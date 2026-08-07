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

function uniqueAccountIds(input: FinanceLimitWriteInput): string[] {
  const requested = input.accountIds ?? (input.accountId ? [input.accountId] : [])
  return [...new Set(requested)]
}

export function normalizeFinanceLimitInput<T extends FinanceLimitWriteInput>(input: T): T {
  if (!input.tagId) {
    throw new Error('Лимит расходов должен быть привязан к тегу')
  }

  const tag = getFinanceTag(input.tagId)
  if (tag.type === 'income') {
    throw new Error('Лимит расходов нельзя связать с доходным тегом')
  }

  const accountIds = uniqueAccountIds(input)
  const periodType = input.periodType === 'custom' ? 'month' : input.periodType

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
      scopeType: 'tag',
      accountId: null,
      accountIds: [],
      startsAt: 0,
      endsAt: null,
      periodType
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
    scopeType: 'account-tag',
    accountId: accountIds[0],
    accountIds,
    startsAt: 0,
    endsAt: null,
    periodType
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

export function getFinanceLimitAccountIds(limitId: string, fallbackAccountId: string | null): string[] {
  const rows = getSqlite()
    .prepare(
      'SELECT account_id FROM finance_limit_accounts WHERE limit_id = ? ORDER BY account_id ASC'
    )
    .all(limitId) as Array<{ account_id: string }>

  if (rows.length > 0) return rows.map((row) => row.account_id)
  return fallbackAccountId ? [fallbackAccountId] : []
}

export function withFinanceLimitAccounts<T extends FinanceLimit>(
  limit: T
): T & FinanceLimitWithAccounts {
  return {
    ...limit,
    periodType: limit.periodType === 'custom' ? 'month' : limit.periodType,
    accountIds: getFinanceLimitAccountIds(limit.id, limit.accountId)
  }
}
