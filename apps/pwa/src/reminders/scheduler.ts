import type { MobileServices } from '../../../mobile/src/app/services'
import type { PwaDatabase } from '../storage/database'

const CURSOR = 'pwa.reminders.scanned-at'
const MAX_LOOKBACK = 30 * 24 * 60 * 60_000
export interface ReminderNotice {
  title: string
  body: string
  tag: string
  route: 'calendar' | 'habits'
}

/** Persistent delivery rows make missed/remounted scans idempotent. */
export async function scanReminders(
  services: Pick<MobileServices, 'settings' | 'calendar' | 'habits'>,
  flush: () => Promise<void>,
  notify: (notice: ReminderNotice) => Promise<void>,
  now = Date.now()
): Promise<number> {
  if (services.settings.get('reminders.enabled') !== 'true') return 0
  const raw = Number(services.settings.get(CURSOR))
  const since = Math.max(
    now - MAX_LOOKBACK,
    Number.isSafeInteger(raw) && raw > 0 && raw <= now ? raw : now - 5 * 60_000
  )
  const notices: ReminderNotice[] = []
  for (const reminder of services.calendar.listDueCalendarReminders(since, now)) {
    if (services.calendar.markCalendarReminderDelivered(reminder))
      notices.push({
        title: reminder.title,
        body: `${reminder.occurrenceDate}${reminder.eventTime ? ` · ${reminder.eventTime}` : ''}`,
        tag: `calendar:${reminder.reminderId}:${reminder.occurrenceDate}`,
        route: 'calendar'
      })
  }
  for (const reminder of services.habits.listDueHabitReminders(since, now)) {
    if (services.habits.markHabitReminderDelivered(reminder))
      notices.push({
        title: reminder.title,
        body: `${reminder.unit} / ${reminder.targetValue} ${reminder.habitUnit}`,
        tag: `habit:${reminder.habitId}:${reminder.occurrenceDate}:${reminder.unit}`,
        route: 'habits'
      })
  }
  services.settings.set(CURSOR, String(now))
  await flush()
  const results = await Promise.allSettled(notices.map(notify))
  const failed = results.some((result) => result.status === 'rejected')
  if (failed)
    throw new Error('Напоминания записаны в приложении, но браузер не показал часть уведомлений.')
  return notices.length
}

export async function showReminder(notice: ReminderNotice): Promise<void> {
  if (!('Notification' in globalThis) || Notification.permission !== 'granted') return
  const registration = await navigator.serviceWorker?.getRegistration()
  if (registration?.active) {
    await registration.showNotification(notice.title, {
      body: notice.body,
      tag: notice.tag,
      icon: '/icons/icon-192.png',
      data: { route: notice.route }
    })
  } else {
    const notification = new Notification(notice.title, { body: notice.body, tag: notice.tag })
    notification.onclick = () => {
      window.focus()
      window.location.hash = notice.route
      notification.close()
    }
  }
}

export async function enableReminders(services: MobileServices, db: PwaDatabase): Promise<void> {
  if (!('Notification' in globalThis))
    throw new Error('Установите PWA на домашний экран и откройте её в поддерживаемом браузере.')
  if ((await Notification.requestPermission()) !== 'granted')
    throw new Error('Разрешите уведомления MyMind в настройках браузера.')
  services.settings.set('reminders.enabled', 'true')
  services.settings.set(CURSOR, String(Date.now()))
  await db.flush()
}
