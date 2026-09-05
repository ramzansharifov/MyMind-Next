import type {
  HabitRecord,
  HabitWeekday,
  HabitEntryRecord,
  HabitReportSummary
} from '@mymind/contracts/habits'

const DAY_MS = 86_400_000

export function dateParts(value: string): [number, number, number] {
  const [year, month, day] = value.split('-').map(Number)
  return [year ?? 0, month ?? 1, day ?? 1]
}

export function dateToUtc(value: string): number {
  const [year, month, day] = dateParts(value)
  return Date.UTC(year, month - 1, day)
}

export function utcToDateKey(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(
    date.getUTCDate()
  ).padStart(2, '0')}`
}

export function addDays(value: string, days: number): string {
  return utcToDateKey(dateToUtc(value) + days * DAY_MS)
}

export function daysBetween(from: string, to: string): number {
  return Math.floor((dateToUtc(to) - dateToUtc(from)) / DAY_MS)
}

export function weekdayForDate(value: string): HabitWeekday {
  const weekday = new Date(dateToUtc(value)).getUTCDay()
  return (weekday === 0 ? 7 : weekday) as HabitWeekday
}

export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

export function habitCreatedDateKey(habit: Pick<HabitRecord, 'createdAt'>): string {
  return localDateKey(new Date(habit.createdAt))
}

export function isHabitScheduledOn(habit: HabitRecord, date: string): boolean {
  const anchor = habitCreatedDateKey(habit)
  if (date < anchor) return false

  if (habit.weekdays.length > 0) {
    return habit.weekdays.includes(weekdayForDate(date))
  }

  const delta = daysBetween(anchor, date)
  return delta >= 0 && delta % habit.repeatEveryDays === 0
}

export function localDateTimeMs(date: string, time: string): number {
  const [year, month, day] = dateParts(date)
  const [hours, minutes] = time.split(':').map(Number)
  return new Date(year, month - 1, day, hours ?? 0, minutes ?? 0, 0, 0).getTime()
}

export function completionRate(summary: Pick<HabitReportSummary, 'completed' | 'missed'>): number {
  const denominator = summary.completed + summary.missed
  if (denominator === 0) return 0
  return Math.round((summary.completed / denominator) * 100)
}

export function emptySummary(): HabitReportSummary {
  return {
    scheduled: 0,
    completed: 0,
    missed: 0,
    skipped: 0,
    pending: 0,
    completionRate: 0
  }
}

export function applyOutcome(
  summary: HabitReportSummary,
  outcome: 'completed' | 'missed' | 'skipped' | 'pending'
): void {
  summary.scheduled += 1
  summary[outcome] += 1
}

export function calculateStreaks(
  scheduledDates: string[],
  entriesByDate: Map<string, HabitEntryRecord>,
  habit: HabitRecord,
  today: string
): { currentStreak: number; bestStreak: number } {
  let running = 0
  let best = 0

  for (const date of scheduledDates) {
    if (date > today) break
    const entry = entriesByDate.get(date)
    if (entry?.skipped) continue
    if (entry && entry.value >= habit.targetValue) {
      running += 1
      best = Math.max(best, running)
      continue
    }
    if (date < today) running = 0
  }

  let current = 0
  for (let index = scheduledDates.length - 1; index >= 0; index -= 1) {
    const date = scheduledDates[index]
    if (date > today) continue
    const entry = entriesByDate.get(date)
    if (entry?.skipped) continue
    if (date === today && (!entry || entry.value < habit.targetValue)) continue
    if (entry && entry.value >= habit.targetValue) {
      current += 1
      continue
    }
    break
  }

  return { currentStreak: current, bestStreak: best }
}
