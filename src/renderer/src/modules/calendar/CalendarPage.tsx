import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Pencil,
  Plus,
  Repeat2,
  Trash2
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type {
  CalendarEventKind,
  CalendarOccurrenceRecord
} from '../../../../shared/contracts/calendar'
import { cn } from '../../shared/lib/cn'
import { AppDateField } from '../../shared/ui/AppDateField'
import { AppDialog } from '../../shared/ui/AppDialog'
import { AppSelect } from '../../shared/ui/AppSelect'
import { ModuleHeader } from '../../shared/ui/ModuleHeader'
import { StandardModulePage } from '../../shared/ui/StandardModulePage'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const MONTH_FORMATTER = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' })
const DAY_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric'
})
const DATE_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric'
})
const NO_TIME_VALUE = '__none__'
const EVENT_KIND_OPTIONS = [
  { value: 'one_time', label: 'Одноразовое' },
  { value: 'annual', label: 'Ежегодное' }
] as const
const REMINDER_UNIT_OPTIONS = [
  { value: 'minutes', label: 'минут' },
  { value: 'hours', label: 'часов' },
  { value: 'days', label: 'дней' },
  { value: 'weeks', label: 'недель' }
] as const
const ANNUAL_MONTH_OPTIONS = [
  { value: '01', label: 'января' },
  { value: '02', label: 'февраля' },
  { value: '03', label: 'марта' },
  { value: '04', label: 'апреля' },
  { value: '05', label: 'мая' },
  { value: '06', label: 'июня' },
  { value: '07', label: 'июля' },
  { value: '08', label: 'августа' },
  { value: '09', label: 'сентября' },
  { value: '10', label: 'октября' },
  { value: '11', label: 'ноября' },
  { value: '12', label: 'декабря' }
] as const
const TIME_HOUR_OPTIONS = [
  { value: NO_TIME_VALUE, label: 'Без времени' },
  ...Array.from({ length: 24 }, (_, hour) => ({
    value: String(hour).padStart(2, '0'),
    label: String(hour).padStart(2, '0')
  }))
]
const TIME_MINUTE_OPTIONS = Array.from({ length: 60 }, (_, minute) => ({
  value: String(minute).padStart(2, '0'),
  label: String(minute).padStart(2, '0')
}))

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1, 12)
}

