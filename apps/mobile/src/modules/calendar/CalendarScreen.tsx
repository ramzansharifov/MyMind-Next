import { useCallback, useEffect, useMemo, useState } from 'react'
import { FlatList, Pressable, Text, View } from 'react-native'
import type {
  CalendarOccurrenceRecord,
  CalendarUnreadReminderRecord
} from '@mymind/contracts/calendar'
import {
  calendarMonthGrid,
  calendarMonthKey,
  calendarParseDate,
  calendarSameMonth,
  calendarShiftMonth
} from '@mymind/core/calendar-month'
import { localDateKey } from '@mymind/core/habits'
import * as schema from '@mymind/core/validation/calendar'
import { diaryDayKeySchema } from '@mymind/core/validation/diary'
import { notifyDataChanged, subscribeDataChanges } from '../../app/changes'
import { useServices } from '../../app/context'
import { useCollection } from '../../shared/hooks/useCollection'
import { FormSheet } from '../../shared/ui/FormSheet'
import { ActionMenu } from '../../shared/ui/ActionMenu'
import { WorkspaceNodeCard } from '../../shared/ui/Workspace'
import { choiceField, textField, type FormSpec } from '../../shared/ui/form-model'
import {
  Button,
  EmptyState,
  ErrorState,
  Label,
  LoadingState,
  Row,
  SearchField
} from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import { CalendarReminderInboxModal } from './CalendarReminderInboxModal'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const
const WEEKDAYS_LONG = [
  'воскресенье',
  'понедельник',
  'вторник',
  'среда',
  'четверг',
  'пятница',
  'суббота'
] as const
const MONTHS = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь'
] as const
const MONTHS_GENITIVE = [
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

function monthTitle(month: string): string {
  const date = calendarParseDate(month)
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

function dayTitle(day: string): string {
  const date = calendarParseDate(day)
  return `${date.getDate()} ${MONTHS_GENITIVE[date.getMonth()]}, ${WEEKDAYS_LONG[date.getDay()]}`
}

function occurrenceSubtitle(item: CalendarOccurrenceRecord): string {
  return [
    item.time,
    item.kind === 'annual' ? 'Каждый год' : '',
    item.note,
    item.elapsed
      ? `${item.elapsed.years} лет, ${item.elapsed.months} мес., ${item.elapsed.days} дн.`
      : ''
  ]
    .filter(Boolean)
    .join(' · ')
}

export function CalendarScreen(): React.JSX.Element {
  const { calendar: api } = useServices()
  const theme = useTheme()
  const today = localDateKey()
  const [month, setMonth] = useState(() => calendarMonthKey(today))
  const [selectedDate, setSelectedDate] = useState(today)
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<FormSpec | null>(null)
  const [inboxOpen, setInboxOpen] = useState(false)
  const grid = useMemo(() => calendarMonthGrid(month), [month])
  const state = useCollection(
    useCallback(
      () =>
        api.listCalendarOccurrences(
          schema.calendarRangeInputSchema.parse({ from: grid.from, to: grid.to })
        ),
      [api, grid.from, grid.to]
    )
  )
  const unread = useCollection(useCallback(() => api.listUnreadCalendarReminders(), [api]))

  useEffect(() => subscribeDataChanges(unread.refresh), [unread.refresh])

  const byDay = useMemo(() => {
    const result = new Map<string, CalendarOccurrenceRecord[]>()
    for (const occurrence of state.data ?? []) {
      const items = result.get(occurrence.occurrenceDate) ?? []
      items.push(occurrence)
      result.set(occurrence.occurrenceDate, items)
    }
    return result
  }, [state.data])

  const visibleOccurrences = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU')
    return (byDay.get(selectedDate) ?? []).filter((item) => {
      if (!normalizedQuery) return true
      return `${item.title} ${item.note}`.toLocaleLowerCase('ru-RU').includes(normalizedQuery)
    })
  }, [byDay, query, selectedDate])

  const selectDate = (day: string): void => {
    setSelectedDate(day)
    setQuery('')
    if (!calendarSameMonth(day, month)) setMonth(calendarMonthKey(day))
  }

  const shiftMonth = (offset: -1 | 1): void => {
    const next = calendarShiftMonth(month, offset)
    setMonth(next)
    setSelectedDate(next)
    setQuery('')
  }

  const selectToday = (): void => {
    setMonth(calendarMonthKey(today))
    setSelectedDate(today)
    setQuery('')
  }

  const acknowledgeReminders = (reminders: CalendarUnreadReminderRecord[]): void => {
    for (const reminder of reminders) {
      api.acknowledgeCalendarReminder({ deliveryId: reminder.deliveryId })
    }
    notifyDataChanged()
  }

  const edit = (item?: CalendarOccurrenceRecord): void =>
    setForm({
      title: item ? 'Изменить событие' : 'Новое событие',
      initial: {
        title: item?.title ?? '',
        kind: item?.kind ?? 'one_time',
        date: item?.occurrenceDate ?? selectedDate,
        time: item?.time ?? null,
        startDate: item?.startDate ?? null,
        note: item?.note ?? '',
        offsets: item?.reminderOffsets.join(', ') ?? ''
      },
      fields: [
        textField('title', 'Название'),
        choiceField('kind', 'Повторение', [
          { value: 'one_time', label: 'Один раз' },
          { value: 'annual', label: 'Каждый год' }
        ]),
        textField('date', 'Дата события', 'date'),
        textField('time', 'Время', 'time', 'Необязательно'),
        textField(
          'startDate',
          'Отсчитывать время от даты',
          'date',
          'Для ежегодных событий; необязательно'
        ),
        textField('note', 'Заметка к этому событию', 'multiline'),
        textField('offsets', 'Напомнить за N минут', 'text', 'Через запятую, например: 30, 1440')
      ],
      save: (values) => {
        const { offsets, ...rest } = values
        const date = String(values.date)
        diaryDayKeySchema.parse(date)
        if (values.startDate) diaryDayKeySchema.parse(values.startDate)
        const input = schema.calendarCreateEventInputSchema.parse({
          ...rest,
          date,
          time: values.time || null,
          startDate: values.startDate || null,
          reminderOffsets: String(offsets).trim() ? String(offsets).split(',').map(Number) : []
        })
        if (item) {
          api.updateCalendarEvent({
            ...input,
            id: item.eventId,
            occurrenceDate: item.occurrenceDate
          })
        } else {
          api.createCalendarEvent(input)
        }
        notifyDataChanged()
        setSelectedDate(date)
        setMonth(calendarMonthKey(date))
        state.refresh()
      }
    })

  const unreadReminders = unread.data ?? []

  return (
    <View style={{ flex: 1 }}>
      <View style={{ gap: 12, marginBottom: 12 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8
          }}
        >
          <Button label="‹" onPress={() => shiftMonth(-1)} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Перейти к сегодняшней дате"
            onPress={selectToday}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: 'center',
              opacity: pressed ? 0.65 : 1
            })}
          >
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>
              {monthTitle(month)}
            </Text>
            <Text style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>
              Нажмите для сегодня
            </Text>
          </Pressable>
          <Button label="›" onPress={() => shiftMonth(1)} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {WEEKDAYS.map((weekday) => (
            <View
              key={weekday}
              style={{ width: '14.285714%', alignItems: 'center', paddingVertical: 4 }}
            >
              <Text style={{ color: theme.muted, fontSize: 12, fontWeight: '600' }}>{weekday}</Text>
            </View>
          ))}
        </View>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 16,
            overflow: 'hidden',
            backgroundColor: theme.surface
          }}
        >
          {grid.days.map((day, index) => {
            const count = byDay.get(day)?.length ?? 0
            const selected = day === selectedDate
            const currentMonth = calendarSameMonth(day, month)
            const isToday = day === today
            return (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityLabel={`${day}. Событий: ${count}`}
                accessibilityState={{ selected }}
                onPress={() => selectDate(day)}
                style={({ pressed }) => ({
                  width: '14.285714%',
                  minHeight: 56,
                  paddingHorizontal: 4,
                  paddingVertical: 7,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRightWidth: index % 7 === 6 ? 0 : 1,
                  borderBottomWidth: index >= 35 ? 0 : 1,
                  borderColor: theme.border,
                  backgroundColor: selected
                    ? `${theme.accent}22`
                    : currentMonth
                      ? theme.surface
                      : theme.raised,
                  opacity: pressed ? 0.65 : currentMonth ? 1 : 0.62
                })}
              >
                <Text
                  style={{
                    color: selected || isToday ? theme.accent : theme.text,
                    fontSize: 14,
                    fontWeight: selected || isToday ? '700' : '500'
                  }}
                >
                  {Number(day.slice(8, 10))}
                </Text>
                {count > 0 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <View
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 3,
                        backgroundColor: theme.accent
                      }}
                    />
                    {count > 1 ? (
                      <Text style={{ color: theme.muted, fontSize: 10, fontWeight: '600' }}>
                        {count}
                      </Text>
                    ) : null}
                  </View>
                ) : (
                  <View style={{ height: 10 }} />
                )}
              </Pressable>
            )
          })}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button label="+ Событие" selected onPress={() => edit()} />
          <Button label="Сегодня" selected={selectedDate === today} onPress={selectToday} />
          {unreadReminders.length > 0 ? (
            <Button
              label={`Напоминания (${unreadReminders.length})`}
              selected
              onPress={() => setInboxOpen(true)}
            />
          ) : null}
        </View>

        <View style={{ gap: 8 }}>
          <Label title>{dayTitle(selectedDate)}</Label>
          <SearchField value={query} onChangeText={setQuery} />
        </View>
      </View>

      {state.error ? <ErrorState message={state.error} retry={state.refresh} /> : null}
      {unread.error ? <ErrorState message={unread.error} retry={unread.refresh} /> : null}
      {state.loading ? (
        <LoadingState />
      ) : (
        <FlatList
          data={visibleOccurrences}
          keyExtractor={(item) => `${item.eventId}:${item.occurrenceDate}`}
          ListEmptyComponent={
            <EmptyState
              text={query.trim() ? 'На этот день ничего не найдено.' : 'На этот день событий нет.'}
            />
          }
          refreshing={state.loading}
          onRefresh={() => {
            state.refresh()
            unread.refresh()
          }}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => (
            <WorkspaceNodeCard
              title={item.title}
              subtitle={occurrenceSubtitle(item)}
              leadingIcon="calendar"
              onPress={() => edit(item)}
              action={
                <ActionMenu
                  title={item.title}
                  items={[
                    ...(item.kind === 'annual'
                      ? [
                          {
                            key: 'skip-year',
                            label: 'Пропустить в этом году',
                            icon: 'skip' as const,
                            onPress: () =>
                              state.confirmDelete(
                                'Скрыть это повторение?',
                                () => {
                                  api.setCalendarOccurrenceHidden({
                                    eventId: item.eventId,
                                    occurrenceDate: item.occurrenceDate,
                                    hidden: true
                                  })
                                },
                                'Остальные ежегодные повторения сохранятся.'
                              )
                          }
                        ]
                      : []),
                    {
                      key: 'delete',
                      label: 'Удалить событие',
                      icon: 'delete',
                      danger: true,
                      onPress: () =>
                        state.confirmDelete(
                          'Удалить событие?',
                          () => {
                            api.deleteCalendarEvent(item.eventId)
                          },
                          item.kind === 'annual'
                            ? 'Будут удалены все ежегодные повторения и заметки.'
                            : 'Событие и заметка будут удалены.'
                        )
                    }
                  ]}
                />
              }
            />
          )}
        />
      )}
      {form ? <FormSheet spec={form} close={() => setForm(null)} /> : null}
      {inboxOpen ? (
        <CalendarReminderInboxModal
          reminders={unreadReminders}
          close={() => setInboxOpen(false)}
          acknowledge={acknowledgeReminders}
        />
      ) : null}
    </View>
  )
}
