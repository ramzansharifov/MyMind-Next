import { useEffect, useState } from 'react'
import { AppState, View } from 'react-native'
import { notifyDataChanged, subscribeDataChanges } from './changes'
import {
  createReminderScheduler,
  reconcileCalendarReminderDeliveries,
  subscribeCalendarReminderDeliveries
} from '../shared/platform/reminders'
import { ErrorState } from '../shared/ui/primitives'
import { messageFor } from '../shared/ui/form-model'
import type { MobileServices } from './services'

export function ReminderStatus({
  services
}: {
  services: MobileServices
}): React.JSX.Element | null {
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const sync = createReminderScheduler(services)
    const run = (): void => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        void (async () => {
          const delivered = await reconcileCalendarReminderDeliveries(services)
          await sync()
          if (delivered > 0) notifyDataChanged()
        })()
          .then(() => {
            if (active) setError('')
          })
          .catch((reason) => {
            if (active) setError(`Напоминания: ${messageFor(reason)}`)
          })
      }, 300)
    }
    const unsubscribeData = subscribeDataChanges(run)
    const unsubscribeNotifications = subscribeCalendarReminderDeliveries(services, notifyDataChanged)
    const state = AppState.addEventListener('change', (value) => {
      if (value === 'active') run()
    })
    run()
    return () => {
      active = false
      if (timer) clearTimeout(timer)
      unsubscribeData()
      unsubscribeNotifications()
      state.remove()
    }
  }, [services])
  return error ? (
    <View>
      <ErrorState message={error} />
    </View>
  ) : null
}
