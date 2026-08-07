import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear
} from 'date-fns'

import type {
  FinanceLimit,
  FinancePeriod,
  FinanceTemplate,
  FinanceTemplateScheduleType
} from '../../shared/contracts/finance'

export function resolveFinanceLimitPeriod(limit: FinanceLimit, at: number): FinancePeriod {
  const date = new Date(at)
  let from: Date
  let to: Date

  switch (limit.periodType) {
    case 'day':
      from = startOfDay(date)
      to = endOfDay(date)
      break
    case 'week':
      from = startOfWeek(date, { weekStartsOn: 1 })
      to = endOfWeek(date, { weekStartsOn: 1 })
      break
    case 'year':
      from = startOfYear(date)
      to = endOfYear(date)
      break
    case 'custom':
    case 'month':
      from = startOfMonth(date)
      to = endOfMonth(date)
      break
  }

  return {
    from: from.getTime(),
    to: to.getTime()
  }
}

export function previousComparablePeriod(period: FinancePeriod): FinancePeriod {
  const duration = Math.max(0, period.to - period.from)
  return {
    from: period.from - duration - 1,
    to: period.from - 1
  }
}

export function advanceFinanceSchedule(
  scheduleType: FinanceTemplateScheduleType,
  scheduleInterval: number,
  from: number
): number | null {
  const date = new Date(from)
  const interval = Math.max(1, scheduleInterval)

  switch (scheduleType) {
    case 'none':
      return null
    case 'daily':
      return addDays(date, interval).getTime()
    case 'weekly':
      return addWeeks(date, interval).getTime()
    case 'monthly':
      return addMonths(date, interval).getTime()
    case 'yearly':
      return addYears(date, interval).getTime()
    case 'custom':
      return addDays(date, interval).getTime()
  }
}

export function nextTemplateOccurrence(
  template: FinanceTemplate,
  fallbackNow: number
): number | null {
  if (template.scheduleType === 'none') {
    return null
  }

  return advanceFinanceSchedule(
    template.scheduleType,
    template.scheduleInterval,
    template.nextOccurrenceAt ?? fallbackNow
  )
}
