import type { WorkoutMuscleGroup } from '../../../../shared/contracts/workouts'

export type WorkoutExerciseCategory = 'arms' | 'back' | 'legs' | 'core'

export const WORKOUT_EXERCISE_CATEGORY_OPTIONS: Array<{
  value: WorkoutExerciseCategory
  label: string
}> = [
  { value: 'arms', label: 'Руки' },
  { value: 'back', label: 'Спина' },
  { value: 'legs', label: 'Ноги' },
  { value: 'core', label: 'Корпус' }
]

const CATEGORY_BY_MUSCLE_GROUP: Record<WorkoutMuscleGroup, WorkoutExerciseCategory> = {
  arms: 'arms',
  shoulders: 'arms',
  biceps: 'arms',
  triceps: 'arms',
  forearms: 'arms',
  back: 'back',
  lats: 'back',
  traps: 'back',
  lower_back: 'back',
  chest: 'core',
  abs: 'core',
  legs: 'legs',
  glutes: 'legs',
  quadriceps: 'legs',
  hamstrings: 'legs',
  calves: 'legs'
}

export function workoutExerciseCategoryForGroups(
  groups: WorkoutMuscleGroup[]
): WorkoutExerciseCategory {
  return CATEGORY_BY_MUSCLE_GROUP[groups[0] ?? 'arms']
}
