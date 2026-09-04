import { Bell, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react'
import { useState } from 'react'

import type { HabitTrackingType } from '../../../../../shared/contracts/habits'
import { AppTimeField } from '../../../shared/ui/AppTimeField'
import { Tooltip } from '../../../shared/ui/tooltip'

const PAGE_SIZE = 12

interface HabitPreferredTimesEditorProps {
  trackingType: HabitTrackingType
  targetValue: number
  values: Record<number, string>
  onChange: (unit: number, value: string) => void
}

export function HabitPreferredTimesEditor({
  trackingType,
  targetValue,
  values,
  onChange
}: HabitPreferredTimesEditorProps): React.JSX.Element {
  const [page, setPage] = useState(0)
  const safeTarget = Math.max(1, Math.floor(Number.isFinite(targetValue) ? targetValue : 1))
  const totalPages = trackingType === 'check' ? 1 : Math.max(1, Math.ceil(safeTarget / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const startUnit = safePage * PAGE_SIZE + 1
  const endUnit = trackingType === 'check' ? 1 : Math.min(safeTarget, startUnit + PAGE_SIZE - 1)
  const units = Array.from({ length: endUnit - startUnit + 1 }, (_, index) => startUnit + index)
  const hasPreferredTime = Object.entries(values).some(
    ([unit, time]) => Number(unit) >= 1 && Number(unit) <= safeTarget && Boolean(time)
  )

  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--app-text)]">
          <Clock3 className="text-accent-300 size-4" />
          {trackingType === 'check' ? 'Предпочтительное время' : 'Предпочтительные времена'}
        </div>

        {totalPages > 1 && (
          <div className="flex shrink-0 items-center gap-1">
            <Tooltip content="Предыдущие единицы времени" side="top">
              <button
                type="button"
                aria-label="Предыдущие единицы времени"
                disabled={safePage === 0}
                className="flex size-8 items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-35"
                onClick={() => setPage(Math.max(0, safePage - 1))}
              >
                <ChevronLeft className="size-3.5" />
              </button>
            </Tooltip>
            <span className="min-w-16 text-center text-[11px] font-medium text-[var(--app-muted)]">
              {safePage + 1} / {totalPages}
            </span>
            <Tooltip content="Следующие единицы времени" side="top">
              <button
                type="button"
                aria-label="Следующие единицы времени"
                disabled={safePage >= totalPages - 1}
                className="flex size-8 items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-35"
                onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
              >
                <ChevronRight className="size-3.5" />
              </button>
            </Tooltip>
          </div>
        )}
      </div>

      <div
        className={
          trackingType === 'check'
            ? 'mt-3 max-w-xs'
            : 'mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3'
        }
      >
        {units.map((unit) => (
          <label key={unit} className="block space-y-1.5">
            <span className="text-xs font-medium text-[var(--app-muted)]">
              {trackingType === 'check' ? 'Время' : `Единица ${unit}`}
            </span>
            <AppTimeField
              value={values[unit] ?? ''}
              ariaLabel={
                trackingType === 'check'
                  ? 'Предпочтительное время привычки'
                  : `Предпочтительное время для единицы ${unit}`
              }
              onChange={(value) => onChange(unit, value)}
            />
          </label>
        ))}
      </div>

      {hasPreferredTime && (
        <div className="border-accent-400/15 bg-accent-500/[0.055] mt-3 flex items-center gap-3 rounded-xl border px-3 py-3">
          <span className="border-accent-400/20 bg-accent-500/10 text-accent-200 flex size-8 shrink-0 items-center justify-center rounded-lg border">
            <Bell className="size-4" />
          </span>
          <div className="text-sm font-medium text-[var(--app-text)]">
            Напоминание включено автоматически · за 30 минут
          </div>
        </div>
      )}
    </div>
  )
}
