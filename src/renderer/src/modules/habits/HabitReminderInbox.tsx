import { Bell, Check, Repeat2 } from 'lucide-react'
import { useState } from 'react'

import type { HabitUnreadReminderRecord } from '../../../../shared/contracts/habits'
import { cn } from '../../shared/lib/cn'

function formatDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(year ?? 0, (month ?? 1) - 1, day ?? 1, 12))
}

function progressLabel(reminder: HabitUnreadReminderRecord): string | null {
  if (reminder.targetValue <= 1) return null
  const unit = reminder.habitUnit.trim()
  return `Шаг ${reminder.unit} из ${reminder.targetValue}${unit ? ` · ${unit}` : ''}`
}

interface HabitReminderInboxProps {
  reminders: HabitUnreadReminderRecord[]
  onAcknowledge: (reminder: HabitUnreadReminderRecord) => Promise<void>
  onOpenHabits?: () => void
  className?: string
}

export function HabitReminderInbox({
  reminders,
  onAcknowledge,
  onOpenHabits,
  className
}: HabitReminderInboxProps): React.JSX.Element | null {
  const [busyDeliveryId, setBusyDeliveryId] = useState<string | null>(null)
  if (reminders.length === 0) return null

  async function acknowledge(reminder: HabitUnreadReminderRecord): Promise<void> {
    setBusyDeliveryId(reminder.deliveryId)
    try {
      await onAcknowledge(reminder)
    } finally {
      setBusyDeliveryId(null)
    }
  }

  return (
    <section
      data-testid="habit-reminder-inbox"
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
            <div className="text-sm font-semibold text-[var(--app-text)]">Напоминания привычек</div>
            <div className="text-xs text-[var(--app-muted)]">
              {reminders.length} непрочитанных · исчезнут только после «Понятно»
            </div>
          </div>
        </div>
        {onOpenHabits && (
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
            onClick={onOpenHabits}
          >
            <Repeat2 className="size-3.5" /> Открыть привычки
          </button>
        )}
      </div>

      <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-3">
        {reminders.map((reminder) => {
          const progress = progressLabel(reminder)
          return (
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
                      {formatDate(reminder.occurrenceDate)}, {reminder.preferredTime}
                    </div>
                    <div className="mt-1 text-xs text-[var(--app-muted)]">
                      Напоминание за 30 минут
                    </div>
                    {progress && (
                      <div className="mt-1 text-xs text-[var(--app-muted)]">{progress}</div>
                    )}
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
          )
        })}
      </div>
    </section>
  )
}
