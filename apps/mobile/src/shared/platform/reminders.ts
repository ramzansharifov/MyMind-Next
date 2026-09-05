import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { addDays, localDateKey } from '@mymind/core/habits'
import type { MobileServices } from '../../app/services'

const prefix = 'mymind-reminder:'
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

/** Serializes reconciliations, so an older request cannot resurrect a deleted reminder. */
export function createReminderScheduler(services: MobileServices): () => Promise<void> {
  let queue = Promise.resolve()
  return () => {
    const operation = queue.then(async () => {
      const enabled = services.settings.get('reminders.enabled') === 'true'
      const allowed = enabled && (await Notifications.getPermissionsAsync()).granted
      const now = Date.now()
      const range = { from: localDateKey(), to: addDays(localDateKey(), 30) }
      const habits = allowed
        ? services.habits.listHabitReminderTriggers(range).map((item) => ({
            identifier: `${prefix}habit:${item.habitId}:${item.occurrenceDate}:${item.unit}`,
            title: item.title,
            body: `${item.unit} / ${item.targetValue} ${item.habitUnit}`,
            triggerAt: item.triggerAt
          }))
        : []
      const calendar = allowed
        ? services.calendar.listCalendarReminderTriggers(range).map((item) => ({
            identifier: `${prefix}calendar:${item.reminderId}:${item.occurrenceDate}`,
            title: item.title,
            body: `${item.occurrenceDate}${item.eventTime ? ` · ${item.eventTime}` : ''}`,
            triggerAt: item.triggerAt
          }))
        : []
      // iOS allows 64 pending notifications per app. Reserve four slots and keep the
      // nearest 60 across both modules. Refill on each foreground and mutation.
      const desired = [...habits, ...calendar]
        .filter((item) => item.triggerAt > now)
        .sort((a, b) => a.triggerAt - b.triggerAt)
        .slice(0, 60)
      const planned = new Map(desired.map((item) => [item.identifier, item]))
      const existing = await Notifications.getAllScheduledNotificationsAsync()
      const unchanged = new Set<string>()
      for (const item of existing) {
        if (!item.identifier.startsWith(prefix)) continue
        const next = planned.get(item.identifier)
        const signature = next ? JSON.stringify([next.title, next.body, next.triggerAt]) : null
        if (next && item.content.data?.signature === signature) unchanged.add(item.identifier)
        else await Notifications.cancelScheduledNotificationAsync(item.identifier)
      }
      for (const item of desired) {
        if (unchanged.has(item.identifier)) continue
        await Notifications.scheduleNotificationAsync({
          identifier: item.identifier,
          content: {
            title: item.title,
            body: item.body,
            sound: 'default',
            data: { signature: JSON.stringify([item.title, item.body, item.triggerAt]) }
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(item.triggerAt),
            channelId: 'mymind-reminders'
          }
        })
      }
    })
    // Keep the queue usable after failure; the caller still receives the rejection.
    queue = operation.catch(() => {})
    return operation
  }
}
