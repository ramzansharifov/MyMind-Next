import type { MobileFinanceReportType } from './finance-report-filters'

export interface FinanceChartVisibility {
  cashFlow: boolean
  expenseBreakdown: boolean
  incomeBreakdown: boolean
  transfers: boolean
}

export function financeChartVisibility(type: MobileFinanceReportType): FinanceChartVisibility {
  return {
    cashFlow: type !== 'transfer',
    expenseBreakdown: type === 'all' || type === 'expense',
    incomeBreakdown: type === 'all' || type === 'income',
    transfers: type === 'all' || type === 'transfer'
  }
}

export function financeChartDomain(values: Array<number | null | undefined>): number {
  return Math.max(1, ...values.map((value) => Math.abs(value ?? 0)))
}

export function financeChartBarSize(
  value: number | null | undefined,
  domain: number,
  maxSize: number,
  minVisibleSize = 4
): number {
  const amount = Math.abs(value ?? 0)
  if (amount === 0) return 0
  const safeDomain = Math.max(1, Math.abs(domain))
  const safeMaxSize = Math.max(0, maxSize)
  if (safeMaxSize === 0) return 0
  return Math.min(
    safeMaxSize,
    Math.max(Math.min(minVisibleSize, safeMaxSize), (amount / safeDomain) * safeMaxSize)
  )
}

export function financeBreakdownWidth(sharePercent: number): `${number}%` {
  const value = Number.isFinite(sharePercent) ? sharePercent : 0
  return `${Math.max(0, Math.min(100, value))}%`
}
