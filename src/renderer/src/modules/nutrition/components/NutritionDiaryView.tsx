import {
  Apple,
  Beef,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Flame,
  Leaf,
  Pencil,
  Plus,
  Trash2,
  Utensils,
  Wheat,
  type LucideIcon
} from 'lucide-react'

import type {
  NutritionLogEntryRecord,
  NutritionMealType,
  NutritionOverview,
  NutritionTargetRecord,
  NutritionValues
} from '../../../../../shared/contracts/nutrition'
import { NUTRITION_MEAL_OPTIONS, nutritionUnitLabel } from '../nutrition-options'
import {
  formatNutritionDate,
  formatNutritionNumber,
  nutritionLocalDateKey,
  nutritionProgress,
  nutritionValuesLine,
  shiftNutritionDate
} from '../nutrition-utils'
import { NutritionSecondaryButton } from './NutritionFormPrimitives'

interface NutritionDiaryViewProps {
  overview: NutritionOverview
  selectedDate: string
  target: NutritionTargetRecord | null
  busy: boolean
  onDateChange: (date: string) => void
  onAdd: (mealType: NutritionMealType) => void
  onEdit: (entry: NutritionLogEntryRecord) => void
  onDelete: (entry: NutritionLogEntryRecord) => void
  onWaterChange: (delta: number) => void
}

export function NutritionDiaryView({
  overview,
  selectedDate,
  target,
  busy,
  onDateChange,
  onAdd,
  onEdit,
  onDelete,
  onWaterChange
}: NutritionDiaryViewProps): React.JSX.Element {
  const nutrients = overview.day.nutrients
  const meals = NUTRITION_MEAL_OPTIONS.map((meal) => ({
    ...meal,
    entries: overview.entries.filter((entry) => entry.mealType === meal.value)
  }))

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
            className="min-w-64 rounded-xl px-3 py-2 text-left hover:bg-[var(--app-control-hover)] max-[520px]:min-w-0"
            onClick={() => onDateChange(nutritionLocalDateKey())}
          >
            <div className="text-sm font-semibold capitalize text-[var(--app-text)]">
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
        <input
          type="date"
          aria-label="Дата дневника питания"
          value={selectedDate}
          className="h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none"
          onChange={(event) => onDateChange(event.target.value)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <NutrientProgressCard
          label="Калории"
          value={nutrients.calories}
          target={target?.calories ?? null}
          unit="ккал"
          icon={Flame}
        />
        <NutrientProgressCard
          label="Белки"
          value={nutrients.proteinG}
          target={target?.proteinG ?? null}
          unit="г"
          icon={Beef}
        />
        <NutrientProgressCard
          label="Жиры"
          value={nutrients.fatG}
          target={target?.fatG ?? null}
          unit="г"
          icon={Leaf}
        />
        <NutrientProgressCard
          label="Углеводы"
          value={nutrients.carbsG}
          target={target?.carbsG ?? null}
          unit="г"
          icon={Wheat}
        />
        <NutrientProgressCard
          label="Клетчатка"
          value={nutrients.fiberG}
          target={target?.fiberG ?? null}
          unit="г"
          icon={Apple}
        />
      </div>

      <WaterCard
        value={overview.day.waterMl}
        target={target?.waterMl ?? null}
        busy={busy}
        onChange={onWaterChange}
      />

      <div className="grid items-start gap-4 xl:grid-cols-2">
        {meals.map((meal) => (
          <MealCard
            key={meal.value}
            mealType={meal.value}
            label={meal.label}
            entries={meal.entries}
            onAdd={() => onAdd(meal.value)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  )
}

function NutrientProgressCard({
  label,
  value,
  target,
  unit,
  icon: Icon
}: {
  label: string
  value: number
  target: number | null
  unit: string
  icon: LucideIcon
}): React.JSX.Element {
  return (
    <article className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[var(--app-muted)]">{label}</span>
        <Icon className="size-4 text-violet-300" />
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <strong className="text-xl font-semibold text-[var(--app-text)]">
          {formatNutritionNumber(value, label === 'Калории' ? 0 : 1)}
        </strong>
        <span className="text-xs text-[var(--app-muted)]">{unit}</span>
      </div>
      {target ? (
        <>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--app-workspace)]">
            <div
              className="h-full rounded-full bg-violet-400"
              style={{ width: `${nutritionProgress(value, target)}%` }}
            />
          </div>
          <div className="mt-1.5 text-[10px] text-[var(--app-muted)]">
            Цель {formatNutritionNumber(target, 0)} {unit}
          </div>
        </>
      ) : (
        <div className="mt-3 text-[10px] text-[var(--app-muted)]">Цель не задана</div>
      )}
    </article>
  )
}

function WaterCard({
  value,
  target,
  busy,
  onChange
}: {
  value: number
  target: number | null
  busy: boolean
  onChange: (delta: number) => void
}): React.JSX.Element {
  return (
    <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]">
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex size-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
          <Droplets className="size-5" />
        </span>
        <div className="min-w-40 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold text-[var(--app-text)]">{value} мл</span>
            {target && <span className="text-xs text-[var(--app-muted)]">из {target} мл</span>}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--app-workspace)]">
            <div
              className="h-full rounded-full bg-cyan-400"
              style={{ width: `${nutritionProgress(value, target)}%` }}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <NutritionSecondaryButton
            disabled={busy || value === 0}
            onClick={() => onChange(-250)}
          >
            −250 мл
          </NutritionSecondaryButton>
          <NutritionSecondaryButton disabled={busy} onClick={() => onChange(250)}>
            +250 мл
          </NutritionSecondaryButton>
          <NutritionSecondaryButton disabled={busy} onClick={() => onChange(500)}>
            +500 мл
          </NutritionSecondaryButton>
        </div>
      </div>
    </section>
  )
}

