import { describe, expect, it } from 'vitest'
import type { HabitRecord, HabitEntryRecord } from '@mymind/contracts/habits'
import { calculateStreaks, isHabitScheduledOn } from './habits'

const habit: HabitRecord = {
  id: 'h',
  title: 'Чтение',
  groupId: null,
  trackingType: 'check',
  targetValue: 1,
  unit: '',
  repeatEveryDays: 2,
  weekdays: [],
  preferredTimes: [],
  remindersEnabled: false,
  createdAt: new Date(2026, 8, 1).getTime(),
  updatedAt: 0
}
describe('shared habit rules', () => {
  it('uses weekdays instead of interval, and never schedules before creation', () => {
    expect(isHabitScheduledOn(habit, '2026-08-30')).toBe(false)
    expect(isHabitScheduledOn(habit, '2026-09-02')).toBe(false)
    expect(isHabitScheduledOn(habit, '2026-09-03')).toBe(true)
    expect(isHabitScheduledOn({ ...habit, weekdays: [3] }, '2026-09-02')).toBe(true)
    expect(isHabitScheduledOn({ ...habit, weekdays: [3] }, '2026-09-03')).toBe(false)
  })
  it('ignores skips and an unfinished today, but breaks on a past missed day', () => {
    const dates = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04']
    const entry = (date: string, value: number, skipped = false): HabitEntryRecord => ({
      id: date,
      habitId: 'h',
      date,
      value,
      skipped,
      createdAt: 0,
      updatedAt: 0
    })
    const entries = new Map([
      ['2026-09-01', entry('2026-09-01', 1)],
      ['2026-09-02', entry('2026-09-02', 0, true)],
      ['2026-09-03', entry('2026-09-03', 1)]
    ])
    expect(calculateStreaks(dates, entries, habit, '2026-09-04')).toEqual({
      currentStreak: 2,
      bestStreak: 2
    })
    expect(calculateStreaks(dates, entries, habit, '2026-09-05')).toEqual({
      currentStreak: 0,
      bestStreak: 2
    })
  })
})
