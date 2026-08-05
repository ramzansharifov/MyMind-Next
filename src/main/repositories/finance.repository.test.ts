import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { FinanceAccountSummary, FinanceTagSummary } from '../../shared/contracts/finance'

import { closeDatabase, getSqlite, initializeDatabaseForTesting } from '../database/client'
import { runDatabaseMigrationsFrom } from '../database/migrate'
import { financeService } from '../services/finance.service'

let root = ''

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'mymind-finance-'))
  initializeDatabaseForTesting(join(root, 'finance.sqlite'))
  runDatabaseMigrationsFrom(resolve(process.cwd(), 'drizzle'))
})

beforeEach(() => {
  const sqlite = getSqlite()
  sqlite.exec(`
    DELETE FROM finance_transaction_entries;
    DELETE FROM finance_transactions;
    DELETE FROM finance_limits;
    DELETE FROM finance_transaction_templates;
    DELETE FROM finance_tags;
    DELETE FROM finance_accounts;
    DELETE FROM finance_exchange_rates;
    DELETE FROM finance_settings;
  `)
})

afterAll(async () => {
  closeDatabase()
  await rm(root, { recursive: true, force: true })
})

function createFixture(): {
  cash: FinanceAccountSummary
  card: FinanceAccountSummary
  usd: FinanceAccountSummary
  incomeTag: FinanceTagSummary
  expenseTag: FinanceTagSummary
  bothTag: FinanceTagSummary
} {
  const cash = financeService.createAccount({
    name: 'Наличные',
    type: 'cash',
    currencyCode: 'TJS',
    initialBalanceMinor: 10_000,
    icon: 'banknote',
    color: '#22c55e'
  })
  const card = financeService.createAccount({
    name: 'Карта',
    type: 'card',
    currencyCode: 'TJS',
    initialBalanceMinor: 0,
    icon: 'credit-card',
    color: '#8b5cf6'
  })
  const usd = financeService.createAccount({
    name: 'USD',
    type: 'wallet',
    currencyCode: 'USD',
    initialBalanceMinor: 0,
    icon: 'wallet',
    color: '#3b82f6'
  })
  const incomeTag = financeService.createTag({
    name: 'Зарплата',
    type: 'income',
    icon: 'briefcase',
    color: '#22c55e'
  })
  const expenseTag = financeService.createTag({
    name: 'Еда',
    type: 'expense',
    icon: 'utensils',
    color: '#ef4444'
  })
  const bothTag = financeService.createTag({
    name: 'Другое',
    type: 'both',
    icon: 'tag',
    color: '#f59e0b'
  })
  return { cash, card, usd, incomeTag, expenseTag, bothTag }
}

