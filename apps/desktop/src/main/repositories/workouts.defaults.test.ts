import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { closeDatabase, initializeDatabaseForTesting } from '../database/client'
import { runDatabaseMigrationsFrom } from '../database/migrate'
import { listWorkoutsOverview } from './workouts.repository'

let root = ''

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'mymind-workout-defaults-'))
  initializeDatabaseForTesting(join(root, 'workouts-defaults.sqlite'))
  runDatabaseMigrationsFrom(resolve(process.cwd(), 'drizzle'))
})

afterAll(async () => {
  closeDatabase()
  await rm(root, { recursive: true, force: true })
})

describe('default workout exercise catalog', () => {
  it('seeds a practical base library with bodyweight and weighted exercises', () => {
    const exercises = listWorkoutsOverview().exercises

    expect(exercises).toHaveLength(24)
    expect(exercises).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Подтягивания',
          muscleGroups: ['lats', 'biceps'],
          usesExternalWeight: false
        }),
        expect.objectContaining({
          title: 'Приседания со штангой',
          muscleGroups: ['quadriceps', 'glutes', 'hamstrings'],
          usesExternalWeight: true
        }),
        expect.objectContaining({
          title: 'Жим штанги лёжа',
          muscleGroups: ['chest', 'triceps', 'shoulders'],
          usesExternalWeight: true
        }),
        expect.objectContaining({
          title: 'Скручивания',
          muscleGroups: ['abs'],
          usesExternalWeight: false
        })
      ])
    )
  })
})
