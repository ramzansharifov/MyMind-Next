import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import type { CalendarReminderRecord } from '@mymind/contracts/calendar'
import { addDays, localDateKey } from '@mymind/core/habits'
import type { MobileServices } from '../../app/services'

const prefix = 'mymind-reminder:'
const calendarScanKey = 'reminders.calendar.last-delivery-scan'
const calendarScheduledLedgerKey = 'reminders.calendar.scheduled-ledger'
const startupLookbackMs = 5 * 60_000
const maxLookbackMs = 30 * 24 * 60 * 60_000
const maxScheduledNotifications = 60

interface PlannedReminder {
  identifier: string
  title: string
  body: string
  triggerAt: number
  calendarReminder?: CalendarReminderRecord
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
})

export async function requestReminderPermission(): Promise<boolean> {
  if (Platform.OS === 'android')
    await Notifications.setNotificationChannelAsync('mymind-reminders', {
      name: 'Привычки и календарь',
      importance: Notifications.AndroidImportance.DEFAULT
    })
  return (await Notifications.requestPermissionsAsync()).granted
}

function plannedSignature(item: PlannedReminder): string {
  return JSON.stringify([
    2,
    item.title,
    item.body,
    item.triggerAt,
    item.calendarReminder?.reminderId ?? 'habit'
  ])
}

function calendarNotificationData(reminder: CalendarReminderRecord): Record<string, string | number> {
  return {
    mymindKind: 'calendar',
    reminderId: reminder.reminderId,
    eventId: reminder.eventId,
    title: reminder.title,
    occurrenceDate: reminder.occurrenceDate,
    eventTime: reminder.eventTime ?? '',
    offsetMinutes: reminder.offsetMinutes,
    triggerAt: reminder.triggerAt
  }
}

function calendarScheduledKey(reminder: CalendarReminderRecord): string {
  return JSON.stringify([reminder.reminderId, reminder.occurrenceDate, reminder.triggerAt])
}

function readCalendarScheduledLedger(services: MobileServices): Set<string> {
  const raw = services.settings.get(calendarScheduledLedgerKey)
  if (!raw) return new Set()
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(
      parsed
        .filter((item): item is string => typeof item === 'string' && item.length <= 512)
        .slice(0, maxScheduledNotifications)
    )
  } catch {
    return new Set()
  }
}

function writeCalendarScheduledLedger(
  services: MobileServices,
  desired: readonly PlannedReminder[]
): void {
  const keys = desired.flatMap((item) =>
    item.calendarReminder ? [calendarScheduledKey(item.calendarReminder)] : []
  )
  services.settings.set(calendarScheduledLedgerKey, JSON.stringify(keys))
}

export function calendarReminderFromNotificationData(
  data: Record<string, unknown> | undefined
): CalendarReminderRecord | null {
  if (!data || data.mymindKind !== 'calendar') return null
  const reminderId = data.reminderId
  const eventId = data.eventId
  const title = data.title
  const occurrenceDate = data.occurrenceDate
  const eventTime = data.eventTime
  const offsetMinutes = data.offsetMinutes
  const triggerAt = data.triggerAt
  if (
    typeof reminderId !== 'string' ||
    typeof eventId !== 'string' ||
    typeof title !== 'string' ||
    typeof occurrenceDate !== 'string' ||
    (typeof eventTime !== 'string' && eventTime !== null && eventTime !== undefined) ||
    typeof offsetMinutes !== 'number' ||
    !Number.isFinite(offsetMinutes) ||
    typeof triggerAt !== 'number' ||
    !Number.isFinite(triggerAt)
  ) {
    return null
  }
  return {
    reminderId,
    eventId,
    title,
    occurrenceDate,
    eventTime: eventTime ? eventTime : null,
    offsetMinutes,
    triggerAt
  }
}

function scanStart(raw: string | null, now: number): number {
  const parsed = raw === null ? Number.NaN : Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > now) return now - startupLookbackMs
  return Math.max(parsed, now - maxLookbackMs)
}

/**
 * Backfills the unread Calendar inbox when the app returns to the foreground. Only reminders
 * recorded in the previous scheduling ledger can be backfilled: this prevents a Calendar
 * reminder displaced by the iOS 60-notification budget from being reported as delivered.
 */
