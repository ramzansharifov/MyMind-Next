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
import type { TaskGroupIcon, TaskPriority } from '../../../../shared/contracts/tasks'

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
