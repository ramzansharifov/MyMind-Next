import {
  calendarMonthGrid,
  calendarMonthKey,
  calendarParseDate,
  calendarSameMonth,
  calendarShiftMonth
} from '@mymind/core/calendar-month'

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export const MOBILE_DATE_WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const

export function isValidDateKey(value?: string | null): value is string {
  if (!value || !DATE_KEY_PATTERN.test(value)) return false
  try {
    calendarParseDate(value)
    return true
  } catch {
    return false
  }
}

export function formatMobileDate(value: string): string {
  if (!isValidDateKey(value)) return value
  const date = calendarParseDate(value)
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date)
}

export function formatMobileAccessibleDate(value: string): string {
  if (!isValidDateKey(value)) return value
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(calendarParseDate(value))
}

export function formatMobileMonth(value: string): string {
  const label = new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric'
  }).format(calendarParseDate(calendarMonthKey(value)))
  return label.charAt(0).toLocaleUpperCase('ru-RU') + label.slice(1)
}

export function datePickerReference(
  value: string,
  min: string | undefined,
  max: string | undefined,
  today: string
): string {
  if (isValidDateKey(value)) return value
  if (isValidDateKey(max)) return max
  if (isValidDateKey(min)) return min
  return today
}

export function dateWithinBounds(value: string, min?: string, max?: string): boolean {
  if (!isValidDateKey(value)) return false
  if (isValidDateKey(min) && value < min) return false
  if (isValidDateKey(max) && value > max) return false
  return true
}

export function datePickerDays(month: string): string[] {
  return calendarMonthGrid(month).days
}

export function datePickerWeeks(month: string): string[][] {
  const days = datePickerDays(month)
  return Array.from({ length: 6 }, (_, index) => days.slice(index * 7, index * 7 + 7))
}

export function datePickerSameMonth(day: string, month: string): boolean {
  return calendarSameMonth(day, month)
}

export function datePickerShiftMonth(month: string, offset: -1 | 1): string {
  return calendarShiftMonth(month, offset)
}
