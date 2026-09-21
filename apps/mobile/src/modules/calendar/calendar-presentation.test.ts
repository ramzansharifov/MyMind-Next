import { describe, expect, it } from 'vitest'
import type { CalendarOccurrenceRecord } from '@mymind/contracts/calendar'
import {
  calendarElapsedLabel,
  calendarOccurrenceSubtitle,
  calendarReminderLabel
} from './calendar-presentation'

function occurrence(overrides: Partial<CalendarOccurrenceRecord> = {}): CalendarOccurrenceRecord {
  return {
    eventId: 'event-1',
    title: 'Годовщина',
    kind: 'annual',
    occurrenceDate: '2026-09-21',
    time: '18:30',
    startDate: '2020-09-21',
    note: '',
    hidden: false,
    reminderOffsets: [60],
    elapsed: { years: 6, months: 0, days: 0 },
    ...overrides
  }
}

describe('calendar mobile presentation', () => {
  it('uses the same human reminder labels as desktop', () => {
    expect(calendarReminderLabel(0)).toBe('В момент события')
    expect(calendarReminderLabel(60)).toBe('За 1 час')
    expect(calendarReminderLabel(120)).toBe('За 2 часа')
    expect(calendarReminderLabel(1440)).toBe('За 1 день')
    expect(calendarReminderLabel(10_080)).toBe('За 1 неделю')
  })

  it('formats elapsed annual-event time with Russian plural forms', () => {
    expect(calendarElapsedLabel({ years: 2, months: 3, days: 1 })).toBe(
      '2 года, 3 месяца, 1 день'
    )
  })

  it('keeps the day-list subtitle compact', () => {
    expect(calendarOccurrenceSubtitle(occurrence())).toBe('18:30 · Каждый год · Прошло 6 лет, 0 дней')
    expect(
      calendarOccurrenceSubtitle(
        occurrence({ kind: 'one_time', time: null, elapsed: null, startDate: null })
      )
    ).toBe('')
  })
})
