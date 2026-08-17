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

export const WORKOUT_MUSCLE_GROUP_OPTIONS: Array<{
  value: WorkoutMuscleGroup
  label: string
  icon: LucideIcon
}> = [
  { value: 'arms', label: 'Руки', icon: Dumbbell },
  { value: 'back', label: 'Спина', icon: Shield },
  { value: 'chest', label: 'Грудные', icon: HeartPulse },
  { value: 'abs', label: 'Пресс', icon: CircleDot },
  { value: 'legs', label: 'Ноги', icon: Footprints },
  { value: 'shoulders', label: 'Плечи', icon: Activity }
]

export const workoutMuscleGroupClasses: Record<
  WorkoutMuscleGroup,
  { soft: string; text: string; border: string; bar: string }
> = {
  arms: {
    soft: 'bg-violet-500/10',
    text: 'text-violet-300',
    border: 'border-violet-400/20',
    bar: 'bg-violet-400'
  },
  back: {
    soft: 'bg-blue-500/10',
    text: 'text-blue-300',
    border: 'border-blue-400/20',
    bar: 'bg-blue-400'
  },
  chest: {
    soft: 'bg-rose-500/10',
    text: 'text-rose-300',
    border: 'border-rose-400/20',
    bar: 'bg-rose-400'
  },
  abs: {
    soft: 'bg-amber-500/10',
    text: 'text-amber-300',
    border: 'border-amber-400/20',
    bar: 'bg-amber-400'
  },
  legs: {
    soft: 'bg-emerald-500/10',
    text: 'text-emerald-300',
    border: 'border-emerald-400/20',
    bar: 'bg-emerald-400'
  },
  shoulders: {
    soft: 'bg-cyan-500/10',
    text: 'text-cyan-300',
    border: 'border-cyan-400/20',
    bar: 'bg-cyan-400'
  }
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
