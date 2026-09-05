import { Notification, type BrowserWindow } from 'electron'

import { CALENDAR_IPC_CHANNELS } from '../../shared/contracts/calendar'
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
        if (!markCalendarReminderDelivered(reminder)) continue

        const window = this.getWindow()
        if (window && !window.isDestroyed() && !window.webContents.isDestroyed()) {
          window.webContents.send(CALENDAR_IPC_CHANNELS.remindersChanged)
        }

        if (!Notification.isSupported()) {
          console.warn('Calendar desktop notifications are not supported', {
            title: reminder.title,
            triggerAt: reminder.triggerAt
          })
          continue
        }

        const notification = new Notification({
          title: reminder.title,
          body: `Событие: ${formatEventDate(reminder.occurrenceDate, reminder.eventTime)}`,
          silent: false,
          timeoutType: 'default'
        })
        notification.on('show', () => {
          console.info('Calendar desktop notification shown', {
            title: reminder.title,
            triggerAt: reminder.triggerAt
          })
        })
        notification.on('failed', (_event, error) => {
          console.error('Calendar desktop notification failed', {
            title: reminder.title,
            triggerAt: reminder.triggerAt,
            error
          })
        })
        notification.on('click', () => {
          const currentWindow = this.getWindow()
          if (!currentWindow || currentWindow.isDestroyed()) return
          if (currentWindow.isMinimized()) currentWindow.restore()
          currentWindow.show()
          currentWindow.focus()
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
