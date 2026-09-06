export const FINANCE_TRANSACTION_TYPES = ['income', 'expense', 'transfer', 'adjustment'] as const
export const FINANCE_USER_TRANSACTION_TYPES = ['income', 'expense', 'transfer'] as const
export const FINANCE_TAG_TYPES = ['income', 'expense', 'both'] as const
export const FINANCE_TAG_COLORS = {
  income: '#34d399',
  expense: '#f87171',
  both: '#fbbf24'
} as const
export const FINANCE_LIMIT_PERIOD_TYPES = ['day', 'week', 'month', 'year'] as const
export const FINANCE_LIMIT_STATES = ['active', 'paused'] as const
export const FINANCE_TRANSACTION_SORTS = [
  'date-desc',
  'date-asc',
  'amount-desc',
  'amount-asc'
] as const
export const FINANCE_PAGES = ['home', 'transactions', 'accounts', 'tags', 'reports'] as const
export const FINANCE_ICON_NAMES = [
  'wallet',
  'credit-card',
  'banknote',
  'landmark',
  'piggy-bank',
  'coins',
  'shopping-cart',
  'utensils',
  'car',
  'home',
  'heart-pulse',
  'graduation-cap',
  'briefcase',
  'gift',
  'plane',
  'receipt',
  'circle-dollar-sign',
  'trending-up',
  'repeat-2',
  'tag'
] as const

export type FinanceTransactionType = (typeof FINANCE_TRANSACTION_TYPES)[number]
export type FinanceUserTransactionType = (typeof FINANCE_USER_TRANSACTION_TYPES)[number]
export type FinanceTagType = (typeof FINANCE_TAG_TYPES)[number]
export type FinanceLimitPeriodType = (typeof FINANCE_LIMIT_PERIOD_TYPES)[number]
export type FinanceLimitState = (typeof FINANCE_LIMIT_STATES)[number]
export type FinanceTransactionSort = (typeof FINANCE_TRANSACTION_SORTS)[number]
export type FinancePageId = (typeof FINANCE_PAGES)[number]
export type FinanceIconName = (typeof FINANCE_ICON_NAMES)[number]

export function getFinanceTagColor(type: FinanceTagType): string {
  return FINANCE_TAG_COLORS[type]
}

export interface FinanceSettings {
  id: 'default'
  baseCurrencyCode: string
  createdAt: number
  updatedAt: number
}

export interface FinanceExchangeRate {
  currencyCode: string
  baseCurrencyCode: string
  rateScaled: number
  updatedAt: number
}

export interface FinanceAccount {
  id: string
  name: string
  currencyCode: string
  initialBalanceMinor: number
  icon: FinanceIconName
  createdAt: number
  updatedAt: number
}

export interface FinanceAccountSummary extends FinanceAccount {
  balanceMinor: number
  transactionCount: number
  lastTransactionAt: number | null
  periodChangeMinor: number
}

export interface FinanceTag {
  id: string
  name: string
  type: FinanceTagType
  icon: FinanceIconName
  color: string
  createdAt: number
  updatedAt: number
}

export interface FinanceTagSummary extends FinanceTag {
  transactionCount: number
  totalAmountMinor: number
  averageAmountMinor: number
  linkedLimitCount: number
  sharePercent: number
}

export interface FinanceTransactionEntry {
  id: string
  transactionId: string
  accountId: string
  accountName: string
  accountCurrencyCode: string
  signedAmountMinor: number
}

export interface FinanceTransaction {
  id: string
  type: FinanceTransactionType
  tagId: string | null
  tagNameSnapshot: string | null
  tagIconSnapshot: string | null
  tagColorSnapshot: string | null
  templateId: string | null
  templateNameSnapshot: string | null
  occurredAt: number
  comment: string
  exchangeRateScaled: number | null
  isSystem: boolean
  systemReason: string | null
  createdAt: number
  updatedAt: number
  entries: FinanceTransactionEntry[]
}

