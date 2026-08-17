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
    <section className="mt-5 grid items-start gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <article className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)]">
        <div className="flex items-start justify-between gap-4 max-[600px]:flex-col">
          <div>
            <h2 className="text-base font-semibold text-[var(--app-text)]">Дневные ориентиры</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--app-muted)]">
              Цели задаются вручную. Изменение создаёт новый период, поэтому прошлый месяц не пересчитывается по сегодняшним значениям.
            </p>
          </div>
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
              Действует с {target.effectiveFrom}
              {target.effectiveTo ? ` по ${target.effectiveTo}` : ''}
            </p>
          </>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-[var(--app-border)] px-6 py-10 text-center">
            <Settings2 className="mx-auto size-8 text-violet-300" />
            <h3 className="mt-3 font-semibold text-[var(--app-text)]">Цели пока не заданы</h3>
            <p className="mt-1 text-sm text-[var(--app-muted)]">
              Дневник работает и без целей — их можно добавить позже.
            </p>
          </div>
        )}
      </article>

      <article className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)]">
        <h2 className="text-sm font-semibold text-[var(--app-text)]">Почему цели хранятся периодами</h2>
        <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--app-muted)]">
          <p>У каждого периода есть дата начала и, при необходимости, дата окончания.</p>
          <p>Если вставить новую цель между двумя существующими периодами, будущая цель сохранится.</p>
          <p>Отчёт сравнивает каждый день с тем ориентиром, который действовал именно в этот день.</p>
          <p>Приложение не назначает медицинские или диетологические нормы автоматически.</p>
        </div>
      </article>
    </section>
  )
}
