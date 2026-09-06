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
  FinanceBalanceByCurrency,
  FinanceDashboard,
  FinanceExchangeRate,
  FinanceLimit,
  FinanceLimitImpact,
  FinanceLimitStatus,
  FinancePeriod,
  FinanceReport,
  FinanceReportFilters,
  FinanceReportPoint,
  FinanceSettings,
  FinanceTag,
  FinanceTagBreakdownPoint,
  FinanceTagSummary,
  FinanceTemplate,
  FinanceTransaction,
  FinanceTransactionEntry,
  FinanceTransactionFilters,
  FinanceTransactionPage,
  PreviewFinanceExpenseInput,
  SetFinanceBaseCurrencyInput,
  SetFinanceLimitStateInput,
  UpdateFinanceAccountInput,
  UpdateFinanceLimitInput,
  UpdateFinanceTagInput,
  UpdateFinanceTemplateInput,
  UpdateFinanceTransactionInput,
  UpsertFinanceExchangeRateInput
} from '@mymind/contracts/finance'
import { getFinanceTagColor } from '@mymind/contracts/finance'
import type { RepositoryRuntime, SqlDatabasePort } from '@mymind/contracts/storage'
import { createFinanceRateBook, convertFinanceMinor } from '@mymind/core/finance-conversion'
import { FINANCE_RATE_SCALE, assertSafeMinor } from '@mymind/core/finance-money'
import {
  defaultFinancePeriod,
  previousComparablePeriod,
  resolveFinanceLimitPeriod
} from '@mymind/core/finance-periods'

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
  currency_code: string
  initial_balance_minor: number
  icon: FinanceAccount['icon']
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
interface LimitRow {
  id: string
  amount_minor: number
  currency_code: string
  scope_type: string
  account_id: string | null
  tag_id: string | null
  period_type: FinanceLimit['periodType'] | 'custom'
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
  created_at: number
  updated_at: number
}
interface CountRow {
  count: number
}
interface ExpenseAmountRow {
  amount_minor: number
  currency_code: string
}
interface AggregateEntryRow {
  type: FinanceTransaction['type']
  tag_id: string | null
  tag_name: string | null
  tag_color: string | null
  occurred_at: number
  account_id: string
  account_name: string
  currency_code: string
  signed_amount_minor: number
  transaction_id: string
}

