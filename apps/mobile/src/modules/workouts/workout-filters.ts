import type {
  WorkoutExerciseRecord,
  WorkoutMuscleGroup,
  WorkoutProgramRecord,
  WorkoutSessionRecord
} from '@mymind/contracts/workouts'

export type WorkoutExerciseCategory = 'arms' | 'back' | 'legs' | 'core'
export type WorkoutProgramFilter = 'all' | 'custom' | string
export type WorkoutMuscleFilter = 'all' | WorkoutMuscleGroup

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
  groups: readonly WorkoutMuscleGroup[]
): WorkoutExerciseCategory {
  return CATEGORY_BY_MUSCLE_GROUP[groups[0] ?? 'arms']
}

export function filterWorkoutExercises(
  exercises: readonly WorkoutExerciseRecord[],
  query: string,
  category: 'all' | WorkoutExerciseCategory,
  muscleLabel: (group: WorkoutMuscleGroup) => string
): WorkoutExerciseRecord[] {
  const normalized = query.trim().toLocaleLowerCase('ru-RU')
  return exercises.filter((exercise) => {
    if (
      category !== 'all' &&
      workoutExerciseCategoryForGroups(exercise.muscleGroups) !== category
    ) {
      return false
    }

    if (!normalized) return true
    const muscles = exercise.muscleGroups.map(muscleLabel).join(' ')
    return `${exercise.title} ${muscles}`.toLocaleLowerCase('ru-RU').includes(normalized)
  })
}

export function filterWorkoutPrograms(
  programs: readonly WorkoutProgramRecord[],
  exercisesById: ReadonlyMap<string, WorkoutExerciseRecord>,
  query: string
): WorkoutProgramRecord[] {
  const normalized = query.trim().toLocaleLowerCase('ru-RU')
  if (!normalized) return [...programs]

  return programs.filter((program) => {
    const exerciseNames = program.exercises
      .map((item) => exercisesById.get(item.exerciseId)?.title ?? '')
      .join(' ')
    return `${program.name} ${program.description} ${exerciseNames}`
      .toLocaleLowerCase('ru-RU')
      .includes(normalized)
  })
}

export function filterWorkoutSessions(
  sessions: readonly WorkoutSessionRecord[],
  query: string,
  programFilter: WorkoutProgramFilter,
  muscleFilter: WorkoutMuscleFilter
): WorkoutSessionRecord[] {
  const normalized = query.trim().toLocaleLowerCase('ru-RU')

  return sessions.filter((session) => {
    if (programFilter !== 'all') {
      if (programFilter === 'custom' && session.programId !== null) return false
      if (programFilter !== 'custom' && session.programId !== programFilter) return false
    }

    if (
      muscleFilter !== 'all' &&
      !session.exercises.some((exercise) => exercise.muscleGroups.includes(muscleFilter))
    ) {
      return false
    }

    if (!normalized) return true
    const exerciseNames = session.exercises.map((exercise) => exercise.exerciseTitle).join(' ')
    return `${session.programName ?? ''} ${session.comment} ${exerciseNames}`
      .toLocaleLowerCase('ru-RU')
      .includes(normalized)
  })
}
