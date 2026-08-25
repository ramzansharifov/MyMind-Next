import type { WorkoutMuscleGroup } from '../../../../../shared/contracts/workouts'

export type ConcreteWorkoutMuscleZone = Exclude<WorkoutMuscleGroup, 'arms' | 'back' | 'legs'>

export const WORKOUT_MUSCLE_ZONE_HINTS: Record<ConcreteWorkoutMuscleZone, string> = {
  shoulders: 'Дельтовидные',
  biceps: 'Передняя часть плеча',
  triceps: 'Задняя часть плеча',
  forearms: 'Предплечья',
  traps: 'Верх спины',
  lats: 'Боковая часть спины',
  lower_back: 'Нижняя часть спины',
  chest: 'Грудные мышцы',
  abs: 'Прямая мышца живота',
  glutes: 'Ягодичные мышцы',
  quadriceps: 'Передняя поверхность бедра',
  hamstrings: 'Задняя поверхность бедра',
  calves: 'Икроножные мышцы'
}