export async function reconcileCalendarReminderDeliveries(
  services: MobileServices
): Promise<number> {
  const now = Date.now()
  const enabled = services.settings.get('reminders.enabled') === 'true'
  if (!enabled) {
    services.settings.set(calendarScanKey, String(now))
    return 0
  }
  const granted = (await Notifications.getPermissionsAsync()).granted
  if (!granted) {
    services.settings.set(calendarScanKey, String(now))
    return 0
  }

  const since = scanStart(services.settings.get(calendarScanKey), now)
  const scheduled = readCalendarScheduledLedger(services)
  const due = services.calendar.listDueCalendarReminders(since, now)
  let delivered = 0
  for (const reminder of due) {
    if (!scheduled.has(calendarScheduledKey(reminder))) continue
    if (services.calendar.markCalendarReminderDelivered(reminder)) delivered += 1
  }
  services.settings.set(calendarScanKey, String(now))
  return delivered
}

/** Records foreground deliveries immediately and response deliveries after background/terminated use. */
export function subscribeCalendarReminderDeliveries(
  services: MobileServices,
  onDelivered: () => void
): () => void {
  const record = (data: Record<string, unknown> | undefined): void => {
    const reminder = calendarReminderFromNotificationData(data)
    if (!reminder) return
    try {
      if (services.calendar.markCalendarReminderDelivered(reminder)) onDelivered()
    } catch (reason) {
      console.error('Failed to record Calendar reminder delivery', reason)
    }
  }

  const received = Notifications.addNotificationReceivedListener((notification) => {
    record(notification.request.content.data)
  })
  const responded = Notifications.addNotificationResponseReceivedListener((response) => {
    record(response.notification.request.content.data)
  })
  return () => {
    received.remove()
    responded.remove()
  }
}

/** Serializes reconciliations, so an older request cannot resurrect a deleted reminder. */
export function createReminderScheduler(services: MobileServices): () => Promise<void> {
  let queue = Promise.resolve()
  return () => {
    const operation = queue.then(async () => {
      const enabled = services.settings.get('reminders.enabled') === 'true'
      const allowed = enabled && (await Notifications.getPermissionsAsync()).granted
      const now = Date.now()
      const range = { from: localDateKey(), to: addDays(localDateKey(), 30) }
      const habits: PlannedReminder[] = allowed
        ? services.habits.listHabitReminderTriggers(range).map((item) => ({
            identifier: `${prefix}habit:${item.habitId}:${item.occurrenceDate}:${item.unit}`,
            title: item.title,
            body: `${item.unit} / ${item.targetValue} ${item.habitUnit}`,
            triggerAt: item.triggerAt
          }))
        : []
      const calendar: PlannedReminder[] = allowed
        ? services.calendar.listCalendarReminderTriggers(range).map((item) => ({
            identifier: `${prefix}calendar:${item.reminderId}:${item.occurrenceDate}`,
            title: item.title,
            body: `${item.occurrenceDate}${item.eventTime ? ` · ${item.eventTime}` : ''}`,
            triggerAt: item.triggerAt,
            calendarReminder: item
          }))
        : []
      // iOS allows 64 pending notifications per app. Reserve four slots and keep the
      // nearest 60 across both modules. Refill on each foreground and mutation.
      const desired = [...habits, ...calendar]
        .filter((item) => item.triggerAt > now)
        .sort((a, b) => a.triggerAt - b.triggerAt)
        .slice(0, maxScheduledNotifications)
      const planned = new Map(desired.map((item) => [item.identifier, item]))
      const existing = await Notifications.getAllScheduledNotificationsAsync()
      const unchanged = new Set<string>()
      for (const item of existing) {
        if (!item.identifier.startsWith(prefix)) continue
        const next = planned.get(item.identifier)
        const signature = next ? plannedSignature(next) : null
        if (next && item.content.data?.signature === signature) unchanged.add(item.identifier)
        else await Notifications.cancelScheduledNotificationAsync(item.identifier)
      }
      for (const item of desired) {
        if (unchanged.has(item.identifier)) continue
        const signature = plannedSignature(item)
        await Notifications.scheduleNotificationAsync({
          identifier: item.identifier,
          content: {
            title: item.title,
            body: item.body,
            sound: 'default',
            data: item.calendarReminder
              ? { signature, ...calendarNotificationData(item.calendarReminder) }
              : { signature, mymindKind: 'habit' }
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(item.triggerAt),
            channelId: 'mymind-reminders'
          }
        })
      }
      // Persist only after all cancellations/schedules succeed. The next foreground catch-up
      // therefore reflects notifications the OS was actually asked to keep, not all due events.
      writeCalendarScheduledLedger(services, desired)
    })
    // Keep the queue usable after failure; the caller still receives the rejection.
    queue = operation.catch(() => {})
    return operation
  }
}
