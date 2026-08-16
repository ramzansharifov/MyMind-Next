import {
  Bell,
  BookOpen,
  Briefcase,
  Dumbbell,
  Folder,
  HeartPulse,
  Home,
  Plane,
  Rocket,
  ShoppingCart,
  User,
  Wallet,
  type LucideIcon
} from 'lucide-react'

import type {
  TaskGroupColor,
  TaskGroupIcon,
  TaskPriority
} from '../../../../shared/contracts/tasks'

export const TASK_PRIORITY_OPTIONS: Array<{ value: TaskPriority; label: string }> = [
  { value: 'low', label: 'Низкий' },
  { value: 'normal', label: 'Обычный' },
  { value: 'high', label: 'Высокий' }
]

export const TASK_GROUP_ICON_OPTIONS: Array<{
  value: TaskGroupIcon
  label: string
  icon: LucideIcon
}> = [
  { value: 'folder', label: 'Общее', icon: Folder },
  { value: 'briefcase', label: 'Работа', icon: Briefcase },
  { value: 'home', label: 'Дом', icon: Home },
  { value: 'user', label: 'Личное', icon: User },
  { value: 'shopping-cart', label: 'Покупки', icon: ShoppingCart },
  { value: 'wallet', label: 'Финансы', icon: Wallet },
  { value: 'book-open', label: 'Учёба', icon: BookOpen },
  { value: 'heart-pulse', label: 'Здоровье', icon: HeartPulse },
  { value: 'dumbbell', label: 'Спорт', icon: Dumbbell },
  { value: 'plane', label: 'Путешествия', icon: Plane },
  { value: 'rocket', label: 'Проекты', icon: Rocket },
  { value: 'bell', label: 'Напоминания', icon: Bell }
]

export const TASK_GROUP_COLOR_OPTIONS: Array<{ value: TaskGroupColor; label: string }> = [
  { value: 'violet', label: 'Фиолетовый' },
  { value: 'blue', label: 'Синий' },
  { value: 'cyan', label: 'Голубой' },
  { value: 'emerald', label: 'Изумрудный' },
  { value: 'amber', label: 'Янтарный' },
  { value: 'orange', label: 'Оранжевый' },
  { value: 'rose', label: 'Розовый' },
  { value: 'pink', label: 'Малиновый' }
]

const groupIconMap = Object.fromEntries(
  TASK_GROUP_ICON_OPTIONS.map((option) => [option.value, option.icon])
) as Record<TaskGroupIcon, LucideIcon>

export const taskGroupColorClasses: Record<
  TaskGroupColor,
  { soft: string; text: string; dot: string; border: string }
> = {
  violet: {
    soft: 'bg-violet-500/12',
    text: 'text-violet-300',
    dot: 'bg-violet-400',
    border: 'border-violet-400/25'
  },
  blue: {
    soft: 'bg-blue-500/12',
    text: 'text-blue-300',
    dot: 'bg-blue-400',
    border: 'border-blue-400/25'
  },
  cyan: {
    soft: 'bg-cyan-500/12',
    text: 'text-cyan-300',
    dot: 'bg-cyan-400',
    border: 'border-cyan-400/25'
  },
  emerald: {
    soft: 'bg-emerald-500/12',
    text: 'text-emerald-300',
    dot: 'bg-emerald-400',
    border: 'border-emerald-400/25'
  },
  amber: {
    soft: 'bg-amber-500/12',
    text: 'text-amber-300',
    dot: 'bg-amber-400',
    border: 'border-amber-400/25'
  },
  orange: {
    soft: 'bg-orange-500/12',
    text: 'text-orange-300',
    dot: 'bg-orange-400',
    border: 'border-orange-400/25'
  },
  rose: {
    soft: 'bg-rose-500/12',
    text: 'text-rose-300',
    dot: 'bg-rose-400',
    border: 'border-rose-400/25'
  },
  pink: {
    soft: 'bg-pink-500/12',
    text: 'text-pink-300',
    dot: 'bg-pink-400',
    border: 'border-pink-400/25'
  }
}

export function TaskGroupIconGlyph({
  icon,
  className
}: {
  icon: TaskGroupIcon
  className?: string
}): React.JSX.Element {
  const Icon = groupIconMap[icon]
  return <Icon aria-hidden="true" className={className} />
}

export function taskPriorityLabel(priority: TaskPriority): string {
  return TASK_PRIORITY_OPTIONS.find((option) => option.value === priority)?.label ?? priority
}

export function taskPriorityClassName(priority: TaskPriority): string {
  if (priority === 'high') {
    return 'border-rose-400/20 bg-rose-500/10 text-rose-200'
  }
  if (priority === 'low') {
    return 'border-sky-400/20 bg-sky-500/10 text-sky-200'
  }
  return 'border-[var(--app-border)] bg-[var(--app-control)] text-[var(--app-muted)]'
}
