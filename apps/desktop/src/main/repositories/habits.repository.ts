import { randomUUID } from 'node:crypto'

import type {
  CreateHabitGroupInput,
  CreateHabitInput,
  DeleteHabitEntryInput,
  DeleteHabitGroupInput,
  DeleteHabitInput,
  HabitEntryRecord,
  HabitGroupColor,
  HabitGroupIcon,
  HabitGroupRecord,
  HabitPreferredTime,
  HabitRecord,
  HabitReminderRecord,
  HabitUnreadReminderRecord,
  HabitAcknowledgeReminderInput,
  HabitReport,
  HabitReportDay,
  HabitReportHabit,
  HabitReportInput,
  HabitReportSummary,
  HabitTrackingType,
  HabitWeekday,
  HabitsOverview,
  HabitsOverviewInput,
  UpdateHabitGroupInput,
  UpdateHabitInput,
  UpsertHabitEntryInput
} from '../../shared/contracts/habits'
import { getSqlite } from '../database/client'

interface HabitGroupRow {
  id: string
  name: string
  icon: HabitGroupIcon
  color: HabitGroupColor
  position: number
  created_at: number
  updated_at: number
}

interface HabitGroupNameRow {
  id: string
  name: string
}

interface HabitRow {
  id: string
  title: string
  group_id: string | null
  tracking_type: HabitTrackingType
  target_value: number
  unit: string
  repeat_every_days: number
  weekdays: string
  preferred_time: string | null
  reminders_enabled: number
  created_at: number
  updated_at: number
}

interface HabitEntryRow {
  id: string
  habit_id: string
  date: string
  value: number
  skipped: number
  created_at: number
  updated_at: number
}

const DAY_MS = 86_400_000
const HABIT_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

function parsePreferredTimes(value: string | null): HabitPreferredTime[] {
  if (!value) return []

  if (value.startsWith('[')) {
    try {
      const parsed = JSON.parse(value) as unknown
      if (!Array.isArray(parsed)) return []
      return parsed
        .filter(
          (item): item is HabitPreferredTime =>
            typeof item === 'object' &&
            item !== null &&
            Number.isInteger((item as HabitPreferredTime).unit) &&
            (item as HabitPreferredTime).unit >= 1 &&
            typeof (item as HabitPreferredTime).time === 'string' &&
            HABIT_TIME_PATTERN.test((item as HabitPreferredTime).time)
        )
        .sort((left, right) => left.unit - right.unit)
    } catch {
      return []
    }
  }

  return HABIT_TIME_PATTERN.test(value) ? [{ unit: 1, time: value }] : []
}

function serializePreferredTimes(values: HabitPreferredTime[]): string | null {
  if (values.length === 0) return null
  return JSON.stringify([...values].sort((left, right) => left.unit - right.unit))
}

function parseWeekdays(value: string | null): HabitWeekday[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return []
    return [
      ...new Set(
        parsed.filter(
          (item): item is HabitWeekday =>
            typeof item === 'number' && Number.isInteger(item) && item >= 1 && item <= 7
        )
      )
    ].sort((left, right) => left - right)
  } catch {
    return []
  }
}

function serializeWeekdays(values: HabitWeekday[] | undefined): string {
  return JSON.stringify([...new Set(values ?? [])].sort((left, right) => left - right))
}

const HABIT_GROUP_SELECT = `SELECT
  id,
  name,
  icon,
  color,
  position,
  created_at,
  updated_at
FROM habit_groups`

const HABIT_SELECT = `SELECT
  id,
  title,
  group_id,
  tracking_type,
  target_value,
  unit,
  repeat_every_days,
  weekdays,
  preferred_time,
  reminders_enabled,
  created_at,
  updated_at
FROM habits`

const HABIT_ENTRY_SELECT = `SELECT
  id,
  habit_id,
  date,
  value,
  skipped,
  created_at,
  updated_at
FROM habit_entries`

