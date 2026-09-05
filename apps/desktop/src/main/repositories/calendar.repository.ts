import { randomUUID } from 'node:crypto'

import type {
  CalendarAcknowledgeReminderInput,
  CalendarCreateEventInput,
  CalendarElapsedDuration,
  CalendarEventRecord,
  CalendarOccurrenceRecord,
  CalendarRangeInput,
  CalendarReminderRecord,
  CalendarUnreadReminderRecord,
  CalendarSetOccurrenceHiddenInput,
  CalendarSetOccurrenceNoteInput,
  CalendarUpdateEventInput
} from '../../shared/contracts/calendar'
import { getSqlite } from '../database/client'

interface EventRow {
  id: string
  title: string
  kind: 'one_time' | 'annual'
  event_date: string
  event_time: string | null
  start_date: string | null
  created_at: number
  updated_at: number
}

interface OccurrenceRow {
  id: string
  event_id: string
  occurrence_date: string
  note: string
  hidden: number
  created_at: number
  updated_at: number
}

interface ReminderRow {
  id: string
  event_id: string
  offset_minutes: number
  created_at: number
}

const EVENT_SELECT = `SELECT id, title, kind, event_date, event_time, start_date, created_at, updated_at FROM calendar_events`
const OCCURRENCE_SELECT = `SELECT id, event_id, occurrence_date, note, hidden, created_at, updated_at FROM calendar_event_occurrences`
const REMINDER_SELECT = `SELECT id, event_id, offset_minutes, created_at FROM calendar_event_reminders`
const DAY_MS = 86_400_000

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function parseDateKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1, 12, 0, 0, 0)
}

function addDays(value: string, amount: number): string {
  const date = parseDateKey(value)
  date.setDate(date.getDate() + amount)
  return localDateKey(date)
}

function dateTimeMs(dateKey: string, time: string | null): number {
  const [year, month, day] = dateKey.split('-').map(Number)
  const [hours, minutes] = (time ?? '09:00').split(':').map(Number)
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1, hours ?? 9, minutes ?? 0, 0, 0).getTime()
}

