import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, getSqlite, initializeDatabaseForTesting } from '../database/client'
import { runDatabaseMigrationsFrom } from '../database/migrate'
import {
  createDiary,
  createDiaryEntry,
  deleteDiary,
  deleteDiaryEntry,
  getDiaryDay,
  getDiaryReport,
  listDiaryDays,
  listDiaryOverview,
  setDiaryMood,
  updateDiaryAppearance
} from './diary.repository'

let root = ''

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'mymind-diary-'))
  initializeDatabaseForTesting(join(root, 'diary.sqlite'))
  runDatabaseMigrationsFrom(resolve(process.cwd(), 'drizzle'))
})

beforeEach(() => {
  getSqlite().exec(`
    DELETE FROM diary_entries;
    DELETE FROM diary_days;
    DELETE FROM diaries;
  `)
})

afterAll(async () => {
  closeDatabase()
  await rm(root, { recursive: true, force: true })
})

describe('diary repository', () => {
  it('always restores one default diary and prevents deleting the last diary', () => {
    const overview = listDiaryOverview()
    expect(overview.diaries).toHaveLength(1)
    expect(overview.diaries[0]).toMatchObject({
      id: 'diary-default',
      title: 'Личный дневник',
      icon: 'book-heart',
      paperPattern: 'ruled',
      paperTone: 'natural',
      coverTone: 'walnut',
      pageCount: 0,
      entryCount: 0
    })

    expect(() => deleteDiary({ id: overview.diaries[0].id })).toThrow('последний дневник')

    const second = createDiary({ title: 'Работа', icon: 'briefcase' })
    expect(listDiaryOverview().diaries).toHaveLength(2)
    expect(deleteDiary({ id: second.id })).toBe(true)
    expect(listDiaryOverview().diaries).toHaveLength(1)
  })

  it('persists paper appearance per diary', () => {
    const diary = listDiaryOverview().diaries[0]
    const updated = updateDiaryAppearance({
      id: diary.id,
      paperPattern: 'grid',
      paperTone: 'white',
      coverTone: 'burgundy'
    })

    expect(updated).toMatchObject({
      paperPattern: 'grid',
      paperTone: 'white',
      coverTone: 'burgundy'
    })
    expect(listDiaryOverview().diaries[0]).toMatchObject({
      paperPattern: 'grid',
      paperTone: 'white',
      coverTone: 'burgundy'
    })
  })

  it('keeps exactly one page per diary and local day with multiple entries', () => {
    const diary = listDiaryOverview().diaries[0]
    const first = createDiaryEntry({
      diaryId: diary.id,
      dayKey: '2026-08-08',
      text: 'Первая мысль'
    })
    const second = createDiaryEntry({
      diaryId: diary.id,
      dayKey: '2026-08-08',
      text: 'Вторая мысль'
    })

    const days = listDiaryDays({ diaryId: diary.id })
    expect(days).toHaveLength(1)
    expect(days[0]).toMatchObject({ dayKey: '2026-08-08', entryCount: 2 })

    const page = getDiaryDay({ diaryId: diary.id, dayKey: '2026-08-08' })
    expect(page?.entries.map((entry) => entry.id)).toEqual([first.id, second.id])
    expect(listDiaryOverview().diaries[0]).toMatchObject({ pageCount: 1, entryCount: 2 })
  })

  it('keeps a mood-only page and prunes a completely empty day', () => {
    const diary = listDiaryOverview().diaries[0]
    const entry = createDiaryEntry({
      diaryId: diary.id,
      dayKey: '2026-08-08',
      text: 'День начался'
    })
    setDiaryMood({ diaryId: diary.id, dayKey: '2026-08-08', mood: 'good' })

    expect(deleteDiaryEntry({ id: entry.id })).toBe(true)
    expect(getDiaryDay({ diaryId: diary.id, dayKey: '2026-08-08' })).toMatchObject({
      mood: 'good',
      entryCount: 0
    })

    expect(setDiaryMood({ diaryId: diary.id, dayKey: '2026-08-08', mood: null })).toBeNull()
    expect(getDiaryDay({ diaryId: diary.id, dayKey: '2026-08-08' })).toBeNull()
    expect(listDiaryOverview().diaries[0].pageCount).toBe(0)
  })

  it('builds diary-scoped reports from pages, entries and one mood per day', () => {
    const diary = listDiaryOverview().diaries[0]
    createDiaryEntry({ diaryId: diary.id, dayKey: '2026-08-01', text: 'Один' })
    createDiaryEntry({ diaryId: diary.id, dayKey: '2026-08-01', text: 'Два' })
    setDiaryMood({ diaryId: diary.id, dayKey: '2026-08-01', mood: 'excellent' })
    setDiaryMood({ diaryId: diary.id, dayKey: '2026-08-02', mood: 'neutral' })

    const report = getDiaryReport({
      diaryId: diary.id,
      fromDay: '2026-08-01',
      toDay: '2026-08-31'
    })

    expect(report).toMatchObject({
      pageCount: 2,
      activeDays: 1,
      entryCount: 2,
      moodDays: 2,
      averageEntriesPerActiveDay: 2,
      averageMoodScore: 4
    })
    expect(report.timeline).toEqual([
      expect.objectContaining({ dayKey: '2026-08-01', moodScore: 5, entryCount: 2 }),
      expect.objectContaining({ dayKey: '2026-08-02', moodScore: 3, entryCount: 0 })
    ])
  })
})
