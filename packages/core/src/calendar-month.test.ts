import { describe, expect, it } from 'vitest'
import {
  calendarAddDays,
  calendarMonthGrid,
  calendarMonthKey,
  calendarSameMonth,
  calendarShiftMonth
} from './calendar-month'

describe('calendar month calculations', () => {
  it('builds a stable Monday-first six-week grid', () => {
    const grid = calendarMonthGrid('2026-09-17')
    expect(grid.month).toBe('2026-09-01')
    expect(grid.from).toBe('2026-08-31')
    expect(grid.to).toBe('2026-10-11')
    expect(grid.days).toHaveLength(42)
    expect(grid.days.slice(0, 7)).toEqual([
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-05',
      '2026-09-06'
    ])
  })

  it('handles leap years and year boundaries', () => {
    expect(calendarAddDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(calendarAddDays('2028-02-29', 1)).toBe('2028-03-01')
    expect(calendarShiftMonth('2026-12-15', 1)).toBe('2027-01-01')
    expect(calendarShiftMonth('2027-01-15', -1)).toBe('2026-12-01')
  })

  it('normalizes arbitrary dates to month keys and identifies spillover cells', () => {
    expect(calendarMonthKey('2026-09-30')).toBe('2026-09-01')
    expect(calendarSameMonth('2026-09-30', '2026-09-01')).toBe(true)
    expect(calendarSameMonth('2026-10-01', '2026-09-01')).toBe(false)
  })

  it('rejects impossible dates and fractional offsets', () => {
    expect(() => calendarMonthGrid('2026-02-31')).toThrow('Некорректная дата')
    expect(() => calendarAddDays('2026-09-01', 1.5)).toThrow('смещение')
    expect(() => calendarShiftMonth('2026-09-01', 0.5)).toThrow('смещение')
  })
})