function addDays(value: string, days: number): string {
  const date = parseDate(value)
  date.setDate(date.getDate() + days)
  return dateKey(date)
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-01`
}

function gridRange(month: string): { from: string; to: string; days: string[] } {
  const first = parseDate(month)
  const mondayOffset = (first.getDay() + 6) % 7
  const from = addDays(month, -mondayOffset)
  const days = Array.from({ length: 42 }, (_, index) => addDays(from, index))
  return { from, to: days.at(-1) ?? from, days }
}

function formatOccurrenceDate(value: string): string {
  return DAY_FORMATTER.format(parseDate(value))
}

function formatDate(value: string): string {
  return DATE_FORMATTER.format(parseDate(value))
}

function occurrenceKey(event: CalendarOccurrenceRecord): string {
  return `${event.eventId}:${event.occurrenceDate}`
}

function annualDayOptions(value: string): { value: string; label: string }[] {
  const month = Number(value.slice(5, 7)) || 1
  const days = new Date(2024, month, 0, 12).getDate()
  return Array.from({ length: days }, (_, index) => {
    const day = pad(index + 1)
    return { value: day, label: String(index + 1) }
  })
}

function withAnnualMonth(value: string, month: string): string {
  const year = value.slice(0, 4) || String(new Date().getFullYear())
  const currentDay = Number(value.slice(8, 10)) || 1
  const maxDay = new Date(2024, Number(month), 0, 12).getDate()
  return `${year}-${month}-${pad(Math.min(currentDay, maxDay))}`
}

function withAnnualDay(value: string, day: string): string {
  const year = value.slice(0, 4) || String(new Date().getFullYear())
  const month = value.slice(5, 7) || '01'
  return `${year}-${month}-${day}`
}

function annualOccurrenceDate(occurrenceDate: string, templateDate: string): string {
  return `${occurrenceDate.slice(0, 4)}-${templateDate.slice(5)}`
}

function plural(value: number, forms: [string, string, string]): string {
  const mod10 = value % 10
  const mod100 = value % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}

function elapsedLabel(event: CalendarOccurrenceRecord): string | null {
  if (!event.elapsed) return null
  const parts: string[] = []
  if (event.elapsed.years) {
    parts.push(`${event.elapsed.years} ${plural(event.elapsed.years, ['год', 'года', 'лет'])}`)
  }
  if (event.elapsed.months) {
    parts.push(
      `${event.elapsed.months} ${plural(event.elapsed.months, ['месяц', 'месяца', 'месяцев'])}`
    )
  }
  parts.push(`${event.elapsed.days} ${plural(event.elapsed.days, ['день', 'дня', 'дней'])}`)
  return parts.join(', ')
}

function reminderLabel(minutes: number): string {
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

interface EditorState {
  eventId: string | null
  occurrenceDate: string
  title: string
  kind: CalendarEventKind
  date: string
  time: string
  startYear: string
  note: string
  reminderOffsets: number[]
}

function emptyEditor(date: string): EditorState {
  return {
    eventId: null,
    occurrenceDate: date,
    title: '',
    kind: 'one_time',
    date,
    time: '',
    startYear: String(new Date().getFullYear()),
    note: '',
    reminderOffsets: []
  }
}

function editorFromOccurrence(event: CalendarOccurrenceRecord): EditorState {
  return {
    eventId: event.eventId,
    occurrenceDate: event.occurrenceDate,
    title: event.title,
    kind: event.kind,
    date: event.occurrenceDate,
    time: event.time ?? '',
    startYear: event.startDate?.slice(0, 4) ?? '',
    note: event.note,
    reminderOffsets: event.reminderOffsets
  }
}

export function CalendarPage(): React.JSX.Element {
  const today = dateKey(new Date())
  const [month, setMonth] = useState(() => monthKey(new Date()))
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null)
  const range = useMemo(() => gridRange(month), [month])
  const [events, setEvents] = useState<CalendarOccurrenceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [saving, setSaving] = useState(false)
  const [reminderAmount, setReminderAmount] = useState(1)
  const [reminderUnit, setReminderUnit] = useState<'minutes' | 'hours' | 'days' | 'weeks'>('days')

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      setEvents(await window.api.calendar.listRange({ from: range.from, to: range.to }))
      setError(null)
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить календарь')
    } finally {
      setLoading(false)
    }
  }, [range.from, range.to])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(initialLoad)
  }, [load])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarOccurrenceRecord[]>()
    for (const event of events) {
      const items = map.get(event.occurrenceDate) ?? []
      items.push(event)
      map.set(event.occurrenceDate, items)
    }
    for (const items of map.values()) {
      items.sort((left, right) => (left.time ?? '99:99').localeCompare(right.time ?? '99:99'))
    }
    return map
  }, [events])

  const selectedDayEvents = eventsByDay.get(selectedDate) ?? []
  const selectedEvent = selectedEventKey
    ? (events.find((event) => occurrenceKey(event) === selectedEventKey) ?? null)
    : null

  function selectDay(day: string): void {
    setSelectedDate(day)
    setSelectedEventKey(null)
  }

  function selectEvent(event: CalendarOccurrenceRecord): void {
    setSelectedDate(event.occurrenceDate)
    setSelectedEventKey(occurrenceKey(event))
  }

  function shiftMonth(delta: number): void {
    const date = parseDate(month)
    date.setMonth(date.getMonth() + delta)
    const nextMonth = monthKey(date)
    setMonth(nextMonth)
    setSelectedDate(nextMonth)
    setSelectedEventKey(null)
  }

  function goToday(): void {
    setMonth(monthKey(new Date()))
    setSelectedDate(today)
    setSelectedEventKey(null)
  }

  function goToDate(value: string): void {
    if (!value) return
    setMonth(monthKey(parseDate(value)))
    setSelectedDate(value)
    setSelectedEventKey(null)
  }

  function openCreate(date = selectedDate): void {
    setEditor(emptyEditor(date))
  }

  function addReminder(): void {
    const multiplier = { minutes: 1, hours: 60, days: 1440, weeks: 10_080 }[reminderUnit]
    const offset = Math.max(0, Math.round(reminderAmount)) * multiplier
    if (!editor || editor.reminderOffsets.includes(offset)) return
    setEditor({
      ...editor,
      reminderOffsets: [...editor.reminderOffsets, offset].sort((a, b) => b - a)
    })
  }

  async function saveEvent(): Promise<void> {
    if (!editor || !editor.title.trim()) return
    setSaving(true)
    try {
      const occurrenceDate =
        editor.kind === 'annual'
          ? annualOccurrenceDate(editor.occurrenceDate, editor.date)
          : editor.date
      const startDate =
        editor.kind === 'annual' && editor.startYear.trim()
          ? `${editor.startYear.trim()}-${editor.date.slice(5)}`
          : null
      const input = {
        title: editor.title.trim(),
        kind: editor.kind,
        date: editor.date,
        time: editor.time || null,
        startDate,
        note: editor.note,
        reminderOffsets: editor.reminderOffsets
      }
      let eventId = editor.eventId
      if (editor.eventId) {
        await window.api.calendar.updateEvent({
          ...input,
          id: editor.eventId,
          occurrenceDate
        })
      } else {
        const created = await window.api.calendar.createEvent(input)
        eventId = created.id
      }
      setSelectedDate(occurrenceDate)
      setSelectedEventKey(eventId ? `${eventId}:${occurrenceDate}` : null)
      setMonth(monthKey(parseDate(occurrenceDate)))
      setEditor(null)
      await load()
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить событие')
    } finally {
      setSaving(false)
    }
  }

  async function deleteSeries(): Promise<void> {
    if (!editor?.eventId) return
    setSaving(true)
    try {
      await window.api.calendar.deleteEvent({ id: editor.eventId })
      setSelectedEventKey(null)
      setEditor(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function hideOccurrence(): Promise<void> {
    if (!editor?.eventId) return
    setSaving(true)
    try {
      await window.api.calendar.setOccurrenceHidden({
        eventId: editor.eventId,
        occurrenceDate: editor.occurrenceDate,
        hidden: true
      })
      setSelectedEventKey(null)
      setEditor(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  const editorOccurrence = editor?.eventId
    ? (events.find(
        (event) =>
          event.eventId === editor.eventId && event.occurrenceDate === editor.occurrenceDate
      ) ?? null)
    : null

  return (
    <StandardModulePage>
      <ModuleHeader
        icon={CalendarDays}
        title="Календарь"
        description="Планируйте события и не пропускайте важные даты."
        actions={
          <button
            type="button"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-400"
            onClick={() => openCreate()}
          >
            <Plus className="size-4" /> Новое событие
          </button>
        }
      />

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div
        data-testid="calendar-layout"
        className="mt-5 grid items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_320px]"
      >
        <section
          data-testid="calendar-grid"
          className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)]"
        >
          <div className="grid min-h-14 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-[var(--app-border)] bg-[var(--app-workspace)] px-3 py-2">
            <button
              type="button"
              className="h-9 justify-self-start rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] px-3 text-xs font-medium text-[var(--app-text)] transition-colors hover:bg-[var(--app-control-hover)]"
              onClick={goToday}
            >
              Сегодня
            </button>

            <div className="flex min-w-0 items-center justify-center gap-2 sm:gap-3">
              <button
                type="button"
                aria-label="Предыдущий месяц"
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                onClick={() => shiftMonth(-1)}
              >
                <ChevronLeft className="size-4" />
              </button>
              <strong className="min-w-[150px] text-center text-sm font-semibold text-[var(--app-text)] capitalize sm:min-w-[180px] sm:text-base">
                {MONTH_FORMATTER.format(parseDate(month))}
              </strong>
              <button
                type="button"
                aria-label="Следующий месяц"
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                onClick={() => shiftMonth(1)}
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <AppDateField
              value={selectedDate}
              onChange={goToDate}
              ariaLabel="Точная дата календаря"
              calendarButtonLabel="Выбрать точную дату календаря"
              className="w-[176px] justify-self-end"
              inputClassName="h-9 rounded-lg bg-[var(--app-card)] text-xs"
            />
          </div>

          <div className="grid grid-cols-7 border-b border-[var(--app-border)] bg-[var(--app-workspace)]/70">
            {WEEKDAYS.map((weekday) => (
              <div
                key={weekday}
                className="px-2 py-2.5 text-center text-xs font-semibold text-[var(--app-muted)]"
              >
                {weekday}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {range.days.map((day, index) => {
              const inMonth = day.slice(0, 7) === month.slice(0, 7)
              const dayEvents = eventsByDay.get(day) ?? []
              const isToday = day === today
              const isSelected = day === selectedDate
              const hasRightBorder = index % 7 !== 6
              const hasBottomBorder = index < 35

              return (
                <div
                  key={day}
                  className={cn(
                    'group min-h-[118px] cursor-default p-2 transition-colors',
                    hasRightBorder && 'border-r border-[var(--app-border)]',
                    hasBottomBorder && 'border-b border-[var(--app-border)]',
                    !inMonth && 'bg-[var(--app-workspace)]/40',
                    !isSelected && 'hover:bg-[var(--app-card-hover)]'
                  )}
                  style={
                    isSelected
                      ? {
                          backgroundColor:
                            'color-mix(in srgb, var(--app-accent-500) 7%, transparent)',
                          boxShadow:
                            'inset 0 0 0 1px color-mix(in srgb, var(--app-accent-500) 48%, transparent)'
                        }
                      : undefined
                  }
                  onClick={() => selectDay(day)}
                  onDoubleClick={() => openCreate(day)}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <button
                      type="button"
                      aria-label={`Выбрать ${formatOccurrenceDate(day)}`}
                      className={cn(
                        'flex size-7 items-center justify-center rounded-lg text-xs font-semibold transition-colors',
                        isToday
                          ? 'bg-violet-500 text-white shadow-sm shadow-violet-500/20'
                          : isSelected
                            ? 'bg-violet-500/15 text-violet-200'
                            : inMonth
                              ? 'text-[var(--app-text)]'
                              : 'text-[var(--app-muted)]'
                      )}
                      onClick={(event) => {
                        event.stopPropagation()
                        selectDay(day)
                      }}
                    >
                      {Number(day.slice(-2))}
                    </button>
                  </div>

                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => {
                      const active = selectedEventKey === occurrenceKey(event)
                      return (
                        <button
                          key={occurrenceKey(event)}
                          type="button"
                          aria-label={`Открыть событие ${event.title}`}
                          className={cn(
                            'flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11px] transition-colors',
                            active
                              ? 'bg-violet-500/20 text-violet-100'
                              : 'bg-violet-500/8 text-[var(--app-text)] hover:bg-violet-500/14'
                          )}
                          onClick={(clickEvent) => {
                            clickEvent.stopPropagation()
                            selectEvent(event)
                          }}
                        >
                          <span className="size-1.5 shrink-0 rounded-full bg-violet-400" />
                          {event.kind === 'annual' && (
                            <Repeat2 className="size-3 shrink-0 opacity-70" />
                          )}
                          <span className="truncate">
                            {event.time ? `${event.time} ` : ''}
                            {event.title}
                          </span>
                        </button>
                      )
                    })}
                    {dayEvents.length > 3 && (
                      <div className="px-1.5 text-[10px] text-[var(--app-muted)]">
                        +{dayEvents.length - 3} ещё
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {loading && (
            <div className="border-t border-[var(--app-border)] px-4 py-2 text-xs text-[var(--app-muted)]">
              Обновление календаря…
            </div>
          )}
        </section>

        <aside
          data-testid="calendar-detail-panel"
          className="flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)]"
        >
          <div className="flex items-start justify-between gap-3 border-b border-[var(--app-border)] px-4 py-4">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold tracking-[0.12em] text-[var(--app-muted)] uppercase">
                Выбранный день
              </div>
              <div className="mt-1 text-sm font-semibold text-[var(--app-text)] first-letter:uppercase">
                {formatOccurrenceDate(selectedDate)}
              </div>
            </div>
            <button
              type="button"
              aria-label={`Добавить событие ${formatOccurrenceDate(selectedDate)}`}
              className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] text-[var(--app-muted)] transition-colors hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-violet-200"
              onClick={() => openCreate(selectedDate)}
            >
              <Plus className="size-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {selectedDayEvents.length > 0 && (
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between text-xs font-medium text-[var(--app-muted)]">
                  <span>События дня</span>
                  <span>{selectedDayEvents.length}</span>
                </div>
                <div className="space-y-1.5">
                  {selectedDayEvents.map((event) => {
                    const active = selectedEventKey === occurrenceKey(event)
                    return (
                      <button
                        key={occurrenceKey(event)}
                        type="button"
                        aria-label={`Выбрать событие ${event.title}`}
                        aria-pressed={active}
                        className={cn(
                          'w-full rounded-xl border px-3 py-2.5 text-left transition-colors',
                          active
                            ? 'border-violet-500/30 bg-violet-500/10'
                            : 'border-[var(--app-border)] bg-[var(--app-workspace)] hover:bg-[var(--app-card-hover)]'
                        )}
                        onClick={() => selectEvent(event)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="size-2 shrink-0 rounded-full bg-violet-400" />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--app-text)]">
                            {event.title}
                          </span>
                          {event.kind === 'annual' && (
                            <Repeat2 className="size-3.5 shrink-0 text-[var(--app-muted)]" />
                          )}
                        </div>
                        {event.time && (
                          <div className="mt-1 pl-4 text-xs text-[var(--app-muted)]">
                            {event.time}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {selectedEvent ? (
              <div className="space-y-4 border-t border-[var(--app-border)] pt-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-1 text-[10px] font-semibold text-violet-200">
                      {selectedEvent.kind === 'annual' ? 'Ежегодное' : 'Одноразовое'}
                    </span>
                    {selectedEvent.time && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--app-border)] bg-[var(--app-workspace)] px-2 py-1 text-[10px] text-[var(--app-muted)]">
                        <Clock3 className="size-3" /> {selectedEvent.time}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-3 text-lg leading-snug font-semibold text-[var(--app-text)]">
                    {selectedEvent.title}
                  </h2>
                  <div className="mt-1 text-xs text-[var(--app-muted)]">
                    {formatDate(selectedEvent.occurrenceDate)}
                  </div>
                </div>

                {selectedEvent.kind === 'annual' && selectedEvent.startDate && (
                  <div className="rounded-xl border border-violet-500/15 bg-violet-500/[0.07] p-3">
                    <div className="text-[11px] font-medium text-[var(--app-muted)]">
                      Существует с
                    </div>
                    <div className="mt-1 text-sm font-medium text-[var(--app-text)]">
                      {selectedEvent.startDate.slice(0, 4)} год
                    </div>
                    {elapsedLabel(selectedEvent) && (
                      <div className="mt-2 text-xs text-violet-200">
                        Прошло {elapsedLabel(selectedEvent)}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <div className="mb-2 text-xs font-semibold text-[var(--app-muted)]">Заметка</div>
                  <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 py-3 text-sm leading-6 text-[var(--app-text)]">
                    {selectedEvent.note.trim() ? (
                      <p className="whitespace-pre-wrap">{selectedEvent.note}</p>
                    ) : (
                      <span className="text-[var(--app-muted)]">Для этого дня заметки нет.</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--app-muted)]">
                    <Bell className="size-3.5" /> Напоминания
                  </div>
                  {selectedEvent.reminderOffsets.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedEvent.reminderOffsets.map((offset) => (
                        <span
                          key={offset}
                          className="rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] px-2.5 py-1.5 text-xs text-[var(--app-text)]"
                        >
                          {reminderLabel(offset)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-[var(--app-muted)]">Напоминания не настроены.</div>
                  )}
                </div>

                <button
                  type="button"
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] text-sm font-medium text-[var(--app-text)] transition-colors hover:bg-[var(--app-control-hover)]"
                  onClick={() => setEditor(editorFromOccurrence(selectedEvent))}
                >
                  <Pencil className="size-4" /> Редактировать событие
                </button>
              </div>
            ) : selectedDayEvents.length > 0 ? (
              <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] px-5 text-center">
                <CalendarDays className="size-8 text-[var(--app-muted)]/55" />
                <div className="mt-3 text-sm font-medium text-[var(--app-text)]">
                  Выберите событие
                </div>
                <p className="mt-1 max-w-52 text-xs leading-5 text-[var(--app-muted)]">
                  Справа появятся его заметка, напоминания и информация о повторении.
                </p>
              </div>
            ) : (
              <div className="flex min-h-72 flex-col items-center justify-center text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl border border-violet-500/15 bg-violet-500/8">
                  <CalendarDays className="size-6 text-violet-300" />
                </div>
                <div className="mt-4 text-sm font-semibold text-[var(--app-text)]">Событий нет</div>
                <p className="mt-1 max-w-52 text-xs leading-5 text-[var(--app-muted)]">
                  Добавьте событие на выбранный день — оно появится прямо в календаре.
                </p>
                <button
                  type="button"
                  className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl bg-violet-500 px-3 text-xs font-semibold text-white hover:bg-violet-400"
                  onClick={() => openCreate(selectedDate)}
                >
                  <Plus className="size-3.5" /> Добавить событие
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>

      <AppDialog
        open={editor !== null}
        onOpenChange={(open) => !open && !saving && setEditor(null)}
        title={editor?.eventId ? 'Событие' : 'Новое событие'}
        description="Настройка события календаря"
        icon={<CalendarDays />}
        size="lg"
        busy={saving}
        footer={
          editor ? (
            <>
              {editor.eventId && editor.kind === 'annual' && (
                <button
                  type="button"
                  disabled={saving}
                  className="mr-auto h-10 rounded-xl px-3 text-sm text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                  onClick={() => void hideOccurrence()}
                >
                  Убрать только в {editor.occurrenceDate.slice(0, 4)} году
                </button>
              )}
              {editor.eventId && (
                <button
                  type="button"
                  disabled={saving}
                  className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm text-red-300 hover:bg-red-500/10"
                  onClick={() => void deleteSeries()}
                >
                  <Trash2 className="size-4" /> Удалить
                </button>
              )}
              <button
                type="button"
                disabled={saving || !editor.title.trim()}
                className="h-10 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-45"
                onClick={() => void saveEvent()}
              >
                Сохранить
              </button>
            </>
          ) : null
        }
      >
        {editor && (
          <div className="space-y-5">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[var(--app-muted)]">
                Название
              </span>
              <input
                autoFocus
                value={editor.title}
                maxLength={160}
                className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-violet-500/45"
                placeholder="Например, годовщина свадьбы"
                onChange={(event) => setEditor({ ...editor, title: event.target.value })}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="mb-1.5 block text-xs font-medium text-[var(--app-muted)]">
                  Тип события
                </span>
                <AppSelect
                  value={editor.kind}
                  options={EVENT_KIND_OPTIONS}
                  ariaLabel="Тип события"
                  triggerClassName="h-11 border border-[var(--app-border)]"
                  onValueChange={(value) =>
                    setEditor({ ...editor, kind: value as CalendarEventKind })
                  }
                />
              </div>

              <div>
                <span className="mb-1.5 block text-xs font-medium text-[var(--app-muted)]">
                  Дата
                </span>
                {editor.kind === 'one_time' ? (
                  <AppDateField
                    value={editor.date}
                    onChange={(value) => setEditor({ ...editor, date: value })}
                    ariaLabel="Дата события"
                    calendarButtonLabel="Выбрать дату события"
                    inputClassName="h-11"
                  />
                ) : (
                  <div className="grid grid-cols-[0.8fr_1.2fr] gap-2">
                    <AppSelect
                      value={editor.date.slice(8, 10)}
                      options={annualDayOptions(editor.date)}
                      ariaLabel="День ежегодного события"
                      triggerClassName="h-11 border border-[var(--app-border)]"
                      onValueChange={(value) =>
                        setEditor({ ...editor, date: withAnnualDay(editor.date, value) })
                      }
                    />
                    <AppSelect
                      value={editor.date.slice(5, 7)}
                      options={ANNUAL_MONTH_OPTIONS}
                      ariaLabel="Месяц ежегодного события"
                      triggerClassName="h-11 border border-[var(--app-border)]"
                      onValueChange={(value) =>
                        setEditor({ ...editor, date: withAnnualMonth(editor.date, value) })
                      }
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="mb-1.5 block text-xs font-medium text-[var(--app-muted)]">
                  Время, необязательно
                </span>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <AppSelect
                    value={editor.time ? editor.time.slice(0, 2) : NO_TIME_VALUE}
                    options={TIME_HOUR_OPTIONS}
                    ariaLabel="Часы события"
                    triggerClassName="h-11 border border-[var(--app-border)]"
                    onValueChange={(value) =>
                      setEditor({
                        ...editor,
                        time:
                          value === NO_TIME_VALUE
                            ? ''
                            : `${value}:${editor.time ? editor.time.slice(3, 5) : '00'}`
                      })
                    }
                  />
                  <span className="text-sm font-semibold text-[var(--app-muted)]">:</span>
                  <AppSelect
                    value={editor.time ? editor.time.slice(3, 5) : '00'}
                    options={TIME_MINUTE_OPTIONS}
                    ariaLabel="Минуты события"
                    disabled={!editor.time}
                    triggerClassName="h-11 border border-[var(--app-border)]"
                    onValueChange={(value) =>
                      setEditor({ ...editor, time: `${editor.time.slice(0, 2)}:${value}` })
                    }
                  />
                </div>
              </div>

              {editor.kind === 'annual' && (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-[var(--app-muted)]">
                    Год начала, необязательно
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    value={editor.startYear}
                    placeholder={String(new Date().getFullYear())}
                    aria-label="Год начала"
                    className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent-500)]"
                    onChange={(event) =>
                      setEditor({
                        ...editor,
                        startYear: event.target.value.replace(/\D/g, '').slice(0, 4)
                      })
                    }
                  />
                </label>
              )}
            </div>

            {editorOccurrence && elapsedLabel(editorOccurrence) && (
              <div className="rounded-xl border border-violet-500/15 bg-violet-500/8 px-4 py-3">
                <div className="text-xs text-[var(--app-muted)]">Прошло с начала</div>
                <div className="mt-1 font-semibold text-[var(--app-text)]">
                  {elapsedLabel(editorOccurrence)}
                </div>
              </div>
            )}

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[var(--app-muted)]">
                Заметка именно на{' '}
                {formatOccurrenceDate(
                  editor.kind === 'annual'
                    ? annualOccurrenceDate(editor.occurrenceDate, editor.date)
                    : editor.date
                )}
              </span>
              <textarea
                value={editor.note}
                rows={4}
                maxLength={10_000}
                className="w-full resize-y rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 py-2.5 text-sm leading-6 text-[var(--app-text)] outline-none focus:border-violet-500/45"
                placeholder="Эта заметка не повторится в следующем году"
                onChange={(event) => setEditor({ ...editor, note: event.target.value })}
              />
            </label>

            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--app-text)]">
                <Bell className="size-4 text-violet-300" /> Напоминания
              </div>
              <div className="space-y-2">
                {editor.reminderOffsets.map((offset) => (
                  <div
                    key={offset}
                    className="flex items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 py-2"
                  >
                    <span className="flex items-center gap-2 text-sm text-[var(--app-text)]">
                      <Clock3 className="size-4 text-[var(--app-muted)]" /> {reminderLabel(offset)}
                    </span>
                    <button
                      type="button"
                      aria-label={`Удалить напоминание ${reminderLabel(offset)}`}
                      className="flex size-7 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300"
                      onClick={() =>
                        setEditor({
                          ...editor,
                          reminderOffsets: editor.reminderOffsets.filter((item) => item !== offset)
                        })
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
                {editor.reminderOffsets.length === 0 && (
                  <div className="rounded-xl border border-dashed border-[var(--app-border)] px-3 py-3 text-xs text-[var(--app-muted)]">
                    Напоминаний пока нет
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  type="number"
                  min={0}
                  max={5256000}
                  value={reminderAmount}
                  className="h-10 w-24 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none"
                  onChange={(event) => setReminderAmount(Number(event.target.value))}
                />
                <div className="w-32">
                  <AppSelect
                    value={reminderUnit}
                    options={REMINDER_UNIT_OPTIONS}
                    ariaLabel="Единица напоминания"
                    triggerClassName="h-10 border border-[var(--app-border)]"
                    onValueChange={(value) => setReminderUnit(value as typeof reminderUnit)}
                  />
                </div>
                <button
                  type="button"
                  className="h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm font-medium text-[var(--app-text)] hover:bg-[var(--app-control-hover)]"
                  onClick={addReminder}
                >
                  Добавить напоминание
                </button>
              </div>
              {!editor.time && editor.reminderOffsets.length > 0 && (
                <p className="mt-2 text-xs text-[var(--app-muted)]">
                  Для события без времени напоминания рассчитываются от 09:00 дня события.
                </p>
              )}
            </div>
          </div>
        )}
      </AppDialog>
    </StandardModulePage>
  )
}
