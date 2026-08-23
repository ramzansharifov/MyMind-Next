import { ChevronLeft, ChevronRight, Clock3 } from 'lucide-react'
import { useState } from 'react'

import type { HabitTrackingType } from '../../../../../shared/contracts/habits'

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

  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--app-text)]">
            <Clock3 className="size-4 text-violet-300" />
            {trackingType === 'check' ? 'Предпочтительное время' : 'Предпочтительные времена'}
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
            {trackingType === 'check'
              ? 'Можно указать одно удобное время для выполнения привычки.'
              : 'Для каждой единицы цели можно указать своё время. Поля необязательные.'}
          </p>
        </div>

        {totalPages > 1 && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label="Предыдущие единицы времени"
              disabled={safePage === 0}
              className="flex size-8 items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-35"
              onClick={() => setPage(Math.max(0, safePage - 1))}
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <span className="min-w-16 text-center text-[11px] font-medium text-[var(--app-muted)]">
              {safePage + 1} / {totalPages}
            </span>
            <button
              type="button"
              aria-label="Следующие единицы времени"
              disabled={safePage >= totalPages - 1}
              className="flex size-8 items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-35"
              onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className={trackingType === 'check' ? 'mt-4 max-w-xs' : 'mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3'}>
        {units.map((unit) => (
          <label key={unit} className="block space-y-1.5">
            <span className="text-xs font-medium text-[var(--app-muted)]">
              {trackingType === 'check' ? 'Время' : `Единица ${unit}`}
            </span>
            <input
              type="time"
              value={values[unit] ?? ''}
              aria-label={
                trackingType === 'check'
                  ? 'Предпочтительное время привычки'
                  : `Предпочтительное время для единицы ${unit}`
              }
              className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
              onChange={(event) => onChange(unit, event.target.value)}
            />
          </label>
        ))}
      </div>
    </div>
  )
}