describe('finance repository and service', () => {
  it('creates accounts and computes balances from signed ledger entries', () => {
    const fixture = createFixture()
    financeService.createTransaction({
      type: 'income',
      accountId: fixture.cash.id,
      amountMinor: 20_000,
      tagId: fixture.incomeTag.id,
      occurredAt: 100,
      comment: 'Доход'
    })
    financeService.createTransaction({
      type: 'expense',
      accountId: fixture.cash.id,
      amountMinor: 5_000,
      tagId: fixture.expenseTag.id,
      occurredAt: 200,
      comment: 'Расход'
    })
    expect(financeService.getAccount(fixture.cash.id).balanceMinor).toBe(25_000)
    expect(financeService.getAccount(fixture.cash.id).transactionCount).toBe(2)
    expect(() => financeService.deleteAccount({ id: fixture.cash.id })).toThrow('очистите')
    const empty = financeService.createAccount({
      name: 'Пустой',
      type: 'other',
      currencyCode: 'TJS',
      initialBalanceMinor: 0,
      icon: 'wallet',
      color: '#64748b'
    })
    expect(financeService.deleteAccount({ id: empty.id })).toBe(true)
  })

  it('creates, changes and deletes an atomic same-currency transfer', () => {
    const fixture = createFixture()
    const transfer = financeService.createTransaction({
      type: 'transfer',
      sourceAccountId: fixture.cash.id,
      destinationAccountId: fixture.card.id,
      sourceAmountMinor: 4_000,
      destinationAmountMinor: 4_000,
      occurredAt: 100,
      comment: ''
    })
    expect(financeService.getAccount(fixture.cash.id).balanceMinor).toBe(6_000)
    expect(financeService.getAccount(fixture.card.id).balanceMinor).toBe(4_000)
    financeService.updateTransaction({
      id: transfer.id,
      transaction: {
        type: 'transfer',
        sourceAccountId: fixture.cash.id,
        destinationAccountId: fixture.card.id,
        sourceAmountMinor: 2_000,
        destinationAmountMinor: 2_000,
        occurredAt: 100,
        comment: 'Исправлено'
      }
    })
    expect(financeService.getAccount(fixture.cash.id).balanceMinor).toBe(8_000)
    expect(financeService.deleteTransaction({ id: transfer.id })).toBe(true)
    expect(financeService.getAccount(fixture.card.id).balanceMinor).toBe(0)
  })

  it('stores both actual amounts for a cross-currency transfer', () => {
    const fixture = createFixture()
    const transfer = financeService.createTransaction({
      type: 'transfer',
      sourceAccountId: fixture.cash.id,
      destinationAccountId: fixture.usd.id,
      sourceAmountMinor: 920_00,
      destinationAmountMinor: 100_00,
      exchangeRateScaled: 108_696,
      occurredAt: 100,
      comment: 'Обмен'
    })
    expect(transfer.entries.map((entry) => entry.signedAmountMinor)).toEqual([-920_00, 100_00])
    expect(financeService.getAccount(fixture.usd.id).balanceMinor).toBe(100_00)
  })

  it('rolls back a failed transfer update without losing old entries', () => {
    const fixture = createFixture()
    const transfer = financeService.createTransaction({
      type: 'transfer',
      sourceAccountId: fixture.cash.id,
      destinationAccountId: fixture.card.id,
      sourceAmountMinor: 1_000,
      destinationAmountMinor: 1_000,
      occurredAt: 100,
      comment: ''
    })
    expect(() =>
      financeService.updateTransaction({
        id: transfer.id,
        transaction: {
          type: 'transfer',
          sourceAccountId: fixture.cash.id,
          destinationAccountId: fixture.card.id,
          sourceAmountMinor: 1_000,
          destinationAmountMinor: 2_000,
          occurredAt: 100,
          comment: ''
        }
      })
    ).toThrow('совпадать')
    expect(financeService.getAccount(fixture.cash.id).balanceMinor).toBe(9_000)
    expect(financeService.getAccount(fixture.card.id).balanceMinor).toBe(1_000)
  })

  it('protects used tags and safely deletes unused tags with dependent metadata', () => {
    const fixture = createFixture()
    financeService.createTransaction({
      type: 'expense',
      accountId: fixture.cash.id,
      amountMinor: 100,
      tagId: fixture.expenseTag.id,
      occurredAt: 100,
      comment: ''
    })
    expect(() => financeService.deleteTag({ id: fixture.expenseTag.id })).toThrow('используется')
    const unused = financeService.createTag({
      name: 'Временный',
      type: 'expense',
      icon: 'tag',
      color: '#64748b'
    })
    financeService.createLimit({
      name: 'Временный',
      amountMinor: 1_000,
      currencyCode: 'TJS',
      scopeType: 'tag',
      accountId: null,
      tagId: unused.id,
      periodType: 'month',
      startsAt: 0,
      endsAt: null,
      warningPercent: 80
    })
    expect(financeService.deleteTag({ id: unused.id })).toBe(true)
  })

  it('calculates warning and exceed states without blocking expenses', () => {
    const fixture = createFixture()
    financeService.createLimit({
      name: 'Еда',
      amountMinor: 1_000,
      currencyCode: 'TJS',
      scopeType: 'tag',
      accountId: null,
      tagId: fixture.expenseTag.id,
      periodType: 'custom',
      startsAt: 0,
      endsAt: 10_000,
      warningPercent: 80
    })
    financeService.createTransaction({
      type: 'expense',
      accountId: fixture.cash.id,
      amountMinor: 900,
      tagId: fixture.expenseTag.id,
      occurredAt: 100,
      comment: ''
    })
    expect(financeService.listLimits(100)[0]).toMatchObject({
      spentMinor: 900,
      warningReached: true,
      exceededMinor: 0
    })
    const impact = financeService.previewExpenseImpact({
      accountId: fixture.cash.id,
      tagId: fixture.expenseTag.id,
      amountMinor: 200,
      occurredAt: 100
    })
    expect(impact.items[0].exceededAfterMinor).toBe(100)
    financeService.createTransaction({
      type: 'expense',
      accountId: fixture.cash.id,
      amountMinor: 200,
      tagId: fixture.expenseTag.id,
      occurredAt: 100,
      comment: ''
    })
    expect(financeService.listLimits(100)[0].exceededMinor).toBe(100)
  })

  it('uses a template without mutating it and keeps transactions after template deletion', () => {
    const fixture = createFixture()
    const template = financeService.createTemplate({
      name: 'Обед',
      type: 'expense',
      sourceAccountId: fixture.cash.id,
      destinationAccountId: null,
      tagId: fixture.expenseTag.id,
      sourceAmountMinor: 500,
      destinationAmountMinor: null,
      comment: 'Шаблон',
      scheduleType: 'monthly',
      scheduleInterval: 1,
      nextOccurrenceAt: 100,
      reminderEnabled: true
    })
    const transaction = financeService.useTemplate({
      templateId: template.id,
      transaction: {
        type: 'expense',
        accountId: fixture.cash.id,
        amountMinor: 700,
        tagId: fixture.expenseTag.id,
        occurredAt: 100,
        comment: 'Изменено'
      }
    })
    expect(financeService.getTemplate(template.id).sourceAmountMinor).toBe(500)
    expect(transaction.templateNameSnapshot).toBe('Обед')
    expect(financeService.deleteTemplate({ id: template.id })).toBe(true)
    expect(financeService.getTransaction(transaction.id)).toMatchObject({
      templateId: null,
      templateNameSnapshot: 'Обед'
    })
  })

  it('clears one account atomically while preserving the other side of transfers', () => {
    const fixture = createFixture()
    financeService.createTransaction({
      type: 'income',
      accountId: fixture.cash.id,
      amountMinor: 5_000,
      tagId: fixture.incomeTag.id,
      occurredAt: 100,
      comment: ''
    })
    financeService.createTransaction({
      type: 'transfer',
      sourceAccountId: fixture.cash.id,
      destinationAccountId: fixture.card.id,
      sourceAmountMinor: 2_000,
      destinationAmountMinor: 2_000,
      occurredAt: 200,
      comment: ''
    })
    const expected = financeService.getAccount(fixture.cash.id).balanceMinor
    const cardBefore = financeService.getAccount(fixture.card.id).balanceMinor
    expect(() =>
      financeService.clearAccountHistory({
        accountId: fixture.cash.id,
        expectedBalanceMinor: expected - 1,
        confirmation: 'ОЧИСТИТЬ'
      })
    ).toThrow('изменился')
    const result = financeService.clearAccountHistory({
      accountId: fixture.cash.id,
      expectedBalanceMinor: expected,
      confirmation: 'ОЧИСТИТЬ'
    })
    expect(result).toMatchObject({
      linkedTransferCount: 1,
      createdAdjustmentCount: 1,
      newInitialBalanceMinor: expected
    })
    expect(financeService.getAccount(fixture.cash.id)).toMatchObject({
      balanceMinor: expected,
      initialBalanceMinor: expected,
      transactionCount: 0
    })
    expect(financeService.getAccount(fixture.card.id).balanceMinor).toBe(cardBefore)
    const cardHistory = financeService.listTransactions({
      accountIds: [fixture.card.id],
      includeSystem: true,
      limit: 20,
      offset: 0
    })
    expect(cardHistory.items).toEqual([
      expect.objectContaining({ type: 'adjustment', isSystem: true })
    ])
  })

  it('filters and paginates transactions and excludes transfers and adjustments from reports', () => {
    const fixture = createFixture()
    financeService.upsertExchangeRate({ currencyCode: 'USD', rateScaled: 9_200_000 })
    financeService.createTransaction({
      type: 'income',
      accountId: fixture.cash.id,
      amountMinor: 1_000,
      tagId: fixture.incomeTag.id,
      occurredAt: 100,
      comment: 'salary'
    })
    financeService.createTransaction({
      type: 'expense',
      accountId: fixture.cash.id,
      amountMinor: 200,
      tagId: fixture.expenseTag.id,
      occurredAt: 200,
      comment: 'lunch'
    })
    financeService.createTransaction({
      type: 'transfer',
      sourceAccountId: fixture.cash.id,
      destinationAccountId: fixture.card.id,
      sourceAmountMinor: 100,
      destinationAmountMinor: 100,
      occurredAt: 300,
      comment: 'move'
    })
    const page = financeService.listTransactions({ search: 'lunch', limit: 1, offset: 0 })
    expect(page).toMatchObject({ total: 1, limit: 1, offset: 0 })
    const report = financeService.getReport({ dateFrom: 0, dateTo: 1_000, currencyCode: 'TJS' })
    expect(report).toMatchObject({
      incomeMinor: 1_000,
      expenseMinor: 200,
      netMinor: 800,
      operationCount: 3
    })
    expect(report.transferFlows).toHaveLength(1)
  })
})