export function createFinanceRepository(runtime: RepositoryRuntime) {
  const database = (): SqlDatabasePort => runtime.database()
  const createId = (): string => runtime.createId()
  const now = (): number => runtime.now()

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
      currencyCode: row.currency_code,
      initialBalanceMinor: assertSafeMinor(row.initial_balance_minor),
      icon: row.icon,
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
      color: getFinanceTagColor(row.type),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  function mapLimit(row: LimitRow): FinanceLimit {
    return {
      id: row.id,
      amountMinor: assertSafeMinor(row.amount_minor),
      currencyCode: row.currency_code,
      tagId: row.tag_id,
      periodType: row.period_type === 'custom' ? 'month' : row.period_type,
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
        row.destination_amount_minor === null
          ? null
          : assertSafeMinor(row.destination_amount_minor),
      comment: row.comment,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  function ensureBaseRate(baseCurrencyCode: string, updatedAt = now()): void {
    database()
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

  function ensureSettingsRow(): SettingsRow {
    const existing = database()
      .prepare('SELECT * FROM finance_settings WHERE id = ?')
      .get('default') as SettingsRow | undefined
    if (existing) {
      ensureBaseRate(existing.base_currency_code, existing.updated_at)
      return existing
    }
    const timestamp = now()
    database()
      .prepare(
        'INSERT INTO finance_settings (id, base_currency_code, created_at, updated_at) VALUES (?, ?, ?, ?)'
      )
      .run('default', 'TJS', timestamp, timestamp)
    ensureBaseRate('TJS', timestamp)
    return {
      id: 'default',
      base_currency_code: 'TJS',
      created_at: timestamp,
      updated_at: timestamp
    }
  }

  function requireAccountRow(id: string): AccountRow {
    const row = database().prepare('SELECT * FROM finance_accounts WHERE id = ?').get(id) as
      AccountRow | undefined
    if (!row) throw new Error('Счёт не найден')
    return row
  }

  function requireTagRow(id: string): TagRow {
    const row = database().prepare('SELECT * FROM finance_tags WHERE id = ?').get(id) as
      TagRow | undefined
    if (!row) throw new Error('Тег не найден')
    return row
  }

  function requireTemplateRow(id: string): TemplateRow {
    const row = database()
      .prepare('SELECT * FROM finance_transaction_templates WHERE id = ?')
      .get(id) as TemplateRow | undefined
    if (!row) throw new Error('Шаблон не найден')
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

  function templateSnapshot(templateId?: string | null): {
    templateId: string | null
    templateNameSnapshot: string | null
  } {
    if (!templateId) return { templateId: null, templateNameSnapshot: null }
    const template = requireTemplateRow(templateId)
    return { templateId: template.id, templateNameSnapshot: template.name }
  }

  function transferRateScaled(sourceAmountMinor: number, destinationAmountMinor: number): number {
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
    const timestamp = now()
    const createdAt = options.createdAt ?? timestamp
    const template = templateSnapshot(input.templateId)

    if (input.type !== 'transfer') {
      requireAccountRow(input.accountId)
      const tag = requireTagRow(input.tagId)
      assertTagCompatible(tag, input.type)
      const signedAmountMinor = input.type === 'income' ? input.amountMinor : -input.amountMinor
      const tagColor = getFinanceTagColor(tag.type)
      if (options.updating) {
        database()
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
            tagColor,
            template.templateId,
            template.templateNameSnapshot,
            input.occurredAt,
            input.comment,
            timestamp,
            transactionId
          )
      } else {
        database()
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
            tagColor,
            template.templateId,
            template.templateNameSnapshot,
            input.occurredAt,
            input.comment,
            createdAt,
            timestamp
          )
      }
      database()
        .prepare(
          'INSERT INTO finance_transaction_entries (id, transaction_id, account_id, signed_amount_minor) VALUES (?, ?, ?, ?)'
        )
        .run(createId(), transactionId, input.accountId, signedAmountMinor)
      return
    }

    const source = requireAccountRow(input.sourceAccountId)
    const destination = requireAccountRow(input.destinationAccountId)
    if (source.id === destination.id) throw new Error('Счета перевода должны отличаться')
    if (
      source.currency_code === destination.currency_code &&
      input.sourceAmountMinor !== input.destinationAmountMinor
    ) {
      throw new Error('Для перевода в одной валюте суммы должны совпадать')
    }
    const exchangeRateScaled =
      input.exchangeRateScaled ??
      transferRateScaled(input.sourceAmountMinor, input.destinationAmountMinor)

    if (options.updating) {
      database()
        .prepare(
          `UPDATE finance_transactions SET
            type = 'transfer', tag_id = NULL, tag_name_snapshot = NULL,
            tag_icon_snapshot = NULL, tag_color_snapshot = NULL,
            template_id = ?, template_name_snapshot = ?, occurred_at = ?, comment = ?,
            exchange_rate_scaled = ?, is_system = 0, system_reason = NULL, updated_at = ?
           WHERE id = ?`
        )
        .run(
          template.templateId,
          template.templateNameSnapshot,
          input.occurredAt,
          input.comment,
          exchangeRateScaled,
          timestamp,
          transactionId
        )
    } else {
      database()
        .prepare(
          `INSERT INTO finance_transactions (
            id, type, tag_id, tag_name_snapshot, tag_icon_snapshot, tag_color_snapshot,
            template_id, template_name_snapshot, occurred_at, comment, exchange_rate_scaled,
            is_system, system_reason, created_at, updated_at
          ) VALUES (?, 'transfer', NULL, NULL, NULL, NULL, ?, ?, ?, ?, ?, 0, NULL, ?, ?)`
        )
        .run(
          transactionId,
          template.templateId,
          template.templateNameSnapshot,
          input.occurredAt,
          input.comment,
          exchangeRateScaled,
          createdAt,
          timestamp
        )
    }
    const insert = database().prepare(
      'INSERT INTO finance_transaction_entries (id, transaction_id, account_id, signed_amount_minor) VALUES (?, ?, ?, ?)'
    )
    insert.run(createId(), transactionId, source.id, -input.sourceAmountMinor)
    insert.run(createId(), transactionId, destination.id, input.destinationAmountMinor)
  }

  function insertAdjustment(
    accountId: string,
    signedAmountMinor: number,
    occurredAt: number,
    reason: string
  ): string {
    const id = createId()
    const timestamp = now()
    database()
      .prepare(
        `INSERT INTO finance_transactions (
          id, type, tag_id, tag_name_snapshot, tag_icon_snapshot, tag_color_snapshot,
          template_id, template_name_snapshot, occurred_at, comment, exchange_rate_scaled,
          is_system, system_reason, created_at, updated_at
        ) VALUES (?, 'adjustment', NULL, NULL, NULL, NULL, NULL, NULL, ?, ?, NULL, 1, ?, ?, ?)`
      )
      .run(id, occurredAt, reason, reason, timestamp, timestamp)
    database()
      .prepare(
        'INSERT INTO finance_transaction_entries (id, transaction_id, account_id, signed_amount_minor) VALUES (?, ?, ?, ?)'
      )
      .run(createId(), id, accountId, signedAmountMinor)
    return id
  }

  function getSettings(): FinanceSettings {
    return mapSettings(ensureSettingsRow())
  }

  function setBaseCurrency(input: SetFinanceBaseCurrencyInput): FinanceSettings {
    database().transaction(() => {
      const settings = ensureSettingsRow()
      const timestamp = now()
      database()
        .prepare('UPDATE finance_settings SET base_currency_code = ?, updated_at = ? WHERE id = ?')
        .run(input.baseCurrencyCode, timestamp, settings.id)
      database().prepare('DELETE FROM finance_exchange_rates').run()
      ensureBaseRate(input.baseCurrencyCode, timestamp)
    })()
    return getSettings()
  }

  function listExchangeRates(): FinanceExchangeRate[] {
    ensureSettingsRow()
    return (
      database()
        .prepare('SELECT * FROM finance_exchange_rates ORDER BY currency_code ASC')
        .all() as ExchangeRateRow[]
    ).map(mapExchangeRate)
  }

  function upsertExchangeRate(input: UpsertFinanceExchangeRateInput): FinanceExchangeRate {
    const settings = getSettings()
    const rateScaled =
      input.currencyCode === settings.baseCurrencyCode ? FINANCE_RATE_SCALE : input.rateScaled
    const timestamp = now()
    database()
      .prepare(
        `INSERT INTO finance_exchange_rates (currency_code, base_currency_code, rate_scaled, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(currency_code) DO UPDATE SET
           base_currency_code = excluded.base_currency_code,
           rate_scaled = excluded.rate_scaled,
           updated_at = excluded.updated_at`
      )
      .run(input.currencyCode, settings.baseCurrencyCode, rateScaled, timestamp)
    return {
      currencyCode: input.currencyCode,
      baseCurrencyCode: settings.baseCurrencyCode,
      rateScaled,
      updatedAt: timestamp
    }
  }

  function deleteExchangeRate(input: DeleteFinanceExchangeRateInput): boolean {
    const settings = getSettings()
    if (input.currencyCode === settings.baseCurrencyCode) {
      throw new Error('Нельзя удалить курс основной валюты')
    }
    return (
      database()
        .prepare('DELETE FROM finance_exchange_rates WHERE currency_code = ?')
        .run(input.currencyCode).changes > 0
    )
  }

  function listAccounts(period?: FinancePeriod): FinanceAccountSummary[] {
    const from = period?.from ?? 0
    const to = period?.to ?? Number.MAX_SAFE_INTEGER
    return (
      database()
        .prepare(
          `SELECT a.*,
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
    ).map(mapAccountSummary)
  }

  function getAccount(id: string, period?: FinancePeriod): FinanceAccountSummary {
    const account = listAccounts(period).find((item) => item.id === id)
    if (!account) throw new Error('Счёт не найден')
    return account
  }

  function createAccount(input: CreateFinanceAccountInput): FinanceAccountSummary {
    const id = createId()
    const timestamp = now()
    database()
      .prepare(
        `INSERT INTO finance_accounts
          (id, name, currency_code, initial_balance_minor, icon, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.name,
        input.currencyCode,
        input.initialBalanceMinor,
        input.icon,
        timestamp,
        timestamp
      )
    return getAccount(id)
  }

  function updateAccount(input: UpdateFinanceAccountInput): FinanceAccountSummary {
    const account = requireAccountRow(input.id)
    const transactionCount = (
      database()
        .prepare('SELECT COUNT(*) AS count FROM finance_transaction_entries WHERE account_id = ?')
        .get(input.id) as CountRow
    ).count
    const nextCurrency = input.currencyCode ?? account.currency_code
    if (transactionCount > 0 && nextCurrency !== account.currency_code) {
      throw new Error('Нельзя изменить валюту счёта после появления операций')
    }
    database()
      .prepare(
        'UPDATE finance_accounts SET name = ?, currency_code = ?, icon = ?, updated_at = ? WHERE id = ?'
      )
      .run(input.name, nextCurrency, input.icon, now(), input.id)
    return getAccount(input.id)
  }

  function deleteAccount(input: { id: string }): boolean {
    requireAccountRow(input.id)
    const entryCount = (
      database()
        .prepare('SELECT COUNT(*) AS count FROM finance_transaction_entries WHERE account_id = ?')
        .get(input.id) as CountRow
    ).count
    if (entryCount > 0) throw new Error('Чтобы удалить счёт, сначала очистите его историю.')
    return database().transaction(
      () =>
        database().prepare('DELETE FROM finance_accounts WHERE id = ?').run(input.id).changes > 0
    )()
  }

  function listTags(): FinanceTagSummary[] {
    const rows = database()
      .prepare(
        `SELECT g.*,
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
    const splitTotals = new Map<string, { income: number; expense: number }>()
    for (const row of rows) {
      const amount = row.total_amount_minor ?? 0
      if (row.type === 'income') totals.set('income', (totals.get('income') ?? 0) + amount)
      if (row.type === 'expense') totals.set('expense', (totals.get('expense') ?? 0) + amount)
      if (row.type === 'both') {
        const income = database()
          .prepare(
            `SELECT COALESCE(SUM(ABS(e.signed_amount_minor)), 0) AS total
             FROM finance_transactions t
             JOIN finance_transaction_entries e ON e.transaction_id = t.id
             WHERE t.tag_id = ? AND t.type = 'income' AND t.is_system = 0`
          )
          .get(row.id) as { total: number }
        const expense = database()
          .prepare(
            `SELECT COALESCE(SUM(ABS(e.signed_amount_minor)), 0) AS total
             FROM finance_transactions t
             JOIN finance_transaction_entries e ON e.transaction_id = t.id
             WHERE t.tag_id = ? AND t.type = 'expense' AND t.is_system = 0`
          )
          .get(row.id) as { total: number }
        splitTotals.set(row.id, { income: income.total, expense: expense.total })
        totals.set('income', (totals.get('income') ?? 0) + income.total)
        totals.set('expense', (totals.get('expense') ?? 0) + expense.total)
      }
    }
    return rows.map((row) => {
      const total = assertSafeMinor(row.total_amount_minor ?? 0)
      const denominator =
        row.type === 'income'
          ? totals.get('income')
          : row.type === 'expense'
            ? totals.get('expense')
            : Math.max(totals.get('income') ?? 0, totals.get('expense') ?? 0)
      const both = splitTotals.get(row.id)
      const meaningfulTotal = both ? both.income + both.expense : total
      return {
        ...mapTag(row),
        transactionCount: row.transaction_count,
        totalAmountMinor: assertSafeMinor(meaningfulTotal),
        averageAmountMinor:
          row.transaction_count > 0 ? Math.round(meaningfulTotal / row.transaction_count) : 0,
        linkedLimitCount: row.linked_limit_count,
        sharePercent: denominator && denominator > 0 ? (meaningfulTotal / denominator) * 100 : 0
      }
    })
  }

  function getTag(id: string): FinanceTagSummary {
    const tag = listTags().find((item) => item.id === id)
    if (!tag) throw new Error('Тег не найден')
    return tag
  }

  function createTag(input: CreateFinanceTagInput): FinanceTagSummary {
    const id = createId()
    const timestamp = now()
    database()
      .prepare(
        'INSERT INTO finance_tags (id, name, type, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(id, input.name, input.type, input.icon, timestamp, timestamp)
    return getTag(id)
  }

  function updateTag(input: UpdateFinanceTagInput): FinanceTagSummary {
    requireTagRow(input.id)
    const incompatibleCount = (
      database()
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
    const tagColor = getFinanceTagColor(input.type)
    database().transaction(() => {
      database()
        .prepare(
          'UPDATE finance_tags SET name = ?, type = ?, icon = ?, updated_at = ? WHERE id = ?'
        )
        .run(input.name, input.type, input.icon, now(), input.id)
      database()
        .prepare('UPDATE finance_transactions SET tag_color_snapshot = ? WHERE tag_id = ?')
        .run(tagColor, input.id)
    })()
    return getTag(input.id)
  }

  function deleteTag(input: { id: string }): boolean {
    requireTagRow(input.id)
    const transactionCount = (
      database()
        .prepare('SELECT COUNT(*) AS count FROM finance_transactions WHERE tag_id = ?')
        .get(input.id) as CountRow
    ).count
    if (transactionCount > 0) {
      throw new Error(`Тег используется в ${transactionCount} операциях и не может быть удалён`)
    }
    return database().transaction(
      () => database().prepare('DELETE FROM finance_tags WHERE id = ?').run(input.id).changes > 0
    )()
  }

  function getTransaction(id: string): FinanceTransaction {
    const row = database().prepare('SELECT * FROM finance_transactions WHERE id = ?').get(id) as
      TransactionRow | undefined
    if (!row) throw new Error('Транзакция не найдена')
    const entries = database()
      .prepare(
        `SELECT e.id, e.transaction_id, e.account_id,
          a.name AS account_name, a.currency_code AS account_currency_code,
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

  function createTransaction(input: CreateFinanceTransactionInput): FinanceTransaction {
    const id = createId()
    database().transaction(() => writeTransaction(id, input))()
    return getTransaction(id)
  }

  function updateTransaction(input: UpdateFinanceTransactionInput): FinanceTransaction {
    const existing = database()
      .prepare('SELECT created_at, is_system FROM finance_transactions WHERE id = ?')
      .get(input.id) as { created_at: number; is_system: number } | undefined
    if (!existing) throw new Error('Транзакция не найдена')
    if (existing.is_system === 1) {
      throw new Error('Системную корректировку нельзя изменять вручную')
    }
    database().transaction(() => {
      database()
        .prepare('DELETE FROM finance_transaction_entries WHERE transaction_id = ?')
        .run(input.id)
      writeTransaction(input.id, input.transaction, {
        createdAt: existing.created_at,
        updating: true
      })
    })()
    return getTransaction(input.id)
  }

  function deleteTransaction(input: { id: string }): boolean {
    const existing = database()
      .prepare('SELECT is_system FROM finance_transactions WHERE id = ?')
      .get(input.id) as { is_system: number } | undefined
    if (!existing) return false
    if (existing.is_system === 1) {
      throw new Error('Системную корректировку нельзя удалить вручную')
    }
    return database().transaction(
      () =>
        database().prepare('DELETE FROM finance_transactions WHERE id = ?').run(input.id).changes >
        0
    )()
  }

  function transactionWhere(filters: FinanceTransactionFilters): {
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
    return { whereSql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params }
  }

  function listTransactions(filters: FinanceTransactionFilters = {}): FinanceTransactionPage {
    const limit = filters.limit ?? 30
    const offset = filters.offset ?? 0
    const { whereSql, params } = transactionWhere(filters)
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
      database()
        .prepare(`SELECT COUNT(*) AS count FROM finance_transactions t ${whereSql}`)
        .get(...params) as CountRow
    ).count
    const rows = database()
      .prepare(
        `SELECT t.id FROM finance_transactions t ${whereSql}
         ORDER BY ${orderBy} LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset) as Array<{ id: string }>
    return { items: rows.map((row) => getTransaction(row.id)), total, limit, offset }
  }

  function clearAccountHistory(
    input: ClearFinanceAccountHistoryInput
  ): ClearFinanceAccountHistoryResult {
    return database().transaction(() => {
      const account = getAccount(input.accountId)
      if (account.balanceMinor !== input.expectedBalanceMinor) {
        throw new Error('Баланс счёта изменился. Обновите данные и подтвердите очистку повторно.')
      }
      if (input.confirmation !== 'ОЧИСТИТЬ') {
        throw new Error('Для подтверждения введите «ОЧИСТИТЬ»')
      }
      const rows = database()
        .prepare(
          `SELECT DISTINCT t.id, t.type, t.occurred_at
           FROM finance_transactions t
           JOIN finance_transaction_entries e ON e.transaction_id = t.id
           WHERE e.account_id = ?`
        )
        .all(input.accountId) as Array<{
        id: string
        type: FinanceTransaction['type']
        occurred_at: number
      }>
      let linkedTransferCount = 0
      let createdAdjustmentCount = 0
      const reason = `Корректировка после очистки счёта «${account.name}»`
      for (const transaction of rows) {
        if (transaction.type === 'transfer') linkedTransferCount += 1
        const otherEntries = database()
          .prepare(
            `SELECT account_id, signed_amount_minor
             FROM finance_transaction_entries
             WHERE transaction_id = ? AND account_id != ?`
          )
          .all(transaction.id, input.accountId) as Array<{
          account_id: string
          signed_amount_minor: number
        }>
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
      if (rows.length) {
        const placeholders = rows.map(() => '?').join(', ')
        database()
          .prepare(`DELETE FROM finance_transactions WHERE id IN (${placeholders})`)
          .run(...rows.map((row) => row.id))
      }
      database()
        .prepare(
          'UPDATE finance_accounts SET initial_balance_minor = ?, updated_at = ? WHERE id = ?'
        )
        .run(account.balanceMinor, now(), account.id)
      return {
        account: getAccount(account.id),
        deletedTransactionCount: rows.length,
        linkedTransferCount,
        createdAdjustmentCount,
        newInitialBalanceMinor: account.balanceMinor
      }
    })()
  }

  function listLimitsRaw(): FinanceLimit[] {
    return (
      database().prepare('SELECT * FROM finance_limits ORDER BY created_at ASC').all() as LimitRow[]
    ).map(mapLimit)
  }

  function requireLimitRaw(id: string): FinanceLimit {
    const row = database().prepare('SELECT * FROM finance_limits WHERE id = ?').get(id) as
      LimitRow | undefined
    if (!row) throw new Error('Лимит не найден')
    return mapLimit(row)
  }

  function limitAccountIds(limitId: string): string[] {
    return (
      database()
        .prepare(
          'SELECT account_id FROM finance_limit_accounts WHERE limit_id = ? ORDER BY account_id ASC'
        )
        .all(limitId) as Array<{ account_id: string }>
    ).map((row) => row.account_id)
  }

  function withLimitAccounts<T extends FinanceLimit>(limit: T): T & { accountIds: string[] } {
    return { ...limit, accountIds: limitAccountIds(limit.id) }
  }

  function normalizeLimitInput<T extends CreateFinanceLimitInput | UpdateFinanceLimitInput>(
    input: T
  ): T {
    const tag = getTag(input.tagId)
    if (tag.type === 'income') throw new Error('Лимит расходов нельзя связать с доходным тегом')
    const accountIds = [...new Set(input.accountIds)]
    if (!accountIds.length) {
      const accounts = listAccounts()
      if (!accounts.length) throw new Error('Сначала создайте хотя бы один счёт')
      const currencies = [...new Set(accounts.map((account) => account.currencyCode))]
      if (currencies.length !== 1) {
        throw new Error(
          'Нельзя выбрать все счета, пока используются разные валюты. Выберите несколько счетов одной валюты.'
        )
      }
      return { ...input, currencyCode: currencies[0], accountIds: [] }
    }
    const accounts = accountIds.map((accountId) => getAccount(accountId))
    const currencies = [...new Set(accounts.map((account) => account.currencyCode))]
    if (currencies.length !== 1) {
      throw new Error('В одном лимите можно выбрать только счета с одинаковой валютой')
    }
    return { ...input, currencyCode: currencies[0], accountIds }
  }

  function syncLimitAccounts(limitId: string, accountIds: readonly string[]): void {
    database().prepare('DELETE FROM finance_limit_accounts WHERE limit_id = ?').run(limitId)
    if (!accountIds.length) return
    const insert = database().prepare(
      'INSERT INTO finance_limit_accounts (limit_id, account_id) VALUES (?, ?)'
    )
    for (const accountId of accountIds) insert.run(limitId, accountId)
  }

  function writeLimit(id: string, input: CreateFinanceLimitInput | UpdateFinanceLimitInput): void {
    const timestamp = now()
    const state = input.state ?? 'active'
    const accountId = input.accountIds[0] ?? null
    const scopeType = input.accountIds.length ? 'account-tag' : 'tag'
    const existing = database().prepare('SELECT id FROM finance_limits WHERE id = ?').get(id)
    if (existing) {
      database()
        .prepare(
          `UPDATE finance_limits SET amount_minor = ?, currency_code = ?, scope_type = ?,
            account_id = ?, tag_id = ?, period_type = ?, starts_at = 0, ends_at = NULL,
            warning_percent = ?, state = ?, updated_at = ? WHERE id = ?`
        )
        .run(
          input.amountMinor,
          input.currencyCode,
          scopeType,
          accountId,
          input.tagId,
          input.periodType,
          input.warningPercent,
          state,
          timestamp,
          id
        )
    } else {
      database()
        .prepare(
          `INSERT INTO finance_limits (
            id, amount_minor, currency_code, scope_type, account_id, tag_id,
            period_type, starts_at, ends_at, warning_percent, state, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, ?, ?)`
        )
        .run(
          id,
          input.amountMinor,
          input.currencyCode,
          scopeType,
          accountId,
          input.tagId,
          input.periodType,
          input.warningPercent,
          state,
          timestamp,
          timestamp
        )
    }
  }

  function loadRateBook() {
    const settings = getSettings()
    const rates = listExchangeRates()
    return { settings, rates, rateBook: createFinanceRateBook(settings.baseCurrencyCode, rates) }
  }

  function limitExpenseRows(
    limit: FinanceLimit,
    period: FinancePeriod,
    excludeTransactionId?: string | null
  ): ExpenseAmountRow[] {
    const clauses = ["t.type = 'expense'", 't.is_system = 0', 't.occurred_at BETWEEN ? AND ?']
    const params: unknown[] = [period.from, period.to]
    const accountIds = limit.accountIds ?? []
    if (accountIds.length) {
      clauses.push(`e.account_id IN (${accountIds.map(() => '?').join(', ')})`)
      params.push(...accountIds)
    } else {
      clauses.push('a.currency_code = ?')
      params.push(limit.currencyCode)
    }
    if (limit.tagId) {
      clauses.push('t.tag_id = ?')
      params.push(limit.tagId)
    }
    if (excludeTransactionId) {
      clauses.push('t.id != ?')
      params.push(excludeTransactionId)
    }
    return database()
      .prepare(
        `SELECT ABS(e.signed_amount_minor) AS amount_minor, a.currency_code
         FROM finance_transactions t
         JOIN finance_transaction_entries e ON e.transaction_id = t.id
         JOIN finance_accounts a ON a.id = e.account_id
         WHERE ${clauses.join(' AND ')}`
      )
      .all(...params) as ExpenseAmountRow[]
  }

  function calculateLimitStatus(raw: FinanceLimit, at: number): FinanceLimitStatus {
    const limit = withLimitAccounts(raw)
    const period = resolveFinanceLimitPeriod(limit, at)
    const { rateBook } = loadRateBook()
    const missing = new Set<string>()
    let spentMinor = 0
    for (const row of limitExpenseRows(limit, period)) {
      const converted = convertFinanceMinor(
        rateBook,
        row.amount_minor,
        row.currency_code,
        limit.currencyCode
      )
      if (converted === null) missing.add(row.currency_code)
      else spentMinor = assertSafeMinor(spentMinor + converted)
    }
    const remainingMinor = limit.amountMinor - spentMinor
    const usagePercent = limit.amountMinor > 0 ? (spentMinor / limit.amountMinor) * 100 : 0
    const daysRemaining = Math.max(0, Math.ceil((period.to - at) / 86_400_000))
    const elapsed = Math.max(0, at - period.from)
    const duration = Math.max(1, period.to - period.from)
    const projectedMinor =
      spentMinor > 0 && elapsed >= 86_400_000 && at >= period.from && at <= period.to
        ? Math.round(spentMinor * (duration / elapsed))
        : null
    return {
      ...limit,
      periodStart: period.from,
      periodEnd: period.to,
      spentMinor,
      remainingMinor,
      usagePercent,
      daysRemaining,
      exceededMinor: Math.max(0, spentMinor - limit.amountMinor),
      projectedMinor,
      warningReached: usagePercent >= limit.warningPercent,
      missingRateCurrencies: [...missing].sort()
    }
  }

  function listLimits(at = now()): FinanceLimitStatus[] {
    return listLimitsRaw()
      .map((limit) => calculateLimitStatus(limit, at))
      .sort((left, right) => {
        const leftRank = left.exceededMinor > 0 ? 0 : left.warningReached ? 1 : 2
        const rightRank = right.exceededMinor > 0 ? 0 : right.warningReached ? 1 : 2
        return leftRank - rightRank || right.usagePercent - left.usagePercent
      })
  }

  function createLimit(input: CreateFinanceLimitInput): FinanceLimitStatus {
    const normalized = normalizeLimitInput(input)
    const id = createId()
    database().transaction(() => {
      writeLimit(id, normalized)
      syncLimitAccounts(id, normalized.accountIds)
    })()
    return calculateLimitStatus(requireLimitRaw(id), now())
  }

  function updateLimit(input: UpdateFinanceLimitInput): FinanceLimitStatus {
    requireLimitRaw(input.id)
    const normalized = normalizeLimitInput(input)
    database().transaction(() => {
      writeLimit(input.id, normalized)
      syncLimitAccounts(input.id, normalized.accountIds)
    })()
    return calculateLimitStatus(requireLimitRaw(input.id), now())
  }

  function setLimitState(input: SetFinanceLimitStateInput): FinanceLimitStatus {
    requireLimitRaw(input.id)
    database()
      .prepare('UPDATE finance_limits SET state = ?, updated_at = ? WHERE id = ?')
      .run(input.state, now(), input.id)
    return calculateLimitStatus(requireLimitRaw(input.id), now())
  }

  function deleteLimit(input: { id: string }): boolean {
    return database().prepare('DELETE FROM finance_limits WHERE id = ?').run(input.id).changes > 0
  }

  function previewExpenseImpact(input: PreviewFinanceExpenseInput): FinanceLimitImpact {
    const account = getAccount(input.accountId)
    const tag = getTag(input.tagId)
    if (tag.type === 'income') throw new Error('Доходный тег нельзя использовать для расхода')
    const { rateBook } = loadRateBook()
    const items = listLimitsRaw()
      .map(withLimitAccounts)
      .filter((limit) => limit.state === 'active')
      .filter((limit) => {
        const ids = limit.accountIds ?? []
        return ids.length
          ? ids.includes(input.accountId)
          : account.currencyCode === limit.currencyCode
      })
      .filter((limit) => !limit.tagId || limit.tagId === input.tagId)
      .map((limit) => {
        const status = calculateLimitStatus(limit, input.occurredAt)
        const convertedExpenseMinor = convertFinanceMinor(
          rateBook,
          input.amountMinor,
          account.currencyCode,
          limit.currencyCode
        )
        const currentRows = limitExpenseRows(
          limit,
          { from: status.periodStart, to: status.periodEnd },
          input.excludeTransactionId
        )
        let currentSpentMinor = 0
        const missing = new Set(status.missingRateCurrencies)
        for (const row of currentRows) {
          const converted = convertFinanceMinor(
            rateBook,
            row.amount_minor,
            row.currency_code,
            limit.currencyCode
          )
          if (converted === null) missing.add(row.currency_code)
          else currentSpentMinor = assertSafeMinor(currentSpentMinor + converted)
        }
        const spentAfterMinor =
          convertedExpenseMinor === null
            ? currentSpentMinor
            : assertSafeMinor(currentSpentMinor + convertedExpenseMinor)
        return {
          limit: {
            ...status,
            spentMinor: currentSpentMinor,
            remainingMinor: limit.amountMinor - currentSpentMinor,
            usagePercent: limit.amountMinor > 0 ? (currentSpentMinor / limit.amountMinor) * 100 : 0,
            exceededMinor: Math.max(0, currentSpentMinor - limit.amountMinor),
            missingRateCurrencies: [...missing].sort()
          },
          currentSpentMinor,
          spentAfterMinor,
          exceededAfterMinor: Math.max(0, spentAfterMinor - limit.amountMinor),
          warningReachedAfter:
            limit.amountMinor > 0 &&
            (spentAfterMinor / limit.amountMinor) * 100 >= limit.warningPercent,
          convertedExpenseMinor
        }
      })
    return {
      items,
      missingRateCurrencies: [
        ...new Set(
          items.flatMap((item) =>
            item.convertedExpenseMinor === null
              ? [account.currencyCode, ...item.limit.missingRateCurrencies]
              : item.limit.missingRateCurrencies
          )
        )
      ].sort()
    }
  }

  function listTemplates(): FinanceTemplate[] {
    return (
      database()
        .prepare('SELECT * FROM finance_transaction_templates ORDER BY name ASC, created_at ASC')
        .all() as TemplateRow[]
    ).map(mapTemplate)
  }

  function getTemplate(id: string): FinanceTemplate {
    return mapTemplate(requireTemplateRow(id))
  }

  function validateTemplateReferences(
    input: CreateFinanceTemplateInput | UpdateFinanceTemplateInput
  ): void {
    if (input.sourceAccountId) requireAccountRow(input.sourceAccountId)
    if (input.destinationAccountId) requireAccountRow(input.destinationAccountId)
    if (input.tagId) {
      const tag = requireTagRow(input.tagId)
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
    const timestamp = now()
    const existing = database()
      .prepare('SELECT created_at FROM finance_transaction_templates WHERE id = ?')
      .get(id) as { created_at: number } | undefined
    if (existing) {
      database()
        .prepare(
          `UPDATE finance_transaction_templates SET
            name = ?, type = ?, source_account_id = ?, destination_account_id = ?, tag_id = ?,
            source_amount_minor = ?, destination_amount_minor = ?, comment = ?, updated_at = ?
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
          timestamp,
          id
        )
    } else {
      database()
        .prepare(
          `INSERT INTO finance_transaction_templates (
            id, name, type, source_account_id, destination_account_id, tag_id,
            source_amount_minor, destination_amount_minor, comment, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
          timestamp,
          timestamp
        )
    }
  }

  function createTemplate(input: CreateFinanceTemplateInput): FinanceTemplate {
    const id = createId()
    database().transaction(() => writeTemplate(id, input))()
    return getTemplate(id)
  }

  function updateTemplate(input: UpdateFinanceTemplateInput): FinanceTemplate {
    requireTemplateRow(input.id)
    database().transaction(() => writeTemplate(input.id, input))()
    return getTemplate(input.id)
  }

  function deleteTemplate(input: { id: string }): boolean {
    return database().transaction(
      () =>
        database().prepare('DELETE FROM finance_transaction_templates WHERE id = ?').run(input.id)
          .changes > 0
    )()
  }

  function allTransactions(filters: FinanceTransactionFilters): FinanceTransaction[] {
    const result: FinanceTransaction[] = []
    let offset = 0
    while (true) {
      const page = listTransactions({ ...filters, limit: 100, offset })
      result.push(...page.items)
      offset += page.items.length
      if (offset >= page.total || !page.items.length) break
    }
    return result
  }

  function sumTransactionsInCurrency(
    transactions: FinanceTransaction[],
    targetCurrency: string
  ): { incomeMinor: number; expenseMinor: number; missingRateCurrencies: string[] } {
    const { rateBook } = loadRateBook()
    const missing = new Set<string>()
    let incomeMinor = 0
    let expenseMinor = 0
    for (const transaction of transactions) {
      if (transaction.isSystem || (transaction.type !== 'income' && transaction.type !== 'expense'))
        continue
      const entry = transaction.entries[0]
      if (!entry) continue
      const converted = convertFinanceMinor(
        rateBook,
        Math.abs(entry.signedAmountMinor),
        entry.accountCurrencyCode,
        targetCurrency
      )
      if (converted === null) missing.add(entry.accountCurrencyCode)
      else if (transaction.type === 'income') incomeMinor = assertSafeMinor(incomeMinor + converted)
      else expenseMinor = assertSafeMinor(expenseMinor + converted)
    }
    return { incomeMinor, expenseMinor, missingRateCurrencies: [...missing].sort() }
  }

  function getDashboard(period = defaultFinancePeriod(now())): FinanceDashboard {
    const { settings, rateBook } = loadRateBook()
    const accounts = listAccounts(period)
    const balances = new Map<string, number>()
    for (const account of accounts) {
      balances.set(
        account.currencyCode,
        assertSafeMinor((balances.get(account.currencyCode) ?? 0) + account.balanceMinor)
      )
    }
    const missingRates = new Set<string>()
    let totalBalanceMinor = 0
    const balancesByCurrency: FinanceBalanceByCurrency[] = [...balances.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([currencyCode, balanceMinor]) => {
        const convertedBalanceMinor = convertFinanceMinor(
          rateBook,
          balanceMinor,
          currencyCode,
          settings.baseCurrencyCode
        )
        if (convertedBalanceMinor === null) missingRates.add(currencyCode)
        else totalBalanceMinor = assertSafeMinor(totalBalanceMinor + convertedBalanceMinor)
        return {
          currencyCode,
          balanceMinor,
          convertedBalanceMinor,
          hasRate: convertedBalanceMinor !== null
        }
      })
    const transactions = allTransactions({
      dateFrom: period.from,
      dateTo: period.to,
      includeSystem: false,
      sort: 'date-desc'
    })
    const totals = sumTransactionsInCurrency(transactions, settings.baseCurrencyCode)
    totals.missingRateCurrencies.forEach((currency) => missingRates.add(currency))
    return {
      settings,
      period,
      totalBalanceMinor,
      totalBalanceComplete: missingRates.size === 0,
      missingRateCurrencies: [...missingRates].sort(),
      balancesByCurrency,
      incomeMinor: totals.incomeMinor,
      expenseMinor: totals.expenseMinor,
      netMinor: assertSafeMinor(totals.incomeMinor - totals.expenseMinor),
      operationCount: transactions.filter((transaction) => !transaction.isSystem).length,
      accounts,
      limits: listLimits(period.to).filter((limit) => limit.state === 'active'),
      recentTransactions: listTransactions({ limit: 8, offset: 0, includeSystem: false }).items
    }
  }

  function aggregateRows(filters: FinanceReportFilters): AggregateEntryRow[] {
    const clauses = ['t.occurred_at BETWEEN ? AND ?']
    const params: unknown[] = [filters.dateFrom, filters.dateTo]
    if (filters.types?.length) {
      clauses.push(`t.type IN (${filters.types.map(() => '?').join(', ')})`)
      params.push(...filters.types)
    }
    if (filters.accountIds?.length) {
      clauses.push(`e.account_id IN (${filters.accountIds.map(() => '?').join(', ')})`)
      params.push(...filters.accountIds)
    }
    if (filters.tagId !== undefined) {
      clauses.push(filters.tagId === null ? 't.tag_id IS NULL' : 't.tag_id = ?')
      if (filters.tagId !== null) params.push(filters.tagId)
    }
    if (filters.currencyCode) {
      clauses.push('a.currency_code = ?')
      params.push(filters.currencyCode)
    }
    if (filters.minAmountMinor !== undefined) {
      clauses.push('ABS(e.signed_amount_minor) >= ?')
      params.push(filters.minAmountMinor)
    }
    if (filters.maxAmountMinor !== undefined) {
      clauses.push('ABS(e.signed_amount_minor) <= ?')
      params.push(filters.maxAmountMinor)
    }
    if (filters.templateOnly !== undefined) {
      clauses.push(
        filters.templateOnly
          ? 't.template_name_snapshot IS NOT NULL'
          : 't.template_name_snapshot IS NULL'
      )
    }
    return database()
      .prepare(
        `SELECT t.type, t.tag_id, t.tag_name_snapshot AS tag_name,
          t.tag_color_snapshot AS tag_color, t.occurred_at,
          e.account_id, a.name AS account_name, a.currency_code,
          e.signed_amount_minor, t.id AS transaction_id
         FROM finance_transactions t
         JOIN finance_transaction_entries e ON e.transaction_id = t.id
         JOIN finance_accounts a ON a.id = e.account_id
         WHERE t.is_system = 0 AND ${clauses.join(' AND ')}
         ORDER BY t.occurred_at ASC, t.created_at ASC`
      )
      .all(...params) as AggregateEntryRow[]
  }

  function convertedRows(rows: AggregateEntryRow[], targetCurrency: string) {
    const { rateBook } = loadRateBook()
    const missing = new Set<string>()
    const converted: Array<AggregateEntryRow & { convertedMinor: number }> = []
    for (const row of rows) {
      const amount = convertFinanceMinor(
        rateBook,
        row.signed_amount_minor,
        row.currency_code,
        targetCurrency
      )
      if (amount === null) missing.add(row.currency_code)
      else converted.push({ ...row, convertedMinor: amount })
    }
    return { converted, missing: [...missing].sort() }
  }

  function reportSummary(rows: Array<AggregateEntryRow & { convertedMinor: number }>) {
    let incomeMinor = 0
    let expenseMinor = 0
    let largestIncomeMinor = 0
    let largestExpenseMinor = 0
    const operations = new Set<string>()
    for (const row of rows) {
      if (row.type === 'income') {
        const amount = Math.abs(row.convertedMinor)
        incomeMinor = assertSafeMinor(incomeMinor + amount)
        largestIncomeMinor = Math.max(largestIncomeMinor, amount)
        operations.add(row.transaction_id)
      } else if (row.type === 'expense') {
        const amount = Math.abs(row.convertedMinor)
        expenseMinor = assertSafeMinor(expenseMinor + amount)
        largestExpenseMinor = Math.max(largestExpenseMinor, amount)
        operations.add(row.transaction_id)
      } else if (row.type === 'transfer') operations.add(row.transaction_id)
    }
    return {
      incomeMinor,
      expenseMinor,
      largestIncomeMinor,
      largestExpenseMinor,
      operationCount: operations.size
    }
  }

  function dateKey(timestamp: number, monthly: boolean): { key: string; label: string } {
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    if (monthly) return { key: `${year}-${month}`, label: `${month}.${year}` }
    const day = String(date.getDate()).padStart(2, '0')
    return { key: `${year}-${month}-${day}`, label: `${day}.${month}` }
  }

  function timeline(
    rows: Array<AggregateEntryRow & { convertedMinor: number }>,
    period: FinancePeriod
  ): FinanceReportPoint[] {
    const durationDays = Math.max(1, Math.ceil((period.to - period.from) / 86_400_000))
    const monthly = durationDays > 120
    const buckets = new Map<string, FinanceReportPoint>()
    let runningBalance = 0
    for (const row of rows) {
      const identity = dateKey(row.occurred_at, monthly)
      const bucket = buckets.get(identity.key) ?? {
        ...identity,
        incomeMinor: 0,
        expenseMinor: 0,
        netMinor: 0,
        balanceMinor: 0
      }
      if (row.type === 'income') bucket.incomeMinor += Math.abs(row.convertedMinor)
      if (row.type === 'expense') bucket.expenseMinor += Math.abs(row.convertedMinor)
      bucket.netMinor = bucket.incomeMinor - bucket.expenseMinor
      runningBalance = assertSafeMinor(runningBalance + row.convertedMinor)
      bucket.balanceMinor = runningBalance
      buckets.set(identity.key, bucket)
    }
    return [...buckets.values()].sort((left, right) => left.key.localeCompare(right.key))
  }

  function tagBreakdown(
    rows: Array<AggregateEntryRow & { convertedMinor: number }>,
    type: 'income' | 'expense'
  ): FinanceTagBreakdownPoint[] {
    const totals = new Map<string, FinanceTagBreakdownPoint>()
    for (const row of rows) {
      if (row.type !== type) continue
      const key = row.tag_id ?? 'unknown'
      const current = totals.get(key) ?? {
        tagId: row.tag_id,
        label: row.tag_name ?? 'Без тега',
        color: row.tag_color,
        amountMinor: 0,
        sharePercent: 0
      }
      current.amountMinor = assertSafeMinor(current.amountMinor + Math.abs(row.convertedMinor))
      totals.set(key, current)
    }
    const grandTotal = [...totals.values()].reduce((sum, item) => sum + item.amountMinor, 0)
    return [...totals.values()]
      .map((item) => ({
        ...item,
        sharePercent: grandTotal > 0 ? (item.amountMinor / grandTotal) * 100 : 0
      }))
      .sort((left, right) => right.amountMinor - left.amountMinor)
  }

  function transferFlows(rows: AggregateEntryRow[]): FinanceReport['transferFlows'] {
    const byTransaction = new Map<string, AggregateEntryRow[]>()
    for (const row of rows) {
      if (row.type !== 'transfer') continue
      const collection = byTransaction.get(row.transaction_id) ?? []
      collection.push(row)
      byTransaction.set(row.transaction_id, collection)
    }
    const flows = new Map<string, FinanceReport['transferFlows'][number]>()
    for (const entries of byTransaction.values()) {
      const source = entries.find((entry) => entry.signed_amount_minor < 0)
      const destination = entries.find((entry) => entry.signed_amount_minor > 0)
      if (!source || !destination) continue
      const key = `${source.account_id}:${destination.account_id}:${source.currency_code}:${destination.currency_code}`
      const current = flows.get(key) ?? {
        sourceAccountId: source.account_id,
        sourceAccountName: source.account_name,
        destinationAccountId: destination.account_id,
        destinationAccountName: destination.account_name,
        sourceAmountMinor: 0,
        destinationAmountMinor: 0,
        sourceCurrencyCode: source.currency_code,
        destinationCurrencyCode: destination.currency_code,
        count: 0
      }
      current.sourceAmountMinor = assertSafeMinor(
        current.sourceAmountMinor + Math.abs(source.signed_amount_minor)
      )
      current.destinationAmountMinor = assertSafeMinor(
        current.destinationAmountMinor + destination.signed_amount_minor
      )
      current.count += 1
      flows.set(key, current)
    }
    return [...flows.values()].sort((left, right) => right.count - left.count)
  }

  function getReport(filters: FinanceReportFilters): FinanceReport {
    const settings = getSettings()
    const targetCurrency = filters.currencyCode ?? settings.baseCurrencyCode
    const period = { from: filters.dateFrom, to: filters.dateTo }
    const comparisonPeriod = previousComparablePeriod(period)
    const rows = aggregateRows(filters)
    const { converted, missing } = convertedRows(rows, targetCurrency)
    const summary = reportSummary(converted)
    const comparisonRows = aggregateRows({
      ...filters,
      dateFrom: comparisonPeriod.from,
      dateTo: comparisonPeriod.to
    })
    const comparison = reportSummary(convertedRows(comparisonRows, targetCurrency).converted)
    const currentNet = summary.incomeMinor - summary.expenseMinor
    const previousNet = comparison.incomeMinor - comparison.expenseMinor
    const changePercent =
      previousNet === 0 ? null : ((currentNet - previousNet) / Math.abs(previousNet)) * 100
    const expenseRows = converted.filter((row) => row.type === 'expense')
    return {
      period,
      comparisonPeriod,
      currencyCode: targetCurrency,
      incomeMinor: summary.incomeMinor,
      expenseMinor: summary.expenseMinor,
      netMinor: assertSafeMinor(currentNet),
      averageExpenseMinor:
        expenseRows.length > 0 ? Math.round(summary.expenseMinor / expenseRows.length) : 0,
      largestExpenseMinor: summary.largestExpenseMinor,
      largestIncomeMinor: summary.largestIncomeMinor,
      operationCount: summary.operationCount,
      changePercent,
      missingRateCurrencies: missing,
      timeline: timeline(converted, period),
      expenseByTag: tagBreakdown(converted, 'expense'),
      incomeByTag: tagBreakdown(converted, 'income'),
      transferFlows: transferFlows(rows),
      limits: listLimits(filters.dateTo)
    }
  }

  return {
    getSettings,
    setBaseCurrency,
    listExchangeRates,
    upsertExchangeRate,
    deleteExchangeRate,
    listAccounts,
    getAccount,
    createAccount,
    updateAccount,
    deleteAccount,
    clearAccountHistory,
    listTransactions,
    getTransaction,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    listTags,
    getTag,
    createTag,
    updateTag,
    deleteTag,
    listLimits,
    createLimit,
    updateLimit,
    setLimitState,
    deleteLimit,
    previewExpenseImpact,
    listTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getDashboard,
    getReport
  }
}

export type FinanceRepository = ReturnType<typeof createFinanceRepository>
