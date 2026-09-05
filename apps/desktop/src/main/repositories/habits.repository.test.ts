import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => '' } }))

import { closeDatabase, getSqlite, initializeDatabaseForTesting } from '../database/client'
import { runDatabaseMigrationsFrom } from '../database/migrate'
import {
  acknowledgeHabitReminder,
  createHabit,
  createHabitGroup,
  deleteHabitGroup,
  getHabitsReport,
  listDueHabitReminders,
  listHabitReminderTriggers,
  listHabitsOverview,
  listUnreadHabitReminders,
  markHabitReminderDelivered,
  updateHabit,
  upsertHabitEntry
} from './habits.repository'

let root = ''

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'mymind-habits-'))
  initializeDatabaseForTesting(join(root, 'habits.sqlite'))
  runDatabaseMigrationsFrom(resolve(process.cwd(), 'drizzle'))
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0))
  getSqlite().exec(
    'DELETE FROM habit_reminder_deliveries; DELETE FROM habit_entries; DELETE FROM habits; DELETE FROM habit_groups;'
  )
})

afterEach(() => {
  vi.useRealTimers()
})

afterAll(async () => {
  closeDatabase()
  await rm(root, { recursive: true, force: true })
})

describe('habits repository', () => {
  it('persists the simplified habit model with per-unit preferred times', () => {
    const health = createHabitGroup({ name: 'Здоровье', icon: 'heart-pulse', color: 'emerald' })
    const habit = createHabit({
      title: 'Пить воду',
      groupId: health.id,
      trackingType: 'count',
      targetValue: 3,
      unit: 'стакана',
      repeatEveryDays: 1,
      remindersEnabled: true,
      preferredTimes: [
        { unit: 1, time: '09:00' },
        { unit: 2, time: '15:00' },
        { unit: 3, time: '21:00' }
      ]
    })

    expect(listHabitsOverview({ date: '2026-01-01' })).toMatchObject({
      groups: [health],
      habits: [habit],
      entries: []
    })
    expect(habit.remindersEnabled).toBe(true)
    expect(habit.preferredTimes).toEqual([
      { unit: 1, time: '09:00' },
      { unit: 2, time: '15:00' },
      { unit: 3, time: '21:00' }
    ])

    const stored = getSqlite()
      .prepare('SELECT preferred_time FROM habits WHERE id = ?')
      .get(habit.id) as { preferred_time: string | null }
    expect(stored.preferred_time).toBe(
      JSON.stringify([
        { unit: 1, time: '09:00' },
        { unit: 2, time: '15:00' },
        { unit: 3, time: '21:00' }
      ])
    )

    const updated = updateHabit({
      id: habit.id,
      title: 'Пить воду регулярно',
      groupId: habit.groupId,
      trackingType: habit.trackingType,
      targetValue: habit.targetValue,
      unit: habit.unit,
      repeatEveryDays: habit.repeatEveryDays,
      preferredTimes: habit.preferredTimes,
      remindersEnabled: habit.remindersEnabled
    })
    expect(updated.title).toBe('Пить воду регулярно')

    const columns = getSqlite().prepare('PRAGMA table_info(habits)').all() as Array<{
      name: string
    }>
    const names = columns.map((column) => column.name)
    expect(names).not.toContain('description')
    expect(names).not.toContain('status')
    expect(names).not.toContain('start_date')
    expect(names).not.toContain('end_date')
    expect(names).not.toContain('archived_on')
    expect(names).toContain('reminders_enabled')
    expect(
      getSqlite()
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'habit_reminder_deliveries'"
        )
        .get()
    ).toBeTruthy()
  })

  it('triggers reminders 30 minutes before preferred times and suppresses completed units', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 8, 0, 0))
    const habit = createHabit({
      title: 'Пить воду',
      groupId: null,
      trackingType: 'count',
      targetValue: 3,
      unit: 'стакана',
      repeatEveryDays: 1,
      remindersEnabled: true,
      preferredTimes: [
        { unit: 1, time: '09:00' },
        { unit: 2, time: '15:00' },
        { unit: 3, time: '21:00' }
      ]
    })

    const firstTrigger = new Date(2026, 0, 1, 8, 30, 0).getTime()
    const first = listDueHabitReminders(firstTrigger - 1_000, firstTrigger)
    expect(first).toHaveLength(1)
    expect(first[0]).toMatchObject({
      habitId: habit.id,
      occurrenceDate: '2026-01-01',
      unit: 1,
      targetValue: 3,
      preferredTime: '09:00',
      triggerAt: firstTrigger
    })
    expect(markHabitReminderDelivered(first[0])).toBe(true)
    expect(markHabitReminderDelivered(first[0])).toBe(false)

    upsertHabitEntry({
      habitId: habit.id,
      date: '2026-01-01',
      value: 2,
      skipped: false
    })
    const secondTrigger = new Date(2026, 0, 1, 14, 30, 0).getTime()
    expect(listDueHabitReminders(secondTrigger - 1_000, secondTrigger)).toEqual([])

    const thirdTrigger = new Date(2026, 0, 1, 20, 30, 0).getTime()
    expect(listDueHabitReminders(thirdTrigger - 1_000, thirdTrigger)).toMatchObject([
      { habitId: habit.id, unit: 3, preferredTime: '21:00' }
    ])

    upsertHabitEntry({
      habitId: habit.id,
      date: '2026-01-01',
      value: 0,
      skipped: true
    })
    expect(listDueHabitReminders(thirdTrigger - 1_000, thirdTrigger)).toEqual([])
  })

  it('persists delivered reminders in the in-app inbox until they are acknowledged', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 8, 30, 0))
    const habit = createHabit({
      title: 'Читать',
      groupId: null,
      trackingType: 'check',
      targetValue: 1,
      unit: '',
      repeatEveryDays: 1,
      preferredTimes: [{ unit: 1, time: '09:00' }]
    })
    const triggerAt = new Date(2026, 0, 1, 8, 30, 0).getTime()
    const [reminder] = listDueHabitReminders(triggerAt - 1_000, triggerAt)

    expect(reminder).toBeTruthy()
    expect(markHabitReminderDelivered(reminder)).toBe(true)
    expect(listUnreadHabitReminders()).toMatchObject([
      {
        habitId: habit.id,
        title: 'Читать',
        occurrenceDate: '2026-01-01',
        preferredTime: '09:00',
        unit: 1,
        targetValue: 1
      }
    ])

    const [unread] = listUnreadHabitReminders()
    expect(acknowledgeHabitReminder({ deliveryId: unread.deliveryId })).toBe(true)
    expect(listUnreadHabitReminders()).toEqual([])
    expect(acknowledgeHabitReminder({ deliveryId: unread.deliveryId })).toBe(false)
  })

  it('automatically schedules reminders whenever a preferred time exists', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 8, 0, 0))
    const withTime = createHabit({
      title: 'Читать',
      groupId: null,
      trackingType: 'check',
      targetValue: 1,
      unit: '',
      repeatEveryDays: 1,
      remindersEnabled: false,
      preferredTimes: [{ unit: 1, time: '09:00' }]
    })
    const withoutTime = createHabit({
      title: 'Без времени',
      groupId: null,
      trackingType: 'check',
      targetValue: 1,
      unit: '',
      repeatEveryDays: 1,
      remindersEnabled: true,
      preferredTimes: []
    })

    expect(withTime.remindersEnabled).toBe(true)
    expect(withoutTime.remindersEnabled).toBe(false)
    const trigger = new Date(2026, 0, 1, 8, 30, 0).getTime()
    expect(listDueHabitReminders(trigger - 1_000, trigger)).toMatchObject([
      { habitId: withTime.id, preferredTime: '09:00' }
    ])
  })

  it('uses the calendar-style range calculation for reminders shortly after midnight', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0))
    const habit = createHabit({
      title: 'Сон',
      groupId: null,
      trackingType: 'check',
      targetValue: 1,
      unit: '',
      repeatEveryDays: 1,
      preferredTimes: [{ unit: 1, time: '00:15' }]
    })

    const triggers = listHabitReminderTriggers({ from: '2026-01-01', to: '2026-01-01' })
    expect(triggers).toMatchObject([
      {
        habitId: habit.id,
        occurrenceDate: '2026-01-02',
        preferredTime: '00:15',
        triggerAt: new Date(2026, 0, 1, 23, 45, 0).getTime()
      }
    ])
  })

  it('allows another reminder after the preferred time is changed on the same day', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 8, 0, 0))
    const habit = createHabit({
      title: 'Прогулка',
      groupId: null,
      trackingType: 'check',
      targetValue: 1,
      unit: '',
      repeatEveryDays: 1,
      preferredTimes: [{ unit: 1, time: '09:00' }]
    })

    const firstTrigger = new Date(2026, 0, 1, 8, 30, 0).getTime()
    const first = listDueHabitReminders(firstTrigger - 1_000, firstTrigger)[0]
    expect(first).toBeDefined()
    expect(markHabitReminderDelivered(first)).toBe(true)

    updateHabit({
      id: habit.id,
      title: habit.title,
      groupId: habit.groupId,
      trackingType: habit.trackingType,
      targetValue: habit.targetValue,
      unit: habit.unit,
      repeatEveryDays: habit.repeatEveryDays,
      preferredTimes: [{ unit: 1, time: '10:00' }]
    })

    const secondTrigger = new Date(2026, 0, 1, 9, 30, 0).getTime()
    const second = listDueHabitReminders(secondTrigger - 1_000, secondTrigger)[0]
    expect(second).toMatchObject({ habitId: habit.id, preferredTime: '10:00' })
    expect(markHabitReminderDelivered(second)).toBe(true)
  })

  it('reads legacy single preferred_time as the first unit without a migration', () => {
    const habit = createHabit({
      title: 'Витамины',
      groupId: null,
      trackingType: 'count',
      targetValue: 3,
      unit: 'приёма',
      repeatEveryDays: 1,
      remindersEnabled: false,
      preferredTimes: []
    })

    getSqlite().prepare('UPDATE habits SET preferred_time = ? WHERE id = ?').run('08:30', habit.id)

    expect(listHabitsOverview({ date: '2026-01-01' }).habits[0]?.preferredTimes).toEqual([
      { unit: 1, time: '08:30' }
    ])
  })

  it('supports one or several selected weekdays and schedules reminders only on them', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 8, 0, 0))
    const habit = createHabit({
      title: 'Недельная привычка',
      groupId: null,
      trackingType: 'check',
      targetValue: 1,
      unit: '',
      repeatEveryDays: 1,
      weekdays: [4, 7],
      preferredTimes: [{ unit: 1, time: '09:00' }]
    })

    expect(habit.weekdays).toEqual([4, 7])
    expect(() =>
      upsertHabitEntry({ habitId: habit.id, date: '2026-01-02', value: 1, skipped: false })
    ).toThrow('На выбранную дату эта привычка не запланирована')
    expect(
      upsertHabitEntry({ habitId: habit.id, date: '2026-01-04', value: 1, skipped: false })
    ).toMatchObject({ date: '2026-01-04', value: 1 })

    getSqlite()
      .prepare('DELETE FROM habit_entries WHERE habit_id = ? AND date = ?')
      .run(habit.id, '2026-01-04')
    const sundayTrigger = new Date(2026, 0, 4, 8, 30, 0).getTime()
    expect(listDueHabitReminders(sundayTrigger - 1_000, sundayTrigger)).toMatchObject([
      { habitId: habit.id, occurrenceDate: '2026-01-04', preferredTime: '09:00' }
    ])
  })

  it('anchors recurrence to the creation day and allows entries only on scheduled days', () => {
    const habit = createHabit({
      title: 'Тренировка',
      groupId: null,
      trackingType: 'check',
      targetValue: 1,
      unit: '',
      repeatEveryDays: 3,
      remindersEnabled: false,
      preferredTimes: []
    })

    const entry = upsertHabitEntry({
      habitId: habit.id,
      date: '2026-01-04',
      value: 1,
      skipped: false
    })
    expect(entry).toMatchObject({ habitId: habit.id, date: '2026-01-04', value: 1, skipped: false })

    expect(() =>
      upsertHabitEntry({ habitId: habit.id, date: '2026-01-05', value: 1, skipped: false })
    ).toThrow('На выбранную дату эта привычка не запланирована')
  })

  it('builds reports with completion, misses, skips and streaks', () => {
    const habit = createHabit({
      title: 'Читать',
      groupId: null,
      trackingType: 'check',
      targetValue: 1,
      unit: '',
      repeatEveryDays: 3,
      remindersEnabled: false,
      preferredTimes: []
    })

    upsertHabitEntry({ habitId: habit.id, date: '2026-01-01', value: 1, skipped: false })
    upsertHabitEntry({ habitId: habit.id, date: '2026-01-04', value: 1, skipped: false })
    upsertHabitEntry({ habitId: habit.id, date: '2026-01-07', value: 0, skipped: true })
    vi.setSystemTime(new Date(2026, 0, 11, 12, 0, 0))

    const report = getHabitsReport({
      dateFrom: '2026-01-01',
      dateTo: '2026-01-10',
      groupId: null,
      ungroupedOnly: false
    })

    expect(report.summary).toEqual({
      scheduled: 4,
      completed: 2,
      missed: 1,
      skipped: 1,
      pending: 0,
      completionRate: 67
    })
    expect(report.habits[0]).toMatchObject({
      habitId: habit.id,
      completed: 2,
      missed: 1,
      skipped: 1,
      currentStreak: 0,
      bestStreak: 2,
      completionRate: 67
    })
  })

  it('keeps habits and history when a group is deleted', () => {
    const group = createHabitGroup({ name: 'Развитие', icon: 'sparkles', color: 'violet' })
    const habit = createHabit({
      title: 'Практика',
      groupId: group.id,
      trackingType: 'check',
      targetValue: 1,
      unit: '',
      repeatEveryDays: 1,
      remindersEnabled: false,
      preferredTimes: []
    })
    upsertHabitEntry({ habitId: habit.id, date: '2026-01-01', value: 1, skipped: false })

    expect(deleteHabitGroup({ id: group.id })).toBe(true)
    const overview = listHabitsOverview({ date: '2026-01-01' })
    expect(overview.habits[0]).toMatchObject({ id: habit.id, groupId: null })
    expect(overview.entries[0]).toMatchObject({ habitId: habit.id, value: 1 })
  })
})
