import type { HabitRecord } from '../../../../shared/contracts/habits'

const DAY_MS = 86_400_000

function dateToUtc(value: string): number {
  const [year, month, day] = value.split('-').map(Number)
  return Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1)
}

function utcToDateKey(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(
    date.getUTCDate()
  ).padStart(2, '0')}`
}

export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

export function addDays(value: string, days: number): string {
  return utcToDateKey(dateToUtc(value) + days * DAY_MS)
}

export function daysBetween(from: string, to: string): number {
  return Math.floor((dateToUtc(to) - dateToUtc(from)) / DAY_MS)
}

export function isHabitScheduledOn(habit: HabitRecord, date: string): boolean {
  if (habit.status !== 'active') return false
  if (date < habit.startDate) return false
  if (habit.endDate !== null && date > habit.endDate) return false
  const delta = daysBetween(habit.startDate, date)
  return delta >= 0 && delta % habit.repeatEveryDays === 0
}

export function nextHabitDate(habit: HabitRecord, from: string): string | null {
  if (habit.status !== 'active') return null
  const effectiveFrom = from < habit.startDate ? habit.startDate : from
  const delta = daysBetween(habit.startDate, effectiveFrom)
  const remainder = delta % habit.repeatEveryDays
  const next = remainder === 0 ? effectiveFrom : addDays(effectiveFrom, habit.repeatEveryDays - remainder)

  if (habit.endDate !== null && next > habit.endDate) return null
  return next
}

export function formatHabitDate(value: string, today = localDateKey()): string {
  if (value === today) return 'Сегодня'
  if (value === addDays(today, 1)) return 'Завтра'
  if (value === addDays(today, -1)) return 'Вчера'

  const date = new Date(dateToUtc(value))
  const todayDate = new Date(dateToUtc(today))
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: date.getUTCFullYear() === todayDate.getUTCFullYear() ? undefined : 'numeric',
    timeZone: 'UTC'
  }).format(date)
}
