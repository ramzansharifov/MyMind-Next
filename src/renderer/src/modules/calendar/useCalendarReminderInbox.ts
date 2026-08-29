import { useCallback, useEffect, useState } from 'react'

import type { CalendarUnreadReminderRecord } from '../../../../shared/contracts/calendar'

const LOCAL_REMINDERS_CHANGED_EVENT = 'mymind:calendar-reminders-changed'
const POLL_INTERVAL_MS = 30_000

function broadcastLocalChange(): void {
  window.dispatchEvent(new Event(LOCAL_REMINDERS_CHANGED_EVENT))
}

export function useCalendarReminderInbox(): {
  reminders: CalendarUnreadReminderRecord[]
  acknowledge: (reminder: CalendarUnreadReminderRecord) => Promise<void>
  refresh: () => Promise<void>
} {
  const [reminders, setReminders] = useState<CalendarUnreadReminderRecord[]>([])

  const refresh = useCallback(async (): Promise<void> => {
    const calendarApi = window.api?.calendar
    if (!calendarApi?.listUnreadReminders) {
      setReminders([])
      return
    }

    try {
      setReminders(await calendarApi.listUnreadReminders())
    } catch (reason: unknown) {
      console.error('Failed to load unread calendar reminders', reason)
    }
  }, [])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void refresh(), 0)
    const interval = window.setInterval(() => void refresh(), POLL_INTERVAL_MS)
    const handleRefresh = (): void => void refresh()
    const unsubscribeMain = window.api?.calendar?.onRemindersChanged?.(handleRefresh)

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
    async (reminder: CalendarUnreadReminderRecord): Promise<void> => {
      const calendarApi = window.api?.calendar
      if (!calendarApi?.acknowledgeReminder) return
      await calendarApi.acknowledgeReminder({ deliveryId: reminder.deliveryId })
      broadcastLocalChange()
      await refresh()
    },
    [refresh]
  )

  return { reminders, acknowledge, refresh }
}
