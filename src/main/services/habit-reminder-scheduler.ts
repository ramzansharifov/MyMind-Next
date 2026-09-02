import { Notification, type BrowserWindow } from 'electron'

import {
  listDueHabitReminders,
  markHabitReminderDelivered
} from '../repositories/habits.repository'

const CHECK_INTERVAL_MS = 30_000
const STARTUP_LOOKBACK_MS = 5 * 60_000

export class HabitReminderScheduler {
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
      const due = listDueHabitReminders(this.lastCheck, now)
      for (const reminder of due) {
        if (!markHabitReminderDelivered(reminder)) continue
        if (!Notification.isSupported()) continue

        const progressLabel =
          reminder.targetValue > 1 ? ` · ${reminder.unit}/${reminder.targetValue}` : ''
        const notification = new Notification({
          title: reminder.title,
          body: `Через 30 минут${progressLabel} · ${reminder.preferredTime}`,
          silent: false,
          timeoutType: 'default'
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
      console.error('Habit reminder scheduler failed', reason)
    } finally {
      this.lastCheck = now
      this.running = false
    }
  }
}
