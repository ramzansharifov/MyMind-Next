import {
  BookOpen,
  Brain,
  Briefcase,
  Code2,
  Droplet,
  Dumbbell,
  Folder,
  HeartPulse,
  Home,
  Leaf,
  Moon,
  Music2,
  Sparkles,
  Sun,
  User,
  Wallet,
  type LucideIcon
} from 'lucide-react'

import type {
  HabitGroupColor,
  HabitGroupIcon,
  HabitTrackingType
} from '../../../../shared/contracts/habits'

export const HABIT_GROUP_ICON_OPTIONS: Array<{ value: HabitGroupIcon; label: string }> = [
  { value: 'folder', label: 'Папка' },
  { value: 'sparkles', label: 'Развитие' },
  { value: 'dumbbell', label: 'Спорт' },
  { value: 'book-open', label: 'Чтение' },
  { value: 'heart-pulse', label: 'Здоровье' },
  { value: 'brain', label: 'Разум' },
  { value: 'droplet', label: 'Вода' },
  { value: 'moon', label: 'Сон' },
  { value: 'sun', label: 'Утро' },
  { value: 'leaf', label: 'Баланс' },
  { value: 'music', label: 'Музыка' },
  { value: 'briefcase', label: 'Работа' },
  { value: 'home', label: 'Дом' },
  { value: 'wallet', label: 'Финансы' },
  { value: 'code', label: 'Код' },
  { value: 'user', label: 'Личное' }
]

export const HABIT_GROUP_COLOR_OPTIONS: Array<{ value: HabitGroupColor; label: string }> = [
  { value: 'violet', label: 'Фиолетовый' },
  { value: 'blue', label: 'Синий' },
  { value: 'cyan', label: 'Голубой' },
  { value: 'emerald', label: 'Изумрудный' },
  { value: 'amber', label: 'Янтарный' },
  { value: 'orange', label: 'Оранжевый' },
  { value: 'rose', label: 'Розово-красный' },
  { value: 'pink', label: 'Розовый' }
]

export const HABIT_TRACKING_OPTIONS: Array<{ value: HabitTrackingType; label: string }> = [
  { value: 'check', label: 'Простая отметка' },
  { value: 'count', label: 'Количество / прогресс' }
]

const iconByName: Record<HabitGroupIcon, LucideIcon> = {
  folder: Folder,
  sparkles: Sparkles,
  dumbbell: Dumbbell,
  'book-open': BookOpen,
  'heart-pulse': HeartPulse,
  brain: Brain,
  droplet: Droplet,
  moon: Moon,
  sun: Sun,
  leaf: Leaf,
  music: Music2,
  briefcase: Briefcase,
  home: Home,
  wallet: Wallet,
  code: Code2,
  user: User
}

export const habitGroupColorClasses: Record<
  HabitGroupColor,
  { soft: string; text: string; border: string; dot: string }
> = {
  violet: {
    soft: 'bg-accent-500/10',
    text: 'text-accent-300',
    border: 'border-accent-400/25',
    dot: 'bg-accent-400'
  },
  blue: {
    soft: 'bg-blue-500/10',
    text: 'text-blue-300',
    border: 'border-blue-400/25',
    dot: 'bg-blue-400'
  },
  cyan: {
    soft: 'bg-cyan-500/10',
    text: 'text-cyan-300',
    border: 'border-cyan-400/25',
    dot: 'bg-cyan-400'
  },
  emerald: {
    soft: 'bg-emerald-500/10',
    text: 'text-emerald-300',
    border: 'border-emerald-400/25',
    dot: 'bg-emerald-400'
  },
  amber: {
    soft: 'bg-amber-500/10',
    text: 'text-amber-300',
    border: 'border-amber-400/25',
    dot: 'bg-amber-400'
  },
  orange: {
    soft: 'bg-orange-500/10',
    text: 'text-orange-300',
    border: 'border-orange-400/25',
    dot: 'bg-orange-400'
  },
  rose: {
    soft: 'bg-rose-500/10',
    text: 'text-rose-300',
    border: 'border-rose-400/25',
    dot: 'bg-rose-400'
  },
  pink: {
    soft: 'bg-pink-500/10',
    text: 'text-pink-300',
    border: 'border-pink-400/25',
    dot: 'bg-pink-400'
  }
}

export function HabitGroupIconGlyph({
  icon,
  className
}: {
  icon: HabitGroupIcon
  className?: string
}): React.JSX.Element {
  const Icon = iconByName[icon]
  return <Icon aria-hidden="true" className={className} />
}

export function habitRepeatLabel(days: number): string {
  if (days === 1) return 'Каждый день'
  return `Каждые ${days} дн.`
}
