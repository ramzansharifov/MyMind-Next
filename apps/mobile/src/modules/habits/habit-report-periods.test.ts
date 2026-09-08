import { describe, expect, it } from 'vitest'
import {
  buildHabitHeatmapWeeks,
  defaultHabitCustomRange,
  habitReportPeriod
} from './habit-report-periods'

const referenceDate = '2026-09-08'

describe('mobile habit report periods', () => {
  it('builds inclusive 7, 30, 90 and 365 day presets', () => {
    expect(habitReportPeriod('7d', '', '', referenceDate)).toMatchObject({
      dateFrom: '2026-09-02',
      dateTo: '2026-09-08'
    })
    expect(habitReportPeriod('30d', '', '', referenceDate)).toMatchObject({
      dateFrom: '2026-08-10',
      dateTo: '2026-09-08'
    })
    expect(habitReportPeriod('90d', '', '', referenceDate)).toMatchObject({
      dateFrom: '2026-06-11',
      dateTo: '2026-09-08'
    })
    expect(habitReportPeriod('365d', '', '', referenceDate)).toMatchObject({
      dateFrom: '2025-09-09',
      dateTo: '2026-09-08'
    })
  })

  it('defaults a custom range to the last 30 inclusive days', () => {
    expect(defaultHabitCustomRange(referenceDate)).toEqual({
      from: '2026-08-10',
      to: '2026-09-08'
    })
  })

  it('accepts valid custom dates and rejects invalid or reversed ranges', () => {
    expect(habitReportPeriod('custom', '2026-02-01', '2026-02-28', referenceDate)).toEqual({
      dateFrom: '2026-02-01',
      dateTo: '2026-02-28',
      label: '2026-02-01 — 2026-02-28'
    })
    expect(() => habitReportPeriod('custom', '2026-02-31', '2026-03-01', referenceDate)).toThrow(
      /корректную дату/i
    )
    expect(() => habitReportPeriod('custom', '2026-09-09', '2026-09-08', referenceDate)).toThrow(
      /раньше начала/i
    )
  })

  it('keeps custom reports inside the shared 730 day limit', () => {
    expect(() => habitReportPeriod('custom', '2024-09-08', '2026-09-08', referenceDate)).toThrow(
      /730 дней/i
    )
    expect(habitReportPeriod('custom', '2024-09-10', '2026-09-08', referenceDate)).toMatchObject({
      dateFrom: '2024-09-10',
      dateTo: '2026-09-08'
    })
  })

  it('lays report days out as Monday-first heatmap weeks with padding', () => {
    const days = [
      { date: '2026-09-02', completionRate: 0 },
      { date: '2026-09-03', completionRate: 25 },
      { date: '2026-09-04', completionRate: 50 },
      { date: '2026-09-05', completionRate: 75 },
      { date: '2026-09-06', completionRate: 100 },
      { date: '2026-09-07', completionRate: 100 },
      { date: '2026-09-08', completionRate: 100 }
    ]
    const weeks = buildHabitHeatmapWeeks(days)

    expect(weeks).toHaveLength(2)
    expect(weeks[0].slice(0, 2)).toEqual([null, null])
    expect(weeks[0][2]?.date).toBe('2026-09-02')
    expect(weeks[1][0]?.date).toBe('2026-09-07')
    expect(weeks[1][1]?.date).toBe('2026-09-08')
    expect(weeks[1].slice(2)).toEqual([null, null, null, null, null])
  })
})
