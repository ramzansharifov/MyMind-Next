import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import type { RepositoryRuntime, SqlDatabasePort } from '@mymind/contracts/storage'
import { mobileSchemaV1 } from './mobile-schema'
import { mobileSchemaV2 } from './mobile-schema-v2'
import { mobileSchemaV3 } from './mobile-schema-v3'
import { mobileSchemaV4 } from './mobile-schema-v4'
import { mobileSchemaV5 } from './mobile-schema-v5'
import { createWorkoutsRepository } from './workouts'

const databases: Database.Database[] = []

function setup(): { db: Database.Database; runtime: RepositoryRuntime } {
  const db = new Database(':memory:')
  databases.push(db)
  db.pragma('foreign_keys = ON')
  for (const schema of [
    mobileSchemaV1,
    mobileSchemaV2,
    mobileSchemaV3,
    mobileSchemaV4,
    mobileSchemaV5
  ])
    for (const sql of schema) db.exec(sql)
  let id = 100
  let now = 10_000
  return {
    db,
    runtime: {
      database: () => db as unknown as SqlDatabasePort,
      createId: () => `20000000-0000-4000-8000-${String(++id).padStart(12, '0')}`,
      now: () => ++now
    }
  }
}

afterEach(() => {
  for (const db of databases.splice(0)) db.close()
})

