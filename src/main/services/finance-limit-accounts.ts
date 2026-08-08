import type {
  CreateFinanceLimitInput,
  FinanceLimit,
  UpdateFinanceLimitInput
} from '../../shared/contracts/finance'
import { getSqlite } from '../database/client'
import {
  getFinanceAccount,
  getFinanceTag,
  listFinanceAccounts
} from '../repositories/finance.repository'

type FinanceLimitWriteInput = CreateFinanceLimitInput | UpdateFinanceLimitInput
export type FinanceLimitWithAccounts = FinanceLimit & { accountIds: string[] }

export function normalizeFinanceLimitInput<T extends FinanceLimitWriteInput>(input: T): T {
  const tag = getFinanceTag(input.tagId)
  if (tag.type === 'income') {
    throw new Error('Лимит расходов нельзя связать с доходным тегом')
  }

  const accountIds = [...new Set(input.accountIds)]

  if (accountIds.length === 0) {
    const accounts = listFinanceAccounts()
    if (accounts.length === 0) {
      throw new Error('Сначала создайте хотя бы один счёт')
    }

    const currencies = [...new Set(accounts.map((account) => account.currencyCode))]
    if (currencies.length !== 1) {
      throw new Error(
        'Нельзя выбрать все счета, пока используются разные валюты. Выберите несколько счетов одной валюты.'
      )
    }

    return {
      ...input,
      currencyCode: currencies[0],
      accountIds: []
    }
  }

  const accounts = accountIds.map((accountId) => getFinanceAccount(accountId))
  const currencies = [...new Set(accounts.map((account) => account.currencyCode))]
  if (currencies.length !== 1) {
    throw new Error('В одном лимите можно выбрать только счета с одинаковой валютой')
  }

  return {
    ...input,
    currencyCode: currencies[0],
    accountIds
  }
}

export function syncFinanceLimitAccounts(limitId: string, accountIds: readonly string[]): void {
  const sqlite = getSqlite()
  sqlite.prepare('DELETE FROM finance_limit_accounts WHERE limit_id = ?').run(limitId)

  if (accountIds.length === 0) return

  const insert = sqlite.prepare(
    'INSERT INTO finance_limit_accounts (limit_id, account_id) VALUES (?, ?)'
  )
  for (const accountId of accountIds) {
    insert.run(limitId, accountId)
  }
}

export function getFinanceLimitAccountIds(limitId: string): string[] {
  const rows = getSqlite()
    .prepare(
      'SELECT account_id FROM finance_limit_accounts WHERE limit_id = ? ORDER BY account_id ASC'
    )
    .all(limitId) as Array<{ account_id: string }>

  return rows.map((row) => row.account_id)
}

export function withFinanceLimitAccounts<T extends FinanceLimit>(
  limit: T
): T & FinanceLimitWithAccounts {
  return {
    ...limit,
    accountIds: getFinanceLimitAccountIds(limit.id)
  }
}
