import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import type { CalendarUnreadReminderRecord } from '@mymind/contracts/calendar'
import { calendarParseDate } from '@mymind/core/calendar-month'
import { AppDialog } from '../../shared/ui/AppDialog'
import { Button, EmptyState, ErrorState } from '../../shared/ui/primitives'
import { WorkspaceNodeCard } from '../../shared/ui/Workspace'
import { messageFor } from '../../shared/ui/form-model'
import { calendarReminderLabel } from './calendar-presentation'

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

function occurrenceLabel(reminder: CalendarUnreadReminderRecord): string {
  const date = calendarParseDate(reminder.occurrenceDate)
  const day = `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
  return [day, reminder.eventTime, calendarReminderLabel(reminder.offsetMinutes)]
    .filter(Boolean)
    .join(' · ')
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
