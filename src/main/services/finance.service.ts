import { endOfDay, format } from 'date-fns'

import type {
  CreateFinanceAccountInput,
  CreateFinanceLimitInput,
  CreateFinanceTagInput,
  CreateFinanceTemplateInput,
  CreateFinanceTransactionInput,
  DeleteFinanceAccountInput,
  DeleteFinanceExchangeRateInput,
  DeleteFinanceLimitInput,
  DeleteFinanceTagInput,
  DeleteFinanceTemplateInput,
  DeleteFinanceTransactionInput,
  FinanceBalanceByCurrency,
  FinanceDashboard,
  FinanceLimit,
  FinanceLimitImpact,
  FinanceLimitStatus,
  FinancePeriod,
  FinanceReport,
  FinanceReportFilters,
  FinanceReportPoint,
  FinanceTagBreakdownPoint,
  FinanceTemplate,
  FinanceTransaction,
  FinanceTransactionFilters,
  FinanceTransactionPage,
  PreviewFinanceExpenseInput,
  SetFinanceBaseCurrencyInput,
  SetFinanceLimitStateInput,
  SetFinanceTemplateStateInput,
  SkipFinanceTemplateInput,
  SnoozeFinanceTemplateInput,
  UpdateFinanceAccountInput,
  UpdateFinanceLimitInput,
  UpdateFinanceTagInput,
  UpdateFinanceTemplateInput,
  UpdateFinanceTransactionInput,
  UpsertFinanceExchangeRateInput,
  UseFinanceTemplateInput
} from '../../shared/contracts/finance'
import { assertSafeMinor } from '../../shared/finance-money'
import { getSqlite } from '../database/client'
import {
  clearFinanceAccountHistory,
  createFinanceAccount,
  createFinanceLimitRaw,
  createFinanceTag,
  createFinanceTemplate,
  createFinanceTransaction,
  deleteFinanceAccount,
  deleteFinanceExchangeRate,
  deleteFinanceLimit,
  deleteFinanceTag,
  deleteFinanceTemplate,
  deleteFinanceTransaction,
  getFinanceAccount,
  getFinanceLimitRaw,
  getFinanceSettings,
  getFinanceTag,
  getFinanceTemplate,
  getFinanceTransaction,
  listFinanceAccounts,
  listFinanceExchangeRates,
  listFinanceLimitsRaw,
  listFinanceTags,
  listFinanceTemplates,
  listFinanceTransactions,
  setFinanceBaseCurrency,
  setFinanceLimitStateRaw,
  setFinanceTemplateState,
  skipFinanceTemplate,
  snoozeFinanceTemplate,
  updateFinanceAccount,
  updateFinanceLimitRaw,
  updateFinanceTag,
  updateFinanceTemplate,
  updateFinanceTransaction,
  upsertFinanceExchangeRate,
  useFinanceTemplate
} from '../repositories/finance.repository'
import { convertFinanceMinor, createFinanceRateBook } from './finance-conversion'
import { previousComparablePeriod, resolveFinanceLimitPeriod } from './finance-periods'

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

function getDefaultPeriod(now = Date.now()): FinancePeriod {
  const date = new Date(now)
  return {
    from: new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
    to: endOfDay(date).getTime()
  }
}

function loadRateBook() {
  const settings = getFinanceSettings()
  const rates = listFinanceExchangeRates()
  return {
    settings,
    rates,
    rateBook: createFinanceRateBook(settings.baseCurrencyCode, rates)
  }
}

function getLimitExpenseRows(
  limit: FinanceLimit,
  period: FinancePeriod,
  excludeTransactionId?: string | null
): ExpenseAmountRow[] {
  const clauses = ["t.type = 'expense'", 't.is_system = 0', 't.occurred_at BETWEEN ? AND ?']
  const params: unknown[] = [period.from, period.to]

  if (limit.accountId) {
    clauses.push('e.account_id = ?')
    params.push(limit.accountId)
  }
  if (limit.tagId) {
    clauses.push('t.tag_id = ?')
    params.push(limit.tagId)
  }
  if (excludeTransactionId) {
    clauses.push('t.id != ?')
    params.push(excludeTransactionId)
  }

  return getSqlite()
    .prepare(
      `SELECT ABS(e.signed_amount_minor) AS amount_minor, a.currency_code
       FROM finance_transactions t
       JOIN finance_transaction_entries e ON e.transaction_id = t.id
       JOIN finance_accounts a ON a.id = e.account_id
       WHERE ${clauses.join(' AND ')}`
    )
    .all(...params) as ExpenseAmountRow[]
}

