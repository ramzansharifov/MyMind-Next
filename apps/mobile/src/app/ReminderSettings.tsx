import { useRef, useState } from 'react'
import { View } from 'react-native'
import { useServices } from './context'
import { notifyDataChanged } from './changes'
import { requestReminderPermission } from '../shared/platform/reminders'
import { Button, ErrorState, Label } from '../shared/ui/primitives'
import { messageFor } from '../shared/ui/form-model'

export function ReminderSettings(): React.JSX.Element {
  const services = useServices()
  const [enabled, setEnabled] = useState(
    () => services.settings.get('reminders.enabled') === 'true'
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const guard = useRef(false)
  const toggle = async (): Promise<void> => {
    if (guard.current) return
    guard.current = true
    setPending(true)
    setError('')
    try {
      if (!enabled && !(await requestReminderPermission()))
        throw new Error('Разрешите уведомления MyMind в настройках телефона.')
      services.settings.set('reminders.enabled', String(!enabled))
      setEnabled(!enabled)
      notifyDataChanged()
    } catch (reason) {
      setError(messageFor(reason))
    } finally {
      guard.current = false
      setPending(false)
    }
  }
  return (
    <View style={{ gap: 12, marginBottom: 24 }}>
      <Label title>Напоминания</Label>
      <Label muted>
        Календарь и привычки. Планируются ближайшие 60 напоминаний в пределах 30 дней; список
        обновляется при открытии приложения и изменении записей.
      </Label>
      <Button
        label={pending ? 'Подождите…' : enabled ? 'Выключить напоминания' : 'Включить напоминания'}
        selected={enabled}
        disabled={pending}
        onPress={() => {
          void toggle()
        }}
      />
      {error && <ErrorState message={error} />}
    </View>
  )
}
