import { describe, expect, it } from 'vitest'
import { reportDateRange, shiftReportDay } from './report-period'

describe('mobile report period helpers', () => {
  it('builds desktop-aligned inclusive preset ranges', () => {
    expect(reportDateRange('7', '', '', '2026-09-08')).toEqual({
      dateFrom: '2026-09-02',
      dateTo: '2026-09-08'
    })
    expect(reportDateRange('30', '', '', '2026-09-08').dateFrom).toBe('2026-08-10')
    expect(reportDateRange('90', '', '', '2026-09-08').dateFrom).toBe('2026-06-11')
    expect(reportDateRange('365', '', '', '2026-09-08').dateFrom).toBe('2025-09-09')
  })

  it('validates custom dates and their order', () => {
    expect(reportDateRange('custom', '2026-01-31', '2026-02-02', '2026-09-08')).toEqual({
      dateFrom: '2026-01-31',
      dateTo: '2026-02-02'
    })
    expect(() => reportDateRange('custom', '2026-02-30', '2026-03-01', '2026-09-08')).toThrow(
      'календарную дату'
    )
    expect(() => reportDateRange('custom', '2026-03-02', '2026-03-01', '2026-09-08')).toThrow(
      'позже конечной'
    )
  })

  it('shifts dates safely across month and year boundaries', () => {
    expect(shiftReportDay('2026-03-01', -1)).toBe('2026-02-28')
    expect(shiftReportDay('2025-01-01', -1)).toBe('2024-12-31')
  })
})
