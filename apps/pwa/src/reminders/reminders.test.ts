/* eslint-disable @typescript-eslint/explicit-function-return-type */
import 'fake-indexeddb/auto'
import initSqlJs from 'sql.js'
import { describe, expect, it } from 'vitest'
import { createCalendarRepository } from '@mymind/persistence/calendar'
import { createHabitsRepository } from '@mymind/persistence/habits'
import { PwaDatabase } from '../storage/database'
import { migrateDatabase } from '../storage/migrations'
import { openPwaDisk } from '../storage/indexed-db'
import { scanReminders, type ReminderNotice } from './scheduler'
import { reminderCalendar } from './calendar-export'

async function fixture() {
  const engine = await initSqlJs()
  const sqlite = new engine.Database()
  migrateDatabase(sqlite)
  const db = new PwaDatabase(sqlite, await openPwaDisk(crypto.randomUUID()), engine)
  const now = new Date(2026, 9, 17, 12, 1).getTime()
  const runtime = {
    database: () => db,
    createId: () => crypto.randomUUID(),
    now: () => now - 60 * 60_000
  }
  const settings = {
    get: (key: string) =>
      (
        db.prepare('SELECT value FROM mobile_preferences WHERE key=?').get(key) as
          { value: string } | undefined
      )?.value ?? null,
    set: (key: string, value: string) => {
      db.prepare('INSERT OR REPLACE INTO mobile_preferences(key,value) VALUES(?,?)').run(key, value)
    }
  }
  return {
    db,
    now,
    services: {
      calendar: createCalendarRepository(runtime),
      habits: createHabitsRepository(runtime),
      settings
    }
  }
}

describe('persistent local reminders', () => {
  it('delivers calendar and habit reminders once, after durable saving, including after reopening', async () => {
    const { db, now, services } = await fixture()
    services.calendar.createCalendarEvent({
      title: 'Appointment',
      kind: 'one_time',
      date: '2026-10-17',
      time: '12:00',
      reminderOffsets: [0]
    })
    services.habits.createHabit({
      title: 'Water',
      groupId: null,
      trackingType: 'check',
      targetValue: 1,
      unit: 'glass',
      repeatEveryDays: 1,
      preferredTimes: [{ unit: 1, time: '12:30' }]
    })
    services.settings.set('reminders.enabled', 'true')
    const notices: ReminderNotice[] = []
    expect(
      await scanReminders(
        services,
        db.flush,
        async (notice) => {
          expect(db.state).toBe('saved')
          notices.push(notice)
        },
        now
      )
    ).toBe(2)
    expect(notices.map((n) => n.route).sort()).toEqual(['calendar', 'habits'])
    expect(
      await scanReminders(
        services,
        db.flush,
        async () => {
          throw new Error('duplicate')
        },
        now + 1000
      )
    ).toBe(0)
    const reopened = new db.engine.Database(await db.disk.readDatabase())
    expect(reopened.exec('SELECT COUNT(*) FROM calendar_reminder_deliveries')[0].values[0][0]).toBe(
      1
    )
    expect(reopened.exec('SELECT COUNT(*) FROM habit_reminder_deliveries')[0].values[0][0]).toBe(1)
    reopened.close()
  })
  it('does not deliver while disabled, and retains unread reminders when system notification fails', async () => {
    const { db, now, services } = await fixture()
    services.calendar.createCalendarEvent({
      title: 'Offline',
      kind: 'one_time',
      date: '2026-10-17',
      time: '12:00',
      reminderOffsets: [0]
    })
    expect(
      await scanReminders(
        services,
        db.flush,
        async () => {
          throw new Error('disabled')
        },
        now
      )
    ).toBe(0)
    services.settings.set('reminders.enabled', 'true')
    await expect(
      scanReminders(
        services,
        db.flush,
        async () => {
          throw new Error('blocked')
        },
        now
      )
    ).rejects.toThrow()
    expect(services.calendar.listUnreadCalendarReminders()).toHaveLength(1)
  })
  it('exports escaped UTF-8 calendar events with alarms and excludes past triggers', async () => {
    const { now, services } = await fixture()
    const title = 'Встреча; друзья, семья\\дом\n' + 'Очень длинное название '.repeat(10)
    services.calendar.createCalendarEvent({
      title,
      kind: 'one_time',
      date: '2026-10-18',
      time: '12:00',
      reminderOffsets: [0, 60]
    })
    services.calendar.createCalendarEvent({
      title: 'Past',
      kind: 'one_time',
      date: '2026-10-17',
      time: '11:00',
      reminderOffsets: [0]
    })
    const result = await reminderCalendar(services, now).text()
    expect(result.match(/BEGIN:VALARM/g)).toHaveLength(2)
    expect(result).not.toContain('SUMMARY:Past')
    expect(result.replace(/\r\n /g, '')).toContain('SUMMARY:Встреча\\; друзья\\, семья\\\\дом\\n')
    for (const line of result.split('\r\n'))
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
  })
})
