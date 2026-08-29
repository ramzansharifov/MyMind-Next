import { Bell, CalendarDays, Check } from 'lucide-react'
import { useState } from 'react'

import type { CalendarUnreadReminderRecord } from '../../../../shared/contracts/calendar'
import { cn } from '../../shared/lib/cn'

function formatDateTime(date: string, time: string | null): string {
  const [year, month, day] = date.split('-').map(Number)
  const label = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(year ?? 0, (month ?? 1) - 1, day ?? 1, 12))
  return time ? `${label}, ${time}` : label
}

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

interface CalendarReminderInboxProps {
  reminders: CalendarUnreadReminderRecord[]
  onAcknowledge: (reminder: CalendarUnreadReminderRecord) => Promise<void>
  onOpenCalendar?: () => void
  className?: string
}

export function CalendarReminderInbox({
  reminders,
  onAcknowledge,
  onOpenCalendar,
  className
}: CalendarReminderInboxProps): React.JSX.Element | null {
  const [busyDeliveryId, setBusyDeliveryId] = useState<string | null>(null)
  if (reminders.length === 0) return null

  async function acknowledge(reminder: CalendarUnreadReminderRecord): Promise<void> {
    setBusyDeliveryId(reminder.deliveryId)
    try {
      await onAcknowledge(reminder)
    } finally {
      setBusyDeliveryId(null)
    }
  }

  return (
    <section
      data-testid="calendar-reminder-inbox"
      className={cn(
        'rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]',
        className
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex size-8 items-center justify-center rounded-xl bg-red-500/10 text-red-300">
            <Bell className="size-4" />
            <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-red-500 ring-2 ring-[var(--app-surface)]" />
          </span>
          <div>
            <div className="text-sm font-semibold text-[var(--app-text)]">
              Напоминания календаря
            </div>
            <div className="text-xs text-[var(--app-muted)]">
              {reminders.length} непрочитанных · исчезнут только после «Понятно»
            </div>
          </div>
        </div>
        {onOpenCalendar && (
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
            onClick={onOpenCalendar}
          >
            <CalendarDays className="size-3.5" /> Открыть календарь
          </button>
        )}
      </div>

      <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-3">
        {reminders.map((reminder) => (
          <article
            key={reminder.deliveryId}
            className="flex min-w-0 flex-col gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-red-500" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[var(--app-text)]">
                    {reminder.title}
                  </div>
                  <div className="mt-1 text-xs text-[var(--app-muted)]">
                    {formatDateTime(reminder.occurrenceDate, reminder.eventTime)}
                  </div>
                  <div className="mt-1 text-xs text-[var(--app-muted)]">
                    {offsetLabel(reminder.offsetMinutes)}
                  </div>
                </div>
              </div>
            </div>
            <button
              type="button"
              disabled={busyDeliveryId === reminder.deliveryId}
              className="inline-flex h-9 items-center justify-center gap-1.5 self-end rounded-xl bg-[var(--app-accent-500)] px-3 text-xs font-semibold text-white transition-opacity disabled:opacity-50"
              onClick={() => void acknowledge(reminder)}
            >
              <Check className="size-3.5" /> Понятно
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
