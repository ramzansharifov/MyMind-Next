import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, getSqlite, initializeDatabaseForTesting } from '../database/client'
import { runDatabaseMigrationsFrom } from '../database/migrate'
import {
  createWorkoutExercise,
  createWorkoutProgram,
  createWorkoutProgressEntry,
  createWorkoutSession,
  getWorkoutReport,
  listWorkoutsOverview,
  updateWorkoutExercise
} from './workouts.repository'

let root = ''

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'mymind-workouts-'))
  initializeDatabaseForTesting(join(root, 'workouts.sqlite'))
  runDatabaseMigrationsFrom(resolve(process.cwd(), 'drizzle'))
})

beforeEach(() => {
  getSqlite().exec(`
    DELETE FROM workout_progress_photos;
    DELETE FROM workout_progress_metrics;
    DELETE FROM workout_progress_entries;
    DELETE FROM workout_sets;
    DELETE FROM workout_session_exercises;
    DELETE FROM workout_sessions;
    DELETE FROM workout_program_exercises;
    DELETE FROM workout_programs;
    DELETE FROM workout_exercises;
  `)
})

afterAll(async () => {
  closeDatabase()
  await rm(root, { recursive: true, force: true })
})

describe('workouts repository', () => {
  it('persists exercises, programs and a program-based workout with weight per set', () => {
    const curl = createWorkoutExercise({
      title: 'Сгибания на бицепс с гантелями',
      muscleGroup: 'arms',
      description: 'Без раскачивания корпуса.',
      status: 'active'
    })
    const row = createWorkoutExercise({
      title: 'Тяга штанги в наклоне',
      muscleGroup: 'back',
      description: '',
      status: 'active'
    })
    const program = createWorkoutProgram({
      name: 'Pull',
      description: 'Спина и бицепс',
      status: 'active',
      exercises: [
        { exerciseId: row.id, plannedSets: 3, targetReps: 8, notes: '' },
        { exerciseId: curl.id, plannedSets: 3, targetReps: 10, notes: 'Контроль негатива' }
      ]
    })

    const session = createWorkoutSession({
      programId: program.id,
      title: '',
      date: '2026-08-17',
      durationMinutes: 65,
      comment: 'Хорошая тренировка',
      exercises: [
        {
          exerciseId: row.id,
          comment: '',
          sets: [
            { reps: 8, weightKg: 60 },
            { reps: 8, weightKg: 62.5 },
            { reps: 7, weightKg: 65 }
          ]
        },
        {
          exerciseId: curl.id,
          comment: 'Последний подход тяжёлый',
          sets: [
            { reps: 12, weightKg: 14 },
            { reps: 10, weightKg: 16 },
            { reps: 8, weightKg: 18 }
          ]
        }
      ]
    })

    expect(session).toMatchObject({
      programId: program.id,
      programName: 'Pull',
      totalSets: 6,
      totalReps: 53
    })
    expect(session.exercises[0]?.sets[1]).toMatchObject({ reps: 8, weightKg: 62.5 })
    expect(listWorkoutsOverview()).toMatchObject({
      exercises: expect.arrayContaining([expect.objectContaining({ id: curl.id })]),
      programs: [expect.objectContaining({ id: program.id, exercises: expect.any(Array) })],
      sessions: [expect.objectContaining({ id: session.id })]
    })
  })

  it('keeps historical exercise snapshots after an exercise is renamed', () => {
    const exercise = createWorkoutExercise({
      title: 'Жим гантелей',
      muscleGroup: 'chest',
      description: '',
      status: 'active'
    })
    createWorkoutSession({
      programId: null,
      title: 'Грудь',
      date: '2026-08-10',
      durationMinutes: null,
      comment: '',
      exercises: [
        {
          exerciseId: exercise.id,
          comment: '',
          sets: [{ reps: 10, weightKg: 24 }]
        }
      ]
    })

    updateWorkoutExercise({
      id: exercise.id,
      title: 'Жим гантелей лёжа',
      muscleGroup: 'chest',
      description: '',
      status: 'active'
    })

    expect(listWorkoutsOverview().sessions[0]?.exercises[0]).toMatchObject({
      exerciseTitle: 'Жим гантелей',
      muscleGroup: 'chest'
    })
  })

  it('stores progress indicators independently from workout sessions', () => {
    const squat = createWorkoutExercise({
      title: 'Присед со штангой',
      muscleGroup: 'legs',
      description: '',
      status: 'active'
    })
    const entry = createWorkoutProgressEntry({
      date: '2026-08-17',
      bodyWeightKg: 78.4,
      wellbeing: 'Выспался, восстановление хорошее.',
      notes: 'Контрольная точка.',
      metrics: [{ exerciseId: squat.id, weightKg: 110, reps: 5, comment: 'RPE 8' }]
    })

    expect(entry).toMatchObject({
      bodyWeightKg: 78.4,
      metrics: [expect.objectContaining({ exerciseId: squat.id, weightKg: 110, reps: 5 })],
      photos: []
    })
  })

  it('builds broad reports by muscle group, exercise, program and workload', () => {
    const bench = createWorkoutExercise({
      title: 'Жим лёжа',
      muscleGroup: 'chest',
      description: '',
      status: 'active'
    })
    const curl = createWorkoutExercise({
      title: 'Сгибания на бицепс',
      muscleGroup: 'arms',
      description: '',
      status: 'active'
    })
    const program = createWorkoutProgram({
      name: 'Верх тела',
      description: '',
      status: 'active',
      exercises: [
        { exerciseId: bench.id, plannedSets: 2, targetReps: 8, notes: '' },
        { exerciseId: curl.id, plannedSets: 2, targetReps: 10, notes: '' }
      ]
    })

    createWorkoutSession({
      programId: program.id,
      title: '',
      date: '2026-08-01',
      durationMinutes: 60,
      comment: '',
      exercises: [
        {
          exerciseId: bench.id,
          comment: '',
          sets: [
            { reps: 8, weightKg: 70 },
            { reps: 8, weightKg: 70 }
          ]
        },
        {
          exerciseId: curl.id,
          comment: '',
          sets: [
            { reps: 10, weightKg: 15 },
            { reps: 10, weightKg: 15 }
          ]
        }
      ]
    })
    createWorkoutSession({
      programId: program.id,
      title: '',
      date: '2026-08-15',
      durationMinutes: 70,
      comment: '',
      exercises: [
        {
          exerciseId: bench.id,
          comment: '',
          sets: [
            { reps: 8, weightKg: 75 },
            { reps: 6, weightKg: 80 }
          ]
        },
        {
          exerciseId: curl.id,
          comment: '',
          sets: [
            { reps: 10, weightKg: 17.5 },
            { reps: 8, weightKg: 20 }
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
      activeDays: 2,
      sets: 8,
      durationMinutes: 130
    })
    expect(report.muscleGroups.find((item) => item.muscleGroup === 'chest')).toMatchObject({
      sets: 4,
      loadPercent: 50
    })
    expect(report.muscleGroups.find((item) => item.muscleGroup === 'arms')).toMatchObject({
      sets: 4,
      loadPercent: 50
    })
    expect(report.exercises.find((item) => item.exerciseId === bench.id)).toMatchObject({
      sessions: 2,
      sets: 4,
      firstBestWeightKg: 70,
      lastBestWeightKg: 80,
      weightChangeKg: 10
    })
    expect(report.programs[0]).toMatchObject({ programId: program.id, sessions: 2 })
    expect(report.timeline).toHaveLength(2)
    expect(report.personalRecords.some((record) => record.exerciseId === bench.id)).toBe(true)
  })
})
