import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => '' } }))

import { closeDatabase, getSqlite, initializeDatabaseForTesting } from '../database/client'
import { runDatabaseMigrationsFrom } from '../database/migrate'
import {
  calculateCalendarElapsed,
  createCalendarEvent,
  listCalendarOccurrences,
  listCalendarReminderTriggers,
  markCalendarReminderDelivered,
  setCalendarOccurrenceHidden,
  setCalendarOccurrenceNote
} from './calendar.repository'

let root = ''

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'mymind-calendar-'))
  initializeDatabaseForTesting(join(root, 'calendar.sqlite'))
  runDatabaseMigrationsFrom(resolve(process.cwd(), 'drizzle'))
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 7, 28, 12, 0, 0))
  getSqlite().exec(
    'DELETE FROM calendar_reminder_deliveries; DELETE FROM calendar_event_reminders; DELETE FROM calendar_event_occurrences; DELETE FROM calendar_events;'
  )
})

afterEach(() => vi.useRealTimers())

afterAll(async () => {
  closeDatabase()
  await rm(root, { recursive: true, force: true })
})

describe('calendar repository', () => {
  it('keeps one-time events on their exact date only', () => {
    createCalendarEvent({ title: 'Встреча', kind: 'one_time', date: '2026-09-04' })
    expect(listCalendarOccurrences({ from: '2026-09-04', to: '2026-09-04' })).toHaveLength(1)
    expect(listCalendarOccurrences({ from: '2027-09-04', to: '2027-09-04' })).toHaveLength(0)
  })

  it('resolves annual events across years and respects an optional start date', () => {
    createCalendarEvent({
      title: 'Годовщина',
      kind: 'annual',
      date: '2026-05-15',
      startDate: '2022-05-15'
    })
    expect(listCalendarOccurrences({ from: '2021-01-01', to: '2021-12-31' })).toHaveLength(0)
    expect(listCalendarOccurrences({ from: '2025-01-01', to: '2027-12-31' }).map((item) => item.occurrenceDate)).toEqual([
      '2025-05-15',
      '2026-05-15',
      '2027-05-15'
    ])
  })

  it('keeps notes attached to one annual occurrence only', () => {
    const event = createCalendarEvent({ title: 'День рождения', kind: 'annual', date: '2026-03-10' })
    setCalendarOccurrenceNote({ eventId: event.id, occurrenceDate: '2026-03-10', note: 'Купить часы' })
    expect(listCalendarOccurrences({ from: '2026-03-10', to: '2026-03-10' })[0]?.note).toBe('Купить часы')
    expect(listCalendarOccurrences({ from: '2027-03-10', to: '2027-03-10' })[0]?.note).toBe('')
  })

  it('can hide one annual occurrence without deleting the series', () => {
    const event = createCalendarEvent({ title: 'Дата', kind: 'annual', date: '2026-08-28' })
    setCalendarOccurrenceHidden({ eventId: event.id, occurrenceDate: '2027-08-28', hidden: true })
    expect(listCalendarOccurrences({ from: '2027-08-28', to: '2027-08-28' })).toHaveLength(0)
    expect(listCalendarOccurrences({ from: '2028-08-28', to: '2028-08-28' })).toHaveLength(1)
  })

  it('supports several reminders and deduplicates their deliveries', () => {
    const event = createCalendarEvent({
      title: 'Встреча',
      kind: 'one_time',
      date: '2026-09-01',
      time: '18:00',
      reminderOffsets: [1440, 180, 30]
    })
    const reminders = listCalendarReminderTriggers({ from: '2026-08-31', to: '2026-09-01' })
    expect(reminders.filter((item) => item.eventId === event.id).map((item) => item.offsetMinutes)).toEqual([1440, 180, 30])
    const first = reminders[0]
    expect(first).toBeDefined()
    expect(markCalendarReminderDelivered(first!.reminderId, first!.occurrenceDate)).toBe(true)
    expect(markCalendarReminderDelivered(first!.reminderId, first!.occurrenceDate)).toBe(false)
  })

  it('calculates calendar-aware elapsed years, months and days', () => {
    expect(calculateCalendarElapsed('2021-05-15', '2026-08-28')).toEqual({ years: 5, months: 3, days: 13 })
  })
})
