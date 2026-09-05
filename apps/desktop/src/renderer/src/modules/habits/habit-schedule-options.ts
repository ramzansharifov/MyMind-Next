import type { HabitRecord, HabitWeekday } from '../../../../shared/contracts/habits'
import { habitRepeatLabel } from './habit-options'

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
