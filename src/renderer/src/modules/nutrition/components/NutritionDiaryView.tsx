import * as Collapsible from '@radix-ui/react-collapsible'
import {
  Braces,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Pencil,
  Settings2,
  Trash2
} from 'lucide-react'
import { useState } from 'react'

import type {
  NutritionLogEntryRecord,
  NutritionMealType,
  NutritionOverview,
  NutritionTargetRecord,
  NutritionValues
} from '../../../../../shared/contracts/nutrition'
import { AppDateField } from '../../../shared/ui/AppDateField'
import { nutritionUnitLabel } from '../nutrition-options'
import {
  formatNutritionDate,
  formatNutritionNumber,
  nutritionLocalDateKey,
  nutritionProgress,
  shiftNutritionDate
} from '../nutrition-utils'

interface NutritionDiaryViewProps {
  overview: NutritionOverview
  selectedDate: string
  target: NutritionTargetRecord | null
  busy: boolean
  onDateChange: (date: string) => void
  onEdit: (entry: NutritionLogEntryRecord) => void
  onDelete: (entry: NutritionLogEntryRecord) => void
  onWaterChange: (delta: number) => void
  onEditTargets: () => void
}

const STANDARD_MEALS: Array<{ value: NutritionMealType; label: string }> = [
  { value: 'breakfast', label: 'Завтрак' },
  { value: 'lunch', label: 'Обед' },
  { value: 'dinner', label: 'Ужин' },
  { value: 'snack', label: 'Перекусы' }
]

export function NutritionDiaryView({
  overview,
  selectedDate,
  target,
  busy,
  onDateChange,
  onEdit,
  onDelete,
  onWaterChange,
  onEditTargets
}: NutritionDiaryViewProps): React.JSX.Element {
  const nutrients = overview.day.nutrients
  const otherEntries = overview.entries.filter((entry) => entry.mealType === 'other')
  const hasEntries = overview.entries.length > 0

  return (
    <section className="mt-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-[var(--app-shadow-card)]">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Предыдущий день"
            className="flex size-9 items-center justify-center rounded-xl text-[var(--app-muted)] hover:bg-[var(--app-control-hover)]"
            onClick={() => onDateChange(shiftNutritionDate(selectedDate, -1))}
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            className="min-w-56 rounded-xl px-3 py-2 text-left hover:bg-[var(--app-control-hover)] max-[520px]:min-w-0"
            onClick={() => onDateChange(nutritionLocalDateKey())}
          >
            <div className="text-sm font-semibold text-[var(--app-text)] capitalize">
              {formatNutritionDate(selectedDate)}
            </div>
            <div className="mt-0.5 text-[11px] text-[var(--app-muted)]">
              {selectedDate === nutritionLocalDateKey()
                ? 'Сегодня'
                : 'Вернуться к сегодняшнему дню'}
            </div>
          </button>
          <button
            type="button"
            aria-label="Следующий день"
            className="flex size-9 items-center justify-center rounded-xl text-[var(--app-muted)] hover:bg-[var(--app-control-hover)]"
            onClick={() => onDateChange(shiftNutritionDate(selectedDate, 1))}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <AppDateField
          value={selectedDate}
          ariaLabel="Дата дневника питания"
          className="w-[155px]"
          onChange={onDateChange}
        />
      </div>

      <DaySummary
        nutrients={nutrients}
        target={target}
        waterMl={overview.day.waterMl}
        busy={busy}
        onWaterChange={onWaterChange}
        onEditTargets={onEditTargets}
      />

      {!hasEntries && (
        <div className="rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] px-5 py-10 text-center">
          <span className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
            <Braces className="size-5" />
          </span>
          <h2 className="mt-3 text-sm font-semibold text-[var(--app-text)]">
            Питание пока не добавлено
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[var(--app-muted)]">
            Получите JSON у вашего GPT, вставьте его в MyMind и проверьте данные перед сохранением.
          </p>
        </div>
      )}

      {hasEntries && (
        <div className="space-y-2">
          {STANDARD_MEALS.map((meal) => (
            <MealRow
              key={meal.value}
              mealType={meal.value}
              label={meal.label}
              entries={overview.entries.filter((entry) => entry.mealType === meal.value)}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
          {otherEntries.length > 0 && (
            <MealRow
              mealType="other"
              label="Другие приёмы пищи"
              entries={otherEntries}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          )}
        </div>
      )}
    </section>
  )
}

function DaySummary({
  nutrients,
  target,
  waterMl,
  busy,
  onWaterChange,
  onEditTargets
}: {
  nutrients: NutritionValues
  target: NutritionTargetRecord | null
  waterMl: number
  busy: boolean
  onWaterChange: (delta: number) => void
  onEditTargets: () => void
}): React.JSX.Element {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const calorieTarget = target?.calories ?? null

  return (
    <article className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-[var(--app-muted)]">За день</div>
          <div className="mt-1 flex items-baseline gap-2">
            <strong className="text-3xl font-semibold tracking-tight text-[var(--app-text)]">
              {formatNutritionNumber(nutrients.calories, 0)}
            </strong>
            <span className="text-sm text-[var(--app-muted)]">
              {calorieTarget ? `/ ${formatNutritionNumber(calorieTarget, 0)} ккал` : 'ккал'}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-medium text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
          onClick={onEditTargets}
        >
          <Settings2 className="size-4" /> Настроить цели
        </button>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--app-workspace)]">
        <div
          className="h-full rounded-full bg-violet-400 transition-[width]"
          style={{ width: `${nutritionProgress(nutrients.calories, calorieTarget)}%` }}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MacroStat label="Белки" value={nutrients.proteinG} target={target?.proteinG ?? null} />
        <MacroStat label="Жиры" value={nutrients.fatG} target={target?.fatG ?? null} />
        <MacroStat label="Углеводы" value={nutrients.carbsG} target={target?.carbsG ?? null} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--app-border)] pt-4">
        <span className="flex size-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
          <Droplets className="size-4" />
        </span>
        <div className="min-w-36 flex-1">
          <div className="text-sm font-semibold text-[var(--app-text)]">
            {waterMl} мл{target?.waterMl ? ` / ${target.waterMl} мл` : ''}
          </div>
          <div className="mt-1.5 h-1.5 max-w-sm overflow-hidden rounded-full bg-[var(--app-workspace)]">
            <div
              className="h-full rounded-full bg-cyan-400"
              style={{ width: `${nutritionProgress(waterMl, target?.waterMl ?? null)}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          disabled={busy}
          className="h-9 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-xs font-medium text-[var(--app-text)] hover:bg-[var(--app-control-hover)] disabled:opacity-45"
          onClick={() => onWaterChange(250)}
        >
          +250 мл
        </button>
        {waterMl > 0 && (
          <button
            type="button"
            disabled={busy}
            className="h-9 rounded-xl px-2.5 text-xs text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] disabled:opacity-45"
            onClick={() => onWaterChange(-250)}
          >
            −250
          </button>
        )}
      </div>

      <Collapsible.Root open={detailsOpen} onOpenChange={setDetailsOpen}>
        <Collapsible.Trigger asChild>
          <button
            type="button"
            className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
          >
            Подробнее
            <ChevronDown
              className={`size-3.5 transition-transform ${detailsOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <SmallStat label="Клетчатка" value={`${formatNutritionNumber(nutrients.fiberG)} г`} />
            <SmallStat label="Сахар" value={`${formatNutritionNumber(nutrients.sugarG)} г`} />
            <SmallStat
              label="Натрий"
              value={`${formatNutritionNumber(nutrients.sodiumMg, 0)} мг`}
            />
          </div>
        </Collapsible.Content>
      </Collapsible.Root>
    </article>
  )
}

function MacroStat({
  label,
  value,
  target
}: {
  label: string
  value: number
  target: number | null
}): React.JSX.Element {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-[var(--app-text)]">{label}</span>
        <span className="text-[var(--app-muted)]">
          {formatNutritionNumber(value)}
          {target ? ` / ${formatNutritionNumber(target)}` : ''} г
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--app-workspace)]">
        <div
          className="h-full rounded-full bg-violet-400/80"
          style={{ width: `${nutritionProgress(value, target)}%` }}
        />
      </div>
    </div>
  )
}