export interface FinanceLimit {
  id: string
  amountMinor: number
  currencyCode: string
  accountIds?: string[]
  tagId: string | null
  periodType: FinanceLimitPeriodType
  warningPercent: number
  state: FinanceLimitState
  createdAt: number
  updatedAt: number
}

export interface FinanceLimitStatus extends FinanceLimit {
  accountIds: string[]
  periodStart: number
  periodEnd: number
  spentMinor: number
  remainingMinor: number
  usagePercent: number
  daysRemaining: number
  exceededMinor: number
  projectedMinor: number | null
  warningReached: boolean
  missingRateCurrencies: string[]
}

export interface FinanceTemplate {
  id: string
  name: string
  type: FinanceUserTransactionType
  sourceAccountId: string | null
  destinationAccountId: string | null
  tagId: string | null
  sourceAmountMinor: number
  destinationAmountMinor: number | null
  comment: string
  createdAt: number
  updatedAt: number
}

export interface FinancePeriod {
  from: number
  to: number
}

export interface FinanceBalanceByCurrency {
  currencyCode: string
  balanceMinor: number
  convertedBalanceMinor: number | null
  hasRate: boolean
}

export interface FinanceDashboard {
  settings: FinanceSettings
  period: FinancePeriod
  totalBalanceMinor: number
  totalBalanceComplete: boolean
  missingRateCurrencies: string[]
  balancesByCurrency: FinanceBalanceByCurrency[]
  incomeMinor: number
  expenseMinor: number
  netMinor: number
  operationCount: number
  accounts: FinanceAccountSummary[]
  limits: FinanceLimitStatus[]
  recentTransactions: FinanceTransaction[]
}

export interface FinanceReportPoint {
  key: string
  label: string
  incomeMinor: number
  expenseMinor: number
  netMinor: number
  balanceMinor: number | null
}

export interface FinanceTagBreakdownPoint {
  tagId: string | null
  label: string
  color: string | null
  amountMinor: number
  sharePercent: number
}

export interface FinanceTransferFlow {
  sourceAccountId: string
  sourceAccountName: string
  destinationAccountId: string
  destinationAccountName: string
  sourceAmountMinor: number
  destinationAmountMinor: number
  sourceCurrencyCode: string
  destinationCurrencyCode: string
  count: number
}

export interface FinanceReport {
  period: FinancePeriod
  comparisonPeriod: FinancePeriod
  currencyCode: string
  incomeMinor: number
  expenseMinor: number
  netMinor: number
  averageExpenseMinor: number
  largestExpenseMinor: number
  largestIncomeMinor: number
  operationCount: number
  changePercent: number | null
  missingRateCurrencies: string[]
  timeline: FinanceReportPoint[]
  expenseByTag: FinanceTagBreakdownPoint[]
  incomeByTag: FinanceTagBreakdownPoint[]
  transferFlows: FinanceTransferFlow[]
  limits: FinanceLimitStatus[]
}

export interface CreateFinanceAccountInput {
  name: string
  currencyCode: string
  initialBalanceMinor: number
  icon: FinanceIconName
}

export interface UpdateFinanceAccountInput {
  id: string
  name: string
  icon: FinanceIconName
  currencyCode?: string
}

export interface DeleteFinanceAccountInput {
  id: string
}

export interface ClearFinanceAccountHistoryInput {
  accountId: string
  expectedBalanceMinor: number
  confirmation: string
}

export interface ClearFinanceAccountHistoryResult {
  account: FinanceAccountSummary
  deletedTransactionCount: number
  linkedTransferCount: number
  createdAdjustmentCount: number
  newInitialBalanceMinor: number
}

export interface CreateFinanceTagInput {
  name: string
  type: FinanceTagType
  icon: FinanceIconName
}

export interface UpdateFinanceTagInput extends CreateFinanceTagInput {
  id: string
}

export interface DeleteFinanceTagInput {
  id: string
}

export interface CreateFinanceIncomeExpenseInput {
  type: 'income' | 'expense'
  accountId: string
  amountMinor: number
  tagId: string
  occurredAt: number
  comment: string
  templateId?: string | null
}

