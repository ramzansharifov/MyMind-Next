const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

function parts(value: string): { year: number; month: number; day: number } {
  const match = DATE_KEY_PATTERN.exec(value)
  if (!match) throw new Error('Некорректная дата календаря')
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day, 12)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error('Некорректная дата календаря')
  }
  return { year, month, day }
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function calendarDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function calendarParseDate(value: string): Date {
  const parsed = parts(value)
  return new Date(parsed.year, parsed.month - 1, parsed.day, 12)
}

export function calendarMonthKey(value: string | Date): string {
  const date = typeof value === 'string' ? calendarParseDate(value) : value
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-01`
}

export function calendarAddDays(value: string, days: number): string {
  if (!Number.isInteger(days)) throw new Error('Некорректное смещение календаря')
  const date = calendarParseDate(value)
  date.setDate(date.getDate() + days)
  return calendarDateKey(date)
}

export function calendarShiftMonth(month: string, offset: number): string {
  if (!Number.isInteger(offset)) throw new Error('Некорректное смещение месяца')
  const date = calendarParseDate(calendarMonthKey(month))
  date.setDate(1)
  date.setMonth(date.getMonth() + offset)
  return calendarMonthKey(date)
}

export interface CalendarMonthGrid {
  month: string
  from: string
  to: string
  days: string[]
}

export function calendarMonthGrid(month: string): CalendarMonthGrid {
  const normalizedMonth = calendarMonthKey(month)
  const first = calendarParseDate(normalizedMonth)
  const mondayOffset = (first.getDay() + 6) % 7
  const from = calendarAddDays(normalizedMonth, -mondayOffset)
  const days = Array.from({ length: 42 }, (_, index) => calendarAddDays(from, index))
  return {
    month: normalizedMonth,
    from,
    to: days[days.length - 1] ?? from,
    days
  }
}

export function calendarSameMonth(day: string, month: string): boolean {
  return calendarMonthKey(day) === calendarMonthKey(month)
}
