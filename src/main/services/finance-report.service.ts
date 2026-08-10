import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear
} from 'date-fns'

import type {
  FinancePeriod,
  FinanceReportFilters,
  FinanceReportPoint,
  FinanceTagBreakdownPoint,
  FinanceTransaction
} from '../../shared/contracts/finance'
import type {
  FinanceReportAccountActivity,
  FinanceReportAnalytics,
  FinanceReportTransferFlow
} from '../../shared/contracts/finance-report-analytics'
import { assertSafeMinor } from '../../shared/finance-money'
import { getSqlite } from '../database/client'
import { getFinanceSettings, listFinanceExchangeRates } from '../repositories/finance.repository'
import {
  convertFinanceMinor,
  createFinanceRateBook,
  type FinanceRateBook
} from './finance-conversion'
import { listFinanceLimitStatuses } from './finance.service'
import { previousComparablePeriod } from './finance-periods'

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

interface ConvertedEntryRow extends AggregateEntryRow {
  convertedMinor: number
}

interface BalanceAccountRow {
  id: string
  name: string
  currency_code: string
  initial_balance_minor: number
  created_at: number
}

interface BalanceEntryRow {
  account_id: string
  signed_amount_minor: number
  occurred_at: number
}

interface ReportBucket {
  key: string
  label: string
  from: number
  to: number
}

type BucketKind = 'day' | 'week' | 'month'

interface ReportSummary {
  incomeMinor: number
  expenseMinor: number
  netMinor: number
  averageIncomeMinor: number
  averageExpenseMinor: number
  largestIncomeMinor: number
  largestExpenseMinor: number
  incomeCount: number
  expenseCount: number
  transferCount: number
  operationCount: number
}

function loadRateBook(): { targetDefaultCurrency: string; rateBook: FinanceRateBook } {
  const settings = getFinanceSettings()
  return {
    targetDefaultCurrency: settings.baseCurrencyCode,
    rateBook: createFinanceRateBook(settings.baseCurrencyCode, listFinanceExchangeRates())
  }
}

