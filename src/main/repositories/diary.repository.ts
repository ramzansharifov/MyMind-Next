import { randomUUID } from 'node:crypto'

import {
  DIARY_MOODS,
  DIARY_MOOD_SCORES,
  type CreateDiaryEntryInput,
  type CreateDiaryInput,
  type DeleteDiaryEntryInput,
  type DeleteDiaryInput,
  type DiaryDay,
  type DiaryDaySummary,
  type DiaryEntry,
  type DiaryMood,
  type DiaryOverview,
  type DiaryReport,
  type DiarySummary,
  type GetDiaryDayInput,
  type GetDiaryReportInput,
  type ListDiaryDaysInput,
  type SetDiaryMoodInput,
  type UpdateDiaryEntryInput,
  type UpdateDiaryInput
} from '../../shared/contracts/diary'
import { getSqlite } from '../database/client'

interface DiaryRow {
  id: string
  title: string
  icon: DiarySummary['icon']
  created_at: number
  updated_at: number
}

interface DiarySummaryRow extends DiaryRow {
  page_count: number
  entry_count: number
  last_activity_at: number
}

interface DiaryDayRow {
  id: string
  diary_id: string
  day_key: string
  mood: DiaryMood | null
  created_at: number
  updated_at: number
  entry_count: number
}

interface DiaryEntryRow {
  id: string
  diary_day_id: string
  text: string
  occurred_at: number
  created_at: number
  updated_at: number
}

const DEFAULT_DIARY_ID = 'diary-default'

