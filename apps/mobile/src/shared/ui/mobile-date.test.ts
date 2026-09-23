import { describe, expect, it } from 'vitest'

import {
  datePickerDays,
  datePickerReference,
  datePickerWeeks,
  dateWithinBounds,
  formatMobileDate,
  isValidDateKey
} from './mobile-date'

describe('mobile date helpers', () => {
  it('formats stored ISO dates like the desktop date controls', () => {
    expect(formatMobileDate('2026-09-23')).toBe('23.09.2026')
  })

  it('rejects impossible dates', () => {
    expect(isValidDateKey('2026-02-29')).toBe(false)
    expect(isValidDateKey('2026-02-28')).toBe(true)
  })

  it('uses a stable fallback reference for empty optional fields', () => {
    expect(datePickerReference('', '2026-01-01', '2026-12-31', '2026-09-23')).toBe('2026-12-31')
    expect(datePickerReference('', undefined, undefined, '2026-09-23')).toBe('2026-09-23')
  })

  it('respects min and max bounds', () => {
    expect(dateWithinBounds('2026-09-23', '2026-09-01', '2026-09-30')).toBe(true)
    expect(dateWithinBounds('2026-10-01', '2026-09-01', '2026-09-30')).toBe(false)
  })

  it('builds the same six-week monday-first calendar grid as desktop', () => {
    const days = datePickerDays('2026-09-01')
    expect(days).toHaveLength(42)
    expect(days[0]).toBe('2026-08-31')
    expect(days[41]).toBe('2026-10-11')
  })

  it('splits the calendar into exactly six rows with seven columns each', () => {
    const weeks = datePickerWeeks('2026-09-01')
    expect(weeks).toHaveLength(6)
    expect(weeks.every((week) => week.length === 7)).toBe(true)
    expect(weeks[0]).toEqual([
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-05',
      '2026-09-06'
    ])
  })
})
