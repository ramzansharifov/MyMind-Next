import { describe, expect, it } from 'vitest'

import {
  clearFinanceAccountHistoryInputSchema,
  createFinanceLimitInputSchema,
  createFinanceTemplateInputSchema,
  createFinanceTransactionInputSchema,
  financeCurrencyCodeSchema,
  financeTransactionFiltersSchema,
  internalFinanceAdjustmentInputSchema
} from './finance'

describe('finance validation', () => {
  it('normalizes currencies and rejects unsafe codes', () => {
    expect(financeCurrencyCodeSchema.parse('tjs')).toBe('TJS')
    expect(() => financeCurrencyCodeSchema.parse('TJ')).toThrow()
  })

  it('accepts income and rejects public adjustments or non-positive amounts', () => {
    expect(
      createFinanceTransactionInputSchema.parse({
        type: 'income',
        accountId: 'account-one',
        amountMinor: 10_000,
        tagId: 'salary',
        occurredAt: 1,
        comment: ''
      }).type
    ).toBe('income')
    expect(() => createFinanceTransactionInputSchema.parse({ type: 'adjustment' })).toThrow()
    expect(() =>
      createFinanceTransactionInputSchema.parse({
        type: 'expense',
        accountId: 'a',
        amountMinor: 0,
        tagId: 't',
        occurredAt: 1,
        comment: ''
      })
    ).toThrow()
  })

  it('requires two different sides for transfers', () => {
    expect(() =>
      createFinanceTransactionInputSchema.parse({
        type: 'transfer',
        sourceAccountId: 'same',
        destinationAccountId: 'same',
        sourceAmountMinor: 100,
        destinationAmountMinor: 100,
        occurredAt: 1,
        comment: ''
      })
    ).toThrow('отличаться')
  })

  it('validates limit scope, custom ranges and warning percent', () => {
    const common = {
      name: 'Еда',
      amountMinor: 100_00,
      currencyCode: 'TJS',
      scopeType: 'tag' as const,
      accountId: null,
      tagId: null,
      periodType: 'custom' as const,
      startsAt: 100,
      endsAt: 50,
      warningPercent: 101
    }
    expect(() => createFinanceLimitInputSchema.parse(common)).toThrow()
    expect(
      createFinanceLimitInputSchema.parse({
        ...common,
        tagId: 'food',
        endsAt: 200,
        warningPercent: 80
      }).tagId
    ).toBe('food')
  })

  it('validates template schedules and transfer references', () => {
    expect(() =>
      createFinanceTemplateInputSchema.parse({
        name: 'Аренда',
        type: 'expense',
        sourceAccountId: 'card',
        destinationAccountId: null,
        tagId: 'home',
        sourceAmountMinor: 100,
        destinationAmountMinor: null,
        comment: '',
        scheduleType: 'monthly',
        scheduleInterval: 1,
        nextOccurrenceAt: null,
        reminderEnabled: true
      })
    ).toThrow('дата')
  })

  it('keeps internal adjustments behind a separate schema and protects clear confirmation', () => {
    expect(
      internalFinanceAdjustmentInputSchema.parse({
        accountId: 'a',
        signedAmountMinor: -10,
        occurredAt: 1,
        reason: 'reason'
      }).signedAmountMinor
    ).toBe(-10)
    expect(() =>
      clearFinanceAccountHistoryInputSchema.parse({
        accountId: 'a',
        expectedBalanceMinor: 1,
        confirmation: 'очистить'
      })
    ).toThrow()
  })

  it('checks filter date and amount ranges', () => {
    expect(() => financeTransactionFiltersSchema.parse({ dateFrom: 20, dateTo: 10 })).toThrow()
    expect(() =>
      financeTransactionFiltersSchema.parse({ minAmountMinor: 200, maxAmountMinor: 100 })
    ).toThrow()
  })
})
