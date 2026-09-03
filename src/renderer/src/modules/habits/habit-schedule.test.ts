import { describe, expect, it } from 'vitest'

import type { HabitRecord } from '../../../../shared/contracts/habits'
import { isHabitScheduledOn, nextHabitDate } from './habit-schedule'

function habit(overrides: Partial<HabitRecord> = {}): HabitRecord {
  return {
    id: 'habit-1',
    title: 'Тест',
    groupId: null,
    trackingType: 'check',
    targetValue: 1,
    unit: '',
    repeatEveryDays: 3,
    weekdays: [],
    preferredTimes: [],
    remindersEnabled: false,
    createdAt: new Date(2026, 0, 1, 12, 0, 0).getTime(),
    updatedAt: new Date(2026, 0, 1, 12, 0, 0).getTime(),
    ...overrides
  }
}

describe('habit schedule', () => {
  it('keeps interval schedules anchored to creation date', () => {
    const value = habit({ repeatEveryDays: 3 })
    expect(isHabitScheduledOn(value, '2026-01-01')).toBe(true)
    expect(isHabitScheduledOn(value, '2026-01-02')).toBe(false)
    expect(isHabitScheduledOn(value, '2026-01-04')).toBe(true)
    expect(nextHabitDate(value, '2026-01-02')).toBe('2026-01-04')
  })

  it('supports Sunday-only and multi-day weekly schedules', () => {
    const sunday = habit({ weekdays: [7] })
    expect(isHabitScheduledOn(sunday, '2026-01-04')).toBe(true)
    expect(isHabitScheduledOn(sunday, '2026-01-05')).toBe(false)
    expect(nextHabitDate(sunday, '2026-01-02')).toBe('2026-01-04')

    const severalDays = habit({ weekdays: [1, 3, 5] })
    expect(isHabitScheduledOn(severalDays, '2026-01-02')).toBe(true)
    expect(isHabitScheduledOn(severalDays, '2026-01-03')).toBe(false)
    expect(isHabitScheduledOn(severalDays, '2026-01-05')).toBe(true)
  })
})
