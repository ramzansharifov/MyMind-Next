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

function setTarget(effectiveFrom: string, calories: number): void {
  setNutritionTargets({
    effectiveFrom,
    calories,
    proteinG: null,
    fatG: null,
    carbsG: null,
    fiberG: null,
    waterMl: null
  })
}

describe('nutrition target periods', () => {
  it('preserves a future target when a new target is inserted between periods', () => {
    setTarget('2026-08-01', 2000)
    setTarget('2026-08-20', 2400)
    setTarget('2026-08-10', 2200)

    expect(listNutritionOverview('2026-08-09').day.target).toMatchObject({
      effectiveFrom: '2026-08-01',
      effectiveTo: '2026-08-09',
      calories: 2000
    })
    expect(listNutritionOverview('2026-08-15').day.target).toMatchObject({
      effectiveFrom: '2026-08-10',
      effectiveTo: '2026-08-19',
      calories: 2200
    })
    expect(listNutritionOverview('2026-08-20').day.target).toMatchObject({
      effectiveFrom: '2026-08-20',
      effectiveTo: null,
      calories: 2400
    })
  })

  it('replaces a target starting on the same date without creating overlapping periods', () => {
    setTarget('2026-08-01', 2000)
    setTarget('2026-08-15', 2300)
    setTarget('2026-08-15', 2500)

    const rows = getSqlite()
      .prepare('SELECT effective_from, effective_to, calories_milli FROM nutrition_targets ORDER BY effective_from')
      .all() as Array<{ effective_from: string; effective_to: string | null; calories_milli: number }>

    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ effective_from: '2026-08-01', effective_to: '2026-08-14' })
    expect(rows[1]).toMatchObject({ effective_from: '2026-08-15', effective_to: null, calories_milli: 2_500_000 })
  })
})
