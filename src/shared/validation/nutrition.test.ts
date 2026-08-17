import { describe, expect, it } from 'vitest'

import {
  createNutritionLogEntryInputSchema,
  createNutritionRecipeInputSchema,
  nutritionOverviewInputSchema,
  nutritionReportInputSchema,
  setNutritionTargetsInputSchema
} from './nutrition'

const foodId = '11111111-1111-4111-8111-111111111111'
const recipeId = '22222222-2222-4222-8222-222222222222'

const zeroNutrients = {
  calories: 0,
  proteinG: 0,
  fatG: 0,
  carbsG: 0,
  fiberG: 0,
  sugarG: 0,
  sodiumMg: 0
}

describe('nutrition validation', () => {
  it('requires a catalog source for food and recipe log entries', () => {
    const result = createNutritionLogEntryInputSchema.safeParse({
      date: '2026-08-17',
      mealType: 'lunch',
      customMealName: '',
      sourceType: 'food',
      sourceId: null,
      amount: 100,
      customTitle: '',
      customUnit: 'g',
      customNutrients: null,
      notes: ''
    })

    expect(result.success).toBe(false)
  })

  it('requires title and nutrients for a custom log entry', () => {
    const result = createNutritionLogEntryInputSchema.safeParse({
      date: '2026-08-17',
      mealType: 'snack',
      customMealName: '',
      sourceType: 'custom',
      sourceId: null,
      amount: 1,
      customTitle: '',
      customUnit: 'serving',
      customNutrients: null,
      notes: ''
    })

    expect(result.success).toBe(false)
  })

  it('rejects impossible calendar dates', () => {
    expect(nutritionOverviewInputSchema.safeParse({ date: '2026-02-29' }).success).toBe(false)
    expect(nutritionOverviewInputSchema.safeParse({ date: '2028-02-29' }).success).toBe(true)
  })

  it('accepts optional targets and rejects negative values', () => {
    expect(
      setNutritionTargetsInputSchema.safeParse({
        effectiveFrom: '2026-08-17',
        calories: null,
        proteinG: 150,
        fatG: null,
        carbsG: null,
        fiberG: 30,
        waterMl: 2500
      }).success
    ).toBe(true)

    expect(
      setNutritionTargetsInputSchema.safeParse({
        effectiveFrom: '2026-08-17',
        calories: -1,
        proteinG: null,
        fatG: null,
        carbsG: null,
        fiberG: null,
        waterMl: null
      }).success
    ).toBe(false)
  })

  it('rejects duplicate ingredients in one recipe', () => {
    const result = createNutritionRecipeInputSchema.safeParse({
      name: 'Одинаковые ингредиенты',
      description: '',
      servings: 1,
      favorite: false,
      status: 'active',
      ingredients: [
        { foodId, amount: 100 },
        { foodId, amount: 50 }
      ]
    })

    expect(result.success).toBe(false)
  })

  it('rejects a reversed report period', () => {
    const result = nutritionReportInputSchema.safeParse({
      dateFrom: '2026-08-18',
      dateTo: '2026-08-17',
      mealType: null,
      sourceType: null,
      foodId: null,
      recipeId: null
    })

    expect(result.success).toBe(false)
  })

  it('rejects mutually incompatible report source filters', () => {
    expect(
      nutritionReportInputSchema.safeParse({
        dateFrom: '2026-08-01',
        dateTo: '2026-08-17',
        mealType: null,
        sourceType: 'recipe',
        foodId,
        recipeId: null
      }).success
    ).toBe(false)

    expect(
      nutritionReportInputSchema.safeParse({
        dateFrom: '2026-08-01',
        dateTo: '2026-08-17',
        mealType: null,
        sourceType: null,
        foodId,
        recipeId
      }).success
    ).toBe(false)
  })

  it('accepts a complete custom record', () => {
    const result = createNutritionLogEntryInputSchema.safeParse({
      date: '2026-08-17',
      mealType: 'other',
      customMealName: 'После тренировки',
      sourceType: 'custom',
      sourceId: null,
      amount: 1,
      customTitle: 'Блюдо в кафе',
      customUnit: 'serving',
      customNutrients: { ...zeroNutrients, calories: 450, proteinG: 30 },
      notes: ''
    })

    expect(result.success).toBe(true)
  })
})