function mapEvent(row: EventRow, reminderOffsets: number[]): CalendarEventRecord {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    date: row.event_date,
    time: row.event_time,
    startDate: row.start_date,
    reminderOffsets,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function normalizedOffsets(values: number[] | undefined): number[] {
  return [...new Set(values ?? [])].sort((left, right) => right - left)
}

function getReminderRows(): ReminderRow[] {
  return getSqlite()
    .prepare(`${REMINDER_SELECT} ORDER BY offset_minutes DESC`)
    .all() as ReminderRow[]
}

function reminderMap(rows = getReminderRows()): Map<string, number[]> {
  const result = new Map<string, number[]>()
  for (const row of rows) {
    const offsets = result.get(row.event_id) ?? []
    offsets.push(row.offset_minutes)
    result.set(row.event_id, offsets)
  }
  return result
}

function getEventRows(): EventRow[] {
  return getSqlite()
    .prepare(`${EVENT_SELECT} ORDER BY event_date, title COLLATE NOCASE`)
    .all() as EventRow[]
}

function requireEvent(id: string): EventRow {
  const row = getSqlite().prepare(`${EVENT_SELECT} WHERE id = ?`).get(id) as EventRow | undefined
  if (!row) throw new Error('Событие календаря не найдено')
  return row
}

function isRealAnnualDate(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day, 12)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

function annualDateForYear(templateDate: string, year: number): string | null {
  const [, month, day] = templateDate.split('-').map(Number)
  if (!month || !day || !isRealAnnualDate(year, month, day)) return null
  return `${year}-${pad(month)}-${pad(day)}`
}

function occurrenceDates(row: EventRow, from: string, to: string): string[] {
  if (row.kind === 'one_time') {
    return row.event_date >= from && row.event_date <= to ? [row.event_date] : []
  }

  const fromYear = Number(from.slice(0, 4))
  const toYear = Number(to.slice(0, 4))
  const result: string[] = []
  for (let year = fromYear; year <= toYear; year += 1) {
    const date = annualDateForYear(row.event_date, year)
    if (!date || date < from || date > to) continue
    if (row.start_date && date < row.start_date) continue
    result.push(date)
  }
  return result
}

export function calculateCalendarElapsed(
  startDate: string | null,
  targetDate = localDateKey()
): CalendarElapsedDuration | null {
  if (!startDate || startDate > targetDate) return null

  const start = parseDateKey(startDate)
  const target = parseDateKey(targetDate)
  let years = target.getFullYear() - start.getFullYear()
  let anchor = new Date(start)
  anchor.setFullYear(start.getFullYear() + years)
  if (anchor > target) {
    years -= 1
    anchor = new Date(start)
    anchor.setFullYear(start.getFullYear() + years)
  }

  let months = 0
  while (months < 11) {
    const next = new Date(anchor)
    next.setMonth(next.getMonth() + 1)
    if (next > target) break
    anchor = next
    months += 1
  }

  const days = Math.max(0, Math.floor((target.getTime() - anchor.getTime()) / DAY_MS))
  return { years, months, days }
}

function upsertOccurrence(
  eventId: string,
  occurrenceDate: string,
  note: string,
  hidden: boolean
): void {
  const now = Date.now()
  const existing = getSqlite()
    .prepare(`${OCCURRENCE_SELECT} WHERE event_id = ? AND occurrence_date = ?`)
    .get(eventId, occurrenceDate) as OccurrenceRow | undefined

  if (existing) {
    getSqlite()
      .prepare(
        'UPDATE calendar_event_occurrences SET note = ?, hidden = ?, updated_at = ? WHERE id = ?'
      )
      .run(note, hidden ? 1 : 0, now, existing.id)
    return
  }

  getSqlite()
    .prepare(
      'INSERT INTO calendar_event_occurrences (id, event_id, occurrence_date, note, hidden, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(randomUUID(), eventId, occurrenceDate, note, hidden ? 1 : 0, now, now)
}

function replaceReminders(eventId: string, offsets: number[]): void {
  const sqlite = getSqlite()
  sqlite.prepare('DELETE FROM calendar_event_reminders WHERE event_id = ?').run(eventId)
  const insert = sqlite.prepare(
    'INSERT INTO calendar_event_reminders (id, event_id, offset_minutes, created_at) VALUES (?, ?, ?, ?)'
  )
  const now = Date.now()
  for (const offset of normalizedOffsets(offsets)) insert.run(randomUUID(), eventId, offset, now)
}

export function listCalendarOccurrences(input: CalendarRangeInput): CalendarOccurrenceRecord[] {
  const events = getEventRows()
  const reminders = reminderMap()
  const overrides = getSqlite().prepare(OCCURRENCE_SELECT).all() as OccurrenceRow[]
  const overrideMap = new Map(
    overrides.map((row) => [`${row.event_id}:${row.occurrence_date}`, row])
  )
  const today = localDateKey()
  const result: CalendarOccurrenceRecord[] = []

  for (const event of events) {
    for (const occurrenceDate of occurrenceDates(event, input.from, input.to)) {
      const override = overrideMap.get(`${event.id}:${occurrenceDate}`)
      if (override?.hidden === 1) continue
      result.push({
        eventId: event.id,
        title: event.title,
        kind: event.kind,
        occurrenceDate,
        time: event.event_time,
        startDate: event.start_date,
        note: override?.note ?? '',
        hidden: false,
        reminderOffsets: reminders.get(event.id) ?? [],
        elapsed: calculateCalendarElapsed(event.start_date, today)
      })
    }
  }

  return result.sort((left, right) => {
    const dateOrder = left.occurrenceDate.localeCompare(right.occurrenceDate)
    if (dateOrder !== 0) return dateOrder
    const leftTime = left.time ?? '99:99'
    const rightTime = right.time ?? '99:99'
    return leftTime.localeCompare(rightTime) || left.title.localeCompare(right.title, 'ru')
  })
}

export function createCalendarEvent(input: CalendarCreateEventInput): CalendarEventRecord {
  const id = randomUUID()
  const now = Date.now()
  const offsets = normalizedOffsets(input.reminderOffsets)
  const sqlite = getSqlite()
  const transaction = sqlite.transaction(() => {
    sqlite
      .prepare(
        'INSERT INTO calendar_events (id, title, kind, event_date, event_time, start_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        id,
        input.title.trim(),
        input.kind,
        input.date,
        input.time ?? null,
        input.kind === 'annual' ? (input.startDate ?? null) : null,
        now,
        now
      )
    replaceReminders(id, offsets)
    if ((input.note ?? '').trim()) upsertOccurrence(id, input.date, input.note ?? '', false)
  })
  transaction()
  return mapEvent(requireEvent(id), offsets)
}

export function updateCalendarEvent(input: CalendarUpdateEventInput): CalendarEventRecord {
  requireEvent(input.id)
  const now = Date.now()
  const offsets = normalizedOffsets(input.reminderOffsets)
  const transaction = getSqlite().transaction(() => {
    getSqlite()
      .prepare(
        'UPDATE calendar_events SET title = ?, kind = ?, event_date = ?, event_time = ?, start_date = ?, updated_at = ? WHERE id = ?'
      )
      .run(
        input.title.trim(),
        input.kind,
        input.date,
        input.time ?? null,
        input.kind === 'annual' ? (input.startDate ?? null) : null,
        now,
        input.id
      )
    replaceReminders(input.id, offsets)
    upsertOccurrence(input.id, input.occurrenceDate, input.note ?? '', false)
  })
  transaction()
  return mapEvent(requireEvent(input.id), offsets)
}

export function deleteCalendarEvent(id: string): boolean {
  return getSqlite().prepare('DELETE FROM calendar_events WHERE id = ?').run(id).changes > 0
}

function findResolvedOccurrence(
  eventId: string,
  occurrenceDate: string
): CalendarOccurrenceRecord | null {
  return (
    listCalendarOccurrences({ from: occurrenceDate, to: occurrenceDate }).find(
      (item) => item.eventId === eventId
    ) ?? null
  )
}

export function setCalendarOccurrenceNote(
  input: CalendarSetOccurrenceNoteInput
): CalendarOccurrenceRecord | null {
  requireEvent(input.eventId)
  const current = getSqlite()
    .prepare(`${OCCURRENCE_SELECT} WHERE event_id = ? AND occurrence_date = ?`)
    .get(input.eventId, input.occurrenceDate) as OccurrenceRow | undefined
  upsertOccurrence(input.eventId, input.occurrenceDate, input.note, current?.hidden === 1)
  return findResolvedOccurrence(input.eventId, input.occurrenceDate)
}

export function setCalendarOccurrenceHidden(
  input: CalendarSetOccurrenceHiddenInput
): CalendarOccurrenceRecord | null {
  const event = requireEvent(input.eventId)
  if (event.kind !== 'annual') {
    if (input.hidden) deleteCalendarEvent(input.eventId)
    return null
  }
  const current = getSqlite()
    .prepare(`${OCCURRENCE_SELECT} WHERE event_id = ? AND occurrence_date = ?`)
    .get(input.eventId, input.occurrenceDate) as OccurrenceRow | undefined
  upsertOccurrence(input.eventId, input.occurrenceDate, current?.note ?? '', input.hidden)
  return input.hidden ? null : findResolvedOccurrence(input.eventId, input.occurrenceDate)
}

export function listCalendarReminderTriggers(input: CalendarRangeInput): CalendarReminderRecord[] {
  const reminderRows = getReminderRows()
  if (reminderRows.length === 0) return []
  const maxOffset = Math.max(...reminderRows.map((row) => row.offset_minutes))
  const extraDays = Math.ceil(maxOffset / 1440) + 1
  const occurrenceFrom = input.from
  const occurrenceTo = addDays(input.to, extraDays)
  const occurrences = listCalendarOccurrences({ from: occurrenceFrom, to: occurrenceTo })
  const remindersByEvent = new Map<string, ReminderRow[]>()
  for (const reminder of reminderRows) {
    const rows = remindersByEvent.get(reminder.event_id) ?? []
    rows.push(reminder)
    remindersByEvent.set(reminder.event_id, rows)
  }
  const fromMs = dateTimeMs(input.from, '00:00')
  const toMs = dateTimeMs(input.to, '23:59') + 59_999
  const result: CalendarReminderRecord[] = []
  for (const occurrence of occurrences) {
    const eventAt = dateTimeMs(occurrence.occurrenceDate, occurrence.time)
    for (const reminder of remindersByEvent.get(occurrence.eventId) ?? []) {
      const triggerAt = eventAt - reminder.offset_minutes * 60_000
      if (triggerAt < fromMs || triggerAt > toMs) continue
      result.push({
        reminderId: reminder.id,
        eventId: occurrence.eventId,
        title: occurrence.title,
        occurrenceDate: occurrence.occurrenceDate,
        eventTime: occurrence.time,
        offsetMinutes: reminder.offset_minutes,
        triggerAt
      })
    }
  }
  return result.sort((left, right) => left.triggerAt - right.triggerAt)
}

export function listDueCalendarReminders(sinceMs: number, nowMs: number): CalendarReminderRecord[] {
  const sinceDate = localDateKey(new Date(sinceMs))
  const nowDate = localDateKey(new Date(nowMs))
  return listCalendarReminderTriggers({ from: sinceDate, to: nowDate }).filter(
    (item) => item.triggerAt >= sinceMs && item.triggerAt <= nowMs
  )
}

export function markCalendarReminderDelivered(reminder: CalendarReminderRecord): boolean {
  try {
    getSqlite()
      .prepare(
        'INSERT INTO calendar_reminder_deliveries (id, reminder_id, event_id, occurrence_date, title, event_time, offset_minutes, delivered_at, acknowledged_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)'
      )
      .run(
        randomUUID(),
        reminder.reminderId,
        reminder.eventId,
        reminder.occurrenceDate,
        reminder.title,
        reminder.eventTime,
        reminder.offsetMinutes,
        Date.now()
      )
    return true
  } catch (reason: unknown) {
    if (reason instanceof Error && /UNIQUE constraint failed/.test(reason.message)) return false
    throw reason
  }
}

interface UnreadReminderRow {
  id: string
  reminder_id: string
  event_id: string
  occurrence_date: string
  title: string
  event_time: string | null
  offset_minutes: number
  delivered_at: number
}

export function listUnreadCalendarReminders(): CalendarUnreadReminderRecord[] {
  const rows = getSqlite()
    .prepare(
      `SELECT id, reminder_id, event_id, occurrence_date, title, event_time, offset_minutes, delivered_at
       FROM calendar_reminder_deliveries
       WHERE acknowledged_at IS NULL
       ORDER BY delivered_at DESC, occurrence_date DESC`
    )
    .all() as UnreadReminderRow[]

  return rows.map((row) => ({
    deliveryId: row.id,
    reminderId: row.reminder_id,
    eventId: row.event_id,
    title: row.title,
    occurrenceDate: row.occurrence_date,
    eventTime: row.event_time,
    offsetMinutes: row.offset_minutes,
    triggerAt: dateTimeMs(row.occurrence_date, row.event_time) - row.offset_minutes * 60_000,
    deliveredAt: row.delivered_at
  }))
}

export function acknowledgeCalendarReminder(input: CalendarAcknowledgeReminderInput): boolean {
  return (
    getSqlite()
      .prepare(
        'UPDATE calendar_reminder_deliveries SET acknowledged_at = ? WHERE id = ? AND acknowledged_at IS NULL'
      )
      .run(Date.now(), input.deliveryId).changes > 0
  )
}
