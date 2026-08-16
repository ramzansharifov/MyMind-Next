import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, getSqlite, initializeDatabaseForTesting } from '../database/client'
import { runDatabaseMigrationsFrom } from '../database/migrate'
import {
  createHabit,
  createHabitGroup,
  deleteHabitGroup,
  getHabitsReport,
  listHabitsOverview,
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
  getSqlite().exec('DELETE FROM habit_entries; DELETE FROM habits; DELETE FROM habit_groups;')
})

afterAll(async () => {
  closeDatabase()
  await rm(root, { recursive: true, force: true })
})

describe('habits repository', () => {
  it('persists groups and broad habit metadata', () => {
    const health = createHabitGroup({ name: 'Здоровье', icon: 'heart-pulse', color: 'emerald' })
    const habit = createHabit({
      title: 'Пить воду',
      description: 'Следить за объёмом воды.',
      groupId: health.id,
      status: 'active',
      trackingType: 'count',
      targetValue: 8,
      unit: 'стаканов',
      repeatEveryDays: 1,
      startDate: '2026-01-01',
      endDate: null,
      preferredTime: '09:00'
    })

    expect(listHabitsOverview({ date: '2026-01-01' })).toMatchObject({
      groups: [health],
      habits: [habit],
      entries: []
    })

    const archived = updateHabit({
      id: habit.id,
      title: habit.title,
      description: habit.description,
      groupId: habit.groupId,
      status: 'archived',
      trackingType: habit.trackingType,
      targetValue: habit.targetValue,
      unit: habit.unit,
      repeatEveryDays: habit.repeatEveryDays,
      startDate: habit.startDate,
      endDate: habit.endDate,
      preferredTime: habit.preferredTime
    })
    expect(archived.status).toBe('archived')
    expect(archived.archivedOn).not.toBeNull()
  })

  it('allows entries only on scheduled days', () => {
    const habit = createHabit({
      title: 'Тренировка',
      description: '',
      groupId: null,
      status: 'active',
      trackingType: 'check',
      targetValue: 1,
      unit: '',
      repeatEveryDays: 3,
      startDate: '2026-01-01',
      endDate: null,
      preferredTime: null
    })

    const entry = upsertHabitEntry({ habitId: habit.id, date: '2026-01-04', value: 1, skipped: false })
    expect(entry).toMatchObject({ habitId: habit.id, date: '2026-01-04', value: 1, skipped: false })

    expect(() =>
      upsertHabitEntry({ habitId: habit.id, date: '2026-01-05', value: 1, skipped: false })
    ).toThrow('На выбранную дату эта привычка не запланирована')
  })

  it('builds reports with completion, misses, skips and streaks', () => {
    const habit = createHabit({
      title: 'Читать',
      description: '',
      groupId: null,
      status: 'active',
      trackingType: 'check',
      targetValue: 1,
      unit: '',
      repeatEveryDays: 3,
      startDate: '2026-01-01',
      endDate: null,
      preferredTime: null
    })

    upsertHabitEntry({ habitId: habit.id, date: '2026-01-01', value: 1, skipped: false })
    upsertHabitEntry({ habitId: habit.id, date: '2026-01-04', value: 1, skipped: false })
    upsertHabitEntry({ habitId: habit.id, date: '2026-01-07', value: 0, skipped: true })

    const report = getHabitsReport({
      dateFrom: '2026-01-01',
      dateTo: '2026-01-10',
      groupId: null,
      ungroupedOnly: false,
      includeArchived: true
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
      description: '',
      groupId: group.id,
      status: 'active',
      trackingType: 'check',
      targetValue: 1,
      unit: '',
      repeatEveryDays: 1,
      startDate: '2026-01-01',
      endDate: null,
      preferredTime: null
    })
    upsertHabitEntry({ habitId: habit.id, date: '2026-01-01', value: 1, skipped: false })

    expect(deleteHabitGroup({ id: group.id })).toBe(true)
    const overview = listHabitsOverview({ date: '2026-01-01' })
    expect(overview.habits[0]).toMatchObject({ id: habit.id, groupId: null })
    expect(overview.entries[0]).toMatchObject({ habitId: habit.id, value: 1 })
  })
})
