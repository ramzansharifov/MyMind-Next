import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { mobileSchemaV1 } from './mobile-schema'
import { createTasksRepository } from './tasks'
import { createHabitsRepository } from './habits'
import { createDiaryRepository } from './diary'
import { createMoviesRepository } from './movies'
import { createMusicRepository } from './music'
import { createCalendarRepository } from './calendar'
import { createTaskInputSchema } from '@mymind/core/validation/tasks'
import { createHabitInputSchema } from '@mymind/core/validation/habits'
import { createMovieInputSchema } from '@mymind/core/validation/movies'
import { createMusicItemInputSchema } from '@mymind/core/validation/music'
import { localDateKey } from '@mymind/core/habits'

function initialize(db: Database.Database): void {
  db.pragma('foreign_keys = ON')
  db.transaction(() => {
    for (const sql of mobileSchemaV1) db.exec(sql)
  })()
}
const taskInput = {
  title: 'Дело',
  description: '',
  groupId: null,
  status: 'active',
  priority: 'normal',
  dueDate: null,
  dueTime: null
} as const

describe('mobile schema and shared repositories', () => {
  it('has the same columns, indexes and foreign keys as fully migrated desktop', () => {
    const desktop = new Database(':memory:')
    const mobile = new Database(':memory:')
    try {
      const root = 'apps/desktop/drizzle'
      const journal = JSON.parse(readFileSync(`${root}/meta/_journal.json`, 'utf8')) as {
        entries: { tag: string }[]
      }
      for (const entry of journal.entries)
        desktop.exec(readFileSync(`${root}/${entry.tag}.sql`, 'utf8'))
      initialize(mobile)
      const tables = mobile
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all() as { name: string }[]
      expect(tables.length).toBe(17)
      for (const { name } of tables) {
        for (const pragma of ['table_info', 'foreign_key_list']) {
          expect(mobile.pragma(`${pragma}('${name}')`), `${name}: ${pragma}`).toEqual(
            desktop.pragma(`${pragma}('${name}')`)
          )
        }
        const indexes = (db: Database.Database): unknown[] =>
          (
            db.pragma(`index_list('${name}')`) as {
              name: string
              unique: number
              partial: number
              origin: string
            }[]
          )
            .map((index) => ({
              name: index.name,
              unique: index.unique,
              partial: index.partial,
              origin: index.origin,
              columns: db.pragma(`index_info('${index.name}')`)
            }))
            .sort((a, b) => a.name.localeCompare(b.name))
        expect(indexes(mobile)).toEqual(indexes(desktop))
      }
    } finally {
      desktop.close()
      mobile.close()
    }
  })

  it('persists edits across reopen, keeps task completion time, and detaches deleted groups', () => {
    const directory = mkdtempSync(join(tmpdir(), 'mymind-mobile-'))
    const file = join(directory, 'test.sqlite')
    let db = new Database(file)
    let now = 1000
    try {
      initialize(db)
      const api = createTasksRepository({
        database: () => db,
        createId: randomUUID,
        now: () => now
      })
      const group = api.createTaskGroup({ name: 'Работа', icon: 'folder', color: 'accent' })
      const task = api.createTask(createTaskInputSchema.parse({ ...taskInput, groupId: group.id }))
      now = 2000
      api.updateTask({ ...taskInput, id: task.id, groupId: group.id, status: 'completed' })
      now = 3000
      api.updateTask({
        ...taskInput,
        title: 'Готово',
        id: task.id,
        groupId: group.id,
        status: 'completed'
      })
      api.deleteTaskGroup({ id: group.id })
      db.close()
      db = new Database(file)
      db.pragma('foreign_keys = ON')
      expect(api.listTasksOverview().tasks[0]).toMatchObject({
        id: task.id,
        title: 'Готово',
        status: 'completed',
        completedAt: 2000,
        groupId: null
      })
      expect(() => api.createTask({ ...taskInput, groupId: 'missing' })).toThrow()
      api.deleteTask({ id: task.id })
      expect(api.listTasksOverview().tasks).toEqual([])
    } finally {
      db.close()
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('keeps habit skip/report semantics and cascades entries on deletion', () => {
    const db = new Database(':memory:')
    try {
      initialize(db)
      const api = createHabitsRepository({
        database: () => db,
        createId: randomUUID,
        now: () => new Date(2026, 8, 1).getTime()
      })
      const habit = api.createHabit(
        createHabitInputSchema.parse({
          title: 'Чтение',
          groupId: null,
          trackingType: 'count',
          targetValue: 2,
          unit: 'главы',
          repeatEveryDays: 1,
          weekdays: [],
          preferredTimes: []
        })
      )
      api.upsertHabitEntry({ habitId: habit.id, date: '2026-09-01', value: 2, skipped: false })
      api.upsertHabitEntry({ habitId: habit.id, date: '2026-09-02', value: 0, skipped: true })
      api.upsertHabitEntry({ habitId: habit.id, date: '2026-09-03', value: 2, skipped: false })
      const report = api.getHabitsReport({
        dateFrom: '2026-09-01',
        dateTo: '2026-09-03',
        groupId: null,
        ungroupedOnly: false
      })
      expect(report.summary).toMatchObject({ completed: 2, skipped: 1, completionRate: 100 })
      expect(report.habits[0].bestStreak).toBe(2)
      api.deleteHabit({ id: habit.id })
      expect(db.prepare('SELECT COUNT(*) AS count FROM habit_entries').get()).toEqual({ count: 0 })
    } finally {
      db.close()
    }
  })

  it('preserves diary day pruning and the last-diary restriction', () => {
    const db = new Database(':memory:')
    try {
      initialize(db)
      const api = createDiaryRepository({ database: () => db, createId: randomUUID, now: Date.now })
      const diary = api.listDiaryOverview().diaries[0]
      expect(() => api.deleteDiary({ id: diary.id })).toThrow()
      const input = { diaryId: diary.id, dayKey: localDateKey() }
      const entry = api.createDiaryEntry({ ...input, text: 'Мои мысли' })
      api.updateDiaryEntry({ id: entry.id, text: 'Новые мысли' })
      expect(api.getDiaryDay(input)?.entries[0].text).toBe('Новые мысли')
      api.deleteDiaryEntry({ id: entry.id })
      expect(api.getDiaryDay(input)).toBeNull()
    } finally {
      db.close()
    }
  })

  it('stores complete catalog metadata and removes playlist membership, not tracks', () => {
    const db = new Database(':memory:')
    try {
      initialize(db)
      const runtime = { database: () => db, createId: randomUUID, now: Date.now }
      const movies = createMoviesRepository(runtime)
      const movie = movies.createMovie(
        createMovieInputSchema.parse({
          title: 'Фильм',
          originalTitle: null,
          type: 'movie',
          year: 2020,
          posterUrl: null,
          director: 'Автор',
          runtimeMinutes: 90,
          genres: ['Драма'],
          actors: ['Актёр'],
          description: 'Описание',
          status: 'watched',
          favorite: true,
          rating: 8,
          comments: 'Заметка'
        })
      )
      expect(movies.getMovie({ id: movie.id })).toMatchObject({
        actors: ['Актёр'],
        rating: 8,
        comments: 'Заметка'
      })
      const music = createMusicRepository(runtime)
      const track = music.createMusicItem(
        createMusicItemInputSchema.parse({
          title: 'Трек',
          type: 'track',
          year: null,
          coverUrl: null,
          artists: ['Артист'],
          album: '',
          durationSeconds: 180,
          trackCount: null,
          genres: [],
          description: '',
          status: 'listened',
          favorite: false,
          rating: 9,
          comments: ''
        })
      )
      const playlist = music.createMusicPlaylist({ name: 'Плейлист' })
      music.setMusicItemPlaylists({ itemId: track.id, playlistIds: [playlist.id] })
      expect(music.listMusicOverview().playlists[0].trackIds).toEqual([track.id])
      music.deleteMusicPlaylist({ id: playlist.id })
      expect(music.getMusicItem({ id: track.id })).toMatchObject({ title: 'Трек' })
    } finally {
      db.close()
    }
  })

  it('keeps annual occurrence notes and hides only the selected year', () => {
    const db = new Database(':memory:')
    try {
      initialize(db)
      const api = createCalendarRepository({
        database: () => db,
        createId: randomUUID,
        now: Date.now
      })
      const event = api.createCalendarEvent({
        title: 'Годовщина',
        kind: 'annual',
        date: '2024-09-06',
        reminderOffsets: [30]
      })
      api.setCalendarOccurrenceNote({
        eventId: event.id,
        occurrenceDate: '2026-09-06',
        note: 'Подарок'
      })
      expect(api.listCalendarOccurrences({ from: '2026-09-06', to: '2026-09-06' })[0].note).toBe(
        'Подарок'
      )
      api.setCalendarOccurrenceHidden({
        eventId: event.id,
        occurrenceDate: '2026-09-06',
        hidden: true
      })
      expect(api.listCalendarOccurrences({ from: '2026-09-06', to: '2026-09-06' })).toEqual([])
      expect(api.listCalendarOccurrences({ from: '2027-09-06', to: '2027-09-06' })).toHaveLength(1)
    } finally {
      db.close()
    }
  })
})
