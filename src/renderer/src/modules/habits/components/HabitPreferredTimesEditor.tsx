import { Tooltip } from '../../../shared/ui/tooltip'
import * as Switch from '@radix-ui/react-switch'
import { Bell, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react'
import { useState } from 'react'

import type { HabitTrackingType } from '../../../../../shared/contracts/habits'
import { AppTimeField } from '../../../shared/ui/AppTimeField'

const PAGE_SIZE = 12

interface HabitPreferredTimesEditorProps {
  trackingType: HabitTrackingType
  targetValue: number
  values: Record<number, string>
  remindersEnabled?: boolean
  onChange: (unit: number, value: string) => void
  onRemindersChange?: (enabled: boolean) => void
}

export function HabitPreferredTimesEditor({
  trackingType,
  targetValue,
  values,
  remindersEnabled = false,
  onChange,
  onRemindersChange = () => undefined
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
            ? 'mt-4 max-w-xs'
            : 'mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3'
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
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-violet-400/15 bg-violet-500/[0.055] px-3 py-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-violet-400/20 bg-violet-500/10 text-violet-200">
            <Bell className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-[var(--app-text)]">Напоминания</div>
            <div className="mt-0.5 text-xs leading-5 text-[var(--app-muted)]">
              За 30 минут до каждого указанного предпочтительного времени.
            </div>
          </div>
          <Switch.Root
            checked={remindersEnabled}
            aria-label="Напоминать о привычке за 30 минут"
            className="relative h-6 w-11 shrink-0 rounded-full border border-[var(--app-border)] bg-[var(--app-control)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 data-[state=checked]:border-violet-400/40 data-[state=checked]:bg-violet-500"
            onCheckedChange={onRemindersChange}
          >
            <Switch.Thumb className="block size-4 translate-x-1 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-5" />
          </Switch.Root>
        </div>
      )}
    </div>
  )
}
