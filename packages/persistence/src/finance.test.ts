import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import type { RepositoryRuntime, SqlDatabasePort } from '@mymind/contracts/storage'
import { FINANCE_RATE_SCALE } from '@mymind/core/finance-money'
import { mobileSchemaV7 } from './mobile-schema-v7'
import { createFinanceRepository } from './finance'

const databases: Database.Database[] = []

function setup() {
  const db = new Database(':memory:')
  databases.push(db)
  db.pragma('foreign_keys = ON')
  for (const sql of mobileSchemaV7) db.exec(sql)
  let sequence = 0
  let clock = new Date(2026, 8, 6, 12).getTime()
  const runtime: RepositoryRuntime = {
    database: () => db as unknown as SqlDatabasePort,
    createId: () => `finance-${++sequence}`,
    now: () => ++clock
  }
  return { db, finance: createFinanceRepository(runtime), now: () => clock }
}

afterEach(() => {
  for (const db of databases.splice(0)) db.close()
})

describe('shared Finance persistence', () => {
  it('derives account balances from signed ledger entries and keeps tag snapshots', () => {
    const { finance, now } = setup()
    const account = finance.createAccount({
      name: 'Карта',
      currencyCode: 'TJS',
      initialBalanceMinor: 100_00,
      icon: 'credit-card'
    })
    const incomeTag = finance.createTag({ name: 'Зарплата', type: 'income', icon: 'briefcase' })
    const expenseTag = finance.createTag({ name: 'Еда', type: 'expense', icon: 'utensils' })

    finance.createTransaction({
      type: 'income',
      accountId: account.id,
      amountMinor: 50_00,
      tagId: incomeTag.id,
      occurredAt: now(),
      comment: 'Доход'
    })
    const expense = finance.createTransaction({
      type: 'expense',
      accountId: account.id,
      amountMinor: 20_00,
      tagId: expenseTag.id,
      occurredAt: now(),
      comment: 'Обед'
    })

    expect(finance.getAccount(account.id).balanceMinor).toBe(130_00)
    expect(expense.entries).toHaveLength(1)
    expect(expense.entries[0].signedAmountMinor).toBe(-20_00)
    expect(expense).toMatchObject({ tagNameSnapshot: 'Еда', tagColorSnapshot: '#f87171' })

    finance.updateTag({ id: expenseTag.id, name: 'Питание', type: 'expense', icon: 'utensils' })
    expect(finance.getTransaction(expense.id).tagNameSnapshot).toBe('Еда')
  })

  it('writes transfers atomically and rejects inconsistent same-currency amounts', () => {
    const { db, finance, now } = setup()
    const source = finance.createAccount({
      name: 'Источник',
      currencyCode: 'TJS',
      initialBalanceMinor: 1000_00,
      icon: 'wallet'
    })
    const destination = finance.createAccount({
      name: 'Назначение',
      currencyCode: 'TJS',
      initialBalanceMinor: 0,
      icon: 'banknote'
    })

    expect(() =>
      finance.createTransaction({
        type: 'transfer',
        sourceAccountId: source.id,
        destinationAccountId: destination.id,
        sourceAmountMinor: 100_00,
        destinationAmountMinor: 99_00,
        occurredAt: now(),
        comment: ''
      })
    ).toThrow('суммы должны совпадать')
    expect(db.prepare('SELECT COUNT(*) AS count FROM finance_transactions').get()).toEqual({
      count: 0
    })

    const transfer = finance.createTransaction({
      type: 'transfer',
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
      sourceAmountMinor: 100_00,
      destinationAmountMinor: 100_00,
      occurredAt: now(),
      comment: 'Перевод'
    })
    expect(transfer.entries.map((entry) => entry.signedAmountMinor)).toEqual([-100_00, 100_00])
    expect(finance.getAccount(source.id).balanceMinor).toBe(900_00)
    expect(finance.getAccount(destination.id).balanceMinor).toBe(100_00)
  })

  it('protects account currency and deletion after ledger history appears', () => {
    const { finance, now } = setup()
    const account = finance.createAccount({
      name: 'Счёт',
      currencyCode: 'TJS',
      initialBalanceMinor: 0,
      icon: 'wallet'
    })
    const tag = finance.createTag({ name: 'Доход', type: 'income', icon: 'trending-up' })
    finance.createTransaction({
      type: 'income',
      accountId: account.id,
      amountMinor: 10_00,
      tagId: tag.id,
      occurredAt: now(),
      comment: ''
    })

    expect(() =>
      finance.updateAccount({ id: account.id, name: 'Счёт', icon: 'wallet', currencyCode: 'USD' })
    ).toThrow('валюту')
    expect(() => finance.deleteAccount({ id: account.id })).toThrow('очистите его историю')
    expect(() => finance.deleteTag({ id: tag.id })).toThrow('не может быть удалён')
  })

  it('clears one account history without changing the counterparty balance', () => {
    const { finance, now } = setup()
    const source = finance.createAccount({
      name: 'A',
      currencyCode: 'TJS',
      initialBalanceMinor: 1000_00,
      icon: 'wallet'
    })
    const destination = finance.createAccount({
      name: 'B',
      currencyCode: 'TJS',
      initialBalanceMinor: 0,
      icon: 'wallet'
    })
    finance.createTransaction({
      type: 'transfer',
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
      sourceAmountMinor: 100_00,
      destinationAmountMinor: 100_00,
      occurredAt: now(),
      comment: ''
    })

    const result = finance.clearAccountHistory({
      accountId: source.id,
      expectedBalanceMinor: 900_00,
      confirmation: 'ОЧИСТИТЬ'
    })
    expect(result).toMatchObject({
      deletedTransactionCount: 1,
      linkedTransferCount: 1,
      createdAdjustmentCount: 1,
      newInitialBalanceMinor: 900_00
    })
    expect(finance.getAccount(source.id)).toMatchObject({
      balanceMinor: 900_00,
      transactionCount: 0
    })
    expect(finance.getAccount(destination.id).balanceMinor).toBe(100_00)
    expect(finance.listTransactions({ includeSystem: true }).items[0]).toMatchObject({
      type: 'adjustment',
      isSystem: true
    })
  })

  it('converts dashboard balances through manual rates and exposes missing rates', () => {
    const { finance } = setup()
    finance.createAccount({
      name: 'TJS',
      currencyCode: 'TJS',
      initialBalanceMinor: 100_00,
      icon: 'wallet'
    })
    finance.createAccount({
      name: 'USD',
      currencyCode: 'USD',
      initialBalanceMinor: 10_00,
      icon: 'credit-card'
    })

    let dashboard = finance.getDashboard()
    expect(dashboard.totalBalanceComplete).toBe(false)
    expect(dashboard.missingRateCurrencies).toEqual(['USD'])

    finance.upsertExchangeRate({ currencyCode: 'USD', rateScaled: 10 * FINANCE_RATE_SCALE })
    dashboard = finance.getDashboard()
    expect(dashboard.totalBalanceComplete).toBe(true)
    expect(dashboard.totalBalanceMinor).toBe(200_00)
  })

  it('enforces limit account currencies and calculates expense impact', () => {
    const { finance, now } = setup()
    const tjs = finance.createAccount({
      name: 'TJS',
      currencyCode: 'TJS',
      initialBalanceMinor: 0,
      icon: 'wallet'
    })
    const usd = finance.createAccount({
      name: 'USD',
      currencyCode: 'USD',
      initialBalanceMinor: 0,
      icon: 'wallet'
    })
    const tag = finance.createTag({ name: 'Еда', type: 'expense', icon: 'utensils' })

    expect(() =>
      finance.createLimit({
        amountMinor: 100_00,
        currencyCode: 'TJS',
        accountIds: [tjs.id, usd.id],
        tagId: tag.id,
        periodType: 'month',
        warningPercent: 80
      })
    ).toThrow('одинаковой валютой')

    const limit = finance.createLimit({
      amountMinor: 100_00,
      currencyCode: 'TJS',
      accountIds: [tjs.id],
      tagId: tag.id,
      periodType: 'month',
      warningPercent: 80
    })
    finance.createTransaction({
      type: 'expense',
      accountId: tjs.id,
      amountMinor: 75_00,
      tagId: tag.id,
      occurredAt: now(),
      comment: ''
    })
    expect(finance.listLimits(now())[0]).toMatchObject({ id: limit.id, spentMinor: 75_00 })
    expect(
      finance.previewExpenseImpact({
        accountId: tjs.id,
        tagId: tag.id,
        amountMinor: 10_00,
        occurredAt: now()
      }).items[0]
    ).toMatchObject({ spentAfterMinor: 85_00, warningReachedAfter: true })
  })

  it('builds reports from ledger values without counting transfers as income or expense', () => {
    const { finance } = setup()
    const account = finance.createAccount({
      name: 'Основной',
      currencyCode: 'TJS',
      initialBalanceMinor: 0,
      icon: 'wallet'
    })
    const second = finance.createAccount({
      name: 'Второй',
      currencyCode: 'TJS',
      initialBalanceMinor: 0,
      icon: 'wallet'
    })
    const income = finance.createTag({ name: 'Доход', type: 'income', icon: 'briefcase' })
    const expense = finance.createTag({ name: 'Еда', type: 'expense', icon: 'utensils' })
    const day = new Date(2026, 8, 6, 10).getTime()
    finance.createTransaction({
      type: 'income',
      accountId: account.id,
      amountMinor: 500_00,
      tagId: income.id,
      occurredAt: day,
      comment: ''
    })
    finance.createTransaction({
      type: 'expense',
      accountId: account.id,
      amountMinor: 120_00,
      tagId: expense.id,
      occurredAt: day + 1,
      comment: ''
    })
    finance.createTransaction({
      type: 'transfer',
      sourceAccountId: account.id,
      destinationAccountId: second.id,
      sourceAmountMinor: 50_00,
      destinationAmountMinor: 50_00,
      occurredAt: day + 2,
      comment: ''
    })

    const report = finance.getReport({ dateFrom: day - 1000, dateTo: day + 1000 })
    expect(report).toMatchObject({
      incomeMinor: 500_00,
      expenseMinor: 120_00,
      netMinor: 380_00,
      operationCount: 3
    })
    expect(report.transferFlows).toHaveLength(1)
    expect(report.expenseByTag[0]).toMatchObject({ label: 'Еда', amountMinor: 120_00 })
  })
})
