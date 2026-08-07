import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

import type {
  FinanceIconName,
  FinanceLimitPeriodType,
  FinanceLimitScopeType,
  FinanceLimitState,
  FinanceTagType,
  FinanceTemplateScheduleType,
  FinanceTemplateState,
  FinanceTransactionType,
  FinanceUserTransactionType
} from '../../../shared/contracts/finance'

export const financeSettings = sqliteTable('finance_settings', {
  id: text('id').primaryKey(),
  baseCurrencyCode: text('base_currency_code').notNull().default('TJS'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
})

export const financeExchangeRates = sqliteTable(
  'finance_exchange_rates',
  {
    currencyCode: text('currency_code').primaryKey(),
    baseCurrencyCode: text('base_currency_code').notNull(),
    rateScaled: integer('rate_scaled').notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [
    index('finance_exchange_rates_base_idx').on(table.baseCurrencyCode),
    uniqueIndex('finance_exchange_rates_currency_base_unique').on(
      table.currencyCode,
      table.baseCurrencyCode
    )
  ]
)

export const financeAccounts = sqliteTable(
  'finance_accounts',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    currencyCode: text('currency_code').notNull(),
    initialBalanceMinor: integer('initial_balance_minor').notNull().default(0),
    icon: text('icon').$type<FinanceIconName>().notNull(),
    color: text('color').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [index('finance_accounts_currency_idx').on(table.currencyCode)]
)

export const financeTags = sqliteTable(
  'finance_tags',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    type: text('type').$type<FinanceTagType>().notNull(),
    icon: text('icon').$type<FinanceIconName>().notNull(),
    color: text('color').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [
    index('finance_tags_type_idx').on(table.type),
    index('finance_tags_name_idx').on(table.name)
  ]
)

export const financeTransactionTemplates = sqliteTable(
  'finance_transaction_templates',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    type: text('type').$type<FinanceUserTransactionType>().notNull(),
    sourceAccountId: text('source_account_id').references(() => financeAccounts.id, {
      onDelete: 'cascade'
    }),
    destinationAccountId: text('destination_account_id').references(() => financeAccounts.id, {
      onDelete: 'cascade'
    }),
    tagId: text('tag_id').references(() => financeTags.id, { onDelete: 'cascade' }),
    sourceAmountMinor: integer('source_amount_minor').notNull(),
    destinationAmountMinor: integer('destination_amount_minor'),
    comment: text('comment').notNull().default(''),
    scheduleType: text('schedule_type').$type<FinanceTemplateScheduleType>().notNull(),
    scheduleInterval: integer('schedule_interval').notNull().default(1),
    nextOccurrenceAt: integer('next_occurrence_at', { mode: 'timestamp_ms' }),
    reminderEnabled: integer('reminder_enabled', { mode: 'boolean' }).notNull().default(false),
    state: text('state').$type<FinanceTemplateState>().notNull().default('active'),
    lastUsedAt: integer('last_used_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [
    index('finance_templates_state_next_idx').on(table.state, table.nextOccurrenceAt),
    index('finance_templates_type_idx').on(table.type),
    index('finance_templates_source_account_idx').on(table.sourceAccountId),
    index('finance_templates_destination_account_idx').on(table.destinationAccountId),
    index('finance_templates_tag_idx').on(table.tagId)
  ]
)

export const financeTransactions = sqliteTable(
  'finance_transactions',
  {
    id: text('id').primaryKey(),
    type: text('type').$type<FinanceTransactionType>().notNull(),
    tagId: text('tag_id').references(() => financeTags.id, { onDelete: 'restrict' }),
    tagNameSnapshot: text('tag_name_snapshot'),
    tagIconSnapshot: text('tag_icon_snapshot').$type<FinanceIconName>(),
    tagColorSnapshot: text('tag_color_snapshot'),
    templateId: text('template_id').references(() => financeTransactionTemplates.id, {
      onDelete: 'set null'
    }),
    templateNameSnapshot: text('template_name_snapshot'),
    occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }).notNull(),
    comment: text('comment').notNull().default(''),
    exchangeRateScaled: integer('exchange_rate_scaled'),
    isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
    systemReason: text('system_reason'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [
    index('finance_transactions_date_idx').on(table.occurredAt),
    index('finance_transactions_type_date_idx').on(table.type, table.occurredAt),
    index('finance_transactions_tag_date_idx').on(table.tagId, table.occurredAt),
    index('finance_transactions_template_date_idx').on(table.templateId, table.occurredAt),
    index('finance_transactions_system_date_idx').on(table.isSystem, table.occurredAt)
  ]
)

export const financeTransactionEntries = sqliteTable(
  'finance_transaction_entries',
  {
    id: text('id').primaryKey(),
    transactionId: text('transaction_id')
      .notNull()
      .references(() => financeTransactions.id, { onDelete: 'cascade' }),
    accountId: text('account_id')
      .notNull()
      .references(() => financeAccounts.id, { onDelete: 'restrict' }),
    signedAmountMinor: integer('signed_amount_minor').notNull()
  },
  (table) => [
    index('finance_entries_account_transaction_idx').on(table.accountId, table.transactionId),
    index('finance_entries_transaction_idx').on(table.transactionId)
  ]
)

export const financeLimits = sqliteTable(
  'finance_limits',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    amountMinor: integer('amount_minor').notNull(),
    currencyCode: text('currency_code').notNull(),
    scopeType: text('scope_type').$type<FinanceLimitScopeType>().notNull(),
    accountId: text('account_id').references(() => financeAccounts.id, { onDelete: 'cascade' }),
    tagId: text('tag_id').references(() => financeTags.id, { onDelete: 'cascade' }),
    periodType: text('period_type').$type<FinanceLimitPeriodType>().notNull(),
    startsAt: integer('starts_at', { mode: 'timestamp_ms' }).notNull(),
    endsAt: integer('ends_at', { mode: 'timestamp_ms' }),
    warningPercent: integer('warning_percent').notNull().default(80),
    state: text('state').$type<FinanceLimitState>().notNull().default('active'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [
    index('finance_limits_state_idx').on(table.state),
    index('finance_limits_account_state_idx').on(table.accountId, table.state),
    index('finance_limits_tag_state_idx').on(table.tagId, table.state)
  ]
)

export const financeLimitAccounts = sqliteTable(
  'finance_limit_accounts',
  {
    limitId: text('limit_id')
      .notNull()
      .references(() => financeLimits.id, { onDelete: 'cascade' }),
    accountId: text('account_id')
      .notNull()
      .references(() => financeAccounts.id, { onDelete: 'cascade' })
  },
  (table) => [
    uniqueIndex('finance_limit_accounts_limit_account_unique').on(table.limitId, table.accountId),
    index('finance_limit_accounts_account_idx').on(table.accountId)
  ]
)
