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
  HabitRecord,
  HabitTrackingType,
  HabitWeekday
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

export const HABIT_WEEKDAY_OPTIONS: Array<{
  value: HabitWeekday
  short: string
  label: string
}> = [
  { value: 1, short: 'Пн', label: 'Понедельник' },
  { value: 2, short: 'Вт', label: 'Вторник' },
  { value: 3, short: 'Ср', label: 'Среда' },
  { value: 4, short: 'Чт', label: 'Четверг' },
  { value: 5, short: 'Пт', label: 'Пятница' },
  { value: 6, short: 'Сб', label: 'Суббота' },
  { value: 7, short: 'Вс', label: 'Воскресенье' }
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
    soft: 'bg-violet-500/10',
    text: 'text-violet-300',
    border: 'border-violet-400/25',
    dot: 'bg-violet-400'
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

const singleWeekdayLabels: Record<HabitWeekday, string> = {
  1: 'Каждый понедельник',
  2: 'Каждый вторник',
  3: 'Каждую среду',
  4: 'Каждый четверг',
  5: 'Каждую пятницу',
  6: 'Каждую субботу',
  7: 'Каждое воскресенье'
}

export function habitScheduleLabel(
  habit: Pick<HabitRecord, 'repeatEveryDays' | 'weekdays'>
): string {
  const weekdays = [...habit.weekdays].sort((left, right) => left - right)
  if (weekdays.length === 0) return habitRepeatLabel(habit.repeatEveryDays)
  if (weekdays.length === 7) return 'Каждый день'
  if (weekdays.length === 1) return singleWeekdayLabels[weekdays[0]]

  const shortByWeekday = new Map(HABIT_WEEKDAY_OPTIONS.map((item) => [item.value, item.short]))
  return `По дням: ${weekdays.map((weekday) => shortByWeekday.get(weekday)).join(', ')}`
}
