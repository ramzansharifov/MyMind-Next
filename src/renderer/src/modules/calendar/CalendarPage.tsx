import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
  Repeat2,
  Trash2
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type {
  CalendarEventKind,
  CalendarOccurrenceRecord
} from '../../../../shared/contracts/calendar'
import { ModuleHeader } from '../../shared/ui/ModuleHeader'
import { StandardModulePage } from '../../shared/ui/StandardModulePage'
import { AppDialog } from '../../shared/ui/AppDialog'
import { cn } from '../../shared/lib/cn'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const MONTH_FORMATTER = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' })
const DAY_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric'
})

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
  startDate: string
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
    startDate: '',
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
    startDate: event.startDate ?? '',
    note: event.note,
    reminderOffsets: event.reminderOffsets
  }
}

export function CalendarPage(): React.JSX.Element {
  const today = dateKey(new Date())
  const [month, setMonth] = useState(() => monthKey(new Date()))
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
    return map
  }, [events])

  function shiftMonth(delta: number): void {
    const date = parseDate(month)
    date.setMonth(date.getMonth() + delta)
    setMonth(monthKey(date))
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
      const input = {
        title: editor.title.trim(),
        kind: editor.kind,
        date: editor.date,
        time: editor.time || null,
        startDate: editor.kind === 'annual' && editor.startDate ? editor.startDate : null,
        note: editor.note,
        reminderOffsets: editor.reminderOffsets
      }
      if (editor.eventId) {
        await window.api.calendar.updateEvent({
          ...input,
          id: editor.eventId,
          occurrenceDate: editor.occurrenceDate
        })
      } else {
        await window.api.calendar.createEvent(input)
      }
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
        description="События, ежегодные даты и гибкие напоминания."
        actions={
          <button
            type="button"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-400"
            onClick={() => setEditor(emptyEditor(today))}
          >
            <Plus className="size-4" /> Новое событие
          </button>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-1.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Предыдущий месяц"
              className="flex size-9 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
              onClick={() => shiftMonth(-1)}
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              className="h-9 rounded-lg px-3 text-sm font-medium text-[var(--app-text)] hover:bg-[var(--app-control-hover)]"
              onClick={() => setMonth(monthKey(new Date()))}
            >
              Сегодня
            </button>
            <button
              type="button"
              aria-label="Следующий месяц"
              className="flex size-9 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
              onClick={() => shiftMonth(1)}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <strong className="px-3 text-sm text-[var(--app-text)] capitalize">
            {MONTH_FORMATTER.format(parseDate(month))}
          </strong>
        </div>
      </ModuleHeader>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <section className="mt-5 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)]">
        <div className="grid grid-cols-7 border-b border-[var(--app-border)] bg-[var(--app-workspace)]">
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
          {range.days.map((day) => {
            const inMonth = day.slice(0, 7) === month.slice(0, 7)
            const dayEvents = eventsByDay.get(day) ?? []
            const isToday = day === today
            return (
              <div
                key={day}
                className={cn(
                  'group min-h-28 border-r border-b border-[var(--app-border)] p-2 transition-colors last:border-r-0 hover:bg-[var(--app-card-hover)]',
                  !inMonth && 'bg-[var(--app-workspace)]/45'
                )}
                onDoubleClick={() => setEditor(emptyEditor(day))}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <button
                    type="button"
                    aria-label={`Добавить событие ${formatOccurrenceDate(day)}`}
                    className={cn(
                      'flex size-7 items-center justify-center rounded-full text-xs font-medium',
                      isToday
                        ? 'bg-violet-500 font-semibold text-white'
                        : inMonth
                          ? 'text-[var(--app-text)] hover:bg-[var(--app-control-hover)]'
                          : 'text-[var(--app-muted)]'
                    )}
                    onClick={() => setEditor(emptyEditor(day))}
                  >
                    {Number(day.slice(-2))}
                  </button>
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 4).map((event) => (
                    <button
                      key={`${event.eventId}:${event.occurrenceDate}`}
                      type="button"
                      className="flex w-full items-center gap-1.5 rounded-lg border border-violet-500/15 bg-violet-500/10 px-2 py-1 text-left text-[11px] text-violet-200 transition-colors hover:bg-violet-500/15"
                      onClick={() => setEditor(editorFromOccurrence(event))}
                    >
                      {event.kind === 'annual' && <Repeat2 className="size-3 shrink-0" />}
                      <span className="truncate">
                        {event.time ? `${event.time} ` : ''}
                        {event.title}
                      </span>
                    </button>
                  ))}
                  {dayEvents.length > 4 && (
                    <div className="px-1 text-[10px] text-[var(--app-muted)]">
                      +{dayEvents.length - 4} ещё
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {loading && (
          <div className="px-4 py-3 text-xs text-[var(--app-muted)]">Обновление календаря…</div>
        )}
      </section>

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
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-[var(--app-muted)]">
                  Тип события
                </span>
                <select
                  value={editor.kind}
                  className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none"
                  onChange={(event) =>
                    setEditor({ ...editor, kind: event.target.value as CalendarEventKind })
                  }
                >
                  <option value="one_time">Одноразовое</option>
                  <option value="annual">Ежегодное</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-[var(--app-muted)]">
                  Дата
                </span>
                <input
                  type="date"
                  value={editor.date}
                  className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none"
                  onChange={(event) => setEditor({ ...editor, date: event.target.value })}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-[var(--app-muted)]">
                  Время, необязательно
                </span>
                <input
                  type="time"
                  value={editor.time}
                  className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none"
                  onChange={(event) => setEditor({ ...editor, time: event.target.value })}
                />
              </label>
              {editor.kind === 'annual' && (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-[var(--app-muted)]">
                    Начало даты, необязательно
                  </span>
                  <input
                    type="date"
                    value={editor.startDate}
                    className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none"
                    onChange={(event) => setEditor({ ...editor, startDate: event.target.value })}
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
                Заметка именно на {formatOccurrenceDate(editor.occurrenceDate)}
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
                <select
                  value={reminderUnit}
                  className="h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none"
                  onChange={(event) => setReminderUnit(event.target.value as typeof reminderUnit)}
                >
                  <option value="minutes">минут</option>
                  <option value="hours">часов</option>
                  <option value="days">дней</option>
                  <option value="weeks">недель</option>
                </select>
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
