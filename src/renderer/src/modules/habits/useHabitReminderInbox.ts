import { useCallback, useEffect, useState } from 'react'

import type { HabitUnreadReminderRecord } from '../../../../shared/contracts/habits'

const LOCAL_REMINDERS_CHANGED_EVENT = 'mymind:habit-reminders-changed'
const POLL_INTERVAL_MS = 30_000

function broadcastLocalChange(): void {
  window.dispatchEvent(new Event(LOCAL_REMINDERS_CHANGED_EVENT))
}

export function useHabitReminderInbox(): {
  reminders: HabitUnreadReminderRecord[]
  acknowledge: (reminder: HabitUnreadReminderRecord) => Promise<void>
  refresh: () => Promise<void>
} {
  const [reminders, setReminders] = useState<HabitUnreadReminderRecord[]>([])

  const refresh = useCallback(async (): Promise<void> => {
    const habitsApi = window.api?.habits
    if (!habitsApi?.listUnreadReminders) {
      setReminders([])
      return
    }

    try {
      setReminders(await habitsApi.listUnreadReminders())
    } catch (reason: unknown) {
      console.error('Failed to load unread habit reminders', reason)
    }
  }, [])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void refresh(), 0)
    const interval = window.setInterval(() => void refresh(), POLL_INTERVAL_MS)
    const handleRefresh = (): void => void refresh()
    const unsubscribeMain = window.api?.habits?.onRemindersChanged?.(handleRefresh)

    window.addEventListener('focus', handleRefresh)
    window.addEventListener(LOCAL_REMINDERS_CHANGED_EVENT, handleRefresh)

    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(interval)
      window.removeEventListener('focus', handleRefresh)
      window.removeEventListener(LOCAL_REMINDERS_CHANGED_EVENT, handleRefresh)
      unsubscribeMain?.()
    }
  }, [refresh])

  const acknowledge = useCallback(
    async (reminder: HabitUnreadReminderRecord): Promise<void> => {
      const habitsApi = window.api?.habits
      if (!habitsApi?.acknowledgeReminder) return
      await habitsApi.acknowledgeReminder({ deliveryId: reminder.deliveryId })
      broadcastLocalChange()
      await refresh()
    },
    [refresh]
  )

  return { reminders, acknowledge, refresh }
}
