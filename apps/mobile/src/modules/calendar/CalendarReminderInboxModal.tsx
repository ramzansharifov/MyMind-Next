import { useState } from 'react'
import { Modal, ScrollView, View } from 'react-native'
import type { CalendarUnreadReminderRecord } from '@mymind/contracts/calendar'
import { calendarParseDate } from '@mymind/core/calendar-month'
import { Button, EmptyState, ErrorState, Label, Row } from '../../shared/ui/primitives'
import { messageFor } from '../../shared/ui/form-model'
import { useTheme } from '../../shared/ui/theme'

const MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря'
] as const

function plural(value: number, forms: [string, string, string]): string {
  const mod10 = value % 10
  const mod100 = value % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}

function offsetLabel(minutes: number): string {
  if (minutes === 0) return 'В момент события'
  if (minutes % 10_080 === 0) {
    const value = minutes / 10_080
    return `За ${value} ${plural(value, ['неделю', 'недели', 'недель'])}`
  }
  if (minutes % 1440 === 0) {
    const value = minutes / 1440
    return `За ${value} ${plural(value, ['день', 'дня', 'дней'])}`
  }
  if (minutes % 60 === 0) {
    const value = minutes / 60
    return `За ${value} ${plural(value, ['час', 'часа', 'часов'])}`
  }
  return `За ${minutes} ${plural(minutes, ['минуту', 'минуты', 'минут'])}`
}

function occurrenceLabel(reminder: CalendarUnreadReminderRecord): string {
  const date = calendarParseDate(reminder.occurrenceDate)
  const day = `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
  return [day, reminder.eventTime, offsetLabel(reminder.offsetMinutes)].filter(Boolean).join(' · ')
}

export function CalendarReminderInboxModal({
  reminders,
  close,
  acknowledge
}: {
  reminders: CalendarUnreadReminderRecord[]
  close(): void
  acknowledge(reminder: CalendarUnreadReminderRecord): void
}): React.JSX.Element {
  const theme = useTheme()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  const acknowledgeOne = (reminder: CalendarUnreadReminderRecord): void => {
    if (busy) return
    setBusy(reminder.deliveryId)
    setError('')
    try {
      acknowledge(reminder)
    } catch (reason) {
      setError(messageFor(reason))
    } finally {
      setBusy(null)
    }
  }

  const acknowledgeAll = (): void => {
    if (busy) return
    setBusy('all')
    setError('')
    try {
      for (const reminder of reminders) acknowledge(reminder)
    } catch (reason) {
      setError(messageFor(reason))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 48 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12
            }}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Label title>Напоминания календаря</Label>
              <Label muted>
                {reminders.length
                  ? `${reminders.length} непрочитанных. Они исчезнут только после подтверждения.`
                  : 'Непрочитанных напоминаний нет.'}
              </Label>
            </View>
            <Button label="Закрыть" onPress={close} />
          </View>

          {reminders.length > 1 ? (
            <Button
              label="Понятно для всех"
              selected
              disabled={Boolean(busy)}
              onPress={acknowledgeAll}
            />
          ) : null}
          {error ? <ErrorState message={error} /> : null}
          {reminders.length === 0 ? <EmptyState text="Все напоминания прочитаны." /> : null}

          {reminders.map((reminder) => (
            <Row
              key={reminder.deliveryId}
              title={reminder.title}
              subtitle={occurrenceLabel(reminder)}
            >
              <Button
                label={busy === reminder.deliveryId ? 'Подождите…' : 'Понятно'}
                selected
                disabled={Boolean(busy)}
                onPress={() => acknowledgeOne(reminder)}
              />
            </Row>
          ))}
        </ScrollView>
      </View>
    </Modal>
  )
}
