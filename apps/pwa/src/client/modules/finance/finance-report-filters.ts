import type {
  FinanceReportFilters,
  FinanceTagSummary,
  FinanceTransactionType
} from '@mymind/contracts/finance'

export type MobileFinanceReportRange =
  '7d' | '30d' | '90d' | 'month' | 'previous-month' | 'year' | 'custom'
export type MobileFinanceReportType = 'all' | 'income' | 'expense' | 'transfer'
export type MobileFinanceReportSource = 'all' | 'template' | 'manual'

export interface MobileFinanceReportPeriod {
  dateFrom: number
  dateTo: number
  label: string
}

export interface MobileFinanceReportSelection {
  range: MobileFinanceReportRange
  customFrom: string
  customTo: string
  type: MobileFinanceReportType
  accountId: string
  tagId: string
  source: MobileFinanceReportSource
  currencyCode: string
}

function dayStart(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function dayEnd(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).getTime()
}

function daysAgoStart(now: Date, days: number): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - days).getTime()
}

export function formatFinanceDateInput(value: number | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseFinanceDateInput(value: string, endOfDay = false): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) throw new Error('Введите дату в формате ГГГГ-ММ-ДД')
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0
  )
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error('Укажите существующую дату')
  }
  return date.getTime()
}

export function financeReportPeriod(
  range: MobileFinanceReportRange,
  customFrom: string,
  customTo: string,
  now = new Date()
): MobileFinanceReportPeriod {
  const dateTo = dayEnd(now)
  if (range === '7d') {
    return { dateFrom: daysAgoStart(now, 6), dateTo, label: 'Последние 7 дней' }
  }
  if (range === '30d') {
    return { dateFrom: daysAgoStart(now, 29), dateTo, label: 'Последние 30 дней' }
  }
  if (range === '90d') {
    return { dateFrom: daysAgoStart(now, 89), dateTo, label: 'Последние 90 дней' }
  }
  if (range === 'month') {
    return {
      dateFrom: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
      dateTo,
      label: 'Текущий месяц'
    }
  }
  if (range === 'previous-month') {
    return {
      dateFrom: new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(),
      dateTo: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime(),
      label: 'Прошлый месяц'
    }
  }
  if (range === 'year') {
    return {
      dateFrom: new Date(now.getFullYear(), 0, 1).getTime(),
      dateTo,
      label: 'Текущий год'
    }
  }

  const dateFrom = parseFinanceDateInput(customFrom)
  const customDateTo = parseFinanceDateInput(customTo, true)
  if (dateFrom > customDateTo) throw new Error('Начальная дата должна быть не позже конечной')
  return { dateFrom, dateTo: customDateTo, label: `${customFrom} — ${customTo}` }
}

export function availableFinanceReportTags(
  tags: readonly FinanceTagSummary[],
  type: MobileFinanceReportType
): FinanceTagSummary[] {
  if (type === 'transfer') return []
  if (type === 'income') return tags.filter((tag) => tag.type === 'income' || tag.type === 'both')
  if (type === 'expense') {
    return tags.filter((tag) => tag.type === 'expense' || tag.type === 'both')
  }
  return [...tags]
}

export function normalizeFinanceReportTagId(
  tags: readonly FinanceTagSummary[],
  type: MobileFinanceReportType,
  tagId: string
): string {
  if (tagId === 'all') return 'all'
  return availableFinanceReportTags(tags, type).some((tag) => tag.id === tagId) ? tagId : 'all'
}

export function buildFinanceReportFilters(
  selection: MobileFinanceReportSelection,
  now = new Date()
): { filters: FinanceReportFilters; period: MobileFinanceReportPeriod; tagId: string } {
  const period = financeReportPeriod(selection.range, selection.customFrom, selection.customTo, now)
  const normalizedTagId = selection.type === 'transfer' ? 'all' : selection.tagId
  const filters: FinanceReportFilters = {
    dateFrom: period.dateFrom,
    dateTo: period.dateTo,
    currencyCode: selection.currencyCode
  }

  if (selection.type !== 'all') filters.types = [selection.type as FinanceTransactionType]
  if (selection.accountId !== 'all') filters.accountIds = [selection.accountId]
  if (normalizedTagId !== 'all') filters.tagId = normalizedTagId
  if (selection.source !== 'all') filters.templateOnly = selection.source === 'template'

  return { filters, period, tagId: normalizedTagId }
}

export function defaultFinanceCustomRange(now = new Date()): { from: string; to: string } {
  return {
    from: formatFinanceDateInput(dayStart(new Date(now.getFullYear(), now.getMonth(), 1))),
    to: formatFinanceDateInput(now)
  }
}
