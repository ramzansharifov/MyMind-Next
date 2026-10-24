import { describe, expect, it } from 'vitest'
import {
  financeBreakdownWidth,
  financeChartBarSize,
  financeChartDomain,
  financeChartVisibility
} from './finance-report-presentation'

describe('mobile finance report presentation', () => {
  it('matches report-type visibility with desktop sections', () => {
    expect(financeChartVisibility('all')).toEqual({
      cashFlow: true,
      expenseBreakdown: true,
      incomeBreakdown: true,
      transfers: true
    })
    expect(financeChartVisibility('income')).toEqual({
      cashFlow: true,
      expenseBreakdown: false,
      incomeBreakdown: true,
      transfers: false
    })
    expect(financeChartVisibility('expense')).toEqual({
      cashFlow: true,
      expenseBreakdown: true,
      incomeBreakdown: false,
      transfers: false
    })
    expect(financeChartVisibility('transfer')).toEqual({
      cashFlow: false,
      expenseBreakdown: false,
      incomeBreakdown: false,
      transfers: true
    })
  })

  it('uses absolute values for a stable signed chart domain', () => {
    expect(financeChartDomain([1200, -4500, null, 900])).toBe(4500)
    expect(financeChartDomain([])).toBe(1)
    expect(financeChartDomain([0, 0])).toBe(1)
  })

  it('keeps non-zero bars visible without exceeding their chart', () => {
    expect(financeChartBarSize(0, 100, 80)).toBe(0)
    expect(financeChartBarSize(1, 100, 80)).toBe(4)
    expect(financeChartBarSize(50, 100, 80)).toBe(40)
    expect(financeChartBarSize(-200, 100, 80)).toBe(80)
  })

  it('clamps category shares to valid native percentage widths', () => {
    expect(financeBreakdownWidth(42.5)).toBe('42.5%')
    expect(financeBreakdownWidth(-5)).toBe('0%')
    expect(financeBreakdownWidth(140)).toBe('100%')
    expect(financeBreakdownWidth(Number.NaN)).toBe('0%')
  })
})
