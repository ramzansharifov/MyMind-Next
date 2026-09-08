import { describe, expect, it } from 'vitest'
import type { FinanceTagSummary } from '@mymind/contracts/finance'
import {
  availableFinanceReportTags,
  buildFinanceReportFilters,
  defaultFinanceCustomRange,
  financeReportPeriod,
  normalizeFinanceReportTagId,
  parseFinanceDateInput
} from './finance-report-filters'

function tag(id: string, type: FinanceTagSummary['type']): FinanceTagSummary {
  return {
    id,
    name: id,
    type,
    icon: 'tag',
    color: '#000000',
    createdAt: 1,
    updatedAt: 1,
    transactionCount: 0,
    totalAmountMinor: 0,
    averageAmountMinor: 0,
    linkedLimitCount: 0,
    sharePercent: 0
  }
}

const now = new Date(2026, 8, 8, 12, 30)
const tags = [tag('income', 'income'), tag('expense', 'expense'), tag('both', 'both')]

describe('mobile finance report filters', () => {
  it('matches desktop quick periods including previous month', () => {
    const previous = financeReportPeriod('previous-month', '', '', now)
    expect(previous.dateFrom).toBe(new Date(2026, 7, 1).getTime())
    expect(previous.dateTo).toBe(new Date(2026, 7, 31, 23, 59, 59, 999).getTime())

    const seven = financeReportPeriod('7d', '', '', now)
    expect(seven.dateFrom).toBe(new Date(2026, 8, 2).getTime())
    expect(seven.dateTo).toBe(new Date(2026, 8, 8, 23, 59, 59, 999).getTime())
  })

  it('parses custom local-day boundaries and rejects invalid ranges', () => {
    expect(parseFinanceDateInput('2026-09-01')).toBe(new Date(2026, 8, 1).getTime())
    expect(parseFinanceDateInput('2026-09-08', true)).toBe(
      new Date(2026, 8, 8, 23, 59, 59, 999).getTime()
    )
    expect(() => financeReportPeriod('custom', '2026-09-09', '2026-09-08', now)).toThrow(
      /начальная дата/i
    )
    expect(() => parseFinanceDateInput('2026-02-31')).toThrow(/существующую дату/i)
    expect(defaultFinanceCustomRange(now)).toEqual({ from: '2026-09-01', to: '2026-09-08' })
  })

  it('filters available tags exactly like desktop reports', () => {
    expect(availableFinanceReportTags(tags, 'income').map((item) => item.id)).toEqual([
      'income',
      'both'
    ])
    expect(availableFinanceReportTags(tags, 'expense').map((item) => item.id)).toEqual([
      'expense',
      'both'
    ])
    expect(availableFinanceReportTags(tags, 'transfer')).toEqual([])
    expect(normalizeFinanceReportTagId(tags, 'income', 'expense')).toBe('all')
    expect(normalizeFinanceReportTagId(tags, 'expense', 'both')).toBe('both')
  })

  it('maps account, tag and source filters to the shared report contract', () => {
    const result = buildFinanceReportFilters(
      {
        range: 'custom',
        customFrom: '2026-08-01',
        customTo: '2026-08-31',
        type: 'expense',
        accountId: 'account-1',
        tagId: 'tag-1',
        source: 'template',
        currencyCode: 'TJS'
      },
      now
    )
    expect(result.filters).toEqual({
      dateFrom: new Date(2026, 7, 1).getTime(),
      dateTo: new Date(2026, 7, 31, 23, 59, 59, 999).getTime(),
      types: ['expense'],
      accountIds: ['account-1'],
      tagId: 'tag-1',
      currencyCode: 'TJS',
      templateOnly: true
    })
  })

  it('drops tag filters for transfers and maps manual source to templateOnly false', () => {
    const result = buildFinanceReportFilters(
      {
        range: '30d',
        customFrom: '',
        customTo: '',
        type: 'transfer',
        accountId: 'all',
        tagId: 'tag-1',
        source: 'manual',
        currencyCode: 'USD'
      },
      now
    )
    expect(result.tagId).toBe('all')
    expect(result.filters.types).toEqual(['transfer'])
    expect(result.filters.tagId).toBeUndefined()
    expect(result.filters.accountIds).toBeUndefined()
    expect(result.filters.currencyCode).toBe('USD')
    expect(result.filters.templateOnly).toBe(false)
  })
})