function SmallStat({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="rounded-xl bg-[var(--app-workspace)] px-3 py-2.5">
      <div className="text-[10px] text-[var(--app-muted)]">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-[var(--app-text)]">{value}</div>
    </div>
  )
}

function MealRow({
  mealType,
  label,
  entries,
  onEdit,
  onDelete
}: {
  mealType: NutritionMealType
  label: string
  entries: NutritionLogEntryRecord[]
  onEdit: (entry: NutritionLogEntryRecord) => void
  onDelete: (entry: NutritionLogEntryRecord) => void
}): React.JSX.Element {
  const calories = entries.reduce((sum, entry) => sum + entry.nutrients.calories, 0)

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)]">
      <header className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-[var(--app-text)]">{label}</h2>
          <p className="mt-0.5 text-[11px] text-[var(--app-muted)]">
            {entries.length > 0 ? `${formatNutritionNumber(calories, 0)} ккал` : 'Нет записей'}
          </p>
        </div>
      </header>

      {entries.length > 0 && (
        <div className="border-t border-[var(--app-border)]">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="group flex items-center gap-3 border-b border-[var(--app-border)] px-4 py-2.5 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-[var(--app-text)]">
                  {entry.title}
                </div>
                <p className="mt-0.5 truncate text-[11px] text-[var(--app-muted)]">
                  {formatNutritionNumber(entry.amount)} {nutritionUnitLabel(entry.unit)} ·{' '}
                  {formatNutritionNumber(entry.nutrients.calories, 0)} ккал · Б{' '}
                  {formatNutritionNumber(entry.nutrients.proteinG)} · Ж{' '}
                  {formatNutritionNumber(entry.nutrients.fatG)} · У{' '}
                  {formatNutritionNumber(entry.nutrients.carbsG)}
                  {mealType === 'other' && entry.customMealName ? ` · ${entry.customMealName}` : ''}
                </p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                <button
                  type="button"
                  aria-label={`Изменить «${entry.title}»`}
                  className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)]"
                  onClick={() => onEdit(entry)}
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Удалить «${entry.title}»`}
                  className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300"
                  onClick={() => onDelete(entry)}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