export interface CreateFinanceTransferInput {
  type: 'transfer'
  sourceAccountId: string
  destinationAccountId: string
  sourceAmountMinor: number
  destinationAmountMinor: number
  exchangeRateScaled?: number | null
  occurredAt: number
  comment: string
  templateId?: string | null
}

export type CreateFinanceTransactionInput =
  | CreateFinanceIncomeExpenseInput
  | CreateFinanceTransferInput

export interface UpdateFinanceTransactionInput {
  id: string
  transaction: CreateFinanceTransactionInput
}

export interface DeleteFinanceTransactionInput {
  id: string
}

export interface FinanceTransactionFilters {
  types?: FinanceTransactionType[]
  accountIds?: string[]
  tagId?: string | null
  currencyCode?: string
  dateFrom?: number
  dateTo?: number
  minAmountMinor?: number
  maxAmountMinor?: number
  search?: string
  templateOnly?: boolean
  includeSystem?: boolean
  sort?: FinanceTransactionSort
  limit?: number
  offset?: number
}

export interface FinanceTransactionPage {
  items: FinanceTransaction[]
  total: number
  limit: number
  offset: number
}

export interface CreateFinanceLimitInput {
  amountMinor: number
  currencyCode: string
  accountIds: string[]
  tagId: string
  periodType: FinanceLimitPeriodType
  warningPercent: number
  state?: FinanceLimitState
}

export interface UpdateFinanceLimitInput extends CreateFinanceLimitInput {
  id: string
  state: FinanceLimitState
}

export interface SetFinanceLimitStateInput {
  id: string
  state: FinanceLimitState
}

export interface DeleteFinanceLimitInput {
  id: string
}

export interface PreviewFinanceExpenseInput {
  accountId: string
  tagId: string
  amountMinor: number
  occurredAt: number
  excludeTransactionId?: string | null
}

export interface FinanceLimitImpactItem {
  limit: FinanceLimitStatus
  currentSpentMinor: number
  spentAfterMinor: number
  exceededAfterMinor: number
  warningReachedAfter: boolean
  convertedExpenseMinor: number | null
}

export interface FinanceLimitImpact {
  items: FinanceLimitImpactItem[]
  missingRateCurrencies: string[]
}

export interface CreateFinanceTemplateInput {
  name: string
  type: FinanceUserTransactionType
  sourceAccountId: string | null
  destinationAccountId: string | null
  tagId: string | null
  sourceAmountMinor: number
  destinationAmountMinor: number | null
  comment: string
}

export interface UpdateFinanceTemplateInput extends CreateFinanceTemplateInput {
  id: string
}

export interface DeleteFinanceTemplateInput {
  id: string
}

export interface SetFinanceBaseCurrencyInput {
  baseCurrencyCode: string
}

export interface UpsertFinanceExchangeRateInput {
  currencyCode: string
  rateScaled: number
}

export interface DeleteFinanceExchangeRateInput {
  currencyCode: string
}

export interface FinanceReportFilters {
  dateFrom: number
  dateTo: number
  types?: FinanceTransactionType[]
  accountIds?: string[]
  tagId?: string | null
  currencyCode?: string
  minAmountMinor?: number
  maxAmountMinor?: number
  templateOnly?: boolean
}

