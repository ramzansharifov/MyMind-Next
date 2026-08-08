import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, getSqlite, initializeDatabaseForTesting } from '../database/client'
import { runDatabaseMigrationsFrom } from '../database/migrate'
import { financeService } from './finance.service'

let root = ''

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'mymind-finance-limits-'))
  initializeDatabaseForTesting(join(root, 'finance.sqlite'))
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

function createExpenseTag() {
  return financeService.createTag({
    name: 'Еда',
    type: 'expense',
    icon: 'utensils'
  })
}

function createAccount(name: string, currencyCode: string) {
  return financeService.createAccount({
    name,
    currencyCode,
    initialBalanceMinor: 0,
    icon: 'wallet'
  })
}

describe('finance multi-account limits', () => {
  it('counts only selected same-currency accounts and applies preview only to them', () => {
    const now = Date.now()
    const cash = createAccount('Наличные', 'TJS')
    const card = createAccount('Карта', 'TJS')
    const usd = createAccount('USD', 'USD')
    const tag = createExpenseTag()

    const limit = financeService.createLimit({
      amountMinor: 10_000,
      currencyCode: 'USD',
      accountIds: [cash.id, card.id],
      tagId: tag.id,
      periodType: 'month',
      warningPercent: 80
    })

    expect(limit).toMatchObject({
      currencyCode: 'TJS',
      accountIds: expect.arrayContaining([cash.id, card.id]),
      tagId: tag.id
    })

    financeService.createTransaction({
      type: 'expense',
      accountId: cash.id,
      amountMinor: 1_000,
      tagId: tag.id,
      occurredAt: now,
      comment: ''
    })
    financeService.createTransaction({
      type: 'expense',
      accountId: card.id,
      amountMinor: 2_000,
      tagId: tag.id,
      occurredAt: now,
      comment: ''
    })
    financeService.createTransaction({
      type: 'expense',
      accountId: usd.id,
      amountMinor: 9_000,
      tagId: tag.id,
      occurredAt: now,
      comment: ''
    })

    expect(financeService.listLimits(now)[0].spentMinor).toBe(3_000)
    expect(
      financeService.previewExpenseImpact({
        accountId: card.id,
        tagId: tag.id,
        amountMinor: 500,
        occurredAt: now
      }).items
    ).toHaveLength(1)
    expect(
      financeService.previewExpenseImpact({
        accountId: usd.id,
        tagId: tag.id,
        amountMinor: 500,
        occurredAt: now
      }).items
    ).toHaveLength(0)
  })

  it('rejects mixed-currency account selections', () => {
    const cash = createAccount('Наличные', 'TJS')
    const usd = createAccount('USD', 'USD')
    const tag = createExpenseTag()

    expect(() =>
      financeService.createLimit({
        amountMinor: 10_000,
        currencyCode: 'TJS',
        accountIds: [cash.id, usd.id],
        tagId: tag.id,
        periodType: 'month',
        warningPercent: 80
      })
    ).toThrow('одинаковой валютой')
  })

  it('allows All accounts only when all existing accounts share one currency', () => {
    const now = Date.now()
    const cash = createAccount('Наличные', 'TJS')
    const card = createAccount('Карта', 'TJS')
    const tag = createExpenseTag()

    const limit = financeService.createLimit({
      amountMinor: 10_000,
      currencyCode: 'USD',
      accountIds: [],
      tagId: tag.id,
      periodType: 'month',
      warningPercent: 80
    })

    expect(limit).toMatchObject({
      currencyCode: 'TJS',
      accountIds: []
    })

    financeService.createTransaction({
      type: 'expense',
      accountId: cash.id,
      amountMinor: 1_000,
      tagId: tag.id,
      occurredAt: now,
      comment: ''
    })
    financeService.createTransaction({
      type: 'expense',
      accountId: card.id,
      amountMinor: 2_000,
      tagId: tag.id,
      occurredAt: now,
      comment: ''
    })
    expect(financeService.listLimits(now)[0].spentMinor).toBe(3_000)

    createAccount('USD', 'USD')
    expect(() =>
      financeService.createLimit({
        amountMinor: 10_000,
        currencyCode: 'TJS',
        accountIds: [],
        tagId: tag.id,
        periodType: 'month',
        warningPercent: 80
      })
    ).toThrow('разные валюты')
  })
})
