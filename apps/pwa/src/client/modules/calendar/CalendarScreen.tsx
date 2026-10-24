import { FittedText } from '../../../ui/FittedText'
import { Action, RefreshRegion } from '../../../ui/browser'
import { runAfterInteraction } from '../../shared/ui/run-after-interaction'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, CalendarDays, Clock3, Repeat2 } from 'lucide-react'
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
import { ActionMenu } from '../../shared/ui/ActionMenu'
import { AppDialog } from '../../shared/ui/AppDialog'
import { FormSheet } from '../../shared/ui/FormSheet'
import { AppDatePickerDialog } from '../../shared/ui/FormControls'
import { MobileCreateAction } from '../../shared/ui/MobileCreateAction'
import { WorkspaceNodeCard } from '../../shared/ui/Workspace'
import { choiceField, textField, type FormSpec } from '../../shared/ui/form-model'
import {
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState
} from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import { CalendarReminderInboxModal } from './CalendarReminderInboxModal'
import {
  calendarElapsedLabel,
  calendarOccurrenceSubtitle,
  calendarReminderLabel
} from './calendar-presentation'
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
function dateTitle(day: string): string {
  const date = calendarParseDate(day)
  return `${date.getDate()} ${MONTHS_GENITIVE[date.getMonth()]} ${date.getFullYear()}`
}
function annualOccurrenceDate(occurrenceDate: string, templateDate: string): string {
  return `${occurrenceDate.slice(0, 4)}-${templateDate.slice(5)}`
}
function eventKey(item: CalendarOccurrenceRecord): string {
  return `${item.eventId}:${item.occurrenceDate}`
}
function startDateFromYear(year: unknown, date: string): string | null {
  if (year === null || year === undefined || String(year).trim() === '') return null
  const value = Number(year)
  if (!Number.isInteger(value) || value < 1 || value > 9999) {
    throw new Error('Год начала должен быть от 1 до 9999')
  }
  return `${String(value).padStart(4, '0')}-${date.slice(5)}`
}
export function CalendarScreen(): React.JSX.Element {
  const { calendar: api } = useServices()
  const theme = useTheme()
  const today = localDateKey()
  const [month, setMonth] = useState(() => calendarMonthKey(today))
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null)
  const [form, setForm] = useState<FormSpec | null>(null)
  const [inboxOpen, setInboxOpen] = useState(false)
  const [dateJumpOpen, setDateJumpOpen] = useState(false)
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
    for (const items of result.values()) {
      items.sort((left, right) => {
        const timeOrder = (left.time ?? '99:99').localeCompare(right.time ?? '99:99')
        return timeOrder || left.title.localeCompare(right.title, 'ru')
      })
    }
    return result
  }, [state.data])
  const selectedDayEvents = byDay.get(selectedDate) ?? []
  const selectedEvent = selectedEventKey
    ? ((state.data ?? []).find((item) => eventKey(item) === selectedEventKey) ?? null)
    : null
  const unreadReminders = unread.data ?? []
  const selectDate = (day: string): void => {
    setSelectedDate(day)
    setSelectedEventKey(null)
    if (!calendarSameMonth(day, month)) setMonth(calendarMonthKey(day))
  }
  const shiftMonth = (offset: -1 | 1): void => {
    const next = calendarShiftMonth(month, offset)
    setMonth(next)
    setSelectedDate(next)
    setSelectedEventKey(null)
  }
  const selectToday = (): void => {
    setMonth(calendarMonthKey(today))
    setSelectedDate(today)
    setSelectedEventKey(null)
  }
  const acknowledgeReminders = (reminders: CalendarUnreadReminderRecord[]): void => {
    for (const reminder of reminders) {
      api.acknowledgeCalendarReminder({ deliveryId: reminder.deliveryId })
    }
    notifyDataChanged()
  }
  const edit = (item?: CalendarOccurrenceRecord, createDate = selectedDate): void => {
    const startYearField = textField(
      'startYear',
      'Год начала, необязательно',
      'nullableNumber',
      'Для ежегодных событий. Используется для расчёта прошедшего времени.'
    )
    startYearField.visibleWhen = { key: 'kind', equals: 'annual' }
    setForm({
      title: item ? 'Изменить событие' : 'Новое событие',
      initial: {
        title: item?.title ?? '',
        kind: item?.kind ?? 'one_time',
        date: item?.occurrenceDate ?? createDate,
        time: item?.time ?? null,
        startYear: item ? (item.startDate?.slice(0, 4) ?? null) : String(new Date().getFullYear()),
        note: item?.note ?? '',
        reminderOffsets: item?.reminderOffsets ?? []
      },
      fields: [
        textField('title', 'Название'),
        choiceField('kind', 'Повторение', [
          { value: 'one_time', label: 'Один раз' },
          { value: 'annual', label: 'Каждый год' }
        ]),
        {
          key: 'date',
          label: 'Дата события',
          kind: 'date',
          hint: 'Для ежегодного события повторяются день и месяц.'
        },
        textField('time', 'Время', 'time', 'Необязательно'),
        startYearField,
        textField(
          'note',
          'Заметка к этому повторению',
          'multiline',
          'У ежегодного события заметка относится именно к выбранному году.'
        ),
        {
          key: 'reminderOffsets',
          label: 'Напоминания',
          kind: 'reminders',
          hint: 'Число + минуты, часы, дни или недели — как на desktop.'
        }
      ],
      save: (values) => {
        const date = String(values.date)
        diaryDayKeySchema.parse(date)
        const kind = values.kind === 'annual' ? 'annual' : 'one_time'
        const startDate = kind === 'annual' ? startDateFromYear(values.startYear, date) : null
        const occurrenceDate =
          item && kind === 'annual' ? annualOccurrenceDate(item.occurrenceDate, date) : date
        const input = schema.calendarCreateEventInputSchema.parse({
          title: values.title,
          kind,
          date,
          time: values.time || null,
          startDate,
          note: values.note,
          reminderOffsets: Array.isArray(values.reminderOffsets) ? values.reminderOffsets : []
        })
        if (item) {
          api.updateCalendarEvent({
            ...input,
            id: item.eventId,
            occurrenceDate
          })
        } else {
          api.createCalendarEvent(input)
        }
        setSelectedEventKey(null)
        setSelectedDate(occurrenceDate)
        setMonth(calendarMonthKey(occurrenceDate))
        notifyDataChanged()
        state.refresh()
        unread.refresh()
      }
    })
  }
  const openEvent = (item: CalendarOccurrenceRecord): void => {
    setSelectedDate(item.occurrenceDate)
    setSelectedEventKey(eventKey(item))
  }
  const editSelectedEvent = (): void => {
    if (!selectedEvent) return
    const item = selectedEvent
    setSelectedEventKey(null)
    runAfterInteraction(() => edit(item))
  }
  const calendarHeader = (
    <>
      <div
        className="ui-stack"
        style={{
          gap: 10,
          marginBottom: 12
        }}
      >
        <div
          className="ui-stack"
          style={{
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 18,
            backgroundColor: theme.surface
          }}
        >
          <div
            className="ui-stack"
            style={{
              minHeight: 50,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingInline: 5,
              paddingBlock: 5,
              borderBottomWidth: 1,
              borderBottomColor: theme.border
            }}
          >
            <Button
              label="Сегодня"
              compact
              selected={selectedDate === today}
              onClick={selectToday}
            />
            <IconButton label="Предыдущий месяц" icon="back" ghost onClick={() => shiftMonth(-1)} />
            <FittedText
              minScale={0.82}
              className="ui-text"
              data-lines={1}
              style={{
                minWidth: 0,
                flex: '1 1 0%',
                textAlign: 'center',
                color: theme.text,
                fontSize: 14.5,
                fontWeight: 700,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 1
              }}
            >
              {monthTitle(month)}
            </FittedText>
            <IconButton
              label="Следующий месяц"
              icon="forward"
              ghost
              onClick={() => shiftMonth(1)}
            />
          </div>

          <div
            className="ui-stack"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingInline: 3,
              backgroundColor: theme.background
            }}
          >
            {WEEKDAYS.map((weekday) => (
              <div
                className="ui-stack"
                key={weekday}
                style={{
                  width: '14.285714%',
                  alignItems: 'center',
                  paddingBlock: 7
                }}
              >
                <span
                  className="ui-text"
                  style={{
                    color: theme.muted,
                    fontSize: 10.5,
                    fontWeight: 700
                  }}
                >
                  {weekday}
                </span>
              </div>
            ))}
          </div>

          <div
            className="ui-stack"
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap'
            }}
          >
            {grid.days.map((day, index) => {
              const events = byDay.get(day) ?? []
              const count = events.length
              const selected = day === selectedDate
              const currentMonth = calendarSameMonth(day, month)
              const isToday = day === today
              return (
                <Action
                  key={day}
                  role={'button'}
                  aria-label={`${day}. Событий: ${count}`}
                  aria-selected={selected}
                  onClick={() => selectDate(day)}
                  onHold={() => {
                    selectDate(day)
                    runAfterInteraction(() => edit(undefined, day))
                  }}
                  style={{
                    width: '14.285714%',
                    minHeight: 54,
                    paddingBlock: 5,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
                    borderRightWidth: index % 7 === 6 ? 0 : 1,
                    borderBottomWidth: index >= 35 ? 0 : 1,
                    borderColor: theme.border,
                    backgroundColor: currentMonth ? theme.surface : theme.background,
                    opacity: currentMonth ? 1 : 0.42
                  }}
                  pressedStyle={{
                    opacity: 0.64
                  }}
                >
                  <div
                    className="ui-stack"
                    style={{
                      width: 26,
                      height: 26,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: isToday && !selected ? 1 : 0,
                      borderColor: theme.accent,
                      borderRadius: 13,
                      backgroundColor: selected
                        ? theme.accent
                        : isToday
                          ? theme.accent + '12'
                          : 'transparent'
                    }}
                  >
                    <span
                      className="ui-text"
                      style={{
                        color: selected ? '#ffffff' : isToday ? theme.accent : theme.text,
                        fontSize: 12,
                        fontWeight: isToday || selected ? '800' : '500'
                      }}
                    >
                      {Number(day.slice(8, 10))}
                    </span>
                  </div>

                  <div
                    className="ui-stack"
                    style={{
                      height: 7,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2
                    }}
                  >
                    {events.slice(0, 3).map((event) => (
                      <div
                        className="ui-stack"
                        key={eventKey(event)}
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: theme.accent
                        }}
                      ></div>
                    ))}
                    {count > 3 ? (
                      <span
                        className="ui-text"
                        style={{
                          color: theme.muted,
                          fontSize: 8,
                          lineHeight: '9px'
                        }}
                      >
                        +{count - 3}
                      </span>
                    ) : null}
                  </div>
                </Action>
              )
            })}
          </div>
        </div>

        <div
          className="ui-stack"
          style={{
            minHeight: 50,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingInline: 2
          }}
        >
          <div
            className="ui-stack"
            style={{
              minWidth: 0,
              flex: '1 1 0%'
            }}
          >
            <span
              className="ui-text"
              style={{
                color: theme.muted,
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: 0.8,
                textTransform: 'uppercase'
              }}
            >
              Выбранный день
            </span>
            <span
              className="ui-text"
              data-lines={1}
              style={{
                marginTop: 3,
                color: theme.text,
                fontSize: 16,
                fontWeight: 700,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 1
              }}
            >
              {dayTitle(selectedDate)}
            </span>
          </div>
          <div
            className="ui-stack"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 3
            }}
          >
            <div
              className="ui-stack"
              style={{
                minWidth: 30,
                height: 28,
                alignItems: 'center',
                justifyContent: 'center',
                paddingInline: 8,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 10,
                backgroundColor: theme.surface
              }}
            >
              <span
                className="ui-text"
                style={{
                  color: theme.muted,
                  fontSize: 10.5,
                  fontWeight: 700
                }}
              >
                {selectedDayEvents.length}
              </span>
            </div>
            <IconButton
              label="Перейти к дате"
              icon="calendar"
              ghost
              onClick={() => setDateJumpOpen(true)}
            />
            <Action
              role={'button'}
              aria-label={
                unreadReminders.length
                  ? `Напоминания: ${unreadReminders.length} непрочитанных`
                  : 'Напоминания'
              }
              onClick={() => setInboxOpen(true)}
              style={{
                position: 'relative',
                width: 40,
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                backgroundColor: 'transparent',
                opacity: 1
              }}
              pressedStyle={{
                backgroundColor: theme.raised,
                opacity: 0.72
              }}
            >
              <Bell size={18} color={unreadReminders.length ? theme.accent : theme.muted} />
              {unreadReminders.length ? (
                <div
                  className="ui-stack"
                  style={{
                    position: 'absolute',
                    top: 3,
                    right: 2,
                    minWidth: 16,
                    height: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingInline: 3,
                    borderRadius: 8,
                    backgroundColor: theme.accent
                  }}
                >
                  <span
                    className="ui-text"
                    style={{
                      color: '#ffffff',
                      fontSize: 9,
                      fontWeight: 800
                    }}
                  >
                    {Math.min(unreadReminders.length, 99)}
                  </span>
                </div>
              ) : null}
            </Action>
          </div>
        </div>
      </div>

      {state.error ? <ErrorState message={state.error} retry={state.refresh} /> : null}
      {unread.error ? <ErrorState message={unread.error} retry={unread.refresh} /> : null}
    </>
  )
  return (
    <div
      className="ui-stack"
      style={{
        flex: '1 1 0%',
        minHeight: 0
      }}
    >
      {null}
      <RefreshRegion
        className="ui-scroll"
        onRefresh={() => {
          state.refresh()
          unread.refresh()
        }}
        busy={state.loading}
      >
        <div
          className="ui-stack ui-scroll-content"
          style={{
            paddingBottom: 96
          }}
        >
          {calendarHeader}
          <div className="ui-stack ui-list" style={{}}>
            {(state.loading ? [] : selectedDayEvents).length > 0 ? (
              (state.loading ? [] : selectedDayEvents).map((item) => (
                <div className="ui-stack ui-list-item" key={eventKey(item)}>
                  {
                    <WorkspaceNodeCard
                      title={item.title}
                      subtitle={calendarOccurrenceSubtitle(item)}
                      leadingIcon="calendar"
                      onClick={() => openEvent(item)}
                      action={
                        <ActionMenu
                          title={item.title}
                          description={dateTitle(item.occurrenceDate)}
                          items={[
                            {
                              key: 'edit',
                              label: 'Редактировать',
                              icon: 'edit',
                              onClick: () => edit(item)
                            },
                            ...(item.kind === 'annual'
                              ? [
                                  {
                                    key: 'skip-year',
                                    label: `Убрать только в ${item.occurrenceDate.slice(0, 4)} году`,
                                    icon: 'skip' as const,
                                    onClick: () =>
                                      state.confirmDelete(
                                        'Скрыть это повторение?',
                                        () => {
                                          setSelectedEventKey(null)
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
                              label:
                                item.kind === 'annual' ? 'Удалить всю серию' : 'Удалить событие',
                              icon: 'delete',
                              danger: true,
                              onClick: () =>
                                state.confirmDelete(
                                  item.kind === 'annual'
                                    ? 'Удалить всю серию?'
                                    : 'Удалить событие?',
                                  () => {
                                    setSelectedEventKey(null)
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
                  }
                </div>
              ))
            ) : state.loading ? (
              <LoadingState />
            ) : (
              <EmptyState text="На этот день событий нет." />
            )}
          </div>
        </div>
      </RefreshRegion>

      <MobileCreateAction
        iconOnly
        actions={[
          {
            key: 'event',
            label: 'Новое событие',
            description: `Создать событие на ${dateTitle(selectedDate)}`,
            icon: 'calendar',
            onClick: () => edit(undefined, selectedDate)
          }
        ]}
      />

      {form ? <FormSheet spec={form} close={() => setForm(null)} /> : null}

      <AppDatePickerDialog
        open={dateJumpOpen}
        onOpenChange={setDateJumpOpen}
        value={selectedDate}
        onValueChange={selectDate}
        label="Перейти к дате"
      />

      <AppDialog
        open={selectedEvent !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedEventKey(null)
        }}
        title={selectedEvent?.title ?? 'Событие'}
        description={selectedEvent ? dateTitle(selectedEvent.occurrenceDate) : undefined}
        icon="calendar"
        presentation="sheet"
        footer={
          selectedEvent ? (
            <Button label="Редактировать" icon="edit" primary onClick={editSelectedEvent} />
          ) : undefined
        }
      >
        {selectedEvent ? (
          <div className="ui-scroll">
            <div
              className="ui-stack ui-scroll-content"
              style={{
                padding: 16,
                gap: 16,
                paddingBottom: 28
              }}
            >
              <div
                className="ui-stack"
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 7
                }}
              >
                <div
                  className="ui-stack"
                  style={{
                    minHeight: 30,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingInline: 10,
                    borderWidth: 1,
                    borderColor: theme.accent + '2F',
                    borderRadius: 10,
                    backgroundColor: theme.accent + '10'
                  }}
                >
                  {selectedEvent.kind === 'annual' ? (
                    <Repeat2 size={13} color={theme.accent} />
                  ) : (
                    <CalendarDays size={13} color={theme.accent} />
                  )}
                  <span
                    className="ui-text"
                    style={{
                      color: theme.accent,
                      fontSize: 11,
                      fontWeight: 700
                    }}
                  >
                    {selectedEvent.kind === 'annual' ? 'Ежегодное' : 'Одноразовое'}
                  </span>
                </div>

                {selectedEvent.time ? (
                  <div
                    className="ui-stack"
                    style={{
                      minHeight: 30,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingInline: 10,
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 10,
                      backgroundColor: theme.surface
                    }}
                  >
                    <Clock3 size={13} color={theme.muted} />
                    <span
                      className="ui-text"
                      style={{
                        color: theme.text,
                        fontSize: 11,
                        fontWeight: 600
                      }}
                    >
                      {selectedEvent.time}
                    </span>
                  </div>
                ) : null}
              </div>

              {selectedEvent.kind === 'annual' && selectedEvent.startDate ? (
                <div
                  className="ui-stack"
                  style={{
                    padding: 13,
                    borderWidth: 1,
                    borderColor: theme.accent + '25',
                    borderRadius: 14,
                    backgroundColor: theme.accent + '0D'
                  }}
                >
                  <span
                    className="ui-text"
                    style={{
                      color: theme.muted,
                      fontSize: 10.5
                    }}
                  >
                    Существует с
                  </span>
                  <span
                    className="ui-text"
                    style={{
                      marginTop: 4,
                      color: theme.text,
                      fontSize: 14,
                      fontWeight: 700
                    }}
                  >
                    {selectedEvent.startDate.slice(0, 4)} года
                  </span>
                  {calendarElapsedLabel(selectedEvent.elapsed) ? (
                    <span
                      className="ui-text"
                      style={{
                        marginTop: 5,
                        color: theme.accent,
                        fontSize: 12
                      }}
                    >
                      Прошло {calendarElapsedLabel(selectedEvent.elapsed)}
                    </span>
                  ) : null}
                </div>
              ) : null}

              <div
                className="ui-stack"
                style={{
                  gap: 7
                }}
              >
                <span
                  className="ui-text"
                  style={{
                    color: theme.muted,
                    fontSize: 11,
                    fontWeight: 700
                  }}
                >
                  Заметка
                </span>
                <div
                  className="ui-stack"
                  style={{
                    minHeight: 58,
                    paddingInline: 12,
                    paddingBlock: 11,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 13,
                    backgroundColor: theme.surface
                  }}
                >
                  <span
                    className="ui-text"
                    style={{
                      color: selectedEvent.note.trim() ? theme.text : theme.muted,
                      fontSize: 13,
                      lineHeight: '20px'
                    }}
                  >
                    {selectedEvent.note.trim() || 'Для этого дня заметки нет.'}
                  </span>
                </div>
              </div>

              <div
                className="ui-stack"
                style={{
                  gap: 7
                }}
              >
                <div
                  className="ui-stack"
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Bell size={14} color={theme.muted} />
                  <span
                    className="ui-text"
                    style={{
                      color: theme.muted,
                      fontSize: 11,
                      fontWeight: 700
                    }}
                  >
                    Напоминания
                  </span>
                </div>

                {selectedEvent.reminderOffsets.length ? (
                  <div
                    className="ui-stack"
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: 7
                    }}
                  >
                    {selectedEvent.reminderOffsets.map((offset) => (
                      <div
                        className="ui-stack"
                        key={offset}
                        style={{
                          paddingInline: 10,
                          paddingBlock: 7,
                          borderWidth: 1,
                          borderColor: theme.border,
                          borderRadius: 10,
                          backgroundColor: theme.surface
                        }}
                      >
                        <span
                          className="ui-text"
                          style={{
                            color: theme.text,
                            fontSize: 11.5
                          }}
                        >
                          {calendarReminderLabel(offset)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span
                    className="ui-text"
                    style={{
                      color: theme.muted,
                      fontSize: 12
                    }}
                  >
                    Напоминания не настроены.
                  </span>
                )}

                {!selectedEvent.time && selectedEvent.reminderOffsets.length ? (
                  <span
                    className="ui-text"
                    style={{
                      color: theme.muted,
                      fontSize: 10.5,
                      lineHeight: '16px'
                    }}
                  >
                    Для события без времени напоминания рассчитываются от 09:00 дня события.
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </AppDialog>

      {inboxOpen ? (
        <CalendarReminderInboxModal
          reminders={unreadReminders}
          close={() => setInboxOpen(false)}
          acknowledge={acknowledgeReminders}
        />
      ) : null}
    </div>
  )
}