function calculateLimitStatus(limit: FinanceLimit, at: number): FinanceLimitStatus {
  const period = resolveFinanceLimitPeriod(limit, at)
  const { rateBook } = loadRateBook()
  const missing = new Set<string>()
  let spentMinor = 0

  for (const row of getLimitExpenseRows(limit, period)) {
    const converted = convertFinanceMinor(
      rateBook,
      row.amount_minor,
      row.currency_code,
      limit.currencyCode
    )
    if (converted === null) {
      missing.add(row.currency_code)
    } else {
      spentMinor = assertSafeMinor(spentMinor + converted)
    }
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

export function listFinanceLimitStatuses(at = Date.now()): FinanceLimitStatus[] {
  return listFinanceLimitsRaw()
    .map((limit) => calculateLimitStatus(limit, at))
    .sort((left, right) => {
      const leftRank = left.exceededMinor > 0 ? 0 : left.warningReached ? 1 : 2
      const rightRank = right.exceededMinor > 0 ? 0 : right.warningReached ? 1 : 2
      return leftRank - rightRank || right.usagePercent - left.usagePercent
    })
}

export function getFinanceLimitStatus(id: string, at = Date.now()): FinanceLimitStatus {
  return calculateLimitStatus(getFinanceLimitRaw(id), at)
}

export function createFinanceLimit(input: CreateFinanceLimitInput): FinanceLimitStatus {
  return calculateLimitStatus(createFinanceLimitRaw(input), Date.now())
}

export function updateFinanceLimit(input: UpdateFinanceLimitInput): FinanceLimitStatus {
  return calculateLimitStatus(updateFinanceLimitRaw(input), Date.now())
}

export function setFinanceLimitState(input: SetFinanceLimitStateInput): FinanceLimitStatus {
  return calculateLimitStatus(setFinanceLimitStateRaw(input), Date.now())
}

export function previewFinanceExpenseImpact(input: PreviewFinanceExpenseInput): FinanceLimitImpact {
  const account = getFinanceAccount(input.accountId)
  const tag = getFinanceTag(input.tagId)
  if (tag.type === 'income') {
    throw new Error('Доходный тег нельзя использовать для расхода')
  }

  const { rateBook } = loadRateBook()
  const items = listFinanceLimitsRaw()
    .filter((limit) => limit.state === 'active')
    .filter((limit) => !limit.accountId || limit.accountId === input.accountId)
    .filter((limit) => !limit.tagId || limit.tagId === input.tagId)
    .map((limit) => {
      const status = calculateLimitStatus(limit, input.occurredAt)
      const convertedExpenseMinor = convertFinanceMinor(
        rateBook,
        input.amountMinor,
        account.currencyCode,
        limit.currencyCode
      )
      const currentRows = getLimitExpenseRows(
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
        else currentSpentMinor += converted
      }

      const spentAfterMinor =
        convertedExpenseMinor === null
          ? currentSpentMinor
          : currentSpentMinor + convertedExpenseMinor
      const statusWithCurrent = {
        ...status,
        spentMinor: currentSpentMinor,
        remainingMinor: limit.amountMinor - currentSpentMinor,
        usagePercent: limit.amountMinor > 0 ? (currentSpentMinor / limit.amountMinor) * 100 : 0,
        exceededMinor: Math.max(0, currentSpentMinor - limit.amountMinor),
        missingRateCurrencies: [...missing].sort()
      }

      return {
        limit: statusWithCurrent,
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

function sumTransactionsInCurrency(
  transactions: FinanceTransaction[],
  targetCurrency: string
): {
  incomeMinor: number
  expenseMinor: number
  missingRateCurrencies: string[]
} {
  const { rateBook } = loadRateBook()
  const missing = new Set<string>()
  let incomeMinor = 0
  let expenseMinor = 0

  for (const transaction of transactions) {
    if (transaction.isSystem || (transaction.type !== 'income' && transaction.type !== 'expense')) {
      continue
    }
    const entry = transaction.entries[0]
    if (!entry) continue
    const converted = convertFinanceMinor(
      rateBook,
      Math.abs(entry.signedAmountMinor),
      entry.accountCurrencyCode,
      targetCurrency
    )
    if (converted === null) {
      missing.add(entry.accountCurrencyCode)
      continue
    }
    if (transaction.type === 'income') incomeMinor += converted
    else expenseMinor += converted
  }

  return {
    incomeMinor: assertSafeMinor(incomeMinor),
    expenseMinor: assertSafeMinor(expenseMinor),
    missingRateCurrencies: [...missing].sort()
  }
}

function loadAllTransactions(filters: FinanceTransactionFilters): FinanceTransaction[] {
  const result: FinanceTransaction[] = []
  let offset = 0

  while (true) {
    const page = listFinanceTransactions({ ...filters, limit: 100, offset })
    result.push(...page.items)
    offset += page.items.length
    if (offset >= page.total || page.items.length === 0) break
  }

  return result
}

export function getFinanceDashboard(period = getDefaultPeriod()): FinanceDashboard {
  const { settings, rateBook } = loadRateBook()
  const accounts = listFinanceAccounts(period)
  const balances = new Map<string, number>()

  for (const account of accounts) {
    balances.set(
      account.currencyCode,
      (balances.get(account.currencyCode) ?? 0) + account.balanceMinor
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
      else totalBalanceMinor += convertedBalanceMinor
      return {
        currencyCode,
        balanceMinor,
        convertedBalanceMinor,
        hasRate: convertedBalanceMinor !== null
      }
    })

  const periodTransactions = loadAllTransactions({
    dateFrom: period.from,
    dateTo: period.to,
    includeSystem: false,
    sort: 'date-desc'
  })
  const totals = sumTransactionsInCurrency(periodTransactions, settings.baseCurrencyCode)
  totals.missingRateCurrencies.forEach((currency) => missingRates.add(currency))

  return {
    settings,
    period,
    totalBalanceMinor: assertSafeMinor(totalBalanceMinor),
    totalBalanceComplete: missingRates.size === 0,
    missingRateCurrencies: [...missingRates].sort(),
    balancesByCurrency,
    incomeMinor: totals.incomeMinor,
    expenseMinor: totals.expenseMinor,
    netMinor: totals.incomeMinor - totals.expenseMinor,
    operationCount: periodTransactions.filter((transaction) => !transaction.isSystem).length,
    accounts,
    limits: listFinanceLimitStatuses(period.to).filter((limit) => limit.state === 'active'),
    recentTransactions: listFinanceTransactions({ limit: 8, offset: 0, includeSystem: false })
      .items,
    upcomingTemplates: listFinanceTemplates()
      .filter((template) => template.state === 'active' && template.nextOccurrenceAt !== null)
      .slice(0, 6)
  }
}

function buildAggregateRows(filters: FinanceReportFilters): AggregateEntryRow[] {
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

  return getSqlite()
    .prepare(
      `SELECT
        t.type,
        t.tag_id,
        t.tag_name_snapshot AS tag_name,
        t.tag_color_snapshot AS tag_color,
        t.occurred_at,
        e.account_id,
        a.name AS account_name,
        a.currency_code,
        e.signed_amount_minor,
        t.id AS transaction_id
       FROM finance_transactions t
       JOIN finance_transaction_entries e ON e.transaction_id = t.id
       JOIN finance_accounts a ON a.id = e.account_id
       WHERE t.is_system = 0 AND ${clauses.join(' AND ')}
       ORDER BY t.occurred_at ASC, t.created_at ASC`
    )
    .all(...params) as AggregateEntryRow[]
}

function convertRows(
  rows: AggregateEntryRow[],
  targetCurrency: string
): {
  converted: Array<AggregateEntryRow & { convertedMinor: number }>
  missing: string[]
} {
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

function reportSummary(rows: Array<AggregateEntryRow & { convertedMinor: number }>): {
  incomeMinor: number
  expenseMinor: number
  largestIncomeMinor: number
  largestExpenseMinor: number
  operationCount: number
} {
  let incomeMinor = 0
  let expenseMinor = 0
  let largestIncomeMinor = 0
  let largestExpenseMinor = 0
  const operations = new Set<string>()

  for (const row of rows) {
    if (row.type === 'income') {
      const amount = Math.abs(row.convertedMinor)
      incomeMinor += amount
      largestIncomeMinor = Math.max(largestIncomeMinor, amount)
      operations.add(row.transaction_id)
    } else if (row.type === 'expense') {
      const amount = Math.abs(row.convertedMinor)
      expenseMinor += amount
      largestExpenseMinor = Math.max(largestExpenseMinor, amount)
      operations.add(row.transaction_id)
    } else if (row.type === 'transfer') {
      operations.add(row.transaction_id)
    }
  }

  return {
    incomeMinor: assertSafeMinor(incomeMinor),
    expenseMinor: assertSafeMinor(expenseMinor),
    largestIncomeMinor,
    largestExpenseMinor,
    operationCount: operations.size
  }
}

function createTimeline(
  rows: Array<AggregateEntryRow & { convertedMinor: number }>,
  period: FinancePeriod
): FinanceReportPoint[] {
  const durationDays = Math.max(1, Math.ceil((period.to - period.from) / 86_400_000))
  const monthly = durationDays > 120
  const buckets = new Map<string, FinanceReportPoint>()
  let runningBalance = 0

  for (const row of rows) {
    const date = new Date(row.occurred_at)
    const key = monthly ? format(date, 'yyyy-MM') : format(date, 'yyyy-MM-dd')
    const label = monthly ? format(date, 'MM.yyyy') : format(date, 'dd.MM')
    const bucket = buckets.get(key) ?? {
      key,
      label,
      incomeMinor: 0,
      expenseMinor: 0,
      netMinor: 0,
      balanceMinor: 0
    }

    if (row.type === 'income') bucket.incomeMinor += Math.abs(row.convertedMinor)
    if (row.type === 'expense') bucket.expenseMinor += Math.abs(row.convertedMinor)
    bucket.netMinor = bucket.incomeMinor - bucket.expenseMinor
    runningBalance += row.convertedMinor
    bucket.balanceMinor = runningBalance
    buckets.set(key, bucket)
  }

  return [...buckets.values()].sort((left, right) => left.key.localeCompare(right.key))
}

function createTagBreakdown(
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
    current.amountMinor += Math.abs(row.convertedMinor)
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

function createTransferFlows(rows: AggregateEntryRow[]): FinanceReport['transferFlows'] {
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
    current.sourceAmountMinor += Math.abs(source.signed_amount_minor)
    current.destinationAmountMinor += destination.signed_amount_minor
    current.count += 1
    flows.set(key, current)
  }

  return [...flows.values()].sort((left, right) => right.count - left.count)
}

export function getFinanceReport(filters: FinanceReportFilters): FinanceReport {
  const settings = getFinanceSettings()
  const targetCurrency = filters.currencyCode ?? settings.baseCurrencyCode
  const period = { from: filters.dateFrom, to: filters.dateTo }
  const comparisonPeriod = previousComparablePeriod(period)
  const rows = buildAggregateRows(filters)
  const { converted, missing } = convertRows(rows, targetCurrency)
  const summary = reportSummary(converted)
  const comparisonRows = buildAggregateRows({
    ...filters,
    dateFrom: comparisonPeriod.from,
    dateTo: comparisonPeriod.to
  })
  const comparison = reportSummary(convertRows(comparisonRows, targetCurrency).converted)
  const currentNet = summary.incomeMinor - summary.expenseMinor
  const previousNet = comparison.incomeMinor - comparison.expenseMinor
  const changePercent =
    previousNet === 0 ? null : ((currentNet - previousNet) / Math.abs(previousNet)) * 100

  return {
    period,
    comparisonPeriod,
    currencyCode: targetCurrency,
    incomeMinor: summary.incomeMinor,
    expenseMinor: summary.expenseMinor,
    netMinor: currentNet,
    averageExpenseMinor:
      converted.filter((row) => row.type === 'expense').length > 0
        ? Math.round(
            summary.expenseMinor / converted.filter((row) => row.type === 'expense').length
          )
        : 0,
    largestExpenseMinor: summary.largestExpenseMinor,
    largestIncomeMinor: summary.largestIncomeMinor,
    operationCount: summary.operationCount,
    changePercent,
    missingRateCurrencies: missing,
    timeline: createTimeline(converted, period),
    expenseByTag: createTagBreakdown(converted, 'expense'),
    incomeByTag: createTagBreakdown(converted, 'income'),
    transferFlows: createTransferFlows(rows),
    limits: listFinanceLimitStatuses(filters.dateTo)
  }
}

export const financeService = {
  getSettings: getFinanceSettings,
  setBaseCurrency: setFinanceBaseCurrency,
  listExchangeRates: listFinanceExchangeRates,
  upsertExchangeRate: upsertFinanceExchangeRate,
  deleteExchangeRate: deleteFinanceExchangeRate,
  listAccounts: listFinanceAccounts,
  getAccount: getFinanceAccount,
  createAccount: createFinanceAccount,
  updateAccount: updateFinanceAccount,
  deleteAccount: (input: DeleteFinanceAccountInput) => deleteFinanceAccount(input.id),
  clearAccountHistory: clearFinanceAccountHistory,
  listTransactions: (filters: FinanceTransactionFilters): FinanceTransactionPage =>
    listFinanceTransactions(filters),
  getTransaction: getFinanceTransaction,
  createTransaction: (input: CreateFinanceTransactionInput) => createFinanceTransaction(input),
  updateTransaction: (input: UpdateFinanceTransactionInput) => updateFinanceTransaction(input),
  deleteTransaction: (input: DeleteFinanceTransactionInput) => deleteFinanceTransaction(input.id),
  listTags: listFinanceTags,
  getTag: getFinanceTag,
  createTag: (input: CreateFinanceTagInput) => createFinanceTag(input),
  updateTag: (input: UpdateFinanceTagInput) => updateFinanceTag(input),
  deleteTag: (input: DeleteFinanceTagInput) => deleteFinanceTag(input.id),
  listLimits: listFinanceLimitStatuses,
  createLimit: (input: CreateFinanceLimitInput) => createFinanceLimit(input),
  updateLimit: (input: UpdateFinanceLimitInput) => updateFinanceLimit(input),
  setLimitState: (input: SetFinanceLimitStateInput) => setFinanceLimitState(input),
  deleteLimit: (input: DeleteFinanceLimitInput) => deleteFinanceLimit(input.id),
  previewExpenseImpact: previewFinanceExpenseImpact,
  listTemplates: listFinanceTemplates,
  getTemplate: getFinanceTemplate,
  createTemplate: (input: CreateFinanceTemplateInput): FinanceTemplate =>
    createFinanceTemplate(input),
  updateTemplate: (input: UpdateFinanceTemplateInput): FinanceTemplate =>
    updateFinanceTemplate(input),
  setTemplateState: (input: SetFinanceTemplateStateInput): FinanceTemplate =>
    setFinanceTemplateState(input),
  deleteTemplate: (input: DeleteFinanceTemplateInput) => deleteFinanceTemplate(input.id),
  useTemplate: (input: UseFinanceTemplateInput) => useFinanceTemplate(input),
  snoozeTemplate: (input: SnoozeFinanceTemplateInput) => snoozeFinanceTemplate(input),
  skipTemplate: (input: SkipFinanceTemplateInput) => skipFinanceTemplate(input.id),
  getDashboard: getFinanceDashboard,
  getReport: getFinanceReport
}
