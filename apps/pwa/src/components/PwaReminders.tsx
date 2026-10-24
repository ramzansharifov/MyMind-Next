import { useEffect, useState } from 'react'
import { ErrorState } from '../client/shared/ui/primitives'
import type { ClientServices } from '../client/app/services'
import { notifyDataChanged, subscribeDataChanges } from '../client/app/changes'
import { scanReminders, showReminder } from '../reminders/scheduler'
import type { PwaDatabase } from '../storage/database'
import { syncActivity } from '../sync/activity'

export function PwaReminders({
  services,
  db,
  paused
}: {
  services: ClientServices
  db: PwaDatabase
  paused: boolean
}): React.JSX.Element | null {
  const [error, setError] = useState('')
  useEffect(() => {
    if (paused) return
    let stopped = false
    let running = false
    const scan = (): void => {
      if (stopped || running || syncActivity.snapshot()) return
      running = true
      void scanReminders(services, db.flush, showReminder)
        .then((count) => {
          if (!stopped) {
            setError('')
            if (count) notifyDataChanged()
          }
        })
        .catch((reason: unknown) => {
          if (!stopped) setError(reason instanceof Error ? reason.message : String(reason))
        })
        .finally(() => {
          running = false
        })
    }
    const unsubscribe = subscribeDataChanges(scan)
    const visible = (): void => {
      if (document.visibilityState === 'visible') scan()
    }
    document.addEventListener('visibilitychange', visible)
    window.addEventListener('focus', scan)
    const timer = setInterval(scan, 15_000)
    scan()
    return () => {
      stopped = true
      clearInterval(timer)
      unsubscribe()
      document.removeEventListener('visibilitychange', visible)
      window.removeEventListener('focus', scan)
    }
  }, [db, paused, services])
  return error ? <ErrorState message={error} /> : null
}