function mapGroup(row: HabitGroupRow): HabitGroupRecord {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapHabit(row: HabitRow): HabitRecord {
  const preferredTimes = parsePreferredTimes(row.preferred_time)
  return {
    id: row.id,
    title: row.title,
    groupId: row.group_id,
    trackingType: row.tracking_type,
    targetValue: row.target_value,
    unit: row.unit,
    repeatEveryDays: row.repeat_every_days,
    weekdays: parseWeekdays(row.weekdays),
    preferredTimes,
    remindersEnabled: preferredTimes.length > 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapEntry(row: HabitEntryRow): HabitEntryRecord {
  return {
    id: row.id,
    habitId: row.habit_id,
    date: row.date,
    value: row.value,
    skipped: row.skipped === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function dateParts(value: string): [number, number, number] {
  const [year, month, day] = value.split('-').map(Number)
  return [year ?? 0, month ?? 1, day ?? 1]
}

function dateToUtc(value: string): number {
  const [year, month, day] = dateParts(value)
  return Date.UTC(year, month - 1, day)
}

function utcToDateKey(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(
    date.getUTCDate()
  ).padStart(2, '0')}`
}

function addDays(value: string, days: number): string {
  return utcToDateKey(dateToUtc(value) + days * DAY_MS)
}

function daysBetween(from: string, to: string): number {
  return Math.floor((dateToUtc(to) - dateToUtc(from)) / DAY_MS)
}

function weekdayForDate(value: string): HabitWeekday {
  const weekday = new Date(dateToUtc(value)).getUTCDay()
  return (weekday === 0 ? 7 : weekday) as HabitWeekday
}

function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

function habitCreatedDateKey(habit: Pick<HabitRecord, 'createdAt'>): string {
  return localDateKey(new Date(habit.createdAt))
}

function findGroup(id: string): HabitGroupRecord | null {
  const row = getSqlite().prepare(`${HABIT_GROUP_SELECT} WHERE id = ?`).get(id) as
    HabitGroupRow | undefined
  return row ? mapGroup(row) : null
}

function requireGroup(id: string): HabitGroupRecord {
  const group = findGroup(id)
  if (!group) throw new Error('Группа привычек не найдена')
  return group
}

function ensureGroupExists(groupId: string | null): void {
  if (groupId !== null) requireGroup(groupId)
}

function ensureUniqueGroupName(name: string, ignoredId: string | null = null): void {
  const normalizedName = name.trim().toLocaleLowerCase('ru-RU')
  const rows = getSqlite().prepare('SELECT id, name FROM habit_groups').all() as HabitGroupNameRow[]
  const duplicate = rows.some(
    (row) => row.id !== ignoredId && row.name.trim().toLocaleLowerCase('ru-RU') === normalizedName
  )
  if (duplicate) throw new Error('Группа с таким названием уже существует')
}

function findHabit(id: string): HabitRecord | null {
  const row = getSqlite().prepare(`${HABIT_SELECT} WHERE id = ?`).get(id) as HabitRow | undefined
  return row ? mapHabit(row) : null
}

function requireHabit(id: string): HabitRecord {
  const habit = findHabit(id)
  if (!habit) throw new Error('Привычка не найдена')
  return habit
}

function findEntry(habitId: string, date: string): HabitEntryRecord | null {
  const row = getSqlite()
    .prepare(`${HABIT_ENTRY_SELECT} WHERE habit_id = ? AND date = ?`)
    .get(habitId, date) as HabitEntryRow | undefined
  return row ? mapEntry(row) : null
}

function nextGroupPosition(): number {
  const row = getSqlite()
    .prepare('SELECT COALESCE(MAX(position), -1) + 1 AS position FROM habit_groups')
    .get() as { position: number }
  return row.position
}

export function isHabitScheduledOn(habit: HabitRecord, date: string): boolean {
  const anchor = habitCreatedDateKey(habit)
  if (date < anchor) return false

  if (habit.weekdays.length > 0) {
    return habit.weekdays.includes(weekdayForDate(date))
  }

  const delta = daysBetween(anchor, date)
  return delta >= 0 && delta % habit.repeatEveryDays === 0
}

export type HabitReminderTrigger = HabitReminderRecord

const HABIT_REMINDER_OFFSET_MS = 30 * 60_000

function localDateTimeMs(date: string, time: string): number {
  const [year, month, day] = dateParts(date)
  const [hours, minutes] = time.split(':').map(Number)
  return new Date(year, month - 1, day, hours ?? 0, minutes ?? 0, 0, 0).getTime()
}

export function listHabitReminderTriggers(input: {
  from: string
  to: string
}): HabitReminderTrigger[] {
  const sqlite = getSqlite()
  const habits = (
    sqlite.prepare(`${HABIT_SELECT} ORDER BY updated_at DESC, created_at DESC`).all() as HabitRow[]
  )
    .map(mapHabit)
    .filter((habit) => habit.preferredTimes.length > 0)

  if (habits.length === 0) return []

  const occurrenceTo = addDays(input.to, 1)
  const entryRows = sqlite
    .prepare(`${HABIT_ENTRY_SELECT} WHERE date >= ? AND date <= ?`)
    .all(input.from, occurrenceTo) as HabitEntryRow[]
  const entries = new Map(entryRows.map((row) => [`${row.habit_id}:${row.date}`, mapEntry(row)]))
  const fromMs = localDateTimeMs(input.from, '00:00')
  const toMs = localDateTimeMs(input.to, '23:59') + 59_999
  const result: HabitReminderTrigger[] = []

  for (
    let occurrenceDate = input.from;
    occurrenceDate <= occurrenceTo;
    occurrenceDate = addDays(occurrenceDate, 1)
  ) {
    for (const habit of habits) {
      if (!isHabitScheduledOn(habit, occurrenceDate)) continue

      const entry = entries.get(`${habit.id}:${occurrenceDate}`)
      if (entry?.skipped) continue
      const progress = entry?.value ?? 0

      for (const preferredTime of habit.preferredTimes) {
        if (progress >= preferredTime.unit) continue
        const triggerAt =
          localDateTimeMs(occurrenceDate, preferredTime.time) - HABIT_REMINDER_OFFSET_MS
        if (triggerAt < fromMs || triggerAt > toMs) continue

        result.push({
          habitId: habit.id,
          title: habit.title,
          occurrenceDate,
          unit: preferredTime.unit,
          targetValue: habit.targetValue,
          habitUnit: habit.unit,
          preferredTime: preferredTime.time,
          triggerAt
        })
      }
    }
  }

  return result.sort(
    (left, right) => left.triggerAt - right.triggerAt || left.title.localeCompare(right.title, 'ru')
  )
}

export function listDueHabitReminders(sinceMs: number, nowMs: number): HabitReminderTrigger[] {
  if (!Number.isFinite(sinceMs) || !Number.isFinite(nowMs) || nowMs < sinceMs) return []

  const sinceDate = localDateKey(new Date(sinceMs))
  const nowDate = localDateKey(new Date(nowMs))
  return listHabitReminderTriggers({ from: sinceDate, to: nowDate }).filter(
    (item) => item.triggerAt >= sinceMs && item.triggerAt <= nowMs
  )
}

export function markHabitReminderDelivered(reminder: HabitReminderTrigger): boolean {
  try {
    getSqlite()
      .prepare(
        `INSERT INTO habit_reminder_deliveries (
id, habit_id, occurrence_date, unit, preferred_time, delivered_at, acknowledged_at
        ) VALUES (?, ?, ?, ?, ?, ?, NULL)`
      )
      .run(
        randomUUID(),
        reminder.habitId,
        reminder.occurrenceDate,
        reminder.unit,
        reminder.preferredTime,
        Date.now()
      )
    return true
  } catch (reason: unknown) {
    if (reason instanceof Error && /UNIQUE constraint failed/.test(reason.message)) return false
    throw reason
  }
}

interface HabitUnreadReminderRow {
  id: string
  habit_id: string
  occurrence_date: string
  unit: number
  preferred_time: string
  delivered_at: number
  title: string
  target_value: number
  habit_unit: string
}

export function listUnreadHabitReminders(): HabitUnreadReminderRecord[] {
  const rows = getSqlite()
    .prepare(
      `SELECT
        delivery.id,
        delivery.habit_id,
        delivery.occurrence_date,
        delivery.unit,
        delivery.preferred_time,
        delivery.delivered_at,
        habit.title,
        habit.target_value,
        habit.unit AS habit_unit
       FROM habit_reminder_deliveries AS delivery
       INNER JOIN habits AS habit ON habit.id = delivery.habit_id
       WHERE delivery.acknowledged_at IS NULL
       ORDER BY delivery.delivered_at DESC, delivery.occurrence_date DESC, delivery.unit ASC`
    )
    .all() as HabitUnreadReminderRow[]

  return rows.map((row) => ({
    deliveryId: row.id,
    habitId: row.habit_id,
    title: row.title,
    occurrenceDate: row.occurrence_date,
    unit: row.unit,
    targetValue: row.target_value,
    habitUnit: row.habit_unit,
    preferredTime: row.preferred_time,
    triggerAt: localDateTimeMs(row.occurrence_date, row.preferred_time) - HABIT_REMINDER_OFFSET_MS,
    deliveredAt: row.delivered_at
  }))
}

export function acknowledgeHabitReminder(input: HabitAcknowledgeReminderInput): boolean {
  return (
    getSqlite()
      .prepare(
        'UPDATE habit_reminder_deliveries SET acknowledged_at = ? WHERE id = ? AND acknowledged_at IS NULL'
      )
      .run(Date.now(), input.deliveryId).changes > 0
  )
}

function completionRate(summary: Pick<HabitReportSummary, 'completed' | 'missed'>): number {
  const denominator = summary.completed + summary.missed
  if (denominator === 0) return 0
  return Math.round((summary.completed / denominator) * 100)
}

function emptySummary(): HabitReportSummary {
  return {
    scheduled: 0,
    completed: 0,
    missed: 0,
    skipped: 0,
    pending: 0,
    completionRate: 0
  }
}

function applyOutcome(
  summary: HabitReportSummary,
  outcome: 'completed' | 'missed' | 'skipped' | 'pending'
): void {
  summary.scheduled += 1
  summary[outcome] += 1
}

function calculateStreaks(
  scheduledDates: string[],
  entriesByDate: Map<string, HabitEntryRecord>,
  habit: HabitRecord,
  today: string
): { currentStreak: number; bestStreak: number } {
  let running = 0
  let best = 0

  for (const date of scheduledDates) {
    if (date > today) break
    const entry = entriesByDate.get(date)
    if (entry?.skipped) continue
    if (entry && entry.value >= habit.targetValue) {
      running += 1
      best = Math.max(best, running)
      continue
    }
    if (date < today) running = 0
  }

  let current = 0
  for (let index = scheduledDates.length - 1; index >= 0; index -= 1) {
    const date = scheduledDates[index]
    if (date > today) continue
    const entry = entriesByDate.get(date)
    if (entry?.skipped) continue
    if (date === today && (!entry || entry.value < habit.targetValue)) continue
    if (entry && entry.value >= habit.targetValue) {
      current += 1
      continue
    }
    break
  }

  return { currentStreak: current, bestStreak: best }
}

export function listHabitsOverview(input: HabitsOverviewInput): HabitsOverview {
  const sqlite = getSqlite()
  const groups = sqlite
    .prepare(`${HABIT_GROUP_SELECT} ORDER BY position ASC, created_at ASC`)
    .all() as HabitGroupRow[]
  const habits = sqlite
    .prepare(`${HABIT_SELECT} ORDER BY updated_at DESC, created_at DESC`)
    .all() as HabitRow[]
  const entries = sqlite
    .prepare(`${HABIT_ENTRY_SELECT} WHERE date = ? ORDER BY updated_at DESC`)
    .all(input.date) as HabitEntryRow[]

  return {
    groups: groups.map(mapGroup),
    habits: habits.map(mapHabit),
    entries: entries.map(mapEntry)
  }
}

export function createHabitGroup(input: CreateHabitGroupInput): HabitGroupRecord {
  ensureUniqueGroupName(input.name)
  const id = randomUUID()
  const now = Date.now()
  const position = nextGroupPosition()

  getSqlite()
    .prepare(
      `INSERT INTO habit_groups (id, name, icon, color, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, input.name, input.icon, input.color, position, now, now)

  return requireGroup(id)
}

export function updateHabitGroup(input: UpdateHabitGroupInput): HabitGroupRecord {
  const group = requireGroup(input.id)
  ensureUniqueGroupName(input.name, input.id)
  const now = Date.now()

  getSqlite()
    .prepare(`UPDATE habit_groups SET name = ?, icon = ?, color = ?, updated_at = ? WHERE id = ?`)
    .run(input.name, input.icon, input.color, now, group.id)

  return requireGroup(group.id)
}

export function deleteHabitGroup(input: DeleteHabitGroupInput): boolean {
  requireGroup(input.id)
  const result = getSqlite().prepare('DELETE FROM habit_groups WHERE id = ?').run(input.id)
  return result.changes > 0
}

export function createHabit(input: CreateHabitInput): HabitRecord {
  ensureGroupExists(input.groupId)
  const id = randomUUID()
  const now = Date.now()

  getSqlite()
    .prepare(
      `INSERT INTO habits (
        id, title, group_id, tracking_type, target_value, unit,
        repeat_every_days, weekdays, preferred_time, reminders_enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.title,
      input.groupId,
      input.trackingType,
      input.targetValue,
      input.unit,
      input.repeatEveryDays,
      serializeWeekdays(input.weekdays),
      serializePreferredTimes(input.preferredTimes),
      input.preferredTimes.length > 0 ? 1 : 0,
      now,
      now
    )

  return requireHabit(id)
}

export function updateHabit(input: UpdateHabitInput): HabitRecord {
  const current = requireHabit(input.id)
  ensureGroupExists(input.groupId)
  const now = Date.now()

  getSqlite()
    .prepare(
      `UPDATE habits SET
        title = ?, group_id = ?, tracking_type = ?, target_value = ?, unit = ?,
        repeat_every_days = ?, weekdays = ?, preferred_time = ?, reminders_enabled = ?, updated_at = ?
       WHERE id = ?`
    )
    .run(
      input.title,
      input.groupId,
      input.trackingType,
      input.targetValue,
      input.unit,
      input.repeatEveryDays,
      serializeWeekdays(input.weekdays ?? current.weekdays),
      serializePreferredTimes(input.preferredTimes),
      input.preferredTimes.length > 0 ? 1 : 0,
      now,
      input.id
    )

  return requireHabit(input.id)
}

export function deleteHabit(input: DeleteHabitInput): boolean {
  requireHabit(input.id)
  const result = getSqlite().prepare('DELETE FROM habits WHERE id = ?').run(input.id)
  return result.changes > 0
}

export function upsertHabitEntry(input: UpsertHabitEntryInput): HabitEntryRecord {
  const habit = requireHabit(input.habitId)
  if (!isHabitScheduledOn(habit, input.date)) {
    throw new Error('На выбранную дату эта привычка не запланирована')
  }
  if (habit.trackingType === 'check' && !input.skipped && input.value !== 0 && input.value !== 1) {
    throw new Error('Для привычки с отметкой допустимы только значения 0 или 1')
  }

  const existing = findEntry(input.habitId, input.date)
  const id = existing?.id ?? randomUUID()
  const now = Date.now()
  const value = input.skipped ? 0 : input.value

  getSqlite()
    .prepare(
      `INSERT INTO habit_entries (id, habit_id, date, value, skipped, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(habit_id, date) DO UPDATE SET
         value = excluded.value,
         skipped = excluded.skipped,
         updated_at = excluded.updated_at`
    )
    .run(
      id,
      input.habitId,
      input.date,
      value,
      input.skipped ? 1 : 0,
      existing?.createdAt ?? now,
      now
    )

  const entry = findEntry(input.habitId, input.date)
  if (!entry) throw new Error('Не удалось сохранить отметку привычки')
  return entry
}

export function deleteHabitEntry(input: DeleteHabitEntryInput): boolean {
  requireHabit(input.habitId)
  const result = getSqlite()
    .prepare('DELETE FROM habit_entries WHERE habit_id = ? AND date = ?')
    .run(input.habitId, input.date)
  return result.changes > 0
}

export function getHabitsReport(input: HabitReportInput): HabitReport {
  const sqlite = getSqlite()
  const today = localDateKey()
  const allHabits = (
    sqlite.prepare(`${HABIT_SELECT} ORDER BY title COLLATE NOCASE ASC`).all() as HabitRow[]
  ).map(mapHabit)

  const habits = allHabits.filter((habit) => {
    if (input.ungroupedOnly && habit.groupId !== null) return false
    if (input.groupId !== null && habit.groupId !== input.groupId) return false
    return true
  })

  if (input.groupId !== null) requireGroup(input.groupId)

  const entries = (
    sqlite
      .prepare(`${HABIT_ENTRY_SELECT} WHERE date >= ? AND date <= ? ORDER BY date ASC`)
      .all(input.dateFrom, input.dateTo) as HabitEntryRow[]
  ).map(mapEntry)

  const habitIds = new Set(habits.map((habit) => habit.id))
  const relevantEntries = entries.filter((entry) => habitIds.has(entry.habitId))
  const entriesByHabit = new Map<string, Map<string, HabitEntryRecord>>()
  for (const entry of relevantEntries) {
    const bucket = entriesByHabit.get(entry.habitId) ?? new Map<string, HabitEntryRecord>()
    bucket.set(entry.date, entry)
    entriesByHabit.set(entry.habitId, bucket)
  }

  const dayByDate = new Map<string, HabitReportDay>()
  for (let date = input.dateFrom; date <= input.dateTo; date = addDays(date, 1)) {
    dayByDate.set(date, { date, ...emptySummary() })
  }

  const summary = emptySummary()
  const habitReports: HabitReportHabit[] = []

  for (const habit of habits) {
    const habitSummary = emptySummary()
    const entriesForHabit = entriesByHabit.get(habit.id) ?? new Map<string, HabitEntryRecord>()
    const scheduledDates: string[] = []
    let totalValue = 0

    for (let date = input.dateFrom; date <= input.dateTo; date = addDays(date, 1)) {
      if (!isHabitScheduledOn(habit, date)) continue
      scheduledDates.push(date)
      const entry = entriesForHabit.get(date)
      const outcome: 'completed' | 'missed' | 'skipped' | 'pending' = entry?.skipped
        ? 'skipped'
        : entry && entry.value >= habit.targetValue
          ? 'completed'
          : date < today
            ? 'missed'
            : 'pending'

      applyOutcome(habitSummary, outcome)
      applyOutcome(summary, outcome)
      const day = dayByDate.get(date)
      if (day) applyOutcome(day, outcome)
      if (entry && !entry.skipped) totalValue += entry.value
    }

    habitSummary.completionRate = completionRate(habitSummary)
    const streaks = calculateStreaks(scheduledDates, entriesForHabit, habit, today)
    habitReports.push({
      habitId: habit.id,
      title: habit.title,
      groupId: habit.groupId,
      trackingType: habit.trackingType,
      targetValue: habit.targetValue,
      unit: habit.unit,
      repeatEveryDays: habit.repeatEveryDays,
      weekdays: habit.weekdays,
      ...habitSummary,
      ...streaks,
      totalValue
    })
  }

  summary.completionRate = completionRate(summary)
  const days = [...dayByDate.values()].map((day) => ({
    ...day,
    completionRate: completionRate(day)
  }))

  return {
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    summary,
    days,
    habits: habitReports.sort((left, right) => {
      if (right.completionRate !== left.completionRate)
        return right.completionRate - left.completionRate
      if (right.completed !== left.completed) return right.completed - left.completed
      return left.title.localeCompare(right.title, 'ru-RU')
    })
  }
}
