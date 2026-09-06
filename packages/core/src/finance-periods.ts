import type { FinanceLimit, FinancePeriod } from '@mymind/contracts/finance'

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function startOfNextLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
}

function startOfLocalWeek(date: Date): Date {
  const start = startOfLocalDay(date)
  const day = start.getDay()
  const daysSinceMonday = day === 0 ? 6 : day - 1
  start.setDate(start.getDate() - daysSinceMonday)
  return start
}

function startOfNextLocalWeek(date: Date): Date {
  const start = startOfLocalWeek(date)
  start.setDate(start.getDate() + 7)
  return start
}

export function resolveFinanceLimitPeriod(limit: FinanceLimit, at: number): FinancePeriod {
  const date = new Date(at)
  let from: Date
  let next: Date

  switch (limit.periodType) {
    case 'day':
      from = startOfLocalDay(date)
      next = startOfNextLocalDay(date)
      break
    case 'week':
      from = startOfLocalWeek(date)
      next = startOfNextLocalWeek(date)
      break
    case 'year':
      from = new Date(date.getFullYear(), 0, 1)
      next = new Date(date.getFullYear() + 1, 0, 1)
      break
    case 'month':
      from = new Date(date.getFullYear(), date.getMonth(), 1)
      next = new Date(date.getFullYear(), date.getMonth() + 1, 1)
      break
  }

  return { from: from.getTime(), to: next.getTime() - 1 }
}

export function previousComparablePeriod(period: FinancePeriod): FinancePeriod {
  const duration = Math.max(0, period.to - period.from)
  return { from: period.from - duration - 1, to: period.from - 1 }
}

export function defaultFinancePeriod(now = Date.now()): FinancePeriod {
  const date = new Date(now)
  return {
    from: new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
    to: startOfNextLocalDay(date).getTime() - 1
  }
}
