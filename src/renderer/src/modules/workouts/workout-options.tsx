import {
  Activity,
  CircleDot,
  Dumbbell,
  Footprints,
  HeartPulse,
  Shield,
  type LucideIcon
} from 'lucide-react'

import type { WorkoutMuscleGroup } from '../../../../shared/contracts/workouts'

export type WorkoutMuscleFamily = 'arms' | 'back' | 'chest' | 'abs' | 'legs'

interface WorkoutMuscleGroupOption {
  value: WorkoutMuscleGroup
  label: string
  shortLabel: string
  family: WorkoutMuscleFamily
  icon: LucideIcon
}

export const WORKOUT_MUSCLE_FAMILY_OPTIONS: Array<{
  value: WorkoutMuscleFamily
  label: string
}> = [
  { value: 'arms', label: 'Руки' },
  { value: 'back', label: 'Спина' },
  { value: 'legs', label: 'Ноги' },
  { value: 'chest', label: 'Грудные мышцы' },
  { value: 'abs', label: 'Пресс' }
]

export const WORKOUT_MUSCLE_GROUP_OPTIONS: WorkoutMuscleGroupOption[] = [
  { value: 'arms', label: 'Руки', shortLabel: 'Вся группа', family: 'arms', icon: Dumbbell },
  {
    value: 'shoulders',
    label: 'Руки · Плечи',
    shortLabel: 'Плечи',
    family: 'arms',
    icon: Activity
  },
  { value: 'biceps', label: 'Руки · Бицепс', shortLabel: 'Бицепс', family: 'arms', icon: Dumbbell },
  {
    value: 'triceps',
    label: 'Руки · Трицепс',
    shortLabel: 'Трицепс',
    family: 'arms',
    icon: Dumbbell
  },
  {
    value: 'forearms',
    label: 'Руки · Предплечье',
    shortLabel: 'Предплечье',
    family: 'arms',
    icon: Dumbbell
  },
  { value: 'back', label: 'Спина', shortLabel: 'Вся спина', family: 'back', icon: Shield },
  {
    value: 'lats',
    label: 'Спина · Широчайшие',
    shortLabel: 'Широчайшие',
    family: 'back',
    icon: Shield
  },
  {
    value: 'traps',
    label: 'Спина · Трапеции',
    shortLabel: 'Трапеции',
    family: 'back',
    icon: Shield
  },
  {
    value: 'lower_back',
    label: 'Спина · Поясница',
    shortLabel: 'Поясница',
    family: 'back',
    icon: Shield
  },
  { value: 'legs', label: 'Ноги', shortLabel: 'Все ноги', family: 'legs', icon: Footprints },
  {
    value: 'glutes',
    label: 'Ноги · Ягодицы',
    shortLabel: 'Ягодицы',
    family: 'legs',
    icon: Footprints
  },
  {
    value: 'quadriceps',
    label: 'Ноги · Квадрицепсы',
    shortLabel: 'Квадрицепсы',
    family: 'legs',
    icon: Footprints
  },
  {
    value: 'hamstrings',
    label: 'Ноги · Задняя поверхность бедра',
    shortLabel: 'Задняя поверхность бедра',
    family: 'legs',
    icon: Footprints
  },
  { value: 'calves', label: 'Ноги · Икры', shortLabel: 'Икры', family: 'legs', icon: Footprints },
  {
    value: 'chest',
    label: 'Грудные мышцы',
    shortLabel: 'Грудные мышцы',
    family: 'chest',
    icon: HeartPulse
  },
  { value: 'abs', label: 'Пресс', shortLabel: 'Пресс', family: 'abs', icon: CircleDot }
]

const armsClasses = {
  soft: 'bg-violet-500/10',
  text: 'text-violet-300',
  border: 'border-violet-400/20',
  bar: 'bg-violet-400'
}
const backClasses = {
  soft: 'bg-blue-500/10',
  text: 'text-blue-300',
  border: 'border-blue-400/20',
  bar: 'bg-blue-400'
}
const chestClasses = {
  soft: 'bg-rose-500/10',
  text: 'text-rose-300',
  border: 'border-rose-400/20',
  bar: 'bg-rose-400'
}
const absClasses = {
  soft: 'bg-amber-500/10',
  text: 'text-amber-300',
  border: 'border-amber-400/20',
  bar: 'bg-amber-400'
}
const legsClasses = {
  soft: 'bg-emerald-500/10',
  text: 'text-emerald-300',
  border: 'border-emerald-400/20',
  bar: 'bg-emerald-400'
}

export const workoutMuscleGroupClasses: Record<
  WorkoutMuscleGroup,
  { soft: string; text: string; border: string; bar: string }
> = {
  arms: armsClasses,
  shoulders: armsClasses,
  biceps: armsClasses,
  triceps: armsClasses,
  forearms: armsClasses,
  back: backClasses,
  lats: backClasses,
  traps: backClasses,
  lower_back: backClasses,
  chest: chestClasses,
  abs: absClasses,
  legs: legsClasses,
  glutes: legsClasses,
  quadriceps: legsClasses,
  hamstrings: legsClasses,
  calves: legsClasses
}

export function workoutMuscleFamilyForGroup(group: WorkoutMuscleGroup): WorkoutMuscleFamily {
  return WORKOUT_MUSCLE_GROUP_OPTIONS.find((option) => option.value === group)?.family ?? 'arms'
}

export function workoutMuscleGroupOptionsForFamily(
  family: WorkoutMuscleFamily
): WorkoutMuscleGroupOption[] {
  return WORKOUT_MUSCLE_GROUP_OPTIONS.filter((option) => option.family === family)
}

export function workoutMuscleGroupLabel(group: WorkoutMuscleGroup): string {
  return WORKOUT_MUSCLE_GROUP_OPTIONS.find((option) => option.value === group)?.label ?? group
}

export function WorkoutMuscleGroupIcon({
  group,
  className
}: {
  group: WorkoutMuscleGroup
  className?: string
}): React.JSX.Element {
  const Icon =
    WORKOUT_MUSCLE_GROUP_OPTIONS.find((option) => option.value === group)?.icon ?? Dumbbell
  return <Icon aria-hidden="true" className={className} />
}
