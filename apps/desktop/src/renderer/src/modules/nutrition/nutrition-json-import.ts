import { z } from 'zod'

import type {
  ImportNutritionMealsInput,
  NutritionMealType,
  NutritionUnit
} from '../../../../shared/contracts/nutrition'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'other'] as const
const UNITS = ['g', 'ml', 'piece', 'serving'] as const

const nonNegativeNumber = z.number().finite().min(0)

const jsonItemSchema = z
  .object({
    name: z.string().trim().min(1).max(180),
    amount: z.number().finite().positive().max(100_000),
    unit: z.enum(UNITS),
    calories: nonNegativeNumber.max(100_000),
    proteinG: nonNegativeNumber.max(10_000),
    fatG: nonNegativeNumber.max(10_000),
    carbsG: nonNegativeNumber.max(10_000),
    fiberG: nonNegativeNumber.max(10_000).optional().default(0),
    sugarG: nonNegativeNumber.max(10_000).optional().default(0),
    sodiumMg: nonNegativeNumber.max(10_000_000).optional().default(0),
    notes: z.string().max(4000).optional().default('')
  })
  .strict()

const jsonMealSchema = z
  .object({
    mealType: z.enum(MEAL_TYPES),
    customMealName: z.string().trim().max(80).optional().default(''),
    items: z.array(jsonItemSchema).min(1).max(100)
  })
  .strict()
  .superRefine((meal, context) => {
    if (meal.mealType === 'other' && !meal.customMealName) {
      context.addIssue({
        code: 'custom',
        message: 'Для mealType "other" укажите customMealName',
        path: ['customMealName']
      })
    }
  })

const jsonDocumentSchema = z
  .object({
    schemaVersion: z.literal(1),
    date: z.string().regex(DATE_PATTERN, 'Дата должна быть в формате YYYY-MM-DD'),
    meals: z.array(jsonMealSchema).min(1).max(20)
  })
  .strict()
  .superRefine((document, context) => {
    const totalItems = document.meals.reduce((sum, meal) => sum + meal.items.length, 0)
    if (totalItems > 300) {
      context.addIssue({
        code: 'custom',
        message: 'За один раз можно импортировать не более 300 позиций',
        path: ['meals']
      })
    }
  })

export const NUTRITION_JSON_EXAMPLE = `{
  "schemaVersion": 1,
  "date": "2026-08-26",
  "meals": [
    {
      "mealType": "lunch",
      "items": [
        {
          "name": "Плов",
          "amount": 250,
          "unit": "g",
          "calories": 575,
          "proteinG": 17,
          "fatG": 24,
          "carbsG": 73
        },
        {
          "name": "Овощной салат",
          "amount": 150,
          "unit": "g",
          "calories": 65,
          "proteinG": 2,
          "fatG": 3,
          "carbsG": 8,
          "fiberG": 3
        }
      ]
    }
  ]
}`

export function parseNutritionMealsJson(raw: string): ImportNutritionMealsInput {
  const normalized = stripCodeFence(raw).trim()
  if (!normalized) throw new Error('Вставьте JSON с данными о питании')

  let parsed: unknown
  try {
    parsed = JSON.parse(normalized)
  } catch {
    throw new Error('Не удалось разобрать JSON. Проверьте запятые, кавычки и скобки.')
  }

  const result = jsonDocumentSchema.safeParse(parsed)
  if (!result.success) {
    const issue = result.error.issues[0]
    const path = issue?.path.length ? ` (${issue.path.join('.')})` : ''
    throw new Error(`${issue?.message ?? 'Некорректная структура JSON'}${path}`)
  }

  return {
    schemaVersion: 1,
    date: result.data.date,
    meals: result.data.meals.map((meal) => ({
      mealType: meal.mealType as NutritionMealType,
      customMealName: meal.customMealName,
      items: meal.items.map((item) => ({
        name: item.name,
        amount: item.amount,
        unit: item.unit as NutritionUnit,
        nutrients: {
          calories: item.calories,
          proteinG: item.proteinG,
          fatG: item.fatG,
          carbsG: item.carbsG,
          fiberG: item.fiberG,
          sugarG: item.sugarG,
          sodiumMg: item.sodiumMg
        },
        notes: item.notes
      }))
    }))
  }
}

function stripCodeFence(value: string): string {
  const trimmed = value.trim()
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return match?.[1] ?? trimmed
}
