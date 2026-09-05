import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, getSqlite, initializeDatabaseForTesting } from '../database/client'
import { runDatabaseMigrationsFrom } from '../database/migrate'
import { listNutritionOverview, setNutritionTargets } from './nutrition.repository'

let root = ''

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'mymind-nutrition-targets-'))
  initializeDatabaseForTesting(join(root, 'nutrition-targets.sqlite'))
  runDatabaseMigrationsFrom(resolve(process.cwd(), 'drizzle'))
})

beforeEach(() => {
  getSqlite().exec('DELETE FROM nutrition_targets;')
})

afterAll(async () => {
  closeDatabase()
  await rm(root, { recursive: true, force: true })
})

function setTarget(calories: number): void {
  setNutritionTargets({
    calories,
    proteinG: null,
    fatG: null,
    carbsG: null,
    fiberG: null,
    waterMl: null
  })
}

function localYear(): number {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.getUTCFullYear()
}

describe('global nutrition target', () => {
  it('keeps only the latest global target and applies it independently of diary date', () => {
    setTarget(2000)
    setTarget(2400)

    const rows = getSqlite()
      .prepare(
        'SELECT effective_from, effective_to, calories_milli FROM nutrition_targets ORDER BY created_at'
      )
      .all() as Array<{
      effective_from: string
      effective_to: string | null
      calories_milli: number
    }>

    expect(rows).toEqual([
      {
        effective_from: '0001-01-01',
        effective_to: null,
        calories_milli: 2_400_000
      }
    ])
    expect(listNutritionOverview('2020-01-01').day.target?.calories).toBe(2400)
    expect(listNutritionOverview('2035-12-31').day.target?.calories).toBe(2400)
  })

  it('uses the currently active legacy period as the global target before the first new save', () => {
    const year = localYear()
    getSqlite()
      .prepare(
        `INSERT INTO nutrition_targets (
          id, effective_from, effective_to, calories_milli, protein_milli_g, fat_milli_g,
          carbs_milli_g, fiber_milli_g, water_ml, created_at
        ) VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, ?),
                 (?, ?, NULL, ?, NULL, NULL, NULL, NULL, NULL, ?)`
      )
      .run(
        'legacy-current',
        `${year}-01-01`,
        `${year}-12-31`,
        2_100_000,
        1,
        'legacy-future',
        `${year + 1}-01-01`,
        2_600_000,
        2
      )

    expect(listNutritionOverview('2020-01-01').currentTarget?.calories).toBe(2100)
    expect(listNutritionOverview('2035-12-31').day.target?.calories).toBe(2100)
  })
})
