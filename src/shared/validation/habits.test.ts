import { describe, expect, it } from 'vitest'

import {
  createHabitInputSchema,
  habitReportInputSchema,
  upsertHabitEntryInputSchema
} from './habits'

const baseHabit = {
  title: 'Читать',
  description: '',
  groupId: null,
  status: 'active' as const,
  trackingType: 'check' as const,
  targetValue: 1,
  unit: '',
  repeatEveryDays: 1,
  startDate: '2026-08-16',
  endDate: null,
  preferredTime: null
}

describe('habit validation', () => {
  it('supports arbitrary recurrence intervals in days', () => {
    expect(
      createHabitInputSchema.parse({ ...baseHabit, repeatEveryDays: 10 }).repeatEveryDays
    ).toBe(10)
    expect(() => createHabitInputSchema.parse({ ...baseHabit, repeatEveryDays: 0 })).toThrow()
  })

  it('keeps check habits binary and lets count habits define a target and unit', () => {
    expect(() =>
      createHabitInputSchema.parse({ ...baseHabit, targetValue: 2 })
    ).toThrow('Для привычки с отметкой целевое значение должно быть равно 1')

    const countHabit = createHabitInputSchema.parse({
      ...baseHabit,
      trackingType: 'count',
      targetValue: 8,
      unit: 'стаканов'
    })
    expect(countHabit).toMatchObject({ trackingType: 'count', targetValue: 8, unit: 'стаканов' })
  })

  it('rejects an end date before the start date', () => {
    expect(() =>
      createHabitInputSchema.parse({
        ...baseHabit,
        startDate: '2026-08-20',
        endDate: '2026-08-19'
      })
    ).toThrow('Дата окончания не может быть раньше даты начала')
  })

  it('limits report ranges and validates mutually exclusive group filters', () => {
    expect(() =>
      habitReportInputSchema.parse({
        dateFrom: '2024-01-01',
        dateTo: '2026-08-16',
        groupId: null,
        ungroupedOnly: false,
        includeArchived: true
      })
    ).toThrow('Период отчёта не может превышать 730 дней')

    expect(() =>
      habitReportInputSchema.parse({
        dateFrom: '2026-08-01',
        dateTo: '2026-08-16',
        groupId: 'group-1',
        ungroupedOnly: true,
        includeArchived: true
      })
    ).toThrow('Нельзя одновременно выбрать группу и режим «Без группы»')
  })

  it('accepts partial progress entries', () => {
    expect(
      upsertHabitEntryInputSchema.parse({
        habitId: 'habit-1',
        date: '2026-08-16',
        value: 3,
        skipped: false
      })
    ).toMatchObject({ value: 3, skipped: false })
  })
})
