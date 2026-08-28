import { Notification, type BrowserWindow } from 'electron'

import {
  listDueCalendarReminders,
  markCalendarReminderDelivered
} from '../repositories/calendar.repository'

const CHECK_INTERVAL_MS = 30_000
const STARTUP_LOOKBACK_MS = 5 * 60_000

function formatEventDate(date: string, time: string | null): string {
  const [year, month, day] = date.split('-').map(Number)
  const formatted = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(year ?? 0, (month ?? 1) - 1, day ?? 1))
  return time ? `${formatted}, ${time}` : formatted
}

export class CalendarReminderScheduler {
  private timer: NodeJS.Timeout | null = null
  private lastCheck = Date.now() - STARTUP_LOOKBACK_MS
  private running = false

  constructor(private readonly getWindow: () => BrowserWindow | null) {}

  start(): void {
    if (this.timer) return
    void this.tick()
    this.timer = setInterval(() => void this.tick(), CHECK_INTERVAL_MS)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  private async tick(): Promise<void> {
    if (this.running) return
    this.running = true
    const now = Date.now()
    try {
      const due = listDueCalendarReminders(this.lastCheck, now)
      for (const reminder of due) {
        if (!markCalendarReminderDelivered(reminder.reminderId, reminder.occurrenceDate)) continue
        if (!Notification.isSupported()) continue

        const notification = new Notification({
          title: reminder.title,
          body: `Событие: ${formatEventDate(reminder.occurrenceDate, reminder.eventTime)}`,
          silent: false
        })
        notification.on('click', () => {
          const window = this.getWindow()
          if (!window || window.isDestroyed()) return
          if (window.isMinimized()) window.restore()
          window.show()
          window.focus()
        })
        notification.show()
      }
    } catch (reason: unknown) {
      console.error('Calendar reminder scheduler failed', reason)
    } finally {
      this.lastCheck = now
      this.running = false
    }
  }
}
