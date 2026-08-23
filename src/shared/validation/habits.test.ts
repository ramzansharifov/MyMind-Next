import { describe, expect, it } from 'vitest'

import {
  createHabitInputSchema,
  habitReportInputSchema,
  upsertHabitEntryInputSchema
} from './habits'

const baseHabit = {
  title: 'Читать',
  groupId: null,
  trackingType: 'check' as const,
  targetValue: 1,
  unit: '',
  repeatEveryDays: 1,
  preferredTimes: []
}

describe('habit validation', () => {
  it('supports arbitrary recurrence intervals in days', () => {
    expect(
      createHabitInputSchema.parse({ ...baseHabit, repeatEveryDays: 10 }).repeatEveryDays
    ).toBe(10)
    expect(() => createHabitInputSchema.parse({ ...baseHabit, repeatEveryDays: 0 })).toThrow()
  })

  it('keeps check habits binary and lets count habits define a target and unit', () => {
    expect(() => createHabitInputSchema.parse({ ...baseHabit, targetValue: 2 })).toThrow(
      'Для привычки с отметкой целевое значение должно быть равно 1'
    )

    const countHabit = createHabitInputSchema.parse({
      ...baseHabit,
      trackingType: 'count',
      targetValue: 8,
      unit: 'стаканов'
    })
    expect(countHabit).toMatchObject({ trackingType: 'count', targetValue: 8, unit: 'стаканов' })
  })

  it('supports one preferred time per target unit', () => {
    const parsed = createHabitInputSchema.parse({
      ...baseHabit,
      trackingType: 'count',
      targetValue: 3,
      unit: 'приёма',
      preferredTimes: [
        { unit: 1, time: '09:00' },
        { unit: 2, time: '15:00' },
        { unit: 3, time: '21:00' }
      ]
    })

    expect(parsed.preferredTimes).toEqual([
      { unit: 1, time: '09:00' },
      { unit: 2, time: '15:00' },
      { unit: 3, time: '21:00' }
    ])
    expect(() =>
      createHabitInputSchema.parse({
        ...baseHabit,
        trackingType: 'count',
        targetValue: 2,
        preferredTimes: [{ unit: 3, time: '09:00' }]
      })
    ).toThrow('Номер единицы для времени не может превышать целевое значение')
    expect(() =>
      createHabitInputSchema.parse({
        ...baseHabit,
        trackingType: 'count',
        targetValue: 2,
        preferredTimes: [
          { unit: 1, time: '09:00' },
          { unit: 1, time: '10:00' }
        ]
      })
    ).toThrow('Для одной единицы можно указать только одно предпочтительное время')
  })

  it('rejects legacy fields removed from the habit model', () => {
    expect(() =>
      createHabitInputSchema.parse({
        ...baseHabit,
        description: 'legacy',
        status: 'active',
        startDate: '2026-08-16',
        endDate: null,
        archivedOn: null
      })
    ).toThrow()
  })

  it('limits report ranges and validates mutually exclusive group filters', () => {
    expect(() =>
      habitReportInputSchema.parse({
        dateFrom: '2024-01-01',
        dateTo: '2026-08-16',
        groupId: null,
        ungroupedOnly: false
      })
    ).toThrow('Период отчёта не может превышать 730 дней')

    expect(() =>
      habitReportInputSchema.parse({
        dateFrom: '2026-08-01',
        dateTo: '2026-08-16',
        groupId: 'group-1',
        ungroupedOnly: true
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
