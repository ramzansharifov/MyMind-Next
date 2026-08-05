import { randomUUID } from 'node:crypto'

import type {
  ClearFinanceAccountHistoryInput,
  ClearFinanceAccountHistoryResult,
  CreateFinanceAccountInput,
  CreateFinanceLimitInput,
  CreateFinanceTagInput,
  CreateFinanceTemplateInput,
  CreateFinanceTransactionInput,
  DeleteFinanceExchangeRateInput,
  FinanceAccount,
  FinanceAccountSummary,
  FinanceExchangeRate,
  FinanceLimit,
  FinancePeriod,
  FinanceSettings,
  FinanceTag,
  FinanceTagSummary,
  FinanceTemplate,
  FinanceTransaction,
  FinanceTransactionEntry,
  FinanceTransactionFilters,
  FinanceTransactionPage,
  SetFinanceBaseCurrencyInput,
  SetFinanceLimitStateInput,
  SetFinanceTemplateStateInput,
  SnoozeFinanceTemplateInput,
  UpdateFinanceAccountInput,
  UpdateFinanceLimitInput,
  UpdateFinanceTagInput,
  UpdateFinanceTemplateInput,
  UpdateFinanceTransactionInput,
  UpsertFinanceExchangeRateInput,
  UseFinanceTemplateInput
} from '../../shared/contracts/finance'
import { FINANCE_RATE_SCALE, assertSafeMinor } from '../../shared/finance-money'
import { getSqlite } from '../database/client'
import { advanceFinanceSchedule } from '../services/finance-periods'

interface SettingsRow {
  id: string
  base_currency_code: string
  created_at: number
  updated_at: number
}

interface ExchangeRateRow {
  currency_code: string
  base_currency_code: string
  rate_scaled: number
  updated_at: number
}

interface AccountRow {
  id: string
  name: string
  type: FinanceAccount['type']
  currency_code: string
  initial_balance_minor: number
  icon: FinanceAccount['icon']
  color: string
  created_at: number
  updated_at: number
}

interface AccountSummaryRow extends AccountRow {
  balance_minor: number | null
  transaction_count: number
  last_transaction_at: number | null
  period_change_minor: number | null
}

interface TagRow {
  id: string
  name: string
  type: FinanceTag['type']
  icon: FinanceTag['icon']
  color: string
  created_at: number
  updated_at: number
}

interface TagSummaryRow extends TagRow {
  transaction_count: number
  total_amount_minor: number | null
  linked_limit_count: number
}

interface TransactionRow {
  id: string
  type: FinanceTransaction['type']
  tag_id: string | null
  tag_name_snapshot: string | null
  tag_icon_snapshot: FinanceTransaction['tagIconSnapshot']
  tag_color_snapshot: string | null
  template_id: string | null
  template_name_snapshot: string | null
  occurred_at: number
  comment: string
  exchange_rate_scaled: number | null
  is_system: number
  system_reason: string | null
  created_at: number
  updated_at: number
}

interface EntryRow {
  id: string
  transaction_id: string
  account_id: string
  account_name: string
  account_currency_code: string
  signed_amount_minor: number
}

interface CountRow {
  count: number
}

interface LimitRow {
  id: string
  name: string
  amount_minor: number
  currency_code: string
  scope_type: FinanceLimit['scopeType']
  account_id: string | null
  tag_id: string | null
  period_type: FinanceLimit['periodType']
  starts_at: number
  ends_at: number | null
  warning_percent: number
  state: FinanceLimit['state']
  created_at: number
  updated_at: number
}

interface TemplateRow {
  id: string
  name: string
  type: FinanceTemplate['type']
  source_account_id: string | null
  destination_account_id: string | null
  tag_id: string | null
  source_amount_minor: number
  destination_amount_minor: number | null
  comment: string
  schedule_type: FinanceTemplate['scheduleType']
  schedule_interval: number
  next_occurrence_at: number | null
  reminder_enabled: number
  state: FinanceTemplate['state']
  last_used_at: number | null
  created_at: number
  updated_at: number
}

