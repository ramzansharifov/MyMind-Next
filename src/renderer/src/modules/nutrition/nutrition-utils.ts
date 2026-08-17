import type { NutritionValues } from '../../../../shared/contracts/nutrition'

export const EMPTY_NUTRITION_VALUES: NutritionValues = {
  calories: 0,
  proteinG: 0,
  fatG: 0,
  carbsG: 0,
  fiberG: 0,
  sugarG: 0,
  sodiumMg: 0
}

export function nutritionLocalDateKey(date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

export function shiftNutritionDate(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() + days)
  return nutritionLocalDateKey(date)
}

export function nutritionDaysAgoKey(days: number): string {
  return shiftNutritionDate(nutritionLocalDateKey(), -days)
}

export function formatNutritionDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(`${value}T12:00:00`))
}

export function formatNutritionNumber(value: number, maximumFractionDigits = 1): string {
  return value.toLocaleString('ru-RU', { maximumFractionDigits })
}

export function nutritionValuesLine(values: NutritionValues): string {
  return `${formatNutritionNumber(values.calories, 0)} ккал · Б ${formatNutritionNumber(values.proteinG)} · Ж ${formatNutritionNumber(values.fatG)} · У ${formatNutritionNumber(values.carbsG)}`
}

export function scaleNutritionValues(
  values: NutritionValues,
  factor: number
): NutritionValues {
  return {
    calories: values.calories * factor,
    proteinG: values.proteinG * factor,
    fatG: values.fatG * factor,
    carbsG: values.carbsG * factor,
    fiberG: values.fiberG * factor,
    sugarG: values.sugarG * factor,
    sodiumMg: values.sodiumMg * factor
  }
}

export function nutritionProgress(value: number, target: number | null): number {
  if (!target || target <= 0) return 0
  return Math.min(100, (value / target) * 100)
}

export function nutritionErrorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'Не удалось выполнить действие'
}

export const NUTRITION_INPUT_CLASS_NAME =
  'h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/10'

export const NUTRITION_TEXTAREA_CLASS_NAME =
  'w-full resize-y rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 py-2.5 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/10'
