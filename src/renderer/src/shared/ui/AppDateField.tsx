import { Tooltip } from './tooltip'
import * as Popover from '@radix-ui/react-popover'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'

import { cn } from '../lib/cn'
import './AppDateField.css'

interface AppDateFieldProps {
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  calendarButtonLabel?: string
  min?: string
  max?: string
  disabled?: boolean
  className?: string
  inputClassName?: string
}

const weekdayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const

function parseDateKey(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  return date
}

function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function todayKey(): string {
  return toDateKey(new Date())
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

function isWithinBounds(key: string, min?: string, max?: string): boolean {
  if (min && key < min) return false
  if (max && key > max) return false
  return true
}

export function AppDateField({
  value,
  onChange,
  ariaLabel,
  calendarButtonLabel = `Открыть календарь для поля «${ariaLabel}»`,
  min,
  max,
  disabled = false,
  className,
  inputClassName
}: AppDateFieldProps): React.JSX.Element {
  const selectedDate = parseDateKey(value)
  const minDate = useMemo(() => parseDateKey(min), [min])
  const maxDate = useMemo(() => parseDateKey(max), [max])
  const fallbackDate = selectedDate ?? maxDate ?? minDate ?? new Date()
  const [open, setOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(fallbackDate))
  const days = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth])
  const previousMonth = shiftMonth(visibleMonth, -1)
  const nextMonth = shiftMonth(visibleMonth, 1)
  const previousMonthDisabled = minDate ? previousMonth < monthStart(minDate) : false
  const nextMonthDisabled = maxDate ? nextMonth > monthStart(maxDate) : false
  const today = todayKey()
  const todayAllowed = isWithinBounds(today, min, max)

  return (
    <div className={cn('relative min-w-0', className)}>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn(
          'app-date-field-input focus:border-accent-500/45 focus:ring-accent-500/10 h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 pr-11 text-sm text-[var(--app-text)] transition-colors outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-45',
          inputClassName
        )}
        onChange={(event) => onChange(event.target.value)}
      />

      <Popover.Root
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (nextOpen) {
            const reference = parseDateKey(value) ?? maxDate ?? minDate ?? new Date()
            setVisibleMonth(monthStart(reference))
          }
        }}
      >
        <Tooltip content={calendarButtonLabel} side="top">
          <Popover.Trigger asChild>
            <button
              type="button"
              aria-label={calendarButtonLabel}
              disabled={disabled}
              className="hover:text-accent-300 focus-visible:ring-accent-500/35 absolute top-1/2 right-1 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--app-muted)] transition-colors outline-none hover:bg-[var(--app-control-hover)] focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CalendarDays className="size-4" />
            </button>
          </Popover.Trigger>
        </Tooltip>

        <Popover.Portal>
          <Popover.Content
            data-testid="app-date-field-popover"
            align="end"
            sideOffset={7}
            collisionPadding={12}
            className="z-[130] w-[310px] rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-3 shadow-2xl outline-none"
          >
            <div className="flex items-center justify-between gap-2">
              <Tooltip content="Предыдущий месяц" side="top">
                <button
                  type="button"
                  aria-label="Предыдущий месяц"
                  disabled={previousMonthDisabled}
                  className="focus-visible:ring-accent-500/35 flex size-9 items-center justify-center rounded-xl text-[var(--app-muted)] transition-colors outline-none hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                  onClick={() => setVisibleMonth(previousMonth)}
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
                  className="focus-visible:ring-accent-500/35 flex size-9 items-center justify-center rounded-xl text-[var(--app-muted)] transition-colors outline-none hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                  onClick={() => setVisibleMonth(nextMonth)}
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
                const isToday = key === today
                const outsideMonth = !sameMonth(date, visibleMonth)
                const dayDisabled = !isWithinBounds(key, min, max)

                return (
                  <button
                    key={key}
                    type="button"
                    aria-label={`Выбрать ${formatAccessibleDate(date)}`}
                    aria-current={selected ? 'date' : undefined}
                    disabled={dayDisabled}
                    className={cn(
                      'focus-visible:ring-accent-500/35 relative flex size-9 items-center justify-center rounded-xl text-xs font-medium transition-colors outline-none focus-visible:ring-2',
                      selected
                        ? 'bg-accent-500 font-semibold text-white shadow-sm'
                        : 'text-[var(--app-text)] hover:bg-[var(--app-control-hover)]',
                      outsideMonth && !selected && 'text-[var(--app-muted)]/45',
                      dayDisabled && 'cursor-not-allowed opacity-25 hover:bg-transparent',
                      isToday && !selected && 'text-accent-300'
                    )}
                    onClick={() => {
                      onChange(key)
                      setOpen(false)
                    }}
                  >
                    {date.getDate()}
                    {isToday && !selected && (
                      <span className="bg-accent-400 absolute bottom-1 size-1 rounded-full" />
                    )}
                  </button>
                )
              })}
            </div>

            <div className="mt-3 border-t border-[var(--app-border)] pt-3">
              <button
                type="button"
                disabled={!todayAllowed}
                className="bg-accent-500/10 text-accent-200 hover:bg-accent-500/15 focus-visible:ring-accent-500/35 flex h-9 w-full items-center justify-center rounded-xl text-xs font-semibold transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-35"
                onClick={() => {
                  if (!todayAllowed) return
                  onChange(today)
                  setVisibleMonth(monthStart(new Date()))
                  setOpen(false)
                }}
              >
                Сегодня
              </button>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  )
}
