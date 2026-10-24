import { addDays, daysBetween, localDateKey, weekdayForDate } from '@mymind/core/habits'

export type MobileHabitReportRange = '7d' | '30d' | '90d' | '365d' | 'custom'

export interface MobileHabitReportPeriod {
  dateFrom: string
  dateTo: string
  label: string
}

const HABIT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MAX_CUSTOM_REPORT_DAYS = 730

function parseDateKey(value: string): string {
  const normalized = value.trim()
  if (!HABIT_DATE_PATTERN.test(normalized)) {
    throw new Error('Дата должна быть в формате ГГГГ-ММ-ДД')
  }

  const [year, month, day] = normalized.split('-').map(Number)
  if (!year || !month || !day || year < 1900 || year > 2200) {
    throw new Error('Введите корректную дату')
  }

  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error('Введите корректную дату')
  }

  return normalized
}

export function defaultHabitCustomRange(referenceDate = localDateKey()): {
  from: string
  to: string
} {
  return { from: addDays(referenceDate, -29), to: referenceDate }
}

export function habitReportPeriod(
  range: MobileHabitReportRange,
  customFrom = '',
  customTo = '',
  referenceDate = localDateKey()
): MobileHabitReportPeriod {
  const to = parseDateKey(referenceDate)
  const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365

  if (range !== 'custom') {
    return {
      dateFrom: addDays(to, -(days - 1)),
      dateTo: to,
      label: `${days} дней`
    }
  }

  const dateFrom = parseDateKey(customFrom)
  const dateTo = parseDateKey(customTo)
  if (dateTo < dateFrom) throw new Error('Конец периода не может быть раньше начала')
  if (dateTo > to) throw new Error('Конец периода не может быть позже сегодняшнего дня')

  const reportDays = daysBetween(dateFrom, dateTo) + 1
  if (reportDays > MAX_CUSTOM_REPORT_DAYS) {
    throw new Error(`Период отчёта не может превышать ${MAX_CUSTOM_REPORT_DAYS} дней`)
  }

  return {
    dateFrom,
    dateTo,
    label: `${dateFrom} — ${dateTo}`
  }
}

export function buildHabitHeatmapWeeks<T extends { date: string }>(
  days: T[]
): Array<Array<T | null>> {
  if (days.length === 0) return []

  const padded: Array<T | null> = [
    ...Array.from({ length: weekdayForDate(days[0].date) - 1 }, () => null),
    ...days
  ]
  while (padded.length % 7 !== 0) padded.push(null)

  const weeks: Array<Array<T | null>> = []
  for (let index = 0; index < padded.length; index += 7) {
    weeks.push(padded.slice(index, index + 7))
  }
  return weeks
}