describe('shared Workouts persistence', () => {
  it('ships the same default exercise catalog and preserves multi-zone metadata', () => {
    const { runtime } = setup()
    const workouts = createWorkoutsRepository(runtime)
    const overview = workouts.listOverview()

    expect(overview.exercises).toHaveLength(24)
    expect(overview.exercises.find((exercise) => exercise.title === 'Подтягивания')).toMatchObject({
      muscleGroups: ['lats', 'biceps'],
      usesExternalWeight: false
    })
    expect(overview.exercises.find((exercise) => exercise.title === 'Становая тяга')).toMatchObject(
      {
        muscleGroups: ['lower_back', 'glutes', 'hamstrings', 'traps'],
        usesExternalWeight: true
      }
    )
  })

  it('keeps program/session snapshots and forces bodyweight volume to zero', () => {
    const { runtime } = setup()
    const workouts = createWorkoutsRepository(runtime)
    const overview = workouts.listOverview()
    const pullup = overview.exercises.find((exercise) => exercise.title === 'Подтягивания')!
    const bench = overview.exercises.find((exercise) => exercise.title === 'Жим штанги лёжа')!
    const program = workouts.createProgram({
      name: 'Силовая',
      description: 'Тест',
      status: 'active',
      exercises: [{ exerciseId: pullup.id }, { exerciseId: bench.id }]
    })
    const session = workouts.createSession({
      programId: program.id,
      date: '2026-09-06',
      durationMinutes: 50,
      comment: 'Хорошо',
      exercises: [
        { exerciseId: pullup.id, comment: '', sets: [{ reps: 12, weightKg: 99 }] },
        { exerciseId: bench.id, comment: '', sets: [{ reps: 5, weightKg: 80 }] }
      ]
    })

    expect(session).toMatchObject({
      programName: 'Силовая',
      totalSets: 2,
      totalReps: 17,
      totalVolumeKg: 400
    })
    expect(session.exercises[0].sets[0].weightKg).toBe(0)

    workouts.updateProgram({
      id: program.id,
      name: 'Силовая новая',
      description: '',
      status: 'active',
      exercises: [{ exerciseId: bench.id }]
    })
    expect(workouts.getSession(session.id).programName).toBe('Силовая')
    workouts.deleteProgram({ id: program.id })
    expect(workouts.getSession(session.id)).toMatchObject({
      programId: null,
      programName: 'Силовая'
    })
  })

  it('creates progress entries and calculates desktop-compatible report totals and records', () => {
    const { runtime } = setup()
    const workouts = createWorkoutsRepository(runtime)
    const overview = workouts.listOverview()
    const bench = overview.exercises.find((exercise) => exercise.title === 'Жим штанги лёжа')!
    const pushups = overview.exercises.find((exercise) => exercise.title === 'Отжимания')!

    workouts.createProgressEntry({
      date: '2026-09-06',
      bodyWeightKg: 72.35,
      wellbeing: 'Отлично',
      notes: '',
      metrics: [
        { exerciseId: bench.id, weightKg: 80, reps: 5, comment: 'Контроль' },
        { exerciseId: pushups.id, weightKg: 0, reps: 30, comment: '' }
      ]
    })
    expect(workouts.listOverview().progressEntries[0]).toMatchObject({
      bodyWeightKg: 72.35,
      wellbeing: 'Отлично'
    })

    workouts.createSession({
      programId: null,
      date: '2026-09-05',
      durationMinutes: 40,
      comment: '',
      exercises: [
        { exerciseId: bench.id, comment: '', sets: [{ reps: 5, weightKg: 80 }] },
        { exerciseId: pushups.id, comment: '', sets: [{ reps: 20, weightKg: 50 }] }
      ]
    })
    workouts.createSession({
      programId: null,
      date: '2026-09-06',
      durationMinutes: 50,
      comment: '',
      exercises: [{ exerciseId: bench.id, comment: '', sets: [{ reps: 4, weightKg: 90 }] }]
    })

    const report = workouts.getReport({
      dateFrom: '2026-09-01',
      dateTo: '2026-09-30',
      programId: null,
      exerciseId: null,
      muscleGroup: null
    })
    expect(report.summary).toMatchObject({
      sessions: 2,
      activeDays: 2,
      sets: 3,
      reps: 29,
      externalWeightSets: 2,
      bodyweightSets: 1,
      volumeKg: 760,
      durationMinutes: 90,
      maxWeightKg: 90
    })
    expect(report.personalRecords[0]).toMatchObject({
      title: 'Жим штанги лёжа',
      weightKg: 90,
      reps: 4
    })
    expect(report.bodyweightRecords[0]).toMatchObject({ title: 'Отжимания', reps: 20 })
  })

  it('stores custom photos, replaces fixed views and cleans their local assets', async () => {
    const { runtime } = setup()
    let imported = 0
    const deletedAssets: string[] = []
    const workouts = createWorkoutsRepository(runtime, {
      importProgressPhoto: async () => {
        imported += 1
        return {
          id: `asset-${imported}`,
          name: `photo-${imported}.jpg`,
          mimeType: 'image/jpeg',
          size: 100 + imported,
          url: `file:///workout-progress/asset-${imported}/photo.jpg`
        }
      },
      deleteProgressPhotoAsset: async (photo) => {
        deletedAssets.push(photo.assetId)
      }
    })
    const entry = workouts.createProgressEntry({
      date: '2026-09-06',
      bodyWeightKg: null,
      wellbeing: '',
      notes: '',
      metrics: []
    })

    const firstFront = await workouts.importProgressPhoto({ entryId: entry.id, view: 'front' })
    const custom = await workouts.importProgressPhoto({ entryId: entry.id, view: 'custom' })
    const nextFront = await workouts.importProgressPhoto({ entryId: entry.id, view: 'front' })

    expect(firstFront?.assetId).toBe('asset-1')
    expect(custom?.assetId).toBe('asset-2')
    expect(nextFront?.assetId).toBe('asset-3')
    expect(workouts.listOverview().progressEntries[0].photos.map((photo) => photo.assetId)).toEqual(
      ['asset-2', 'asset-3']
    )
    expect(deletedAssets).toEqual(['asset-1'])

    await workouts.deleteProgressPhoto({ id: custom!.id })
    expect(deletedAssets).toEqual(['asset-1', 'asset-2'])
    workouts.deleteProgressEntry({ id: entry.id })
    expect(deletedAssets).toEqual(['asset-1', 'asset-2', 'asset-3'])
  })
})