function mapSettings(row: SettingsRow): FinanceSettings {
  return {
    id: 'default',
    baseCurrencyCode: row.base_currency_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapExchangeRate(row: ExchangeRateRow): FinanceExchangeRate {
  return {
    currencyCode: row.currency_code,
    baseCurrencyCode: row.base_currency_code,
    rateScaled: row.rate_scaled,
    updatedAt: row.updated_at
  }
}

function mapAccount(row: AccountRow): FinanceAccount {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    currencyCode: row.currency_code,
    initialBalanceMinor: assertSafeMinor(row.initial_balance_minor),
    icon: row.icon,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapAccountSummary(row: AccountSummaryRow): FinanceAccountSummary {
  return {
    ...mapAccount(row),
    balanceMinor: assertSafeMinor(row.balance_minor ?? row.initial_balance_minor),
    transactionCount: row.transaction_count,
    lastTransactionAt: row.last_transaction_at,
    periodChangeMinor: assertSafeMinor(row.period_change_minor ?? 0)
  }
}

function mapTag(row: TagRow): FinanceTag {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    icon: row.icon,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapLimit(row: LimitRow): FinanceLimit {
  return {
    id: row.id,
    name: row.name,
    amountMinor: assertSafeMinor(row.amount_minor),
    currencyCode: row.currency_code,
    scopeType: row.scope_type,
    accountId: row.account_id,
    tagId: row.tag_id,
    periodType: row.period_type,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    warningPercent: row.warning_percent,
    state: row.state,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapTemplate(row: TemplateRow): FinanceTemplate {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    sourceAccountId: row.source_account_id,
    destinationAccountId: row.destination_account_id,
    tagId: row.tag_id,
    sourceAmountMinor: assertSafeMinor(row.source_amount_minor),
    destinationAmountMinor:
      row.destination_amount_minor === null ? null : assertSafeMinor(row.destination_amount_minor),
    comment: row.comment,
    scheduleType: row.schedule_type,
    scheduleInterval: row.schedule_interval,
    nextOccurrenceAt: row.next_occurrence_at,
    reminderEnabled: row.reminder_enabled === 1,
    state: row.state,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function ensureFinanceSettingsRow(): SettingsRow {
  const sqlite = getSqlite()
  const existing = sqlite.prepare('SELECT * FROM finance_settings WHERE id = ?').get('default') as
    SettingsRow | undefined

  if (existing) {
    ensureBaseRate(existing.base_currency_code, existing.updated_at)
    return existing
  }

  const now = Date.now()
  sqlite
    .prepare(
      'INSERT INTO finance_settings (id, base_currency_code, created_at, updated_at) VALUES (?, ?, ?, ?)'
    )
    .run('default', 'TJS', now, now)
  ensureBaseRate('TJS', now)

  return {
    id: 'default',
    base_currency_code: 'TJS',
    created_at: now,
    updated_at: now
  }
}

function ensureBaseRate(baseCurrencyCode: string, updatedAt = Date.now()): void {
  getSqlite()
    .prepare(
      `INSERT INTO finance_exchange_rates (currency_code, base_currency_code, rate_scaled, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(currency_code) DO UPDATE SET
         base_currency_code = excluded.base_currency_code,
         rate_scaled = excluded.rate_scaled,
         updated_at = excluded.updated_at`
    )
    .run(baseCurrencyCode, baseCurrencyCode, FINANCE_RATE_SCALE, updatedAt)
}

function getAccountRow(id: string): AccountRow {
  const row = getSqlite().prepare('SELECT * FROM finance_accounts WHERE id = ?').get(id) as
    AccountRow | undefined

  if (!row) {
    throw new Error('Счёт не найден')
  }

  return row
}

function getTagRow(id: string): TagRow {
  const row = getSqlite().prepare('SELECT * FROM finance_tags WHERE id = ?').get(id) as
    TagRow | undefined

  if (!row) {
    throw new Error('Тег не найден')
  }

  return row
}

function getTemplateRow(id: string): TemplateRow {
  const row = getSqlite()
    .prepare('SELECT * FROM finance_transaction_templates WHERE id = ?')
    .get(id) as TemplateRow | undefined

  if (!row) {
    throw new Error('Шаблон не найден')
  }

  return row
}

function assertTagCompatible(tag: TagRow, type: 'income' | 'expense'): void {
  if (tag.type !== 'both' && tag.type !== type) {
    throw new Error(
      type === 'income'
        ? 'Выбранный тег нельзя использовать для дохода'
        : 'Выбранный тег нельзя использовать для расхода'
    )
  }
}

function getTemplateSnapshot(templateId?: string | null): {
  templateId: string | null
  templateNameSnapshot: string | null
} {
  if (!templateId) {
    return { templateId: null, templateNameSnapshot: null }
  }

  const template = getTemplateRow(templateId)
  return { templateId: template.id, templateNameSnapshot: template.name }
}

function calculateTransferRateScaled(
  sourceAmountMinor: number,
  destinationAmountMinor: number
): number {
  const numerator = BigInt(destinationAmountMinor) * BigInt(FINANCE_RATE_SCALE)
  const denominator = BigInt(sourceAmountMinor)
  const rounded = (numerator + denominator / 2n) / denominator

  if (rounded > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error('Курс перевода выходит за допустимый диапазон')
  }

  return Number(rounded)
}

function writeTransaction(
  transactionId: string,
  input: CreateFinanceTransactionInput,
  options: { createdAt?: number; updating?: boolean } = {}
): void {
  const sqlite = getSqlite()
  const now = Date.now()
  const createdAt = options.createdAt ?? now
  const templateSnapshot = getTemplateSnapshot(input.templateId)

  if (input.type !== 'transfer') {
    getAccountRow(input.accountId)
    const tag = getTagRow(input.tagId)
    assertTagCompatible(tag, input.type)
    const signedAmountMinor = input.type === 'income' ? input.amountMinor : -input.amountMinor

    if (options.updating) {
      sqlite
        .prepare(
          `UPDATE finance_transactions SET
            type = ?, tag_id = ?, tag_name_snapshot = ?, tag_icon_snapshot = ?,
            tag_color_snapshot = ?, template_id = ?, template_name_snapshot = ?,
            occurred_at = ?, comment = ?, exchange_rate_scaled = NULL,
            is_system = 0, system_reason = NULL, updated_at = ?
           WHERE id = ?`
        )
        .run(
          input.type,
          tag.id,
          tag.name,
          tag.icon,
          tag.color,
          templateSnapshot.templateId,
          templateSnapshot.templateNameSnapshot,
          input.occurredAt,
          input.comment,
          now,
          transactionId
        )
    } else {
      sqlite
        .prepare(
          `INSERT INTO finance_transactions (
            id, type, tag_id, tag_name_snapshot, tag_icon_snapshot, tag_color_snapshot,
            template_id, template_name_snapshot, occurred_at, comment, exchange_rate_scaled,
            is_system, system_reason, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, NULL, ?, ?)`
        )
        .run(
          transactionId,
          input.type,
          tag.id,
          tag.name,
          tag.icon,
          tag.color,
          templateSnapshot.templateId,
          templateSnapshot.templateNameSnapshot,
          input.occurredAt,
          input.comment,
          createdAt,
          now
        )
    }

    sqlite
      .prepare(
        'INSERT INTO finance_transaction_entries (id, transaction_id, account_id, signed_amount_minor) VALUES (?, ?, ?, ?)'
      )
      .run(randomUUID(), transactionId, input.accountId, signedAmountMinor)
    return
  }

  const sourceAccount = getAccountRow(input.sourceAccountId)
  const destinationAccount = getAccountRow(input.destinationAccountId)

  if (sourceAccount.id === destinationAccount.id) {
    throw new Error('Счета перевода должны отличаться')
  }

  if (
    sourceAccount.currency_code === destinationAccount.currency_code &&
    input.sourceAmountMinor !== input.destinationAmountMinor
  ) {
    throw new Error('Для перевода в одной валюте суммы должны совпадать')
  }

  const exchangeRateScaled =
    input.exchangeRateScaled ??
    calculateTransferRateScaled(input.sourceAmountMinor, input.destinationAmountMinor)

  if (options.updating) {
    sqlite
      .prepare(
        `UPDATE finance_transactions SET
          type = 'transfer', tag_id = NULL, tag_name_snapshot = NULL,
          tag_icon_snapshot = NULL, tag_color_snapshot = NULL,
          template_id = ?, template_name_snapshot = ?, occurred_at = ?, comment = ?,
          exchange_rate_scaled = ?, is_system = 0, system_reason = NULL, updated_at = ?
         WHERE id = ?`
      )
      .run(
        templateSnapshot.templateId,
        templateSnapshot.templateNameSnapshot,
        input.occurredAt,
        input.comment,
        exchangeRateScaled,
        now,
        transactionId
      )
  } else {
    sqlite
      .prepare(
        `INSERT INTO finance_transactions (
          id, type, tag_id, tag_name_snapshot, tag_icon_snapshot, tag_color_snapshot,
          template_id, template_name_snapshot, occurred_at, comment, exchange_rate_scaled,
          is_system, system_reason, created_at, updated_at
        ) VALUES (?, 'transfer', NULL, NULL, NULL, NULL, ?, ?, ?, ?, ?, 0, NULL, ?, ?)`
      )
      .run(
        transactionId,
        templateSnapshot.templateId,
        templateSnapshot.templateNameSnapshot,
        input.occurredAt,
        input.comment,
        exchangeRateScaled,
        createdAt,
        now
      )
  }

  const insertEntry = sqlite.prepare(
    'INSERT INTO finance_transaction_entries (id, transaction_id, account_id, signed_amount_minor) VALUES (?, ?, ?, ?)'
  )
  insertEntry.run(randomUUID(), transactionId, sourceAccount.id, -input.sourceAmountMinor)
  insertEntry.run(randomUUID(), transactionId, destinationAccount.id, input.destinationAmountMinor)
}

function insertAdjustment(
  accountId: string,
  signedAmountMinor: number,
  occurredAt: number,
  reason: string
): string {
  const sqlite = getSqlite()
  const id = randomUUID()
  const now = Date.now()

  sqlite
    .prepare(
      `INSERT INTO finance_transactions (
        id, type, tag_id, tag_name_snapshot, tag_icon_snapshot, tag_color_snapshot,
        template_id, template_name_snapshot, occurred_at, comment, exchange_rate_scaled,
        is_system, system_reason, created_at, updated_at
      ) VALUES (?, 'adjustment', NULL, NULL, NULL, NULL, NULL, NULL, ?, ?, NULL, 1, ?, ?, ?)`
    )
    .run(id, occurredAt, reason, reason, now, now)
  sqlite
    .prepare(
      'INSERT INTO finance_transaction_entries (id, transaction_id, account_id, signed_amount_minor) VALUES (?, ?, ?, ?)'
    )
    .run(randomUUID(), id, accountId, signedAmountMinor)

  return id
}

export function getFinanceSettings(): FinanceSettings {
  return mapSettings(ensureFinanceSettingsRow())
}

export function setFinanceBaseCurrency(input: SetFinanceBaseCurrencyInput): FinanceSettings {
  const sqlite = getSqlite()

  sqlite.transaction(() => {
    const settings = ensureFinanceSettingsRow()
    const now = Date.now()

    sqlite
      .prepare('UPDATE finance_settings SET base_currency_code = ?, updated_at = ? WHERE id = ?')
      .run(input.baseCurrencyCode, now, settings.id)
    sqlite.prepare('DELETE FROM finance_exchange_rates').run()
    ensureBaseRate(input.baseCurrencyCode, now)
  })()

  return getFinanceSettings()
}

export function listFinanceExchangeRates(): FinanceExchangeRate[] {
  ensureFinanceSettingsRow()
  return (
    getSqlite()
      .prepare('SELECT * FROM finance_exchange_rates ORDER BY currency_code ASC')
      .all() as ExchangeRateRow[]
  ).map(mapExchangeRate)
}

export function upsertFinanceExchangeRate(
  input: UpsertFinanceExchangeRateInput
): FinanceExchangeRate {
  const settings = getFinanceSettings()
  const rateScaled =
    input.currencyCode === settings.baseCurrencyCode ? FINANCE_RATE_SCALE : input.rateScaled
  const now = Date.now()

  getSqlite()
    .prepare(
      `INSERT INTO finance_exchange_rates (currency_code, base_currency_code, rate_scaled, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(currency_code) DO UPDATE SET
         base_currency_code = excluded.base_currency_code,
         rate_scaled = excluded.rate_scaled,
         updated_at = excluded.updated_at`
    )
    .run(input.currencyCode, settings.baseCurrencyCode, rateScaled, now)

  return mapExchangeRate({
    currency_code: input.currencyCode,
    base_currency_code: settings.baseCurrencyCode,
    rate_scaled: rateScaled,
    updated_at: now
  })
}

export function deleteFinanceExchangeRate(input: DeleteFinanceExchangeRateInput): boolean {
  const settings = getFinanceSettings()
  if (input.currencyCode === settings.baseCurrencyCode) {
    throw new Error('Нельзя удалить курс основной валюты')
  }

  return (
    getSqlite()
      .prepare('DELETE FROM finance_exchange_rates WHERE currency_code = ?')
      .run(input.currencyCode).changes > 0
  )
}

export function listFinanceAccounts(period?: FinancePeriod): FinanceAccountSummary[] {
  const from = period?.from ?? 0
  const to = period?.to ?? Number.MAX_SAFE_INTEGER
  const rows = getSqlite()
    .prepare(
      `SELECT
        a.*,
        a.initial_balance_minor + COALESCE(SUM(e.signed_amount_minor), 0) AS balance_minor,
        COUNT(DISTINCT e.transaction_id) AS transaction_count,
        MAX(t.occurred_at) AS last_transaction_at,
        COALESCE(SUM(CASE WHEN t.occurred_at BETWEEN ? AND ? THEN e.signed_amount_minor ELSE 0 END), 0) AS period_change_minor
       FROM finance_accounts a
       LEFT JOIN finance_transaction_entries e ON e.account_id = a.id
       LEFT JOIN finance_transactions t ON t.id = e.transaction_id
       GROUP BY a.id
       ORDER BY a.created_at ASC, a.name ASC`
    )
    .all(from, to) as AccountSummaryRow[]

  return rows.map(mapAccountSummary)
}

export function getFinanceAccount(id: string, period?: FinancePeriod): FinanceAccountSummary {
  const account = listFinanceAccounts(period).find((item) => item.id === id)
  if (!account) {
    throw new Error('Счёт не найден')
  }
  return account
}

export function createFinanceAccount(input: CreateFinanceAccountInput): FinanceAccountSummary {
  const id = randomUUID()
  const now = Date.now()

  getSqlite()
    .prepare(
      `INSERT INTO finance_accounts (
        id, name, type, currency_code, initial_balance_minor, icon, color, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.name,
      input.type,
      input.currencyCode,
      input.initialBalanceMinor,
      input.icon,
      input.color,
      now,
      now
    )

  return getFinanceAccount(id)
}

export function updateFinanceAccount(input: UpdateFinanceAccountInput): FinanceAccountSummary {
  const account = getAccountRow(input.id)
  const transactionCount = (
    getSqlite()
      .prepare('SELECT COUNT(*) AS count FROM finance_transaction_entries WHERE account_id = ?')
      .get(input.id) as CountRow
  ).count
  const nextCurrency = input.currencyCode ?? account.currency_code

  if (transactionCount > 0 && nextCurrency !== account.currency_code) {
    throw new Error('Нельзя изменить валюту счёта после появления операций')
  }

  getSqlite()
    .prepare(
      `UPDATE finance_accounts SET
        name = ?, type = ?, currency_code = ?, icon = ?, color = ?, updated_at = ?
       WHERE id = ?`
    )
    .run(input.name, input.type, nextCurrency, input.icon, input.color, Date.now(), input.id)

  return getFinanceAccount(input.id)
}

export function deleteFinanceAccount(id: string): boolean {
  getAccountRow(id)
  const entryCount = (
    getSqlite()
      .prepare('SELECT COUNT(*) AS count FROM finance_transaction_entries WHERE account_id = ?')
      .get(id) as CountRow
  ).count

  if (entryCount > 0) {
    throw new Error('Чтобы удалить счёт, сначала очистите его историю.')
  }

  return getSqlite().transaction(() => {
    return getSqlite().prepare('DELETE FROM finance_accounts WHERE id = ?').run(id).changes > 0
  })()
}

export function listFinanceTags(): FinanceTagSummary[] {
  const rows = getSqlite()
    .prepare(
      `SELECT
        g.*,
        COUNT(DISTINCT t.id) AS transaction_count,
        COALESCE(SUM(ABS(e.signed_amount_minor)), 0) AS total_amount_minor,
        (SELECT COUNT(*) FROM finance_limits l WHERE l.tag_id = g.id) AS linked_limit_count
       FROM finance_tags g
       LEFT JOIN finance_transactions t ON t.tag_id = g.id AND t.is_system = 0
       LEFT JOIN finance_transaction_entries e ON e.transaction_id = t.id
       GROUP BY g.id
       ORDER BY g.type ASC, g.name ASC`
    )
    .all() as TagSummaryRow[]

  const totals = new Map<'income' | 'expense', number>([
    ['income', 0],
    ['expense', 0]
  ])

  for (const row of rows) {
    const amount = row.total_amount_minor ?? 0
    if (row.type === 'income') totals.set('income', (totals.get('income') ?? 0) + amount)
    if (row.type === 'expense') totals.set('expense', (totals.get('expense') ?? 0) + amount)
    if (row.type === 'both') {
      const income = getSqlite()
        .prepare(
          `SELECT COALESCE(SUM(ABS(e.signed_amount_minor)), 0) AS total
           FROM finance_transactions t
           JOIN finance_transaction_entries e ON e.transaction_id = t.id
           WHERE t.tag_id = ? AND t.type = 'income' AND t.is_system = 0`
        )
        .get(row.id) as { total: number }
      const expense = getSqlite()
        .prepare(
          `SELECT COALESCE(SUM(ABS(e.signed_amount_minor)), 0) AS total
           FROM finance_transactions t
           JOIN finance_transaction_entries e ON e.transaction_id = t.id
           WHERE t.tag_id = ? AND t.type = 'expense' AND t.is_system = 0`
        )
        .get(row.id) as { total: number }
      totals.set('income', (totals.get('income') ?? 0) + income.total)
      totals.set('expense', (totals.get('expense') ?? 0) + expense.total)
    }
  }

  return rows.map((row) => {
    const total = assertSafeMinor(row.total_amount_minor ?? 0)
    const denominator = row.type === 'income' ? totals.get('income') : totals.get('expense')
    return {
      ...mapTag(row),
      transactionCount: row.transaction_count,
      totalAmountMinor: total,
      averageAmountMinor: row.transaction_count > 0 ? Math.round(total / row.transaction_count) : 0,
      linkedLimitCount: row.linked_limit_count,
      sharePercent: denominator && denominator > 0 ? (total / denominator) * 100 : 0
    }
  })
}

export function getFinanceTag(id: string): FinanceTagSummary {
  const tag = listFinanceTags().find((item) => item.id === id)
  if (!tag) {
    throw new Error('Тег не найден')
  }
  return tag
}

export function createFinanceTag(input: CreateFinanceTagInput): FinanceTagSummary {
  const id = randomUUID()
  const now = Date.now()
  getSqlite()
    .prepare(
      'INSERT INTO finance_tags (id, name, type, icon, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(id, input.name, input.type, input.icon, input.color, now, now)
  return getFinanceTag(id)
}

export function updateFinanceTag(input: UpdateFinanceTagInput): FinanceTagSummary {
  getTagRow(input.id)

  const incompatibleCount = (
    getSqlite()
      .prepare(
        `SELECT COUNT(*) AS count FROM finance_transactions
         WHERE tag_id = ? AND is_system = 0 AND type IN ('income', 'expense')
           AND (? != 'both' AND type != ?)`
      )
      .get(input.id, input.type, input.type) as CountRow
  ).count

  if (incompatibleCount > 0) {
    throw new Error('Нельзя изменить тип тега: он уже используется несовместимыми операциями')
  }

  getSqlite()
    .prepare(
      'UPDATE finance_tags SET name = ?, type = ?, icon = ?, color = ?, updated_at = ? WHERE id = ?'
    )
    .run(input.name, input.type, input.icon, input.color, Date.now(), input.id)
  return getFinanceTag(input.id)
}

export function deleteFinanceTag(id: string): boolean {
  getTagRow(id)
  const transactionCount = (
    getSqlite()
      .prepare('SELECT COUNT(*) AS count FROM finance_transactions WHERE tag_id = ?')
      .get(id) as CountRow
  ).count

  if (transactionCount > 0) {
    throw new Error(`Тег используется в ${transactionCount} операциях и не может быть удалён`)
  }

  return getSqlite().transaction(() => {
    return getSqlite().prepare('DELETE FROM finance_tags WHERE id = ?').run(id).changes > 0
  })()
}

export function getFinanceTransaction(id: string): FinanceTransaction {
  const row = getSqlite().prepare('SELECT * FROM finance_transactions WHERE id = ?').get(id) as
    TransactionRow | undefined

  if (!row) {
    throw new Error('Транзакция не найдена')
  }

  const entries = getSqlite()
    .prepare(
      `SELECT
        e.id,
        e.transaction_id,
        e.account_id,
        a.name AS account_name,
        a.currency_code AS account_currency_code,
        e.signed_amount_minor
       FROM finance_transaction_entries e
       JOIN finance_accounts a ON a.id = e.account_id
       WHERE e.transaction_id = ?
       ORDER BY e.signed_amount_minor ASC, e.id ASC`
    )
    .all(id) as EntryRow[]

  return {
    id: row.id,
    type: row.type,
    tagId: row.tag_id,
    tagNameSnapshot: row.tag_name_snapshot,
    tagIconSnapshot: row.tag_icon_snapshot,
    tagColorSnapshot: row.tag_color_snapshot,
    templateId: row.template_id,
    templateNameSnapshot: row.template_name_snapshot,
    occurredAt: row.occurred_at,
    comment: row.comment,
    exchangeRateScaled: row.exchange_rate_scaled,
    isSystem: row.is_system === 1,
    systemReason: row.system_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    entries: entries.map((entry): FinanceTransactionEntry => ({
      id: entry.id,
      transactionId: entry.transaction_id,
      accountId: entry.account_id,
      accountName: entry.account_name,
      accountCurrencyCode: entry.account_currency_code,
      signedAmountMinor: assertSafeMinor(entry.signed_amount_minor)
    }))
  }
}

export function createFinanceTransaction(input: CreateFinanceTransactionInput): FinanceTransaction {
  const id = randomUUID()
  getSqlite().transaction(() => writeTransaction(id, input))()
  return getFinanceTransaction(id)
}

export function updateFinanceTransaction(input: UpdateFinanceTransactionInput): FinanceTransaction {
  const existing = getSqlite()
    .prepare('SELECT created_at, is_system FROM finance_transactions WHERE id = ?')
    .get(input.id) as { created_at: number; is_system: number } | undefined

  if (!existing) {
    throw new Error('Транзакция не найдена')
  }
  if (existing.is_system === 1) {
    throw new Error('Системную корректировку нельзя изменять вручную')
  }

  getSqlite().transaction(() => {
    getSqlite()
      .prepare('DELETE FROM finance_transaction_entries WHERE transaction_id = ?')
      .run(input.id)
    writeTransaction(input.id, input.transaction, {
      createdAt: existing.created_at,
      updating: true
    })
  })()

  return getFinanceTransaction(input.id)
}

export function deleteFinanceTransaction(id: string): boolean {
  const existing = getSqlite()
    .prepare('SELECT is_system FROM finance_transactions WHERE id = ?')
    .get(id) as { is_system: number } | undefined
  if (!existing) return false
  if (existing.is_system === 1) {
    throw new Error('Системную корректировку нельзя удалить вручную')
  }
  return getSqlite().transaction(() => {
    return getSqlite().prepare('DELETE FROM finance_transactions WHERE id = ?').run(id).changes > 0
  })()
}

function buildTransactionWhere(filters: FinanceTransactionFilters): {
  whereSql: string
  params: unknown[]
} {
  const clauses: string[] = []
  const params: unknown[] = []

  if (!filters.includeSystem) clauses.push('t.is_system = 0')
  if (filters.types?.length) {
    clauses.push(`t.type IN (${filters.types.map(() => '?').join(', ')})`)
    params.push(...filters.types)
  }
  if (filters.accountIds?.length) {
    clauses.push(
      `EXISTS (SELECT 1 FROM finance_transaction_entries ae WHERE ae.transaction_id = t.id AND ae.account_id IN (${filters.accountIds.map(() => '?').join(', ')}))`
    )
    params.push(...filters.accountIds)
  }
  if (filters.tagId !== undefined) {
    clauses.push(filters.tagId === null ? 't.tag_id IS NULL' : 't.tag_id = ?')
    if (filters.tagId !== null) params.push(filters.tagId)
  }
  if (filters.currencyCode) {
    clauses.push(
      `EXISTS (
        SELECT 1 FROM finance_transaction_entries ce
        JOIN finance_accounts ca ON ca.id = ce.account_id
        WHERE ce.transaction_id = t.id AND ca.currency_code = ?
      )`
    )
    params.push(filters.currencyCode)
  }
  if (filters.dateFrom !== undefined) {
    clauses.push('t.occurred_at >= ?')
    params.push(filters.dateFrom)
  }
  if (filters.dateTo !== undefined) {
    clauses.push('t.occurred_at <= ?')
    params.push(filters.dateTo)
  }
  if (filters.minAmountMinor !== undefined) {
    clauses.push(
      'EXISTS (SELECT 1 FROM finance_transaction_entries me WHERE me.transaction_id = t.id AND ABS(me.signed_amount_minor) >= ?)'
    )
    params.push(filters.minAmountMinor)
  }
  if (filters.maxAmountMinor !== undefined) {
    clauses.push(
      'NOT EXISTS (SELECT 1 FROM finance_transaction_entries xe WHERE xe.transaction_id = t.id AND ABS(xe.signed_amount_minor) > ?)'
    )
    params.push(filters.maxAmountMinor)
  }
  if (filters.search) {
    clauses.push("(t.comment LIKE ? ESCAPE '\\' OR t.tag_name_snapshot LIKE ? ESCAPE '\\')")
    const search = `%${filters.search.replace(/[\\%_]/g, '\\$&')}%`
    params.push(search, search)
  }
  if (filters.templateOnly !== undefined) {
    clauses.push(
      filters.templateOnly
        ? 't.template_name_snapshot IS NOT NULL'
        : 't.template_name_snapshot IS NULL'
    )
  }

  return {
    whereSql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params
  }
}

export function listFinanceTransactions(
  filters: FinanceTransactionFilters = {}
): FinanceTransactionPage {
  const limit = filters.limit ?? 30
  const offset = filters.offset ?? 0
  const { whereSql, params } = buildTransactionWhere(filters)
  const amountExpression =
    '(SELECT MAX(ABS(se.signed_amount_minor)) FROM finance_transaction_entries se WHERE se.transaction_id = t.id)'
  const orderBy =
    filters.sort === 'date-asc'
      ? 't.occurred_at ASC, t.created_at ASC'
      : filters.sort === 'amount-desc'
        ? `${amountExpression} DESC, t.occurred_at DESC`
        : filters.sort === 'amount-asc'
          ? `${amountExpression} ASC, t.occurred_at DESC`
          : 't.occurred_at DESC, t.created_at DESC'

  const total = (
    getSqlite()
      .prepare(`SELECT COUNT(*) AS count FROM finance_transactions t ${whereSql}`)
      .get(...params) as CountRow
  ).count
  const rows = getSqlite()
    .prepare(
      `SELECT t.id FROM finance_transactions t ${whereSql}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset) as { id: string }[]

  return {
    items: rows.map((row) => getFinanceTransaction(row.id)),
    total,
    limit,
    offset
  }
}

export function clearFinanceAccountHistory(
  input: ClearFinanceAccountHistoryInput
): ClearFinanceAccountHistoryResult {
  const sqlite = getSqlite()

  return sqlite.transaction(() => {
    const account = getFinanceAccount(input.accountId)
    if (account.balanceMinor !== input.expectedBalanceMinor) {
      throw new Error('Баланс счёта изменился. Обновите данные и подтвердите очистку повторно.')
    }

    const transactionRows = sqlite
      .prepare(
        `SELECT DISTINCT t.id, t.type, t.occurred_at
         FROM finance_transactions t
         JOIN finance_transaction_entries e ON e.transaction_id = t.id
         WHERE e.account_id = ?`
      )
      .all(input.accountId) as {
      id: string
      type: FinanceTransaction['type']
      occurred_at: number
    }[]

    let linkedTransferCount = 0
    let createdAdjustmentCount = 0
    const reason = `Корректировка после очистки счёта «${account.name}»`

    for (const transaction of transactionRows) {
      if (transaction.type === 'transfer') linkedTransferCount += 1
      const otherEntries = sqlite
        .prepare(
          `SELECT account_id, signed_amount_minor
           FROM finance_transaction_entries
           WHERE transaction_id = ? AND account_id != ?`
        )
        .all(transaction.id, input.accountId) as {
        account_id: string
        signed_amount_minor: number
      }[]

      for (const entry of otherEntries) {
        insertAdjustment(
          entry.account_id,
          entry.signed_amount_minor,
          transaction.occurred_at,
          reason
        )
        createdAdjustmentCount += 1
      }
    }

    if (transactionRows.length > 0) {
      const placeholders = transactionRows.map(() => '?').join(', ')
      sqlite
        .prepare(`DELETE FROM finance_transactions WHERE id IN (${placeholders})`)
        .run(...transactionRows.map((transaction) => transaction.id))
    }

    sqlite
      .prepare('UPDATE finance_accounts SET initial_balance_minor = ?, updated_at = ? WHERE id = ?')
      .run(account.balanceMinor, Date.now(), account.id)

    return {
      account: getFinanceAccount(account.id),
      deletedTransactionCount: transactionRows.length,
      linkedTransferCount,
      createdAdjustmentCount,
      newInitialBalanceMinor: account.balanceMinor
    }
  })()
}

export function listFinanceLimitsRaw(): FinanceLimit[] {
  return (
    getSqlite().prepare('SELECT * FROM finance_limits ORDER BY created_at ASC').all() as LimitRow[]
  ).map(mapLimit)
}

export function getFinanceLimitRaw(id: string): FinanceLimit {
  const row = getSqlite().prepare('SELECT * FROM finance_limits WHERE id = ?').get(id) as
    LimitRow | undefined
  if (!row) throw new Error('Лимит не найден')
  return mapLimit(row)
}

function writeLimit(id: string, input: CreateFinanceLimitInput | UpdateFinanceLimitInput): void {
  if (input.accountId) getAccountRow(input.accountId)
  if (input.tagId) {
    const tag = getTagRow(input.tagId)
    if (tag.type === 'income') throw new Error('Лимит расходов нельзя связать с доходным тегом')
  }
  const now = Date.now()
  const state = input.state ?? 'active'
  const existing = getSqlite().prepare('SELECT id FROM finance_limits WHERE id = ?').get(id)

  if (existing) {
    getSqlite()
      .prepare(
        `UPDATE finance_limits SET name = ?, amount_minor = ?, currency_code = ?, scope_type = ?,
          account_id = ?, tag_id = ?, period_type = ?, starts_at = ?, ends_at = ?,
          warning_percent = ?, state = ?, updated_at = ? WHERE id = ?`
      )
      .run(
        input.name,
        input.amountMinor,
        input.currencyCode,
        input.scopeType,
        input.accountId,
        input.tagId,
        input.periodType,
        input.startsAt,
        input.endsAt,
        input.warningPercent,
        state,
        now,
        id
      )
  } else {
    getSqlite()
      .prepare(
        `INSERT INTO finance_limits (
          id, name, amount_minor, currency_code, scope_type, account_id, tag_id,
          period_type, starts_at, ends_at, warning_percent, state, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.name,
        input.amountMinor,
        input.currencyCode,
        input.scopeType,
        input.accountId,
        input.tagId,
        input.periodType,
        input.startsAt,
        input.endsAt,
        input.warningPercent,
        state,
        now,
        now
      )
  }
}

export function createFinanceLimitRaw(input: CreateFinanceLimitInput): FinanceLimit {
  const id = randomUUID()
  getSqlite().transaction(() => writeLimit(id, input))()
  return getFinanceLimitRaw(id)
}

export function updateFinanceLimitRaw(input: UpdateFinanceLimitInput): FinanceLimit {
  getFinanceLimitRaw(input.id)
  getSqlite().transaction(() => writeLimit(input.id, input))()
  return getFinanceLimitRaw(input.id)
}

export function setFinanceLimitStateRaw(input: SetFinanceLimitStateInput): FinanceLimit {
  getFinanceLimitRaw(input.id)
  getSqlite()
    .prepare('UPDATE finance_limits SET state = ?, updated_at = ? WHERE id = ?')
    .run(input.state, Date.now(), input.id)
  return getFinanceLimitRaw(input.id)
}

export function deleteFinanceLimit(id: string): boolean {
  return getSqlite().prepare('DELETE FROM finance_limits WHERE id = ?').run(id).changes > 0
}

export function listFinanceTemplates(): FinanceTemplate[] {
  return (
    getSqlite()
      .prepare(
        `SELECT * FROM finance_transaction_templates
         ORDER BY CASE WHEN next_occurrence_at IS NULL THEN 1 ELSE 0 END, next_occurrence_at ASC, name ASC`
      )
      .all() as TemplateRow[]
  ).map(mapTemplate)
}

export function getFinanceTemplate(id: string): FinanceTemplate {
  return mapTemplate(getTemplateRow(id))
}

function validateTemplateReferences(
  input: CreateFinanceTemplateInput | UpdateFinanceTemplateInput
): void {
  if (input.sourceAccountId) getAccountRow(input.sourceAccountId)
  if (input.destinationAccountId) getAccountRow(input.destinationAccountId)
  if (input.tagId) {
    const tag = getTagRow(input.tagId)
    if (input.type === 'income' || input.type === 'expense') assertTagCompatible(tag, input.type)
  }
  if (
    input.sourceAccountId &&
    input.destinationAccountId &&
    input.sourceAccountId === input.destinationAccountId
  ) {
    throw new Error('Счета перевода должны отличаться')
  }
}

function writeTemplate(
  id: string,
  input: CreateFinanceTemplateInput | UpdateFinanceTemplateInput
): void {
  validateTemplateReferences(input)
  const sqlite = getSqlite()
  const now = Date.now()
  const state = input.state ?? 'active'
  const existing = sqlite
    .prepare('SELECT created_at, last_used_at FROM finance_transaction_templates WHERE id = ?')
    .get(id) as { created_at: number; last_used_at: number | null } | undefined

  if (existing) {
    sqlite
      .prepare(
        `UPDATE finance_transaction_templates SET
          name = ?, type = ?, source_account_id = ?, destination_account_id = ?, tag_id = ?,
          source_amount_minor = ?, destination_amount_minor = ?, comment = ?, schedule_type = ?,
          schedule_interval = ?, next_occurrence_at = ?, reminder_enabled = ?, state = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        input.name,
        input.type,
        input.sourceAccountId,
        input.destinationAccountId,
        input.tagId,
        input.sourceAmountMinor,
        input.destinationAmountMinor,
        input.comment,
        input.scheduleType,
        input.scheduleInterval,
        input.nextOccurrenceAt,
        input.reminderEnabled ? 1 : 0,
        state,
        now,
        id
      )
  } else {
    sqlite
      .prepare(
        `INSERT INTO finance_transaction_templates (
          id, name, type, source_account_id, destination_account_id, tag_id,
          source_amount_minor, destination_amount_minor, comment, schedule_type,
          schedule_interval, next_occurrence_at, reminder_enabled, state,
          last_used_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`
      )
      .run(
        id,
        input.name,
        input.type,
        input.sourceAccountId,
        input.destinationAccountId,
        input.tagId,
        input.sourceAmountMinor,
        input.destinationAmountMinor,
        input.comment,
        input.scheduleType,
        input.scheduleInterval,
        input.nextOccurrenceAt,
        input.reminderEnabled ? 1 : 0,
        state,
        now,
        now
      )
  }
}

export function createFinanceTemplate(input: CreateFinanceTemplateInput): FinanceTemplate {
  const id = randomUUID()
  getSqlite().transaction(() => writeTemplate(id, input))()
  return getFinanceTemplate(id)
}

export function updateFinanceTemplate(input: UpdateFinanceTemplateInput): FinanceTemplate {
  getTemplateRow(input.id)
  getSqlite().transaction(() => writeTemplate(input.id, input))()
  return getFinanceTemplate(input.id)
}

export function setFinanceTemplateState(input: SetFinanceTemplateStateInput): FinanceTemplate {
  getTemplateRow(input.id)
  getSqlite()
    .prepare('UPDATE finance_transaction_templates SET state = ?, updated_at = ? WHERE id = ?')
    .run(input.state, Date.now(), input.id)
  return getFinanceTemplate(input.id)
}

export function deleteFinanceTemplate(id: string): boolean {
  return getSqlite().transaction(() => {
    return (
      getSqlite().prepare('DELETE FROM finance_transaction_templates WHERE id = ?').run(id)
        .changes > 0
    )
  })()
}

export function useFinanceTemplate(input: UseFinanceTemplateInput): FinanceTransaction {
  const sqlite = getSqlite()
  const transactionId = randomUUID()

  sqlite.transaction(() => {
    const template = getFinanceTemplate(input.templateId)
    const transaction = {
      ...input.transaction,
      templateId: template.id
    } as CreateFinanceTransactionInput
    writeTransaction(transactionId, transaction)
    const nextOccurrenceAt = advanceFinanceSchedule(
      template.scheduleType,
      template.scheduleInterval,
      template.nextOccurrenceAt ?? input.transaction.occurredAt
    )
    sqlite
      .prepare(
        `UPDATE finance_transaction_templates SET
          last_used_at = ?, next_occurrence_at = ?, updated_at = ? WHERE id = ?`
      )
      .run(Date.now(), nextOccurrenceAt, Date.now(), template.id)
  })()

  return getFinanceTransaction(transactionId)
}

export function snoozeFinanceTemplate(input: SnoozeFinanceTemplateInput): FinanceTemplate {
  getTemplateRow(input.id)
  getSqlite()
    .prepare(
      'UPDATE finance_transaction_templates SET next_occurrence_at = ?, updated_at = ? WHERE id = ?'
    )
    .run(input.nextOccurrenceAt, Date.now(), input.id)
  return getFinanceTemplate(input.id)
}

export function skipFinanceTemplate(id: string): FinanceTemplate {
  const template = getFinanceTemplate(id)
  const nextOccurrenceAt = advanceFinanceSchedule(
    template.scheduleType,
    template.scheduleInterval,
    template.nextOccurrenceAt ?? Date.now()
  )
  getSqlite()
    .prepare(
      'UPDATE finance_transaction_templates SET next_occurrence_at = ?, updated_at = ? WHERE id = ?'
    )
    .run(nextOccurrenceAt, Date.now(), id)
  return getFinanceTemplate(id)
}
