import { describe, expect, it } from 'vitest'
import type { FinanceAccountSummary, FinanceTemplate } from '@mymind/contracts/finance'

import { financeTemplateTransactionDefaults } from './finance-template-transaction'

function account(id: string, currencyCode = 'TJS'): FinanceAccountSummary {
  return {
    id,
    name: id,
    currencyCode,
    initialBalanceMinor: 0,
    icon: 'wallet',
    createdAt: 1,
    updatedAt: 1,
    balanceMinor: 0,
    transactionCount: 0,
    lastTransactionAt: null,
    periodChangeMinor: 0
  }
}

function template(overrides: Partial<FinanceTemplate> = {}): FinanceTemplate {
  return {
    id: 'template-1',
    name: 'Monthly transfer',
    type: 'transfer',
    sourceAccountId: 'source',
    destinationAccountId: 'destination',
    tagId: null,
    sourceAmountMinor: 125050,
    destinationAmountMinor: 125050,
    comment: 'Saved comment',
    createdAt: 1,
    updatedAt: 1,
    ...overrides
  }
}

describe('finance template transaction defaults', () => {
  it('prefills the mobile transaction form from a template', () => {
    const now = new Date(2026, 8, 22, 14, 35).getTime()
    const result = financeTemplateTransactionDefaults(
      template(),
      [account('source'), account('destination')],
      now
    )

    expect(result).toEqual({
      type: 'transfer',
      accountId: 'source',
      destinationAccountId: 'destination',
      tagId: '',
      amount: '1250.50',
      date: '2026-09-22',
      time: '14:35',
      comment: 'Saved comment'
    })
  })

  it('preserves income/expense tags and source currency formatting', () => {
    const now = new Date(2026, 8, 22, 9, 5).getTime()
    const result = financeTemplateTransactionDefaults(
      template({
        type: 'expense',
        destinationAccountId: null,
        tagId: 'food',
        sourceAmountMinor: 1299,
        comment: 'Lunch'
      }),
      [account('source', 'USD')],
      now
    )

    expect(result.type).toBe('expense')
    expect(result.tagId).toBe('food')
    expect(result.destinationAccountId).toBe('')
    expect(result.amount).toBe('12.99')
    expect(result.comment).toBe('Lunch')
  })
})
