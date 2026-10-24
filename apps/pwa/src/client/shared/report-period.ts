export type MobileReportPeriod = '7' | '30' | '90' | '365' | 'custom'

export interface MobileReportDateRange {
  dateFrom: string
  dateTo: string
}

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/

function parseDayKey(value: string): Date {
  const match = DAY_KEY.exec(value)
  if (!match) throw new Error('Дата должна быть в формате ГГГГ-ММ-ДД')
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error('Укажите существующую календарную дату')
  }
  return date
}

function dayKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

export function shiftReportDay(value: string, days: number): string {
  const date = parseDayKey(value)
  date.setUTCDate(date.getUTCDate() + days)
  return dayKey(date)
}

export function reportDateRange(
  period: MobileReportPeriod,
  customFrom: string,
  customTo: string,
  referenceDay: string
): MobileReportDateRange {
  parseDayKey(referenceDay)

  if (period === 'custom') {
    parseDayKey(customFrom)
    parseDayKey(customTo)
    if (customFrom > customTo) throw new Error('Начальная дата не может быть позже конечной')
    return { dateFrom: customFrom, dateTo: customTo }
  }

  const days = Number(period)
  return {
    dateFrom: shiftReportDay(referenceDay, -(days - 1)),
    dateTo: referenceDay
  }
}

export const mobileReportPeriodLabels: Record<MobileReportPeriod, string> = {
  '7': '7 дней',
  '30': '30 дней',
  '90': '90 дней',
  '365': '365 дней',
  custom: 'Свой период'
}
