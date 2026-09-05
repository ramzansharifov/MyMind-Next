import { describe, expect, it } from 'vitest'

import {
  clearFinanceAccountHistoryInputSchema,
  createFinanceAccountInputSchema,
  createFinanceLimitInputSchema,
  createFinanceTagInputSchema,
  createFinanceTemplateInputSchema,
  createFinanceTransactionInputSchema,
  financeCurrencyCodeSchema,
  financeTransactionFiltersSchema,
  internalFinanceAdjustmentInputSchema,
  updateFinanceAccountInputSchema,
  updateFinanceTagInputSchema
} from './finance'

describe('finance validation', () => {
  it('normalizes currencies and rejects unsafe codes', () => {
    expect(financeCurrencyCodeSchema.parse('tjs')).toBe('TJS')
    expect(() => financeCurrencyCodeSchema.parse('TJ')).toThrow()
  })

  it('validates accounts without a configurable color and normalizes manual currency input', () => {
    expect(
      createFinanceAccountInputSchema.parse({
        name: 'Кошелёк',
        currencyCode: 'usd',
        initialBalanceMinor: 0,
        icon: 'wallet'
      })
    ).toEqual({
      name: 'Кошелёк',
      currencyCode: 'USD',
      initialBalanceMinor: 0,
      icon: 'wallet'
    })
    expect(() =>
      createFinanceAccountInputSchema.parse({
        name: 'Кошелёк',
        currencyCode: 'USD',
        initialBalanceMinor: 0,
        icon: 'wallet',
        color: '#60a5fa'
      })
    ).toThrow()
    expect(() =>
      updateFinanceAccountInputSchema.parse({
        id: 'wallet',
        name: 'Кошелёк',
        icon: 'wallet',
        color: '#60a5fa'
      })
    ).toThrow()
  })

  it('rejects custom tag colors at create and update validation boundaries', () => {
    expect(
      createFinanceTagInputSchema.parse({ name: 'Еда', type: 'expense', icon: 'utensils' })
    ).toEqual({ name: 'Еда', type: 'expense', icon: 'utensils' })
    expect(() =>
      createFinanceTagInputSchema.parse({
        name: 'Еда',
        type: 'expense',
        icon: 'utensils',
        color: '#ffffff'
      })
    ).toThrow()
    expect(() =>
      updateFinanceTagInputSchema.parse({
        id: 'food',
        name: 'Еда',
        type: 'expense',
        icon: 'utensils',
        color: '#ffffff'
      })
    ).toThrow()
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

  it('requires a tag for limits and only accepts calendar periods', () => {
    const common = {
      amountMinor: 100_00,
      currencyCode: 'TJS',
      accountIds: ['card'],
      tagId: 'food',
      periodType: 'month' as const,
      warningPercent: 80
    }
    expect(createFinanceLimitInputSchema.parse(common)).toEqual(common)
    expect(() => createFinanceLimitInputSchema.parse({ ...common, tagId: '' })).toThrow()
    expect(() => createFinanceLimitInputSchema.parse({ ...common, periodType: 'custom' })).toThrow()
    expect(() => createFinanceLimitInputSchema.parse({ ...common, warningPercent: 101 })).toThrow()
  })

  it('validates passive template references without schedule or reminder fields', () => {
    expect(
      createFinanceTemplateInputSchema.parse({
        name: 'Аренда',
        type: 'expense',
        sourceAccountId: 'card',
        destinationAccountId: null,
        tagId: 'home',
        sourceAmountMinor: 100,
        destinationAmountMinor: null,
        comment: ''
      })
    ).toMatchObject({ name: 'Аренда', type: 'expense', tagId: 'home' })

    expect(() =>
      createFinanceTemplateInputSchema.parse({
        name: 'Перевод',
        type: 'transfer',
        sourceAccountId: 'card',
        destinationAccountId: 'card',
        tagId: null,
        sourceAmountMinor: 100,
        destinationAmountMinor: 100,
        comment: ''
      })
    ).toThrow('отличаться')
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
