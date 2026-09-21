import type {
  CalendarElapsedDuration,
  CalendarOccurrenceRecord
} from '@mymind/contracts/calendar'

function plural(value: number, forms: [string, string, string]): string {
  const mod10 = value % 10
  const mod100 = value % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}

export function calendarReminderLabel(minutes: number): string {
  if (minutes === 0) return 'В момент события'
  if (minutes % 10_080 === 0) {
    const value = minutes / 10_080
    return `За ${value} ${plural(value, ['неделю', 'недели', 'недель'])}`
  }
  if (minutes % 1440 === 0) {
    const value = minutes / 1440
    return `За ${value} ${plural(value, ['день', 'дня', 'дней'])}`
  }
  if (minutes % 60 === 0) {
    const value = minutes / 60
    return `За ${value} ${plural(value, ['час', 'часа', 'часов'])}`
  }
  return `За ${minutes} ${plural(minutes, ['минуту', 'минуты', 'минут'])}`
}

export function calendarElapsedLabel(elapsed: CalendarElapsedDuration | null): string | null {
  if (!elapsed) return null
  const parts: string[] = []

  if (elapsed.years) {
    parts.push(`${elapsed.years} ${plural(elapsed.years, ['год', 'года', 'лет'])}`)
  }
  if (elapsed.months) {
    parts.push(
      `${elapsed.months} ${plural(elapsed.months, ['месяц', 'месяца', 'месяцев'])}`
    )
  }
  parts.push(`${elapsed.days} ${plural(elapsed.days, ['день', 'дня', 'дней'])}`)

  return parts.join(', ')
}

export function calendarOccurrenceSubtitle(item: CalendarOccurrenceRecord): string {
  const elapsed = calendarElapsedLabel(item.elapsed)
  return [
    item.time,
    item.kind === 'annual' ? 'Каждый год' : '',
    elapsed ? `Прошло ${elapsed}` : ''
  ]
    .filter(Boolean)
    .join(' · ')
}
