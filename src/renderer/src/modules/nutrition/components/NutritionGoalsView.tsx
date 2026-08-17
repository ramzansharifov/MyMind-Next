import { Pencil, Settings2 } from 'lucide-react'

import type { NutritionTargetRecord } from '../../../../../shared/contracts/nutrition'
import { formatNutritionNumber } from '../nutrition-utils'
import { NutritionSecondaryButton } from './NutritionFormPrimitives'

export function NutritionGoalsView({
  target,
  onEdit
}: {
  target: NutritionTargetRecord | null
  onEdit: () => void
}): React.JSX.Element {
  const rows: Array<{ label: string; value: number | null; unit: string }> = target
    ? [
        { label: 'Калории', value: target.calories, unit: 'ккал' },
        { label: 'Белки', value: target.proteinG, unit: 'г' },
        { label: 'Жиры', value: target.fatG, unit: 'г' },
        { label: 'Углеводы', value: target.carbsG, unit: 'г' },
        { label: 'Клетчатка', value: target.fiberG, unit: 'г' },
        { label: 'Вода', value: target.waterMl, unit: 'мл' }
      ]
    : []

  return (
    <section className="mt-5">
      <article className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)]">
        <div className="flex items-center justify-between gap-4 max-[600px]:flex-col max-[600px]:items-stretch">
          <h2 className="text-base font-semibold text-[var(--app-text)]">Дневные цели</h2>
          <NutritionSecondaryButton onClick={onEdit}>
            <Pencil className="size-3.5" /> Изменить
          </NutritionSecondaryButton>
        </div>

        {target ? (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((row) => (
                <div
                  key={row.label}
                  className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4"
                >
                  <div className="text-xs text-[var(--app-muted)]">{row.label}</div>
                  <div className="mt-1 text-xl font-semibold text-[var(--app-text)]">
                    {row.value === null
                      ? '—'
                      : `${formatNutritionNumber(row.value, 0)} ${row.unit}`}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-[var(--app-muted)]">
              С {target.effectiveFrom}
              {target.effectiveTo ? ` по ${target.effectiveTo}` : ''}
            </p>
          </>
        ) : (
          <div className="mt-5 flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] text-center">
            <Settings2 className="size-8 text-violet-300" />
            <h3 className="mt-3 font-semibold text-[var(--app-text)]">Цели не заданы</h3>
          </div>
        )}
      </article>
    </section>
  )
}
