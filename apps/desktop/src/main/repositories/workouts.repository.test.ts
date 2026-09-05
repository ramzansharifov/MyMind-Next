import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, getSqlite, initializeDatabaseForTesting } from '../database/client'
import { runDatabaseMigrationsFrom } from '../database/migrate'
import {
  addWorkoutProgressPhoto,
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
      muscleGroups: ['biceps'],
      usesExternalWeight: true,
      status: 'active'
    })
    const row = createWorkoutExercise({
      title: 'Тяга штанги в наклоне',
      muscleGroups: ['lats', 'traps'],
      usesExternalWeight: true,
      status: 'active'
    })
    const program = createWorkoutProgram({
      name: 'Pull',
      description: 'Спина и бицепс',
      status: 'active',
      exercises: [{ exerciseId: row.id }, { exerciseId: curl.id }]
    })

    const session = createWorkoutSession({
      programId: program.id,
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

    expect(curl).toMatchObject({ muscleGroup: 'biceps', muscleGroups: ['biceps'] })
    expect(row).toMatchObject({ muscleGroup: 'lats', muscleGroups: ['lats', 'traps'] })
    expect(program.exercises).toEqual([
      expect.objectContaining({ exerciseId: row.id, position: 0 }),
      expect.objectContaining({ exerciseId: curl.id, position: 1 })
    ])
    expect(session).toMatchObject({
      programId: program.id,
      programName: 'Pull',
      totalSets: 6,
      totalReps: 53
    })
    expect(session.exercises[0]).toMatchObject({ muscleGroups: ['lats', 'traps'] })
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
      muscleGroups: ['chest'],
      usesExternalWeight: true,
      status: 'active'
    })
    createWorkoutSession({
      programId: null,
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
      muscleGroups: ['chest'],
      usesExternalWeight: true,
      status: 'active'
    })

    expect(listWorkoutsOverview().sessions[0]?.exercises[0]).toMatchObject({
      exerciseTitle: 'Жим гантелей',
      muscleGroup: 'chest',
      muscleGroups: ['chest']
    })
  })

  it('reads legacy broad muscle groups without losing compatibility', () => {
    const now = Date.now()
    getSqlite()
      .prepare(
        `INSERT INTO workout_exercises
          (id, title, muscle_group, description, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run('legacy-arms', 'Старое упражнение', 'arms', '', 'active', now, now)

    const legacy = listWorkoutsOverview().exercises.find(
      (exercise) => exercise.id === 'legacy-arms'
    )
    expect(legacy).toMatchObject({
      muscleGroup: 'shoulders',
      muscleGroups: ['shoulders', 'biceps', 'triceps', 'forearms'],
      usesExternalWeight: true
    })
  })

  it('keeps bodyweight exercises free of additional weight and snapshots the mode', () => {
    const pullUp = createWorkoutExercise({
      title: 'Подтягивания',
      muscleGroups: ['lats', 'biceps'],
      usesExternalWeight: false,
      status: 'active'
    })

    const session = createWorkoutSession({
      programId: null,
      date: '2026-08-12',
      durationMinutes: 45,
      comment: 'Работа с собственным весом',
      exercises: [
        {
          exerciseId: pullUp.id,
          comment: '',
          sets: [
            { reps: 10, weightKg: 25 },
            { reps: 8, weightKg: 25 }
          ]
        }
      ]
    })

    expect(pullUp.usesExternalWeight).toBe(false)
    expect(session).not.toHaveProperty('title')
    expect(session.exercises[0]).toMatchObject({
      usesExternalWeight: false,
      sets: [
        expect.objectContaining({ reps: 10, weightKg: 0 }),
        expect.objectContaining({ reps: 8, weightKg: 0 })
      ]
    })
    expect(session.totalVolumeKg).toBe(0)

    const bodyweightReport = getWorkoutReport({
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
      programId: null,
      exerciseId: null,
      muscleGroup: null
    })
    expect(bodyweightReport.summary).toMatchObject({
      externalWeightSets: 0,
      bodyweightSets: 2,
      bodyweightReps: 18,
      averageWeightKg: 0,
      volumeKg: 0
    })
    expect(bodyweightReport.exercises[0]).toMatchObject({
      usesExternalWeight: false,
      bestSetReps: 10,
      firstBestReps: 10,
      lastBestReps: 10,
      repsChange: 0
    })
    expect(bodyweightReport.personalRecords).toEqual([])
    expect(bodyweightReport.bodyweightRecords[0]).toMatchObject({
      exerciseId: pullUp.id,
      reps: 10
    })

    updateWorkoutExercise({
      id: pullUp.id,
      title: 'Подтягивания',
      muscleGroups: ['lats', 'biceps'],
      usesExternalWeight: true,
      status: 'active'
    })

    expect(listWorkoutsOverview().sessions[0]?.exercises[0]?.usesExternalWeight).toBe(false)
  })

  it('stores progress indicators independently from workout sessions', () => {
    const squat = createWorkoutExercise({
      title: 'Присед со штангой',
      muscleGroups: ['quadriceps', 'glutes'],
      usesExternalWeight: true,
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
      metrics: [
        expect.objectContaining({
          exerciseId: squat.id,
          muscleGroups: ['quadriceps', 'glutes'],
          usesExternalWeight: true,
          weightKg: 110,
          reps: 5
        })
      ],
      photos: []
    })
  })

  it('stores bodyweight progress without fake weight and keeps photo angles', () => {
    const pullUp = createWorkoutExercise({
      title: 'Подтягивания для прогресса',
      muscleGroups: ['lats', 'biceps'],
      usesExternalWeight: false,
      status: 'active'
    })
    const entry = createWorkoutProgressEntry({
      date: '2026-08-20',
      bodyWeightKg: 77.8,
      wellbeing: '',
      notes: '',
      metrics: [{ exerciseId: pullUp.id, weightKg: 30, reps: 12, comment: '' }]
    })

    const front = addWorkoutProgressPhoto(entry.id, 'front', {
      id: 'asset-front',
      name: 'front.jpg',
      mimeType: 'image/jpeg',
      size: 1200,
      url: 'mymind-asset://workout-progress/front.jpg'
    })
    const custom = addWorkoutProgressPhoto(entry.id, 'custom', {
      id: 'asset-custom',
      name: 'custom.jpg',
      mimeType: 'image/jpeg',
      size: 900,
      url: 'mymind-asset://workout-progress/custom.jpg'
    })

    const stored = listWorkoutsOverview().progressEntries[0]
    expect(stored?.metrics[0]).toMatchObject({
      exerciseId: pullUp.id,
      usesExternalWeight: false,
      weightKg: 0,
      reps: 12
    })
    expect(front.view).toBe('front')
    expect(custom.view).toBe('custom')
    expect(stored?.photos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: front.id, view: 'front' }),
        expect.objectContaining({ id: custom.id, view: 'custom' })
      ])
    )
  })

  it('builds broad reports by muscle group, exercise, program and workload', () => {
    const bench = createWorkoutExercise({
      title: 'Жим лёжа',
      muscleGroups: ['chest'],
      usesExternalWeight: true,
      status: 'active'
    })
    const curl = createWorkoutExercise({
      title: 'Сгибания на бицепс',
      muscleGroups: ['biceps'],
      usesExternalWeight: true,
      status: 'active'
    })
    const program = createWorkoutProgram({
      name: 'Верх тела',
      description: '',
      status: 'active',
      exercises: [{ exerciseId: bench.id }, { exerciseId: curl.id }]
    })

    createWorkoutSession({
      programId: program.id,
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
      externalWeightSets: 8,
      bodyweightSets: 0,
      durationMinutes: 130
    })
    expect(report.muscleGroups.find((item) => item.muscleGroup === 'chest')).toMatchObject({
      sets: 4,
      loadPercent: 50
    })
    expect(report.muscleGroups.find((item) => item.muscleGroup === 'biceps')).toMatchObject({
      sets: 4,
      loadPercent: 50
    })
    expect(report.exercises.find((item) => item.exerciseId === bench.id)).toMatchObject({
      muscleGroups: ['chest'],
      usesExternalWeight: true,
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
