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
import { WorkoutMuscleArtwork } from './components/WorkoutMuscleArtwork'

export type WorkoutMuscleFamily = 'arms' | 'back' | 'chest' | 'abs' | 'legs'

interface WorkoutMuscleGroupOption {
  value: WorkoutMuscleGroup
  label: string
  shortLabel: string
  family: WorkoutMuscleFamily
  icon: LucideIcon
}

const MUSCLE_GROUP_LABELS: Record<WorkoutMuscleGroup, string> = {
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

export const WORKOUT_MUSCLE_FAMILY_OPTIONS: Array<{
  value: WorkoutMuscleFamily
  label: string
}> = [
  { value: 'arms', label: 'Руки' },
  { value: 'back', label: 'Спина' },
  { value: 'chest', label: 'Грудные мышцы' },
  { value: 'abs', label: 'Пресс' },
  { value: 'legs', label: 'Ноги' }
]

/** Only concrete selectable zones. Legacy broad groups are intentionally omitted. */
export const WORKOUT_MUSCLE_GROUP_OPTIONS: WorkoutMuscleGroupOption[] = [
  {
    value: 'shoulders',
    label: 'Плечи',
    shortLabel: 'Плечи',
    family: 'arms',
    icon: Activity
  },
  { value: 'biceps', label: 'Бицепс', shortLabel: 'Бицепс', family: 'arms', icon: Dumbbell },
  {
    value: 'triceps',
    label: 'Трицепс',
    shortLabel: 'Трицепс',
    family: 'arms',
    icon: Dumbbell
  },
  {
    value: 'forearms',
    label: 'Предплечья',
    shortLabel: 'Предплечья',
    family: 'arms',
    icon: Dumbbell
  },
  {
    value: 'lats',
    label: 'Широчайшие',
    shortLabel: 'Широчайшие',
    family: 'back',
    icon: Shield
  },
  {
    value: 'traps',
    label: 'Трапеции',
    shortLabel: 'Трапеции',
    family: 'back',
    icon: Shield
  },
  {
    value: 'lower_back',
    label: 'Поясница',
    shortLabel: 'Поясница',
    family: 'back',
    icon: Shield
  },
  {
    value: 'chest',
    label: 'Грудные мышцы',
    shortLabel: 'Грудь',
    family: 'chest',
    icon: HeartPulse
  },
  { value: 'abs', label: 'Пресс', shortLabel: 'Пресс', family: 'abs', icon: CircleDot },
  {
    value: 'glutes',
    label: 'Ягодицы',
    shortLabel: 'Ягодицы',
    family: 'legs',
    icon: Footprints
  },
  {
    value: 'quadriceps',
    label: 'Квадрицепсы',
    shortLabel: 'Квадрицепсы',
    family: 'legs',
    icon: Footprints
  },
  {
    value: 'hamstrings',
    label: 'Задняя поверхность бедра',
    shortLabel: 'Бицепс бедра',
    family: 'legs',
    icon: Footprints
  },
  { value: 'calves', label: 'Икры', shortLabel: 'Икры', family: 'legs', icon: Footprints }
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
  if (group === 'arms') return 'arms'
  if (group === 'back') return 'back'
  if (group === 'legs') return 'legs'
  return WORKOUT_MUSCLE_GROUP_OPTIONS.find((option) => option.value === group)?.family ?? 'arms'
}

export function workoutMuscleGroupOptionsForFamily(
  family: WorkoutMuscleFamily
): WorkoutMuscleGroupOption[] {
  return WORKOUT_MUSCLE_GROUP_OPTIONS.filter((option) => option.family === family)
}

export function workoutMuscleGroupLabel(group: WorkoutMuscleGroup): string {
  return MUSCLE_GROUP_LABELS[group] ?? group
}

export function workoutMuscleGroupsLabel(groups: WorkoutMuscleGroup[]): string {
  const unique = [...new Set(groups)]
  return unique.length ? unique.map(workoutMuscleGroupLabel).join(' · ') : 'Зоны не выбраны'
}

export function WorkoutMuscleGroupIcon({
  group,
  className
}: {
  group: WorkoutMuscleGroup
  className?: string
}): React.JSX.Element {
  return <WorkoutMuscleArtwork groups={[group]} className={className} />
}