function buildAggregateRows(filters: FinanceReportFilters): AggregateEntryRow[] {
  const clauses = ['t.is_system = 0', 't.occurred_at BETWEEN ? AND ?']
  const params: unknown[] = [filters.dateFrom, filters.dateTo]

  if (filters.types?.length) {
    clauses.push(`t.type IN (${filters.types.map(() => '?').join(', ')})`)
    params.push(...filters.types)
  }
  if (filters.accountIds?.length) {
    clauses.push(
      `EXISTS (
        SELECT 1 FROM finance_transaction_entries account_filter
        WHERE account_filter.transaction_id = t.id
          AND account_filter.account_id IN (${filters.accountIds.map(() => '?').join(', ')})
      )`
    )
    params.push(...filters.accountIds)
  }
  if (filters.tagId !== undefined) {
    clauses.push(filters.tagId === null ? 't.tag_id IS NULL' : 't.tag_id = ?')
    if (filters.tagId !== null) params.push(filters.tagId)
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
       WHERE ${clauses.join(' AND ')}
       ORDER BY t.occurred_at ASC, t.created_at ASC, e.signed_amount_minor ASC`
    )
    .all(...params) as AggregateEntryRow[]
}

function convertRows(
  rows: AggregateEntryRow[],
  targetCurrency: string,
  rateBook: FinanceRateBook
): { converted: ConvertedEntryRow[]; missing: string[] } {
  const converted: ConvertedEntryRow[] = []
  const missing = new Set<string>()

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

function applyAmountFilters(
  rawRows: AggregateEntryRow[],
  convertedRows: ConvertedEntryRow[],
  filters: FinanceReportFilters
): { rawRows: AggregateEntryRow[]; convertedRows: ConvertedEntryRow[] } {
  if (filters.minAmountMinor === undefined && filters.maxAmountMinor === undefined) {
    return { rawRows, convertedRows }
  }

  const rawCountByTransaction = new Map<string, number>()
  const convertedByTransaction = new Map<string, ConvertedEntryRow[]>()

  for (const row of rawRows) {
    rawCountByTransaction.set(
      row.transaction_id,
      (rawCountByTransaction.get(row.transaction_id) ?? 0) + 1
    )
  }
  for (const row of convertedRows) {
    const entries = convertedByTransaction.get(row.transaction_id) ?? []
    entries.push(row)
    convertedByTransaction.set(row.transaction_id, entries)
  }

  const allowed = new Set<string>()
  for (const [transactionId, rawCount] of rawCountByTransaction) {
    const entries = convertedByTransaction.get(transactionId) ?? []
    if (entries.length !== rawCount || entries.length === 0) continue
    const amount = Math.max(...entries.map((entry) => Math.abs(entry.convertedMinor)))
    if (filters.minAmountMinor !== undefined && amount < filters.minAmountMinor) continue
    if (filters.maxAmountMinor !== undefined && amount > filters.maxAmountMinor) continue
    allowed.add(transactionId)
  }

  return {
    rawRows: rawRows.filter((row) => allowed.has(row.transaction_id)),
    convertedRows: convertedRows.filter((row) => allowed.has(row.transaction_id))
  }
}

function amountsByTransaction(
  rows: ConvertedEntryRow[],
  type: 'income' | 'expense'
): Map<string, number> {
  const amounts = new Map<string, number>()
  for (const row of rows) {
    if (row.type !== type) continue
    amounts.set(
      row.transaction_id,
      (amounts.get(row.transaction_id) ?? 0) + Math.abs(row.convertedMinor)
    )
  }
  return amounts
}

function distinctTransactions(
  rows: AggregateEntryRow[],
  type?: FinanceTransaction['type']
): Set<string> {
  const ids = new Set<string>()
  for (const row of rows) {
    if (type === undefined || row.type === type) ids.add(row.transaction_id)
  }
  return ids
}

function summarize(
  rawRows: AggregateEntryRow[],
  convertedRows: ConvertedEntryRow[]
): ReportSummary {
  const incomeAmounts = amountsByTransaction(convertedRows, 'income')
  const expenseAmounts = amountsByTransaction(convertedRows, 'expense')
  const incomeMinor = assertSafeMinor(
    [...incomeAmounts.values()].reduce((sum, value) => sum + value, 0)
  )
  const expenseMinor = assertSafeMinor(
    [...expenseAmounts.values()].reduce((sum, value) => sum + value, 0)
  )
  const incomeValues = [...incomeAmounts.values()]
  const expenseValues = [...expenseAmounts.values()]

  return {
    incomeMinor,
    expenseMinor,
    netMinor: assertSafeMinor(incomeMinor - expenseMinor),
    averageIncomeMinor: incomeValues.length > 0 ? Math.round(incomeMinor / incomeValues.length) : 0,
    averageExpenseMinor:
      expenseValues.length > 0 ? Math.round(expenseMinor / expenseValues.length) : 0,
    largestIncomeMinor: incomeValues.length > 0 ? Math.max(...incomeValues) : 0,
    largestExpenseMinor: expenseValues.length > 0 ? Math.max(...expenseValues) : 0,
    incomeCount: distinctTransactions(rawRows, 'income').size,
    expenseCount: distinctTransactions(rawRows, 'expense').size,
    transferCount: distinctTransactions(rawRows, 'transfer').size,
    operationCount: distinctTransactions(rawRows).size
  }
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / Math.abs(previous)) * 100
}

function resolveComparisonPeriod(period: FinancePeriod): FinancePeriod {
  const from = new Date(period.from)
  const to = new Date(period.to)
  const endsAtDayEnd = endOfDay(to).getTime() === period.to

  if (
    startOfMonth(from).getTime() === period.from &&
    endsAtDayEnd &&
    from.getFullYear() === to.getFullYear() &&
    from.getMonth() === to.getMonth()
  ) {
    const previousMonth = startOfMonth(addMonths(from, -1))
    if (endOfMonth(from).getTime() === period.to) {
      return { from: previousMonth.getTime(), to: endOfMonth(previousMonth).getTime() }
    }
    const previousMonthLastDay = endOfMonth(previousMonth).getDate()
    const comparableDay = Math.min(to.getDate(), previousMonthLastDay)
    return {
      from: previousMonth.getTime(),
      to: endOfDay(
        new Date(previousMonth.getFullYear(), previousMonth.getMonth(), comparableDay)
      ).getTime()
    }
  }

  if (
    startOfYear(from).getTime() === period.from &&
    endsAtDayEnd &&
    from.getFullYear() === to.getFullYear()
  ) {
    const previousYearStart = startOfYear(
      new Date(from.getFullYear() - 1, from.getMonth(), from.getDate())
    )
    if (endOfYear(from).getTime() === period.to) {
      return { from: previousYearStart.getTime(), to: endOfYear(previousYearStart).getTime() }
    }
    const targetMonth = to.getMonth()
    const targetDay = to.getDate()
    const previousTargetMonth = new Date(previousYearStart.getFullYear(), targetMonth, 1)
    const comparableDay = Math.min(targetDay, endOfMonth(previousTargetMonth).getDate())
    return {
      from: previousYearStart.getTime(),
      to: endOfDay(new Date(previousYearStart.getFullYear(), targetMonth, comparableDay)).getTime()
    }
  }

  return previousComparablePeriod(period)
}

function bucketKind(period: FinancePeriod): BucketKind {
  const days = Math.max(1, differenceInCalendarDays(new Date(period.to), new Date(period.from)) + 1)
  if (days <= 45) return 'day'
  if (days <= 210) return 'week'
  return 'month'
}

function bucketKey(timestamp: number, kind: BucketKind): string {
  const date = new Date(timestamp)
  if (kind === 'day') return format(startOfDay(date), 'yyyy-MM-dd')
  if (kind === 'week') return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  return format(startOfMonth(date), 'yyyy-MM')
}

function createBuckets(period: FinancePeriod): { kind: BucketKind; buckets: ReportBucket[] } {
  const kind = bucketKind(period)
  const date = new Date(period.from)
  let cursor =
    kind === 'day'
      ? startOfDay(date)
      : kind === 'week'
        ? startOfWeek(date, { weekStartsOn: 1 })
        : startOfMonth(date)
  const buckets: ReportBucket[] = []

  while (cursor.getTime() <= period.to) {
    const naturalEnd =
      kind === 'day'
        ? endOfDay(cursor)
        : kind === 'week'
          ? endOfWeek(cursor, { weekStartsOn: 1 })
          : endOfMonth(cursor)
    const from = Math.max(period.from, cursor.getTime())
    const to = Math.min(period.to, naturalEnd.getTime())
    buckets.push({
      key: bucketKey(cursor.getTime(), kind),
      label:
        kind === 'day'
          ? format(new Date(from), 'dd.MM')
          : kind === 'week'
            ? `${format(new Date(from), 'dd.MM')}–${format(new Date(to), 'dd.MM')}`
            : format(new Date(from), 'MM.yyyy'),
      from,
      to
    })
    cursor =
      kind === 'day'
        ? addDays(cursor, 1)
        : kind === 'week'
          ? addWeeks(cursor, 1)
          : addMonths(cursor, 1)
  }

  return { kind, buckets }
}

function createTimeline(
  rows: ConvertedEntryRow[],
  period: FinancePeriod
): { points: FinanceReportPoint[]; buckets: ReportBucket[] } {
  const { kind, buckets } = createBuckets(period)
  const points = new Map<string, FinanceReportPoint>(
    buckets.map((bucket) => [
      bucket.key,
      {
        key: bucket.key,
        label: bucket.label,
        incomeMinor: 0,
        expenseMinor: 0,
        netMinor: 0,
        balanceMinor: null
      }
    ])
  )

  for (const row of rows) {
    if (row.type !== 'income' && row.type !== 'expense') continue
    const point = points.get(bucketKey(row.occurred_at, kind))
    if (!point) continue
    if (row.type === 'income') point.incomeMinor += Math.abs(row.convertedMinor)
    else point.expenseMinor += Math.abs(row.convertedMinor)
    point.netMinor = point.incomeMinor - point.expenseMinor
  }

  return { points: buckets.map((bucket) => points.get(bucket.key)!), buckets }
}

function loadBalanceAccounts(accountIds?: string[]): BalanceAccountRow[] {
  const params: unknown[] = []
  const where = accountIds?.length ? `WHERE id IN (${accountIds.map(() => '?').join(', ')})` : ''
  if (accountIds?.length) params.push(...accountIds)
  return getSqlite()
    .prepare(
      `SELECT id, name, currency_code, initial_balance_minor, created_at
       FROM finance_accounts ${where}
       ORDER BY created_at ASC, name ASC`
    )
    .all(...params) as BalanceAccountRow[]
}

function loadBalanceEntries(periodTo: number, accountIds?: string[]): BalanceEntryRow[] {
  const clauses = ['t.occurred_at <= ?']
  const params: unknown[] = [periodTo]
  if (accountIds?.length) {
    clauses.push(`e.account_id IN (${accountIds.map(() => '?').join(', ')})`)
    params.push(...accountIds)
  }
  return getSqlite()
    .prepare(
      `SELECT e.account_id, e.signed_amount_minor, t.occurred_at
       FROM finance_transaction_entries e
       JOIN finance_transactions t ON t.id = e.transaction_id
       WHERE ${clauses.join(' AND ')}
       ORDER BY t.occurred_at ASC, t.created_at ASC`
    )
    .all(...params) as BalanceEntryRow[]
}

function attachBalanceTimeline(
  points: FinanceReportPoint[],
  buckets: ReportBucket[],
  period: FinancePeriod,
  accountIds: string[] | undefined,
  targetCurrency: string,
  rateBook: FinanceRateBook
): {
  points: FinanceReportPoint[]
  balanceStartMinor: number | null
  balanceEndMinor: number | null
  missing: string[]
} {
  const accounts = loadBalanceAccounts(accountIds)
  const entries = loadBalanceEntries(period.to, accountIds)
  const entriesByAccount = new Map<string, BalanceEntryRow[]>()
  for (const entry of entries) {
    const collection = entriesByAccount.get(entry.account_id) ?? []
    collection.push(entry)
    entriesByAccount.set(entry.account_id, collection)
  }

  const states = new Map<
    string,
    { active: boolean; balanceMinor: number; entryIndex: number; entries: BalanceEntryRow[] }
  >()
  const startAt = period.from - 1

  for (const account of accounts) {
    const accountEntries = entriesByAccount.get(account.id) ?? []
    const state = {
      active: account.created_at <= startAt,
      balanceMinor: account.created_at <= startAt ? account.initial_balance_minor : 0,
      entryIndex: 0,
      entries: accountEntries
    }
    while (
      state.active &&
      state.entryIndex < state.entries.length &&
      state.entries[state.entryIndex].occurred_at <= startAt
    ) {
      state.balanceMinor = assertSafeMinor(
        state.balanceMinor + state.entries[state.entryIndex].signed_amount_minor
      )
      state.entryIndex += 1
    }
    states.set(account.id, state)
  }

  const missing = new Set<string>()
  const totalBalance = (): number | null => {
    let total = 0
    let complete = true
    for (const account of accounts) {
      const state = states.get(account.id)!
      if (!state.active) continue
      const converted = convertFinanceMinor(
        rateBook,
        state.balanceMinor,
        account.currency_code,
        targetCurrency
      )
      if (converted === null) {
        missing.add(account.currency_code)
        complete = false
      } else {
        total = assertSafeMinor(total + converted)
      }
    }
    return complete ? total : null
  }

  const balanceStartMinor = totalBalance()

  for (let index = 0; index < buckets.length; index += 1) {
    const bucket = buckets[index]
    for (const account of accounts) {
      const state = states.get(account.id)!
      if (!state.active && account.created_at <= bucket.to) {
        state.active = true
        state.balanceMinor = account.initial_balance_minor
      }
      if (!state.active) continue
      while (
        state.entryIndex < state.entries.length &&
        state.entries[state.entryIndex].occurred_at <= bucket.to
      ) {
        state.balanceMinor = assertSafeMinor(
          state.balanceMinor + state.entries[state.entryIndex].signed_amount_minor
        )
        state.entryIndex += 1
      }
    }
    points[index].balanceMinor = totalBalance()
  }

  return {
    points,
    balanceStartMinor,
    balanceEndMinor: points.at(-1)?.balanceMinor ?? balanceStartMinor,
    missing: [...missing].sort()
  }
}

function createTagBreakdown(
  rows: ConvertedEntryRow[],
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

function createTransferFlows(
  rawRows: AggregateEntryRow[],
  convertedRows: ConvertedEntryRow[]
): FinanceReportTransferFlow[] {
  const byTransaction = new Map<string, AggregateEntryRow[]>()
  const convertedByTransaction = new Map<string, ConvertedEntryRow[]>()

  for (const row of rawRows) {
    if (row.type !== 'transfer') continue
    const collection = byTransaction.get(row.transaction_id) ?? []
    collection.push(row)
    byTransaction.set(row.transaction_id, collection)
  }
  for (const row of convertedRows) {
    if (row.type !== 'transfer') continue
    const collection = convertedByTransaction.get(row.transaction_id) ?? []
    collection.push(row)
    convertedByTransaction.set(row.transaction_id, collection)
  }

  const flows = new Map<string, FinanceReportTransferFlow>()
  for (const [transactionId, entries] of byTransaction) {
    const source = entries.find((entry) => entry.signed_amount_minor < 0)
    const destination = entries.find((entry) => entry.signed_amount_minor > 0)
    if (!source || !destination) continue
    const convertedSource = convertedByTransaction
      .get(transactionId)
      ?.find((entry) => entry.account_id === source.account_id && entry.convertedMinor < 0)
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
      count: 0,
      convertedAmountMinor: 0
    }
    current.sourceAmountMinor = assertSafeMinor(
      current.sourceAmountMinor + Math.abs(source.signed_amount_minor)
    )
    current.destinationAmountMinor = assertSafeMinor(
      current.destinationAmountMinor + Math.abs(destination.signed_amount_minor)
    )
    current.count += 1
    if (convertedSource === undefined) current.convertedAmountMinor = null
    else if (current.convertedAmountMinor !== null) {
      current.convertedAmountMinor = assertSafeMinor(
        current.convertedAmountMinor + Math.abs(convertedSource.convertedMinor)
      )
    }
    flows.set(key, current)
  }

  return [...flows.values()].sort((left, right) => {
    const leftValue = left.convertedAmountMinor ?? -1
    const rightValue = right.convertedAmountMinor ?? -1
    return rightValue - leftValue || right.count - left.count
  })
}

function createAccountActivity(
  rows: ConvertedEntryRow[],
  selectedAccountIds?: string[]
): FinanceReportAccountActivity[] {
  const selected = selectedAccountIds?.length ? new Set(selectedAccountIds) : null
  const working = new Map<string, FinanceReportAccountActivity & { operationIds: Set<string> }>()

  for (const row of rows) {
    if (selected && !selected.has(row.account_id)) continue
    const current = working.get(row.account_id) ?? {
      accountId: row.account_id,
      accountName: row.account_name,
      currencyCode: row.currency_code,
      incomeMinor: 0,
      expenseMinor: 0,
      transferInMinor: 0,
      transferOutMinor: 0,
      netMinor: 0,
      operationCount: 0,
      operationIds: new Set<string>()
    }
    const amount = Math.abs(row.convertedMinor)
    if (row.type === 'income') current.incomeMinor = assertSafeMinor(current.incomeMinor + amount)
    if (row.type === 'expense')
      current.expenseMinor = assertSafeMinor(current.expenseMinor + amount)
    if (row.type === 'transfer' && row.convertedMinor > 0) {
      current.transferInMinor = assertSafeMinor(current.transferInMinor + amount)
    }
    if (row.type === 'transfer' && row.convertedMinor < 0) {
      current.transferOutMinor = assertSafeMinor(current.transferOutMinor + amount)
    }
    current.operationIds.add(row.transaction_id)
    working.set(row.account_id, current)
  }

  return [...working.values()]
    .map(({ operationIds, ...item }) => ({
      ...item,
      operationCount: operationIds.size,
      netMinor: assertSafeMinor(
        item.incomeMinor - item.expenseMinor + item.transferInMinor - item.transferOutMinor
      )
    }))
    .sort((left, right) => {
      const leftActivity =
        left.incomeMinor + left.expenseMinor + left.transferInMinor + left.transferOutMinor
      const rightActivity =
        right.incomeMinor + right.expenseMinor + right.transferInMinor + right.transferOutMinor
      return rightActivity - leftActivity
    })
}

function relevantLimits(
  filters: FinanceReportFilters
): ReturnType<typeof listFinanceLimitStatuses> {
  if (filters.types?.length && !filters.types.includes('expense')) return []
  if (filters.tagId === null) return []
  const selectedAccounts = filters.accountIds?.length ? new Set(filters.accountIds) : null

  return listFinanceLimitStatuses(filters.dateTo)
    .filter((limit) => limit.state === 'active')
    .filter((limit) => filters.tagId === undefined || limit.tagId === filters.tagId)
    .filter((limit) => {
      if (!selectedAccounts) return true
      if (limit.accountIds.length === 0) return true
      return limit.accountIds.some((accountId) => selectedAccounts.has(accountId))
    })
}

function buildPeriodData(
  filters: FinanceReportFilters,
  targetCurrency: string,
  rateBook: FinanceRateBook
): {
  rawRows: AggregateEntryRow[]
  convertedRows: ConvertedEntryRow[]
  missing: string[]
  summary: ReportSummary
} {
  const raw = buildAggregateRows(filters)
  const conversion = convertRows(raw, targetCurrency, rateBook)
  const filtered = applyAmountFilters(raw, conversion.converted, filters)
  return {
    ...filtered,
    missing: conversion.missing,
    summary: summarize(filtered.rawRows, filtered.convertedRows)
  }
}

export function getFinanceReportAnalytics(filters: FinanceReportFilters): FinanceReportAnalytics {
  const { targetDefaultCurrency, rateBook } = loadRateBook()
  const targetCurrency = filters.currencyCode ?? targetDefaultCurrency
  const period = { from: filters.dateFrom, to: filters.dateTo }
  const comparisonPeriod = resolveComparisonPeriod(period)
  const current = buildPeriodData(filters, targetCurrency, rateBook)
  const comparison = buildPeriodData(
    { ...filters, dateFrom: comparisonPeriod.from, dateTo: comparisonPeriod.to },
    targetCurrency,
    rateBook
  )

  const timeline = createTimeline(current.convertedRows, period)
  const balance = attachBalanceTimeline(
    timeline.points,
    timeline.buckets,
    period,
    filters.accountIds,
    targetCurrency,
    rateBook
  )
  const transferFlows = createTransferFlows(current.rawRows, current.convertedRows)
  const missingRateCurrencies = [...new Set([...current.missing, ...balance.missing])].sort()
  const calendarDays = Math.max(
    1,
    differenceInCalendarDays(new Date(period.to), new Date(period.from)) + 1
  )
  const transferVolumeMinor = assertSafeMinor(
    transferFlows.reduce((sum, flow) => sum + (flow.convertedAmountMinor ?? 0), 0)
  )
  const balanceChangeMinor =
    balance.balanceStartMinor === null || balance.balanceEndMinor === null
      ? null
      : assertSafeMinor(balance.balanceEndMinor - balance.balanceStartMinor)
  const incomeChangePercent = percentChange(
    current.summary.incomeMinor,
    comparison.summary.incomeMinor
  )
  const expenseChangePercent = percentChange(
    current.summary.expenseMinor,
    comparison.summary.expenseMinor
  )
  const netChangePercent = percentChange(current.summary.netMinor, comparison.summary.netMinor)

  return {
    period,
    comparisonPeriod,
    currencyCode: targetCurrency,
    incomeMinor: current.summary.incomeMinor,
    expenseMinor: current.summary.expenseMinor,
    netMinor: current.summary.netMinor,
    averageIncomeMinor: current.summary.averageIncomeMinor,
    averageExpenseMinor: current.summary.averageExpenseMinor,
    averageDailyExpenseMinor: Math.round(current.summary.expenseMinor / calendarDays),
    largestExpenseMinor: current.summary.largestExpenseMinor,
    largestIncomeMinor: current.summary.largestIncomeMinor,
    incomeCount: current.summary.incomeCount,
    expenseCount: current.summary.expenseCount,
    transferCount: current.summary.transferCount,
    operationCount: current.summary.operationCount,
    transferVolumeMinor,
    savingsRatePercent:
      current.summary.incomeMinor > 0
        ? (current.summary.netMinor / current.summary.incomeMinor) * 100
        : null,
    balanceStartMinor: balance.balanceStartMinor,
    balanceEndMinor: balance.balanceEndMinor,
    balanceChangeMinor,
    comparisonIncomeMinor: comparison.summary.incomeMinor,
    comparisonExpenseMinor: comparison.summary.expenseMinor,
    comparisonNetMinor: comparison.summary.netMinor,
    incomeChangePercent,
    expenseChangePercent,
    netChangePercent,
    changePercent: netChangePercent,
    missingRateCurrencies,
    comparisonMissingRateCurrencies: comparison.missing,
    timeline: balance.points,
    expenseByTag: createTagBreakdown(current.convertedRows, 'expense'),
    incomeByTag: createTagBreakdown(current.convertedRows, 'income'),
    accountActivity: createAccountActivity(current.convertedRows, filters.accountIds),
    transferFlows,
    limits: relevantLimits(filters)
  }
}
