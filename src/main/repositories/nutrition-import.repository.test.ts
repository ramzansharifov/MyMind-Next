import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, getSqlite, initializeDatabaseForTesting } from '../database/client'
import { runDatabaseMigrationsFrom } from '../database/migrate'
import { importNutritionMeals } from './nutrition-import.repository'
import { listNutritionOverview } from './nutrition.repository'

let root = ''

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'mymind-nutrition-import-'))
  initializeDatabaseForTesting(join(root, 'nutrition.sqlite'))
  runDatabaseMigrationsFrom(resolve(process.cwd(), 'drizzle'))
})

beforeEach(() => {
  getSqlite().exec(`
    DELETE FROM nutrition_log_entries;
    DELETE FROM nutrition_water_days;
    DELETE FROM nutrition_targets;
  `)
})

afterAll(async () => {
  closeDatabase()
  await rm(root, { recursive: true, force: true })
})

describe('nutrition JSON import repository', () => {
  it('stores multiple meals as independent custom snapshots in one import', () => {
    const result = importNutritionMeals({
      schemaVersion: 1,
      date: '2026-08-26',
      meals: [
        {
          mealType: 'breakfast',
          customMealName: '',
          items: [
            {
              name: 'Яйца',
              amount: 3,
              unit: 'piece',
              nutrients: {
                calories: 234,
                proteinG: 18.9,
                fatG: 15.9,
                carbsG: 1.8,
                fiberG: 0,
                sugarG: 0.6,
                sodiumMg: 186
              },
              notes: ''
            }
          ]
        },
        {
          mealType: 'lunch',
          customMealName: '',
          items: [
            {
              name: 'Плов',
              amount: 250,
              unit: 'g',
              nutrients: {
                calories: 575,
                proteinG: 17,
                fatG: 24,
                carbsG: 73,
                fiberG: 3,
                sugarG: 4,
                sodiumMg: 650
              },
              notes: 'Оценка GPT'
            },
            {
              name: 'Овощной салат',
              amount: 150,
              unit: 'g',
              nutrients: {
                calories: 65,
                proteinG: 2,
                fatG: 3,
                carbsG: 8,
                fiberG: 3,
                sugarG: 4,
                sodiumMg: 120
              },
              notes: ''
            }
          ]
        }
      ]
    })

    expect(result).toMatchObject({ date: '2026-08-26', mealCount: 2, itemCount: 3 })
    expect(result.created.map((entry) => entry.title)).toEqual(['Яйца', 'Плов', 'Овощной салат'])
    expect(result.created.every((entry) => entry.sourceType === 'custom')).toBe(true)
    expect(result.created.every((entry) => entry.sourceId === null)).toBe(true)

    const overview = listNutritionOverview('2026-08-26')
    expect(overview.entries).toHaveLength(3)
    expect(overview.day.nutrients.calories).toBe(874)
    expect(overview.day.nutrients.proteinG).toBe(37.9)
    expect(overview.entries.find((entry) => entry.title === 'Плов')?.notes).toBe('Оценка GPT')
  })
})
