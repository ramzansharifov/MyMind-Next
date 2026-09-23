import { describe, expect, it } from 'vitest'
import type { FinanceTagSummary } from '@mymind/contracts/finance'

import {
  financeQuickCompatibleTags,
  financeQuickTransactionStages
} from './finance-quick-transaction'

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

describe('finance quick transaction flow', () => {
  it('uses account, tag and amount for income/expense', () => {
    expect(financeQuickTransactionStages('income')).toEqual([
      'source-account',
      'tag',
      'amount'
    ])
    expect(financeQuickTransactionStages('expense')).toEqual([
      'source-account',
      'tag',
      'amount'
    ])
  })

  it('uses source, destination and amount for transfers', () => {
    expect(financeQuickTransactionStages('transfer')).toEqual([
      'source-account',
      'destination-account',
      'amount'
    ])
  })

  it('filters tags by operation type and never uses tags for transfers', () => {
    const tags = [tag('income', 'income'), tag('expense', 'expense'), tag('both', 'both')]
    expect(financeQuickCompatibleTags(tags, 'income').map((item) => item.id)).toEqual([
      'income',
      'both'
    ])
    expect(financeQuickCompatibleTags(tags, 'expense').map((item) => item.id)).toEqual([
      'expense',
      'both'
    ])
    expect(financeQuickCompatibleTags(tags, 'transfer')).toEqual([])
  })
})
