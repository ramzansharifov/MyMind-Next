import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import type { CalendarUnreadReminderRecord } from '@mymind/contracts/calendar'
import { calendarParseDate } from '@mymind/core/calendar-month'
import { AppDialog } from '../../shared/ui/AppDialog'
import { Button, EmptyState, ErrorState } from '../../shared/ui/primitives'
import { WorkspaceNodeCard } from '../../shared/ui/Workspace'
import { messageFor } from '../../shared/ui/form-model'

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
  acknowledge(reminders: CalendarUnreadReminderRecord[]): void
}): React.JSX.Element {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  const run = (key: string, selected: CalendarUnreadReminderRecord[]): void => {
    if (busy) return
    setBusy(key)
    setError('')
    try {
      acknowledge(selected)
    } catch (reason) {
      setError(messageFor(reason))
    } finally {
      setBusy(null)
    }
  }

  return (
    <AppDialog
      open
      onOpenChange={(open) => {
        if (!open) close()
      }}
      title="Напоминания календаря"
      description={
        reminders.length
          ? `${reminders.length} непрочитанных. Они исчезнут только после подтверждения.`
          : 'Непрочитанных напоминаний нет.'
      }
      icon="calendar"
      presentation="sheet"
      busy={Boolean(busy)}
    >
      <ScrollView contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: 28 }}>
        {reminders.length > 1 ? (
          <View style={{ alignItems: 'flex-start', marginBottom: 2 }}>
            <Button
              label={busy === 'all' ? 'Подождите…' : 'Понятно для всех'}
              selected
              disabled={Boolean(busy)}
              onPress={() => run('all', reminders)}
            />
          </View>
        ) : null}
        {error ? <ErrorState message={error} /> : null}
        {reminders.length === 0 ? <EmptyState text="Все напоминания прочитаны." /> : null}

        {reminders.map((reminder) => (
          <WorkspaceNodeCard
            key={reminder.deliveryId}
            title={reminder.title}
            subtitle={occurrenceLabel(reminder)}
            leadingIcon="calendar"
            action={
              <Button
                label={busy === reminder.deliveryId ? '…' : 'Понятно'}
                compact
                selected
                disabled={Boolean(busy)}
                onPress={() => run(reminder.deliveryId, [reminder])}
              />
            }
          />
        ))}
      </ScrollView>
    </AppDialog>
  )
}
