import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => tmpdir() } }))

import { closeDatabase, getSqlite, initializeDatabaseForTesting } from '../database/client'
import {
  createWorkoutExercise,
  createWorkoutSession,
  getWorkoutReport
} from './workouts.repository'

let root = ''

function applyMigration(path: string): void {
  const sql = readFileSync(resolve(process.cwd(), path), 'utf8')
  for (const statement of sql.split('--> statement-breakpoint')) {
    const normalized = statement.trim()
    if (normalized) getSqlite().exec(normalized)
  }
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'mymind-report-smoke-'))
  initializeDatabaseForTesting(join(root, 'report.sqlite'))
  applyMigration('drizzle/0029_workouts_module.sql')
  applyMigration('drizzle/0033_workouts_external_weight.sql')
})

beforeEach(() => {
  getSqlite().exec(`
    DELETE FROM workout_sets;
    DELETE FROM workout_session_exercises;
    DELETE FROM workout_sessions;
    DELETE FROM workout_program_exercises;
    DELETE FROM workout_programs;
    DELETE FROM workout_exercises;
  `)
})

afterAll(() => {
  closeDatabase()
  rmSync(root, { recursive: true, force: true })
})

describe('workout report load modes', () => {
  it('keeps weighted metrics separate from bodyweight progress', () => {
    const curl = createWorkoutExercise({
      title: 'Сгибания',
      muscleGroups: ['biceps'],
      usesExternalWeight: true,
      status: 'active'
    })
    const pullUp = createWorkoutExercise({
      title: 'Подтягивания',
      muscleGroups: ['lats', 'biceps'],
      usesExternalWeight: false,
      status: 'active'
    })

    createWorkoutSession({
      programId: null,
      date: '2026-08-10',
      durationMinutes: 40,
      comment: '',
      exercises: [
        {
          exerciseId: curl.id,
          comment: '',
          sets: [{ reps: 10, weightKg: 20 }]
        },
        {
          exerciseId: pullUp.id,
          comment: '',
          sets: [
            { reps: 10, weightKg: 99 },
            { reps: 8, weightKg: 99 }
          ]
        }
      ]
    })

    createWorkoutSession({
      programId: null,
      date: '2026-08-20',
      durationMinutes: 45,
      comment: '',
      exercises: [
        {
          exerciseId: pullUp.id,
          comment: '',
          sets: [
            { reps: 12, weightKg: 99 },
            { reps: 9, weightKg: 99 }
          ]
        }
      ]
    })

    const report = getWorkoutReport({
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
      programId: null,
      exerciseId: null,
      muscleGroup: null
    })

    expect(report.summary).toMatchObject({
      sessions: 2,
      exercises: 2,
      sets: 5,
      externalWeightSets: 1,
      externalWeightReps: 10,
      bodyweightSets: 4,
      bodyweightReps: 39,
      volumeKg: 200,
      averageWeightKg: 20,
      maxWeightKg: 20
    })

    const bodyweight = report.exercises.find(
      (exercise) => exercise.exerciseId === pullUp.id && !exercise.usesExternalWeight
    )
    expect(bodyweight).toMatchObject({
      volumeKg: 0,
      averageWeightKg: 0,
      bestSetReps: 12,
      firstBestReps: 10,
      lastBestReps: 12,
      repsChange: 2
    })

    expect(report.personalRecords).toHaveLength(1)
    expect(report.personalRecords[0]?.exerciseId).toBe(curl.id)
    expect(report.bodyweightRecords[0]).toMatchObject({
      exerciseId: pullUp.id,
      reps: 12,
      date: '2026-08-20'
    })
    expect(report.timeline).toEqual([
      expect.objectContaining({
        date: '2026-08-10',
        externalWeightSets: 1,
        bodyweightSets: 2
      }),
      expect.objectContaining({
        date: '2026-08-20',
        externalWeightSets: 0,
        bodyweightSets: 2
      })
    ])

    const freeOnly = getWorkoutReport({
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
      programId: 'custom',
      exerciseId: null,
      muscleGroup: null
    })
    expect(freeOnly.summary.sessions).toBe(2)
  })
})
