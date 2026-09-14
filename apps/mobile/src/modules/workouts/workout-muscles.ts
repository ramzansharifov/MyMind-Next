import type { WorkoutMuscleGroup, WorkoutMuscleZone } from '@mymind/contracts/workouts'

const LABELS: Record<WorkoutMuscleGroup, string> = {
  arms: 'Руки',
  shoulders: 'Плечи',
  biceps: 'Бицепс',
  triceps: 'Трицепс',
  forearms: 'Предплечья',
  back: 'Спина',
  lats: 'Широчайшие',
  traps: 'Трапеции',
  lower_back: 'Поясница',
  chest: 'Грудные мышцы',
  abs: 'Пресс',
  legs: 'Ноги',
  glutes: 'Ягодицы',
  quadriceps: 'Квадрицепсы',
  hamstrings: 'Задняя поверхность бедра',
  calves: 'Икры'
}

const LEGACY_EXPANSIONS: Partial<Record<WorkoutMuscleGroup, WorkoutMuscleZone[]>> = {
  arms: ['shoulders', 'biceps', 'triceps', 'forearms'],
  back: ['traps', 'lats', 'lower_back'],
  legs: ['glutes', 'quadriceps', 'hamstrings', 'calves']
}

export function workoutMuscleLabel(group: WorkoutMuscleGroup): string {
  return LABELS[group] ?? group
}

export function expandWorkoutMuscleGroups(
  groups: readonly WorkoutMuscleGroup[]
): WorkoutMuscleZone[] {
  const result: WorkoutMuscleZone[] = []
  for (const group of groups) {
    const expanded = LEGACY_EXPANSIONS[group] ?? [group as WorkoutMuscleZone]
    for (const zone of expanded) {
      if (!result.includes(zone)) result.push(zone)
    }
  }
  return result
}
