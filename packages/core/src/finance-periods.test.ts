import { describe, expect, it } from 'vitest'
import type { FinanceLimit } from '@mymind/contracts/finance'
import {
  defaultFinancePeriod,
  previousComparablePeriod,
  resolveFinanceLimitPeriod
} from './finance-periods'

function limit(periodType: FinanceLimit['periodType']): FinanceLimit {
  return {
    id: 'limit',
    amountMinor: 1,
    currencyCode: 'TJS',
    accountIds: [],
    tagId: 'tag',
    periodType,
    warningPercent: 80,
    state: 'active',
    createdAt: 0,
    updatedAt: 0
  }
}

describe('shared Finance periods', () => {
  it('uses Monday as the start of a weekly limit', () => {
    const at = new Date(2026, 8, 6, 12, 30).getTime() // Sunday
    const period = resolveFinanceLimitPeriod(limit('week'), at)
    const from = new Date(period.from)
    const to = new Date(period.to)
    expect([from.getFullYear(), from.getMonth(), from.getDate(), from.getDay()]).toEqual([
      2026, 7, 31, 1
    ])
    expect([to.getFullYear(), to.getMonth(), to.getDate(), to.getDay()]).toEqual([2026, 8, 6, 0])
    expect(to.getHours()).toBe(23)
    expect(to.getMinutes()).toBe(59)
  })

  it('resolves day, month and year boundaries in local time', () => {
    const at = new Date(2026, 8, 6, 12).getTime()
    expect(new Date(resolveFinanceLimitPeriod(limit('day'), at).from).getHours()).toBe(0)
    expect(new Date(resolveFinanceLimitPeriod(limit('month'), at).from).getDate()).toBe(1)
    expect(new Date(resolveFinanceLimitPeriod(limit('year'), at).from).getMonth()).toBe(0)
  })

  it('creates a previous period with the same inclusive duration', () => {
    const current = { from: 100, to: 199 }
    expect(previousComparablePeriod(current)).toEqual({ from: 0, to: 99 })
  })

  it('defaults dashboard periods to current month through the current local day', () => {
    const now = new Date(2026, 8, 6, 15, 20).getTime()
    const period = defaultFinancePeriod(now)
    expect(new Date(period.from).getDate()).toBe(1)
    expect(new Date(period.to).getDate()).toBe(6)
    expect(new Date(period.to).getHours()).toBe(23)
  })
})