function MealCard({
  mealType,
  label,
  entries,
  onAdd,
  onEdit,
  onDelete
}: {
  mealType: NutritionMealType
  label: string
  entries: NutritionLogEntryRecord[]
  onAdd: () => void
  onEdit: (entry: NutritionLogEntryRecord) => void
  onDelete: (entry: NutritionLogEntryRecord) => void
}): React.JSX.Element {
  const totals: NutritionValues = entries.reduce(
    (sum, entry) => ({
      calories: sum.calories + entry.nutrients.calories,
      proteinG: sum.proteinG + entry.nutrients.proteinG,
      fatG: sum.fatG + entry.nutrients.fatG,
      carbsG: sum.carbsG + entry.nutrients.carbsG,
      fiberG: sum.fiberG + entry.nutrients.fiberG,
      sugarG: sum.sugarG + entry.nutrients.sugarG,
      sodiumMg: sum.sodiumMg + entry.nutrients.sodiumMg
    }),
    {
      calories: 0,
      proteinG: 0,
      fatG: 0,
      carbsG: 0,
      fiberG: 0,
      sugarG: 0,
      sodiumMg: 0
    }
  )

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)]">
      <header className="flex items-center gap-3 border-b border-[var(--app-border)] px-4 py-3">
        <span className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
          <Utensils className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-[var(--app-text)]">{label}</h2>
          <p className="mt-0.5 text-[11px] text-[var(--app-muted)]">
            {formatNutritionNumber(totals.calories, 0)} ккал · {entries.length} поз.
          </p>
        </div>
        <button
          type="button"
          aria-label={`Добавить в ${label.toLowerCase()}`}
          className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300 hover:bg-violet-500/15"
          onClick={onAdd}
        >
          <Plus className="size-4" />
        </button>
      </header>

      {entries.length === 0 ? (
        <div className="px-4 py-8 text-center text-xs text-[var(--app-muted)]">
          Пока ничего не добавлено
        </div>
      ) : (
        <div className="divide-y divide-[var(--app-border)]">
          {entries.map((entry) => (
            <div key={entry.id} className="group flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold text-[var(--app-text)]">
                    {entry.title}
                  </span>
                  {mealType === 'other' && entry.customMealName && (
                    <span className="rounded-md bg-[var(--app-control)] px-1.5 py-0.5 text-[10px] text-[var(--app-muted)]">
                      {entry.customMealName}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-[var(--app-muted)]">
                  {formatNutritionNumber(entry.amount)} {nutritionUnitLabel(entry.unit)} ·{' '}
                  {nutritionValuesLine(entry.nutrients)}
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
