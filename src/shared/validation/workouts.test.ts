import { describe, expect, it } from 'vitest'

import {
  createWorkoutExerciseInputSchema,
  createWorkoutProgramInputSchema,
  createWorkoutSessionInputSchema,
  workoutReportInputSchema
} from './workouts'

const exerciseId = '123e4567-e89b-12d3-a456-426614174000'

describe('workouts validation', () => {
  it('accepts fixed muscle groups for exercises', () => {
    expect(
      createWorkoutExerciseInputSchema.parse({
        title: 'Сгибания на бицепс с гантелями',
        muscleGroup: 'arms',
        description: '',
        status: 'active'
      })
    ).toMatchObject({ muscleGroup: 'arms' })

    expect(() =>
      createWorkoutExerciseInputSchema.parse({
        title: 'Упражнение',
        muscleGroup: 'forearms',
        description: '',
        status: 'active'
      })
    ).toThrow()
  })

  it('rejects duplicated exercises inside a program', () => {
    expect(() =>
      createWorkoutProgramInputSchema.parse({
        name: 'Руки',
        description: '',
        status: 'active',
        exercises: [
          { exerciseId, plannedSets: 3, targetReps: 10, notes: '' },
          { exerciseId, plannedSets: 4, targetReps: 8, notes: '' }
        ]
      })
    ).toThrow('Одно упражнение нельзя добавлять в программу несколько раз')
  })

  it('validates every set in a workout record', () => {
    const parsed = createWorkoutSessionInputSchema.parse({
      programId: null,
      title: 'Свободная тренировка',
      date: '2026-08-17',
      durationMinutes: 70,
      comment: '',
      exercises: [
        {
          exerciseId,
          comment: 'Хорошая техника',
          sets: [
            { reps: 12, weightKg: 14 },
            { reps: 10, weightKg: 16 }
          ]
        }
      ]
    })

    expect(parsed.exercises[0]?.sets).toHaveLength(2)
    expect(() =>
      createWorkoutSessionInputSchema.parse({
        ...parsed,
        exercises: [{ exerciseId, comment: '', sets: [{ reps: 0, weightKg: 10 }] }]
      })
    ).toThrow()
  })

  it('requires a valid report range', () => {
    expect(() =>
      workoutReportInputSchema.parse({
        dateFrom: '2026-08-18',
        dateTo: '2026-08-17',
        programId: null,
        exerciseId: null,
        muscleGroup: null
      })
    ).toThrow('Начальная дата не может быть позже конечной')
  })
})
