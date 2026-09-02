import { Tooltip } from '../../../shared/ui/tooltip'
import * as Popover from '@radix-ui/react-popover'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'

import { cn } from '../../../shared/lib/cn'

interface HabitDatePickerProps {
  value: string
  max: string
  onChange: (value: string) => void
}

const weekdayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const

function parseDateKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDisplayDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(parseDateKey(value))
}

function formatAccessibleDate(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date)
}

function formatMonth(date: Date): string {
  const label = new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric'
  }).format(date)
  return label.charAt(0).toLocaleUpperCase('ru-RU') + label.slice(1)
}

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12)
}

function shiftMonth(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1, 12)
}

function buildCalendarDays(month: Date): Date[] {
  const first = monthStart(month)
  const mondayOffset = (first.getDay() + 6) % 7
  const gridStart = new Date(first)
  gridStart.setDate(first.getDate() - mondayOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    return date
  })
}

function sameMonth(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth()
}

export function HabitDatePicker({ value, max, onChange }: HabitDatePickerProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(parseDateKey(value)))
  const maxDate = useMemo(() => parseDateKey(max), [max])
  const days = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth])
  const nextMonthDisabled = shiftMonth(visibleMonth, 1) > monthStart(maxDate)

  return (
    <Popover.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) setVisibleMonth(monthStart(parseDateKey(value)))
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Открыть календарь привычек"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm font-medium text-[var(--app-text)] transition-colors outline-none hover:bg-[var(--app-control-hover)] focus-visible:ring-2 focus-visible:ring-violet-500/35"
        >
          <CalendarDays className="size-4 text-violet-300" />
          <span>{formatDisplayDate(value)}</span>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          data-testid="habit-date-picker-popover"
          align="start"
          sideOffset={7}
          collisionPadding={12}
          className="z-[130] w-[310px] rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-2xl outline-none"
        >
          <div className="flex items-center justify-between gap-2">
            <Tooltip content="Предыдущий месяц" side="top">
              <button
                type="button"
                aria-label="Предыдущий месяц"
                className="flex size-9 items-center justify-center rounded-xl text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-violet-500/35 focus-visible:outline-none"
                onClick={() => setVisibleMonth((current) => shiftMonth(current, -1))}
              >
                <ChevronLeft className="size-4" />
              </button>
            </Tooltip>
            <div className="text-sm font-semibold text-[var(--app-text)]">
              {formatMonth(visibleMonth)}
            </div>
            <Tooltip content="Следующий месяц" side="top">
              <button
                type="button"
                aria-label="Следующий месяц"
                disabled={nextMonthDisabled}
                className="flex size-9 items-center justify-center rounded-xl text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-violet-500/35 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                onClick={() => setVisibleMonth((current) => shiftMonth(current, 1))}
              >
                <ChevronRight className="size-4" />
              </button>
            </Tooltip>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 px-0.5">
            {weekdayLabels.map((weekday) => (
              <div
                key={weekday}
                className="flex h-7 items-center justify-center text-[10px] font-semibold tracking-[0.08em] text-[var(--app-muted)] uppercase"
              >
                {weekday}
              </div>
            ))}

            {days.map((date) => {
              const key = toDateKey(date)
              const selected = key === value
              const isToday = key === max
              const outsideMonth = !sameMonth(date, visibleMonth)
              const disabled = date > maxDate

              return (
                <button
                  key={key}
                  type="button"
                  aria-label={`Выбрать ${formatAccessibleDate(date)}`}
                  aria-current={selected ? 'date' : undefined}
                  disabled={disabled}
                  className={cn(
                    'relative flex size-9 items-center justify-center rounded-xl text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-violet-500/35',
                    selected
                      ? 'bg-violet-500 font-semibold text-white shadow-sm'
                      : 'text-[var(--app-text)] hover:bg-[var(--app-control-hover)]',
                    outsideMonth && !selected && 'text-[var(--app-muted)]/45',
                    disabled && 'cursor-not-allowed opacity-25 hover:bg-transparent',
                    isToday && !selected && 'text-violet-300'
                  )}
                  onClick={() => {
                    onChange(key)
                    setOpen(false)
                  }}
                >
                  {date.getDate()}
                  {isToday && !selected && (
                    <span className="absolute bottom-1 size-1 rounded-full bg-violet-400" />
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-3 border-t border-[var(--app-border)] pt-3">
            <button
              type="button"
              className="flex h-9 w-full items-center justify-center rounded-xl bg-violet-500/10 text-xs font-semibold text-violet-200 transition-colors hover:bg-violet-500/15 focus-visible:ring-2 focus-visible:ring-violet-500/35 focus-visible:outline-none"
              onClick={() => {
                onChange(max)
                setVisibleMonth(monthStart(maxDate))
                setOpen(false)
              }}
            >
              Сегодня
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
