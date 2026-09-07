import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CalendarReminderRecord } from '@mymind/contracts/calendar'
import type { MobileServices } from '../../app/services'

const notifications = vi.hoisted(() => ({
  setNotificationHandler: vi.fn(),
  getPermissionsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  setNotificationChannelAsync: vi.fn(),
  getAllScheduledNotificationsAsync: vi.fn(),
  cancelScheduledNotificationAsync: vi.fn(),
  scheduleNotificationAsync: vi.fn(),
  addNotificationReceivedListener: vi.fn(),
  addNotificationResponseReceivedListener: vi.fn()
}))

vi.mock('expo-notifications', () => ({
  ...notifications,
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' }
}))
vi.mock('react-native', () => ({ Platform: { OS: 'android' } }))

import {
  calendarReminderFromNotificationData,
  createReminderScheduler,
  reconcileCalendarReminderDeliveries
} from './reminders'

const reminder: CalendarReminderRecord = {
  reminderId: 'reminder-1',
  eventId: 'event-1',
  title: 'Встреча',
  occurrenceDate: '2026-09-07',
  eventTime: '12:30',
  offsetMinutes: 30,
  triggerAt: new Date(2026, 8, 7, 12).getTime()
}

interface HabitTriggerFixture {
  habitId: string
  occurrenceDate: string
  unit: string
  title: string
  targetValue: number
  habitUnit: string
  triggerAt: number
}

function scheduledKey(item: CalendarReminderRecord): string {
  return JSON.stringify([item.reminderId, item.occurrenceDate, item.triggerAt])
}

function services(overrides?: {
  enabled?: boolean
  storedScan?: string | null
  storedLedger?: CalendarReminderRecord[]
  due?: CalendarReminderRecord[]
  scheduled?: CalendarReminderRecord[]
  habits?: HabitTriggerFixture[]
}): { service: MobileServices; values: Map<string, string> } {
  const values = new Map<string, string>()
  values.set('reminders.enabled', String(overrides?.enabled ?? true))
  if (overrides?.storedScan !== undefined && overrides.storedScan !== null)
    values.set('reminders.calendar.last-delivery-scan', overrides.storedScan)
  if (overrides?.storedLedger)
    values.set(
      'reminders.calendar.scheduled-ledger',
      JSON.stringify(overrides.storedLedger.map(scheduledKey))
    )
  const service = {
    settings: {
      get: vi.fn((key: string) => values.get(key) ?? null),
      set: vi.fn((key: string, value: string) => {
        values.set(key, value)
      })
    },
    calendar: {
      listDueCalendarReminders: vi.fn(() => overrides?.due ?? [reminder]),
      markCalendarReminderDelivered: vi.fn(() => true),
      listCalendarReminderTriggers: vi.fn(() => overrides?.scheduled ?? [])
    },
    habits: {
      listHabitReminderTriggers: vi.fn(() => overrides?.habits ?? [])
    }
  } as unknown as MobileServices
  return { service, values }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 8, 7, 12, 5))
  notifications.getPermissionsAsync.mockResolvedValue({ granted: true })
  notifications.getAllScheduledNotificationsAsync.mockResolvedValue([])
  notifications.scheduleNotificationAsync.mockResolvedValue('scheduled')
})

afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('mobile reminder delivery tracking', () => {
  it('parses only complete Calendar notification payloads', () => {
    expect(
      calendarReminderFromNotificationData({
        mymindKind: 'calendar',
        reminderId: reminder.reminderId,
        eventId: reminder.eventId,
        title: reminder.title,
        occurrenceDate: reminder.occurrenceDate,
        eventTime: '',
        offsetMinutes: reminder.offsetMinutes,
        triggerAt: reminder.triggerAt
      })
    ).toEqual({ ...reminder, eventTime: null })

    expect(
      calendarReminderFromNotificationData({
        mymindKind: 'calendar',
        reminderId: reminder.reminderId,
        eventId: reminder.eventId,
        title: reminder.title,
        occurrenceDate: reminder.occurrenceDate,
        offsetMinutes: '30',
        triggerAt: reminder.triggerAt
      })
    ).toBeNull()
    expect(calendarReminderFromNotificationData({ mymindKind: 'habit' })).toBeNull()
  })

  it('backfills only due Calendar reminders that were actually scheduled', async () => {
    const now = Date.now()
    const previous = now - 60_000
    const { service, values } = services({
      storedScan: String(previous),
      storedLedger: [reminder]
    })

    await expect(reconcileCalendarReminderDeliveries(service)).resolves.toBe(1)
    expect(service.calendar.listDueCalendarReminders).toHaveBeenCalledWith(previous, now)
    expect(service.calendar.markCalendarReminderDelivered).toHaveBeenCalledWith(reminder)
    expect(values.get('reminders.calendar.last-delivery-scan')).toBe(String(now))
  })

  it('does not report a due Calendar reminder that was displaced from the OS schedule', async () => {
    const now = Date.now()
    const { service } = services({
      storedScan: String(now - 60_000),
      due: [reminder],
      storedLedger: []
    })

    await expect(reconcileCalendarReminderDeliveries(service)).resolves.toBe(0)
    expect(service.calendar.markCalendarReminderDelivered).not.toHaveBeenCalled()
  })

  it('does not backfill disabled reminders and advances the scan boundary', async () => {
    const now = Date.now()
    const { service, values } = services({ enabled: false, storedLedger: [reminder] })

    await expect(reconcileCalendarReminderDeliveries(service)).resolves.toBe(0)
    expect(notifications.getPermissionsAsync).not.toHaveBeenCalled()
    expect(service.calendar.listDueCalendarReminders).not.toHaveBeenCalled()
    expect(values.get('reminders.calendar.last-delivery-scan')).toBe(String(now))
  })

  it('reschedules future Calendar notifications with delivery metadata and persists the ledger', async () => {
    const futureReminder = {
      ...reminder,
      reminderId: 'reminder-future',
      triggerAt: Date.now() + 60_000
    }
    const { service, values } = services({ scheduled: [futureReminder] })
    const schedule = createReminderScheduler(service)

    await schedule()

    expect(notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1)
    const request = notifications.scheduleNotificationAsync.mock.calls[0]?.[0]
    expect(request?.content.data).toMatchObject({
      mymindKind: 'calendar',
      reminderId: futureReminder.reminderId,
      eventId: futureReminder.eventId,
      occurrenceDate: futureReminder.occurrenceDate,
      offsetMinutes: futureReminder.offsetMinutes,
      triggerAt: futureReminder.triggerAt
    })
    expect(String(request?.content.data?.signature)).toContain('[2,')
    expect(values.get('reminders.calendar.scheduled-ledger')).toBe(
      JSON.stringify([scheduledKey(futureReminder)])
    )
  })

  it('stores no Calendar ledger entry when the 60-notification budget is consumed by habits', async () => {
    const now = Date.now()
    const futureReminder = {
      ...reminder,
      reminderId: 'reminder-later',
      triggerAt: now + 120_000
    }
    const habits = Array.from({ length: 60 }, (_, index): HabitTriggerFixture => ({
      habitId: `habit-${index}`,
      occurrenceDate: '2026-09-07',
      unit: 'утро',
      title: `Привычка ${index}`,
      targetValue: 1,
      habitUnit: 'раз',
      triggerAt: now + (index + 1) * 1000
    }))
    const { service, values } = services({ scheduled: [futureReminder], habits })

    await createReminderScheduler(service)()

    expect(notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(60)
    expect(values.get('reminders.calendar.scheduled-ledger')).toBe('[]')
  })
})
