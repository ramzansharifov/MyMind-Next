import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, getSqlite, initializeDatabaseForTesting } from '../database/client'
import { runDatabaseMigrationsFrom } from '../database/migrate'
import { financeService } from './finance.service'
import { getFinanceReportAnalytics } from './finance-report.service'

let root = ''

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'mymind-finance-report-'))
  initializeDatabaseForTesting(join(root, 'finance-report.sqlite'))
  runDatabaseMigrationsFrom(resolve(process.cwd(), 'drizzle'))
})

beforeEach(() => {
  getSqlite().exec(`
    DELETE FROM finance_transaction_entries;
    DELETE FROM finance_transactions;
    DELETE FROM finance_limit_accounts;
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

function at(day: number, hour = 12): number {
  return new Date(2026, 7, day, hour, 0, 0, 0).getTime()
}

function period(fromDay: number, toDay: number) {
  return {
    dateFrom: new Date(2026, 7, fromDay, 0, 0, 0, 0).getTime(),
    dateTo: new Date(2026, 7, toDay, 23, 59, 59, 999).getTime(),
    currencyCode: 'TJS'
  }
}

function createCoreFixture() {
  const cash = financeService.createAccount({
    name: 'Наличные',
    currencyCode: 'TJS',
    initialBalanceMinor: 10_000,
    icon: 'banknote'
  })
  const usd = financeService.createAccount({
    name: 'Доллары',
    currencyCode: 'USD',
    initialBalanceMinor: 1_000,
    icon: 'wallet'
  })
  const incomeTag = financeService.createTag({
    name: 'Зарплата',
    type: 'income',
    icon: 'briefcase'
  })
  const expenseTag = financeService.createTag({
    name: 'Еда',
    type: 'expense',
    icon: 'utensils'
  })
  financeService.upsertExchangeRate({ currencyCode: 'USD', rateScaled: 9_200_000 })
  return { cash, usd, incomeTag, expenseTag }
}

describe('finance report analytics', () => {
  it('includes template operations by default and converts every account currency into the report currency', () => {
    const fixture = createCoreFixture()
    const template = financeService.createTemplate({
      name: 'Обед',
      type: 'expense',
      sourceAccountId: fixture.cash.id,
      destinationAccountId: null,
      tagId: fixture.expenseTag.id,
      sourceAmountMinor: 2_000,
      destinationAmountMinor: null,
      comment: ''
    })

    financeService.createTransaction({
      type: 'income',
      accountId: fixture.cash.id,
      amountMinor: 5_000,
      tagId: fixture.incomeTag.id,
      occurredAt: at(2),
      comment: ''
    })
    financeService.createTransaction({
      type: 'expense',
      accountId: fixture.cash.id,
      amountMinor: 2_000,
      tagId: fixture.expenseTag.id,
      occurredAt: at(3),
      comment: '',
      templateId: template.id
    })
    financeService.createTransaction({
      type: 'income',
      accountId: fixture.usd.id,
      amountMinor: 1_000,
      tagId: fixture.incomeTag.id,
      occurredAt: at(4),
      comment: ''
    })

    const report = getFinanceReportAnalytics(period(1, 5))
    expect(report).toMatchObject({
      currencyCode: 'TJS',
      incomeMinor: 14_200,
      expenseMinor: 2_000,
      netMinor: 12_200,
      incomeCount: 2,
      expenseCount: 1,
      transferCount: 0,
      operationCount: 3,
      balanceStartMinor: 19_200,
      balanceEndMinor: 31_400
    })
    expect(report.timeline).toHaveLength(5)
    expect(report.timeline[0]).toMatchObject({ incomeMinor: 0, expenseMinor: 0, balanceMinor: 19_200 })
    expect(report.timeline[4].balanceMinor).toBe(31_400)
    expect(report.missingRateCurrencies).toEqual([])

    const manualOnly = getFinanceReportAnalytics({ ...period(1, 5), templateOnly: false })
    expect(manualOnly).toMatchObject({ incomeMinor: 14_200, expenseMinor: 0, operationCount: 2 })

    const templateOnly = getFinanceReportAnalytics({ ...period(1, 5), templateOnly: true })
    expect(templateOnly).toMatchObject({ incomeMinor: 0, expenseMinor: 2_000, operationCount: 1 })
  })

  it('keeps both sides of a transfer when filtering by one account and compares transfer volume in report currency', () => {
    const fixture = createCoreFixture()
    financeService.createTransaction({
      type: 'transfer',
      sourceAccountId: fixture.cash.id,
      destinationAccountId: fixture.usd.id,
      sourceAmountMinor: 9_200,
      destinationAmountMinor: 1_000,
      occurredAt: at(2),
      comment: ''
    })

    const report = getFinanceReportAnalytics({
      ...period(1, 3),
      types: ['transfer'],
      accountIds: [fixture.cash.id]
    })

    expect(report).toMatchObject({
      incomeMinor: 0,
      expenseMinor: 0,
      transferCount: 1,
      operationCount: 1,
      transferVolumeMinor: 9_200
    })
    expect(report.transferFlows).toHaveLength(1)
    expect(report.transferFlows[0]).toMatchObject({
      sourceAccountId: fixture.cash.id,
      destinationAccountId: fixture.usd.id,
      sourceAmountMinor: 9_200,
      destinationAmountMinor: 1_000,
      convertedAmountMinor: 9_200,
      count: 1
    })
    expect(report.accountActivity).toEqual([
      expect.objectContaining({
        accountId: fixture.cash.id,
        transferOutMinor: 9_200,
        transferInMinor: 0,
        operationCount: 1
      })
    ])
  })

  it('keeps operation counts when an amount cannot be converted and marks monetary data incomplete', () => {
    const cash = financeService.createAccount({
      name: 'Наличные',
      currencyCode: 'TJS',
      initialBalanceMinor: 0,
      icon: 'banknote'
    })
    const eur = financeService.createAccount({
      name: 'EUR',
      currencyCode: 'EUR',
      initialBalanceMinor: 10_000,
      icon: 'wallet'
    })
    const expenseTag = financeService.createTag({
      name: 'Покупки',
      type: 'expense',
      icon: 'shopping-bag'
    })
    financeService.createTransaction({
      type: 'expense',
      accountId: eur.id,
      amountMinor: 2_500,
      tagId: expenseTag.id,
      occurredAt: at(2),
      comment: ''
    })

    const report = getFinanceReportAnalytics(period(1, 3))
    expect(cash.id).not.toBe(eur.id)
    expect(report.operationCount).toBe(1)
    expect(report.expenseCount).toBe(1)
    expect(report.expenseMinor).toBe(0)
    expect(report.missingRateCurrencies).toContain('EUR')
    expect(report.balanceStartMinor).toBeNull()
    expect(report.balanceEndMinor).toBeNull()
  })
})