function mapEntry(row: DiaryEntryRow): DiaryEntry {
  return {
    id: row.id,
    diaryDayId: row.diary_day_id,
    text: row.text,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapDay(row: DiaryDayRow): DiaryDaySummary {
  return {
    id: row.id,
    diaryId: row.diary_id,
    dayKey: row.day_key,
    mood: row.mood,
    entryCount: row.entry_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapDiary(row: DiarySummaryRow): DiarySummary {
  return {
    id: row.id,
    title: row.title,
    icon: row.icon,
    pageCount: row.page_count,
    entryCount: row.entry_count,
    lastActivityAt: row.last_activity_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function ensureDefaultDiary(): void {
  const row = getSqlite().prepare('SELECT COUNT(*) AS count FROM diaries').get() as {
    count: number
  }
  if (row.count > 0) return

  const now = Date.now()
  getSqlite()
    .prepare(
      'INSERT INTO diaries (id, title, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    )
    .run(DEFAULT_DIARY_ID, 'Личный дневник', 'book-heart', now, now)
}

function requireDiary(id: string): DiaryRow {
  ensureDefaultDiary()
  const row = getSqlite()
    .prepare('SELECT id, title, icon, created_at, updated_at FROM diaries WHERE id = ?')
    .get(id) as DiaryRow | undefined
  if (!row) throw new Error('Дневник не найден')
  return row
}

function getDiarySummary(id: string): DiarySummary {
  const row = getSqlite()
    .prepare(
      `SELECT
        d.id,
        d.title,
        d.icon,
        d.created_at,
        d.updated_at,
        COUNT(DISTINCT dy.id) AS page_count,
        COUNT(e.id) AS entry_count,
        d.updated_at AS last_activity_at
       FROM diaries d
       LEFT JOIN diary_days dy ON dy.diary_id = d.id
       LEFT JOIN diary_entries e ON e.diary_day_id = dy.id
       WHERE d.id = ?
       GROUP BY d.id`
    )
    .get(id) as DiarySummaryRow | undefined
  if (!row) throw new Error('Дневник не найден')
  return mapDiary(row)
}

function touchDiary(diaryId: string, at = Date.now()): void {
  getSqlite().prepare('UPDATE diaries SET updated_at = ? WHERE id = ?').run(at, diaryId)
}

function getDayRow(diaryId: string, dayKey: string): DiaryDayRow | undefined {
  return getSqlite()
    .prepare(
      `SELECT
        dy.id,
        dy.diary_id,
        dy.day_key,
        dy.mood,
        dy.created_at,
        dy.updated_at,
        COUNT(e.id) AS entry_count
       FROM diary_days dy
       LEFT JOIN diary_entries e ON e.diary_day_id = dy.id
       WHERE dy.diary_id = ? AND dy.day_key = ?
       GROUP BY dy.id`
    )
    .get(diaryId, dayKey) as DiaryDayRow | undefined
}

function getOrCreateDay(diaryId: string, dayKey: string): DiaryDayRow {
  requireDiary(diaryId)
  const existing = getDayRow(diaryId, dayKey)
  if (existing) return existing

  const id = randomUUID()
  const now = Date.now()
  getSqlite()
    .prepare(
      'INSERT INTO diary_days (id, diary_id, day_key, mood, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, ?)'
    )
    .run(id, diaryId, dayKey, now, now)
  return getDayRow(diaryId, dayKey)!
}

function pruneDayIfEmpty(dayId: string): void {
  const row = getSqlite()
    .prepare(
      `SELECT dy.diary_id, dy.mood, COUNT(e.id) AS entry_count
       FROM diary_days dy
       LEFT JOIN diary_entries e ON e.diary_day_id = dy.id
       WHERE dy.id = ?
       GROUP BY dy.id`
    )
    .get(dayId) as
    | { diary_id: string; mood: DiaryMood | null; entry_count: number }
    | undefined

  if (!row || row.mood !== null || row.entry_count > 0) return
  getSqlite().prepare('DELETE FROM diary_days WHERE id = ?').run(dayId)
  touchDiary(row.diary_id)
}

export function listDiaryOverview(): DiaryOverview {
  ensureDefaultDiary()
  const rows = getSqlite()
    .prepare(
      `SELECT
        d.id,
        d.title,
        d.icon,
        d.created_at,
        d.updated_at,
        COUNT(DISTINCT dy.id) AS page_count,
        COUNT(e.id) AS entry_count,
        d.updated_at AS last_activity_at
       FROM diaries d
       LEFT JOIN diary_days dy ON dy.diary_id = d.id
       LEFT JOIN diary_entries e ON e.diary_day_id = dy.id
       GROUP BY d.id
       ORDER BY d.updated_at DESC, d.created_at ASC`
    )
    .all() as DiarySummaryRow[]
  return { diaries: rows.map(mapDiary) }
}

export function createDiary(input: CreateDiaryInput): DiarySummary {
  const id = randomUUID()
  const now = Date.now()
  getSqlite()
    .prepare(
      'INSERT INTO diaries (id, title, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    )
    .run(id, input.title, input.icon, now, now)
  return getDiarySummary(id)
}

export function updateDiary(input: UpdateDiaryInput): DiarySummary {
  requireDiary(input.id)
  const now = Date.now()
  getSqlite()
    .prepare('UPDATE diaries SET title = ?, icon = ?, updated_at = ? WHERE id = ?')
    .run(input.title, input.icon, now, input.id)
  return getDiarySummary(input.id)
}

export function deleteDiary(input: DeleteDiaryInput): boolean {
  requireDiary(input.id)
  const countRow = getSqlite().prepare('SELECT COUNT(*) AS count FROM diaries').get() as {
    count: number
  }
  if (countRow.count <= 1) throw new Error('Нельзя удалить последний дневник')
  const result = getSqlite().prepare('DELETE FROM diaries WHERE id = ?').run(input.id)
  return result.changes > 0
}

export function getDiaryDay(input: GetDiaryDayInput): DiaryDay | null {
  requireDiary(input.diaryId)
  const row = getDayRow(input.diaryId, input.dayKey)
  if (!row) return null

  const entries = getSqlite()
    .prepare(
      `SELECT id, diary_day_id, text, occurred_at, created_at, updated_at
       FROM diary_entries
       WHERE diary_day_id = ?
       ORDER BY occurred_at ASC, created_at ASC`
    )
    .all(row.id) as DiaryEntryRow[]

  return { ...mapDay(row), entries: entries.map(mapEntry) }
}

export function listDiaryDays(input: ListDiaryDaysInput): DiaryDaySummary[] {
  requireDiary(input.diaryId)
  const clauses = ['dy.diary_id = ?']
  const params: unknown[] = [input.diaryId]

  if (input.fromDay) {
    clauses.push('dy.day_key >= ?')
    params.push(input.fromDay)
  }
  if (input.toDay) {
    clauses.push('dy.day_key <= ?')
    params.push(input.toDay)
  }

  const rows = getSqlite()
    .prepare(
      `SELECT
        dy.id,
        dy.diary_id,
        dy.day_key,
        dy.mood,
        dy.created_at,
        dy.updated_at,
        COUNT(e.id) AS entry_count
       FROM diary_days dy
       LEFT JOIN diary_entries e ON e.diary_day_id = dy.id
       WHERE ${clauses.join(' AND ')}
       GROUP BY dy.id
       ORDER BY dy.day_key DESC`
    )
    .all(...params) as DiaryDayRow[]

  return rows.map(mapDay)
}

export function setDiaryMood(input: SetDiaryMoodInput): DiaryDay | null {
  const sqlite = getSqlite()
  return sqlite.transaction(() => {
    const day =
      input.mood === null
        ? getDayRow(input.diaryId, input.dayKey)
        : getOrCreateDay(input.diaryId, input.dayKey)
    if (!day) return null

    const now = Date.now()
    sqlite
      .prepare('UPDATE diary_days SET mood = ?, updated_at = ? WHERE id = ?')
      .run(input.mood, now, day.id)
    touchDiary(input.diaryId, now)
    pruneDayIfEmpty(day.id)
    return getDiaryDay(input)
  })()
}

export function createDiaryEntry(input: CreateDiaryEntryInput): DiaryEntry {
  const sqlite = getSqlite()
  return sqlite.transaction(() => {
    const day = getOrCreateDay(input.diaryId, input.dayKey)
    const id = randomUUID()
    const now = Date.now()

    sqlite
      .prepare(
        `INSERT INTO diary_entries
          (id, diary_day_id, text, occurred_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(id, day.id, input.text, now, now, now)
    sqlite.prepare('UPDATE diary_days SET updated_at = ? WHERE id = ?').run(now, day.id)
    touchDiary(input.diaryId, now)

    const row = sqlite
      .prepare(
        'SELECT id, diary_day_id, text, occurred_at, created_at, updated_at FROM diary_entries WHERE id = ?'
      )
      .get(id) as DiaryEntryRow
    return mapEntry(row)
  })()
}

export function updateDiaryEntry(input: UpdateDiaryEntryInput): DiaryEntry {
  const sqlite = getSqlite()
  return sqlite.transaction(() => {
    const existing = sqlite
      .prepare(
        `SELECT e.id, e.diary_day_id, e.text, e.occurred_at, e.created_at, e.updated_at, dy.diary_id
         FROM diary_entries e
         JOIN diary_days dy ON dy.id = e.diary_day_id
         WHERE e.id = ?`
      )
      .get(input.id) as (DiaryEntryRow & { diary_id: string }) | undefined
    if (!existing) throw new Error('Запись не найдена')

    const now = Date.now()
    sqlite
      .prepare('UPDATE diary_entries SET text = ?, updated_at = ? WHERE id = ?')
      .run(input.text, now, input.id)
    sqlite
      .prepare('UPDATE diary_days SET updated_at = ? WHERE id = ?')
      .run(now, existing.diary_day_id)
    touchDiary(existing.diary_id, now)

    const row = sqlite
      .prepare(
        'SELECT id, diary_day_id, text, occurred_at, created_at, updated_at FROM diary_entries WHERE id = ?'
      )
      .get(input.id) as DiaryEntryRow
    return mapEntry(row)
  })()
}

export function deleteDiaryEntry(input: DeleteDiaryEntryInput): boolean {
  const sqlite = getSqlite()
  return sqlite.transaction(() => {
    const existing = sqlite
      .prepare(
        `SELECT e.diary_day_id, dy.diary_id
         FROM diary_entries e
         JOIN diary_days dy ON dy.id = e.diary_day_id
         WHERE e.id = ?`
      )
      .get(input.id) as { diary_day_id: string; diary_id: string } | undefined
    if (!existing) return false

    const result = sqlite.prepare('DELETE FROM diary_entries WHERE id = ?').run(input.id)
    const now = Date.now()
    sqlite
      .prepare('UPDATE diary_days SET updated_at = ? WHERE id = ?')
      .run(now, existing.diary_day_id)
    touchDiary(existing.diary_id, now)
    pruneDayIfEmpty(existing.diary_day_id)
    return result.changes > 0
  })()
}

export function getDiaryReport(input: GetDiaryReportInput): DiaryReport {
  const days = listDiaryDays(input).slice().reverse()
  const activeDays = days.filter((day) => day.entryCount > 0).length
  const entryCount = days.reduce((sum, day) => sum + day.entryCount, 0)
  const moodDays = days.filter((day) => day.mood !== null).length
  const moodCounts = new Map<DiaryMood, number>(DIARY_MOODS.map((mood) => [mood, 0]))
  let moodScoreTotal = 0

  for (const day of days) {
    if (!day.mood) continue
    moodCounts.set(day.mood, (moodCounts.get(day.mood) ?? 0) + 1)
    moodScoreTotal += DIARY_MOOD_SCORES[day.mood]
  }

  return {
    diaryId: input.diaryId,
    fromDay: input.fromDay ?? null,
    toDay: input.toDay ?? null,
    pageCount: days.length,
    activeDays,
    entryCount,
    moodDays,
    averageEntriesPerActiveDay: activeDays > 0 ? entryCount / activeDays : 0,
    averageMoodScore: moodDays > 0 ? moodScoreTotal / moodDays : null,
    moodBreakdown: DIARY_MOODS.map((mood) => ({
      mood,
      count: moodCounts.get(mood) ?? 0,
      sharePercent: moodDays > 0 ? ((moodCounts.get(mood) ?? 0) / moodDays) * 100 : 0
    })),
    timeline: days.map((day) => ({
      dayKey: day.dayKey,
      mood: day.mood,
      moodScore: day.mood ? DIARY_MOOD_SCORES[day.mood] : null,
      entryCount: day.entryCount
    }))
  }
}
