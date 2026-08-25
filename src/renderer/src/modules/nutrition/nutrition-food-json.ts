import type { CreateNutritionFoodInput } from '../../../../shared/contracts/nutrition'
import { createNutritionFoodInputSchema } from '../../../../shared/validation/nutrition'

export interface NutritionFoodsJsonParseResult {
  foods: CreateNutritionFoodInput[]
  error: string | null
}

export const NUTRITION_FOODS_JSON_EXAMPLE = `[
  {
    "name": "Куриное филе приготовленное",
    "category": "protein",
    "baseAmount": 100,
    "baseUnit": "g",
    "calories": 165,
    "proteinG": 31,
    "fatG": 3.6,
    "carbsG": 0
  },
  {
    "name": "Гречка варёная",
    "category": "grains",
    "baseAmount": 100,
    "baseUnit": "g",
    "nutrients": {
      "calories": 92,
      "proteinG": 3.4,
      "fatG": 0.6,
      "carbsG": 19.9,
      "fiberG": 2.7,
      "sugarG": 0.9,
      "sodiumMg": 4
    }
  }
]`

function stripCodeFence(value: string): string {
  const trimmed = value.trim()
  if (!trimmed.startsWith('```')) return trimmed
  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

function firstDefined(...values: unknown[]): unknown {
  return values.find((value) => value !== undefined)
}

function normalizedCandidate(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value

  const source = value as Record<string, unknown>
  const nutrients =
    source.nutrients && typeof source.nutrients === 'object' && !Array.isArray(source.nutrients)
      ? (source.nutrients as Record<string, unknown>)
      : {}

  return {
    name: source.name,
    brand: source.brand ?? '',
    category: source.category ?? 'other',
    baseAmount: source.baseAmount ?? 100,
    baseUnit: source.baseUnit ?? source.unit ?? 'g',
    nutrients: {
      calories: firstDefined(nutrients.calories, source.calories, source.kcal, 0),
      proteinG: firstDefined(nutrients.proteinG, source.proteinG, source.protein, 0),
      fatG: firstDefined(nutrients.fatG, source.fatG, source.fat, 0),
      carbsG: firstDefined(nutrients.carbsG, source.carbsG, source.carbs, 0),
      fiberG: firstDefined(nutrients.fiberG, source.fiberG, source.fiber, 0),
      sugarG: firstDefined(nutrients.sugarG, source.sugarG, source.sugar, 0),
      sodiumMg: firstDefined(nutrients.sodiumMg, source.sodiumMg, source.sodium, 0)
    },
    notes: source.notes ?? ''
  }
}

function formatIssue(index: number, path: PropertyKey[], message: string): string {
  const field = path.length > 0 ? ` · ${path.map(String).join('.')}` : ''
  return `Продукт ${index + 1}${field}: ${message}`
}

export function parseNutritionFoodsJson(value: string): NutritionFoodsJsonParseResult {
  const source = stripCodeFence(value)
  if (!source) return { foods: [], error: null }

  let parsed: unknown
  try {
    parsed = JSON.parse(source) as unknown
  } catch {
    return { foods: [], error: 'JSON содержит синтаксическую ошибку' }
  }

  const candidates = Array.isArray(parsed) ? parsed : [parsed]
  if (candidates.length === 0) return { foods: [], error: 'Массив продуктов пуст' }
  if (candidates.length > 300) {
    return { foods: [], error: 'За один раз можно добавить до 300 продуктов' }
  }

  const foods: CreateNutritionFoodInput[] = []
  for (const [index, candidate] of candidates.entries()) {
    const result = createNutritionFoodInputSchema.safeParse(normalizedCandidate(candidate))
    if (!result.success) {
      const issue = result.error.issues[0]
      return {
        foods: [],
        error: formatIssue(index, issue?.path ?? [], issue?.message ?? 'Некорректные данные')
      }
    }
    foods.push(result.data)
  }

  return { foods, error: null }
}
