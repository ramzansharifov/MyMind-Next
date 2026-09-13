import { describe, expect, it } from 'vitest'
import type {
  WorkoutExerciseRecord,
  WorkoutProgramRecord,
  WorkoutSessionRecord
} from '@mymind/contracts/workouts'
import {
  filterWorkoutExercises,
  filterWorkoutPrograms,
  filterWorkoutSessions,
  workoutExerciseCategoryForGroups
} from './workout-filters'

const exercise = (
  id: string,
  title: string,
  muscleGroups: WorkoutExerciseRecord['muscleGroups']
): WorkoutExerciseRecord => ({
  id,
  title,
  muscleGroup: muscleGroups[0] ?? 'shoulders',
  muscleGroups,
  usesExternalWeight: true,
  status: 'active',
  createdAt: 1,
  updatedAt: 1
})

describe('workout desktop parity filters', () => {
  it('groups exercises by the same primary muscle categories as desktop', () => {
    expect(workoutExerciseCategoryForGroups(['biceps'])).toBe('arms')
    expect(workoutExerciseCategoryForGroups(['lats'])).toBe('back')
    expect(workoutExerciseCategoryForGroups(['quadriceps'])).toBe('legs')
    expect(workoutExerciseCategoryForGroups(['chest'])).toBe('core')
  })

  it('filters exercises by category and searchable muscle label', () => {
    const items = [
      exercise('curl', 'Сгибание рук', ['biceps']),
      exercise('row', 'Тяга', ['lats'])
    ]

    expect(filterWorkoutExercises(items, '', 'arms', (group) => group).map((item) => item.id)).toEqual([
      'curl'
    ])
    expect(filterWorkoutExercises(items, 'lats', 'all', (group) => group).map((item) => item.id)).toEqual([
      'row'
    ])
  })

  it('searches programs by exercises included in the program', () => {
    const exercises = [exercise('curl', 'Сгибание рук', ['biceps'])]
    const programs: WorkoutProgramRecord[] = [
      {
        id: 'program',
        name: 'День рук',
        description: '',
        status: 'active',
        exercises: [{ id: 'link', exerciseId: 'curl', position: 0 }],
        createdAt: 1,
        updatedAt: 1
      }
    ]

    expect(
      filterWorkoutPrograms(programs, new Map(exercises.map((item) => [item.id, item])), 'сгибание')
    ).toHaveLength(1)
  })

  it('filters sessions by program and muscle group before text search', () => {
    const sessions: WorkoutSessionRecord[] = [
      {
        id: 'program-session',
        programId: 'p1',
        programName: 'Сила',
        date: '2026-09-13',
        durationMinutes: 30,
        comment: '',
        exercises: [
          {
            id: 'se1',
            exerciseId: 'curl',
            exerciseTitle: 'Сгибание рук',
            muscleGroup: 'biceps',
            muscleGroups: ['biceps'],
            usesExternalWeight: true,
            position: 0,
            comment: '',
            sets: []
          }
        ],
        totalSets: 0,
        totalReps: 0,
        totalVolumeKg: 0,
        createdAt: 1,
        updatedAt: 1
      },
      {
        id: 'custom-session',
        programId: null,
        programName: null,
        date: '2026-09-13',
        durationMinutes: 20,
        comment: 'спина',
        exercises: [
          {
            id: 'se2',
            exerciseId: 'row',
            exerciseTitle: 'Тяга',
            muscleGroup: 'lats',
            muscleGroups: ['lats'],
            usesExternalWeight: true,
            position: 0,
            comment: '',
            sets: []
          }
        ],
        totalSets: 0,
        totalReps: 0,
        totalVolumeKg: 0,
        createdAt: 1,
        updatedAt: 1
      }
    ]

    expect(filterWorkoutSessions(sessions, '', 'custom', 'all').map((item) => item.id)).toEqual([
      'custom-session'
    ])
    expect(filterWorkoutSessions(sessions, '', 'all', 'biceps').map((item) => item.id)).toEqual([
      'program-session'
    ])
  })
})
