import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import type { RepositoryRuntime, SqlDatabasePort } from '@mymind/contracts/storage'
import type { CreateNutritionFoodInput } from '@mymind/contracts/nutrition'
import { mobileSchemaV6 } from './mobile-schema-v6'
import { createNutritionRepository } from './nutrition'

const databases: Database.Database[] = []

function setup(): {
  db: Database.Database
  runtime: RepositoryRuntime
  nutrition: ReturnType<typeof createNutritionRepository>
} {
  const db = new Database(':memory:')
  databases.push(db)
  db.pragma('foreign_keys = ON')
  for (const sql of mobileSchemaV6) db.exec(sql)
  let id = 100
  let now = 10_000
  const runtime: RepositoryRuntime = {
    database: () => db as unknown as SqlDatabasePort,
    createId: () => `30000000-0000-4000-8000-${String(++id).padStart(12, '0')}`,
    now: () => ++now
  }
  return { db, runtime, nutrition: createNutritionRepository(runtime) }
}

const foodInput = (name = 'Тестовый продукт'): CreateNutritionFoodInput => ({
  name,
  brand: 'MyMind',
  category: 'protein',
  baseAmount: 100,
  baseUnit: 'g',
  nutrients: {
    calories: 123.4567,
    proteinG: 20.1234,
    fatG: 3.4567,
    carbsG: 4.5678,
    fiberG: 1.2345,
    sugarG: 0.4567,
    sodiumMg: 55.5555
  },
  notes: ''
})

afterEach(() => {
  for (const db of databases.splice(0)) db.close()
})

describe('shared Nutrition persistence', () => {
  it('ships the default catalog and stores decimal values as exact milli snapshots', () => {
    const { nutrition } = setup()
    expect(nutrition.listOverview({ date: '2026-09-06' }).foods.length).toBeGreaterThan(40)

    const food = nutrition.createFood(foodInput())
    expect(food).toMatchObject({
      baseAmount: 100,
      nutrients: { calories: 123.457, proteinG: 20.123, sodiumMg: 55.556 }
    })
    const entry = nutrition.createLogEntry({
      date: '2026-09-06',
      mealType: 'lunch',
      customMealName: '',
      sourceType: 'food',
      sourceId: food.id,
      amount: 50,
      customTitle: '',
      customUnit: 'g',
      customNutrients: null,
      notes: ''
    })
    expect(entry).toMatchObject({
      title: 'Тестовый продукт',
      unit: 'g',
      nutrients: { calories: 61.73, proteinG: 10.06 }
    })

    nutrition.updateFood({ ...foodInput('Переименованный продукт'), id: food.id })
    expect(nutrition.listOverview({ date: '2026-09-06' }).entries[0]).toMatchObject({
      title: 'Тестовый продукт',
      nutrients: { calories: 61.73 }
    })
    expect(nutrition.deleteFood({ id: food.id })).toBe(true)
    expect(nutrition.listOverview({ date: '2026-09-06' }).entries).toHaveLength(1)
  })

  it('calculates recipes, restricts referenced foods and cascades recipe ingredients', () => {
    const { db, nutrition } = setup()
    const first = nutrition.createFood(foodInput('Первый ингредиент'))
    const second = nutrition.createFood({
      ...foodInput('Второй ингредиент'),
      nutrients: { ...foodInput().nutrients, calories: 200 }
    })
    const recipe = nutrition.createRecipe({
      name: 'Рецепт',
      description: '',
      servings: 2,
      ingredients: [
        { foodId: first.id, amount: 100 },
        { foodId: second.id, amount: 50 }
      ]
    })
    expect(recipe).toMatchObject({
      totalNutrients: { calories: 223.46 },
      perServingNutrients: { calories: 111.73 }
    })
    expect(() => nutrition.deleteFood({ id: first.id })).toThrow('используется в рецепте')
    nutrition.deleteRecipe({ id: recipe.id })
    expect(db.prepare('SELECT COUNT(*) AS count FROM nutrition_recipe_ingredients').get()).toEqual({
      count: 0
    })
    expect(nutrition.deleteFood({ id: first.id })).toBe(true)
  })

  it('updates water and global targets and builds filtered reports', () => {
    const { nutrition } = setup()
    nutrition.setTargets({
      calories: 500,
      proteinG: 60,
      fatG: 40,
      carbsG: 80,
      fiberG: 20,
      waterMl: 2000
    })
    nutrition.setWater({ date: '2026-09-06', waterMl: 1500 })
    nutrition.createLogEntry({
      date: '2026-09-06',
      mealType: 'breakfast',
      customMealName: '',
      sourceType: 'custom',
      sourceId: null,
      amount: 1,
      customTitle: 'Завтрак',
      customUnit: 'serving',
      customNutrients: {
        calories: 500,
        proteinG: 30,
        fatG: 20,
        carbsG: 50,
        fiberG: 8,
        sugarG: 4,
        sodiumMg: 250
      },
      notes: ''
    })
    const report = nutrition.getReport({
      dateFrom: '2026-09-06',
      dateTo: '2026-09-07',
      mealType: 'breakfast',
      sourceType: null,
      foodId: null,
      recipeId: null
    })
    expect(report.summary).toMatchObject({
      calendarDays: 2,
      loggedDays: 1,
      entries: 1,
      averageCalories: 500,
      averageWaterMl: 750,
      calorieGoalHitPercent: 100
    })
    expect(report.timeline[0]).toMatchObject({ waterMl: 1500, targetCalories: 500 })
  })

  it('imports a meal atomically and skips duplicate bulk catalog identities', () => {
    const { db, nutrition } = setup()
    const result = nutrition.createFoods({
      foods: [foodInput('Уникальный продукт'), foodInput(' уникальный ПРОДУКТ ')]
    })
    expect(result.created).toHaveLength(1)
    expect(result.skippedNames).toEqual(['уникальный ПРОДУКТ'])

    expect(() =>
      nutrition.importMeals({
        schemaVersion: 1,
        date: '2026-09-06',
        meals: [
          {
            mealType: 'dinner',
            customMealName: '',
            items: [
              {
                name: 'Валидная позиция',
                amount: 1,
                unit: 'serving',
                nutrients: foodInput().nutrients,
                notes: ''
              },
              {
                name: 'Сломанная позиция',
                amount: 1,
                unit: 'serving',
                nutrients: null,
                notes: ''
              }
            ]
          }
        ]
      } as never)
    ).toThrow('пищевую ценность')
    expect(db.prepare('SELECT COUNT(*) AS count FROM nutrition_log_entries').get()).toEqual({
      count: 0
    })

    const imported = nutrition.importMeals({
      schemaVersion: 1,
      date: '2026-09-06',
      meals: [
        {
          mealType: 'dinner',
          customMealName: '',
          items: [
            {
              name: 'Ужин',
              amount: 1,
              unit: 'serving',
              nutrients: foodInput().nutrients,
              notes: ''
            }
          ]
        }
      ]
    })
    expect(imported).toMatchObject({ mealCount: 1, itemCount: 1 })
  })
})
