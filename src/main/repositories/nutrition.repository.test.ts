import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, getSqlite, initializeDatabaseForTesting } from '../database/client'
import { runDatabaseMigrationsFrom } from '../database/migrate'
import {
  createNutritionFood,
  createNutritionFoods,
  createNutritionLogEntry,
  createNutritionRecipe,
  getNutritionReport,
  listNutritionOverview,
  setNutritionTargets,
  setNutritionWater,
  updateNutritionFood
} from './nutrition.repository'

let root = ''

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'mymind-nutrition-'))
  initializeDatabaseForTesting(join(root, 'nutrition.sqlite'))
  runDatabaseMigrationsFrom(resolve(process.cwd(), 'drizzle'))
})

beforeEach(() => {
  getSqlite().exec(`
    DELETE FROM nutrition_log_entries;
    DELETE FROM nutrition_recipe_ingredients;
    DELETE FROM nutrition_recipes;
    DELETE FROM nutrition_foods;
    DELETE FROM nutrition_water_days;
    DELETE FROM nutrition_targets;
  `)
})

afterAll(async () => {
  closeDatabase()
  await rm(root, { recursive: true, force: true })
})

function createChicken(): ReturnType<typeof createNutritionFood> {
  return createNutritionFood({
    name: 'Куриная грудка',
    brand: '',
    category: 'protein',
    baseAmount: 100,
    baseUnit: 'g',
    nutrients: {
      calories: 165,
      proteinG: 31,
      fatG: 3.6,
      carbsG: 0,
      fiberG: 0,
      sugarG: 0,
      sodiumMg: 74
    },
    favorite: true,
    status: 'active',
    notes: ''
  })
}

describe('nutrition repository', () => {
  it('calculates recipes from reusable foods and logs them by servings', () => {
    const chicken = createChicken()
    const rice = createNutritionFood({
      name: 'Рис варёный',
      brand: '',
      category: 'grains',
      baseAmount: 100,
      baseUnit: 'g',
      nutrients: {
        calories: 130,
        proteinG: 2.7,
        fatG: 0.3,
        carbsG: 28,
        fiberG: 0.4,
        sugarG: 0.1,
        sodiumMg: 1
      },
      favorite: false,
      status: 'active',
      notes: ''
    })

    const recipe = createNutritionRecipe({
      name: 'Курица с рисом',
      description: '',
      servings: 2,
      favorite: true,
      status: 'active',
      ingredients: [
        { foodId: chicken.id, amount: 200 },
        { foodId: rice.id, amount: 300 }
      ]
    })

    expect(recipe.totalNutrients.calories).toBe(720)
    expect(recipe.perServingNutrients.calories).toBe(360)

    const entry = createNutritionLogEntry({
      date: '2026-08-17',
      mealType: 'lunch',
      customMealName: '',
      sourceType: 'recipe',
      sourceId: recipe.id,
      amount: 1.5,
      customTitle: '',
      customUnit: 'serving',
      customNutrients: null,
      notes: ''
    })

    expect(entry).toMatchObject({ title: 'Курица с рисом', unit: 'serving' })
    expect(entry.nutrients.calories).toBe(540)
  })

  it('bulk creates products transactionally and skips exact catalog duplicates', () => {
    createChicken()
    const apple = {
      name: 'Яблоко',
      brand: '',
      category: 'fruits' as const,
      baseAmount: 100,
      baseUnit: 'g' as const,
      nutrients: {
        calories: 52,
        proteinG: 0.3,
        fatG: 0.2,
        carbsG: 13.8,
        fiberG: 2.4,
        sugarG: 10.4,
        sodiumMg: 1
      },
      favorite: false,
      status: 'active' as const,
      notes: ''
    }

    const result = createNutritionFoods({
      foods: [
        {
          name: 'Куриная грудка',
          brand: '',
          category: 'protein',
          baseAmount: 100,
          baseUnit: 'g',
          nutrients: {
            calories: 165,
            proteinG: 31,
            fatG: 3.6,
            carbsG: 0,
            fiberG: 0,
            sugarG: 0,
            sodiumMg: 74
          },
          favorite: false,
          status: 'active',
          notes: ''
        },
        apple,
        apple
      ]
    })

    expect(result.created.map((food) => food.name)).toEqual(['Яблоко'])
    expect(result.skippedNames).toEqual(['Куриная грудка', 'Яблоко'])
    expect(listNutritionOverview('2026-08-17').foods.map((food) => food.name)).toEqual([
      'Куриная грудка',
      'Яблоко'
    ])
  })

  it('keeps historical nutrient snapshots after a food is edited', () => {
    const chicken = createChicken()
    const entry = createNutritionLogEntry({
      date: '2026-08-10',
      mealType: 'dinner',
      customMealName: '',
      sourceType: 'food',
      sourceId: chicken.id,
      amount: 200,
      customTitle: '',
      customUnit: 'g',
      customNutrients: null,
      notes: ''
    })

    updateNutritionFood({
      ...chicken,
      name: 'Куриная грудка новая',
      nutrients: { ...chicken.nutrients, calories: 200 }
    })

    const stored = listNutritionOverview('2026-08-10').entries[0]
    expect(stored).toMatchObject({ id: entry.id, title: 'Куриная грудка' })
    expect(stored?.nutrients.calories).toBe(330)
  })

  it('preserves target history and uses the target active on each report day', () => {
    setNutritionTargets({
      effectiveFrom: '2026-08-01',
      calories: 2000,
      proteinG: 140,
      fatG: 70,
      carbsG: 220,
      fiberG: 30,
      waterMl: 2500
    })
    setNutritionTargets({
      effectiveFrom: '2026-08-15',
      calories: 2400,
      proteinG: 160,
      fatG: 80,
      carbsG: 260,
      fiberG: 32,
      waterMl: 3000
    })

    createNutritionLogEntry({
      date: '2026-08-10',
      mealType: 'other',
      customMealName: 'Итог дня',
      sourceType: 'custom',
      sourceId: null,
      amount: 1,
      customTitle: 'Рацион 10 августа',
      customUnit: 'serving',
      customNutrients: {
        calories: 2000,
        proteinG: 140,
        fatG: 70,
        carbsG: 220,
        fiberG: 30,
        sugarG: 30,
        sodiumMg: 1800
      },
      notes: ''
    })
    createNutritionLogEntry({
      date: '2026-08-16',
      mealType: 'other',
      customMealName: 'Итог дня',
      sourceType: 'custom',
      sourceId: null,
      amount: 1,
      customTitle: 'Рацион 16 августа',
      customUnit: 'serving',
      customNutrients: {
        calories: 2400,
        proteinG: 160,
        fatG: 80,
        carbsG: 260,
        fiberG: 32,
        sugarG: 35,
        sodiumMg: 1900
      },
      notes: ''
    })
    setNutritionWater({ date: '2026-08-16', waterMl: 3000 })

    const report = getNutritionReport({
      dateFrom: '2026-08-10',
      dateTo: '2026-08-16',
      mealType: null,
      sourceType: null,
      foodId: null,
      recipeId: null
    })

    expect(report.summary.calorieGoalDays).toBe(2)
    expect(report.summary.calorieGoalHitDays).toBe(2)
    expect(report.timeline.find((day) => day.date === '2026-08-10')?.targetCalories).toBe(2000)
    expect(report.timeline.find((day) => day.date === '2026-08-16')?.targetCalories).toBe(2400)
  })
})
