from pathlib import Path


options_path = Path('src/renderer/src/modules/workouts/workout-options.tsx')
options = options_path.read_text(encoding='utf-8')
options = options.replace(
    "export type WorkoutMuscleFamily = 'arms' | 'back' | 'chest' | 'abs' | 'legs'\nexport type WorkoutExerciseCategory = 'arms' | 'back' | 'legs' | 'core'\n",
    "export type WorkoutMuscleFamily = 'arms' | 'back' | 'chest' | 'abs' | 'legs'\n",
    1,
)
category_block = """export const WORKOUT_EXERCISE_CATEGORY_OPTIONS: Array<{
  value: WorkoutExerciseCategory
  label: string
}> = [
  { value: 'arms', label: 'Руки' },
  { value: 'back', label: 'Спина' },
  { value: 'legs', label: 'Ноги' },
  { value: 'core', label: 'Корпус' }
]

const WORKOUT_EXERCISE_CATEGORY_BY_GROUP: Record<WorkoutMuscleGroup, WorkoutExerciseCategory> = {
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
  return WORKOUT_EXERCISE_CATEGORY_BY_GROUP[groups[0] ?? 'arms']
}

"""
if category_block not in options:
    raise SystemExit('generated workout category block not found')
options_path.write_text(options.replace(category_block, '', 1), encoding='utf-8')

category_module = """import type { WorkoutMuscleGroup } from '../../../../shared/contracts/workouts'

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
"""
Path('src/renderer/src/modules/workouts/workout-exercise-categories.ts').write_text(
    category_module, encoding='utf-8'
)

page_path = Path('src/renderer/src/modules/workouts/WorkoutsPage.tsx')
page = page_path.read_text(encoding='utf-8')
generated_import = """import {
  WORKOUT_EXERCISE_CATEGORY_OPTIONS,
  WORKOUT_MUSCLE_GROUP_OPTIONS,
  workoutExerciseCategoryForGroups,
  workoutMuscleGroupClasses,
  workoutMuscleGroupLabel,
  workoutMuscleGroupsLabel,
  type WorkoutExerciseCategory
} from './workout-options'
"""
replacement_import = """import {
  WORKOUT_EXERCISE_CATEGORY_OPTIONS,
  workoutExerciseCategoryForGroups,
  type WorkoutExerciseCategory
} from './workout-exercise-categories'
import {
  WORKOUT_MUSCLE_GROUP_OPTIONS,
  workoutMuscleGroupClasses,
  workoutMuscleGroupLabel,
  workoutMuscleGroupsLabel
} from './workout-options'
"""
if generated_import not in page:
    raise SystemExit('generated WorkoutsPage category import not found')
page_path.write_text(page.replace(generated_import, replacement_import, 1), encoding='utf-8')
