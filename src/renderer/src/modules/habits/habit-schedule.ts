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

export function habitCreatedDateKey(habit: Pick<HabitRecord, 'createdAt'>): string {
  return localDateKey(new Date(habit.createdAt))
}

export function addDays(value: string, days: number): string {
  return utcToDateKey(dateToUtc(value) + days * DAY_MS)
}

export function daysBetween(from: string, to: string): number {
  return Math.floor((dateToUtc(to) - dateToUtc(from)) / DAY_MS)
}

export function isHabitScheduledOn(habit: HabitRecord, date: string): boolean {
  const anchor = habitCreatedDateKey(habit)
  if (date < anchor) return false
  const delta = daysBetween(anchor, date)
  return delta >= 0 && delta % habit.repeatEveryDays === 0
}

export function nextHabitDate(habit: HabitRecord, from: string): string {
  const anchor = habitCreatedDateKey(habit)
  const effectiveFrom = from < anchor ? anchor : from
  const delta = daysBetween(anchor, effectiveFrom)
  const remainder = delta % habit.repeatEveryDays
  return remainder === 0 ? effectiveFrom : addDays(effectiveFrom, habit.repeatEveryDays - remainder)
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