export const FINANCE_IPC_CHANNELS = {
  getSettings: 'finance:get-settings',
  setBaseCurrency: 'finance:set-base-currency',
  listExchangeRates: 'finance:list-exchange-rates',
  upsertExchangeRate: 'finance:upsert-exchange-rate',
  deleteExchangeRate: 'finance:delete-exchange-rate',
  listAccounts: 'finance:list-accounts',
  getAccount: 'finance:get-account',
  createAccount: 'finance:create-account',
  updateAccount: 'finance:update-account',
  deleteAccount: 'finance:delete-account',
  clearAccountHistory: 'finance:clear-account-history',
  listTransactions: 'finance:list-transactions',
  getTransaction: 'finance:get-transaction',
  createTransaction: 'finance:create-transaction',
  updateTransaction: 'finance:update-transaction',
  deleteTransaction: 'finance:delete-transaction',
  listTags: 'finance:list-tags',
  getTag: 'finance:get-tag',
  createTag: 'finance:create-tag',
  updateTag: 'finance:update-tag',
  deleteTag: 'finance:delete-tag',
  listLimits: 'finance:list-limits',
  createLimit: 'finance:create-limit',
  updateLimit: 'finance:update-limit',
  setLimitState: 'finance:set-limit-state',
  deleteLimit: 'finance:delete-limit',
  previewExpenseImpact: 'finance:preview-expense-impact',
  listTemplates: 'finance:list-templates',
  createTemplate: 'finance:create-template',
  updateTemplate: 'finance:update-template',
  deleteTemplate: 'finance:delete-template',
  getDashboard: 'finance:get-dashboard',
  getReport: 'finance:get-report'
} as const

export interface FinanceApi {
  getSettings(): Promise<FinanceSettings>
  setBaseCurrency(input: SetFinanceBaseCurrencyInput): Promise<FinanceSettings>
  listExchangeRates(): Promise<FinanceExchangeRate[]>
  upsertExchangeRate(input: UpsertFinanceExchangeRateInput): Promise<FinanceExchangeRate>
  deleteExchangeRate(input: DeleteFinanceExchangeRateInput): Promise<boolean>
  listAccounts(period?: FinancePeriod): Promise<FinanceAccountSummary[]>
  getAccount(id: string, period?: FinancePeriod): Promise<FinanceAccountSummary>
  createAccount(input: CreateFinanceAccountInput): Promise<FinanceAccountSummary>
  updateAccount(input: UpdateFinanceAccountInput): Promise<FinanceAccountSummary>
  deleteAccount(input: DeleteFinanceAccountInput): Promise<boolean>
  clearAccountHistory(
    input: ClearFinanceAccountHistoryInput
  ): Promise<ClearFinanceAccountHistoryResult>
  listTransactions(filters: FinanceTransactionFilters): Promise<FinanceTransactionPage>
  getTransaction(id: string): Promise<FinanceTransaction>
  createTransaction(input: CreateFinanceTransactionInput): Promise<FinanceTransaction>
  updateTransaction(input: UpdateFinanceTransactionInput): Promise<FinanceTransaction>
  deleteTransaction(input: DeleteFinanceTransactionInput): Promise<boolean>
  listTags(): Promise<FinanceTagSummary[]>
  getTag(id: string): Promise<FinanceTagSummary>
  createTag(input: CreateFinanceTagInput): Promise<FinanceTagSummary>
  updateTag(input: UpdateFinanceTagInput): Promise<FinanceTagSummary>
  deleteTag(input: DeleteFinanceTagInput): Promise<boolean>
  listLimits(at?: number): Promise<FinanceLimitStatus[]>
  createLimit(input: CreateFinanceLimitInput): Promise<FinanceLimitStatus>
  updateLimit(input: UpdateFinanceLimitInput): Promise<FinanceLimitStatus>
  setLimitState(input: SetFinanceLimitStateInput): Promise<FinanceLimitStatus>
  deleteLimit(input: DeleteFinanceLimitInput): Promise<boolean>
  previewExpenseImpact(input: PreviewFinanceExpenseInput): Promise<FinanceLimitImpact>
  listTemplates(): Promise<FinanceTemplate[]>
  createTemplate(input: CreateFinanceTemplateInput): Promise<FinanceTemplate>
  updateTemplate(input: UpdateFinanceTemplateInput): Promise<FinanceTemplate>
  deleteTemplate(input: DeleteFinanceTemplateInput): Promise<boolean>
  getDashboard(period?: FinancePeriod): Promise<FinanceDashboard>
  getReport(filters: FinanceReportFilters): Promise<FinanceReport>
}
