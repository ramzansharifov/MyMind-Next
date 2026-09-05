import { randomUUID } from 'expo-crypto'
import type { SQLiteDatabase } from 'expo-sqlite'
import { createTasksRepository } from '@mymind/persistence/tasks'
import { createHabitsRepository } from '@mymind/persistence/habits'
import { createMoviesRepository } from '@mymind/persistence/movies'
import { createMusicRepository } from '@mymind/persistence/music'
import { createCalendarRepository } from '@mymind/persistence/calendar'
import { createDiaryRepository } from '@mymind/persistence/diary'
import { adaptSqlite } from '../shared/storage/sqlite'

export interface MobileServices {
  tasks: ReturnType<typeof createTasksRepository>
  habits: ReturnType<typeof createHabitsRepository>
  movies: ReturnType<typeof createMoviesRepository>
  music: ReturnType<typeof createMusicRepository>
  calendar: ReturnType<typeof createCalendarRepository>
  diary: ReturnType<typeof createDiaryRepository>
  settings: { get(key: string): string | null; set(key: string, value: string): void }
}
export function createMobileServices(db: SQLiteDatabase): MobileServices {
  const database = adaptSqlite(db)
  const runtime = { database: () => database, createId: randomUUID, now: Date.now }
  return {
    tasks: createTasksRepository(runtime),
    habits: createHabitsRepository(runtime),
    movies: createMoviesRepository(runtime),
    music: createMusicRepository(runtime),
    calendar: createCalendarRepository(runtime),
    diary: createDiaryRepository(runtime),
    settings: {
      get: (key: string) =>
        db.getFirstSync<{ value: string }>(
          'SELECT value FROM mobile_preferences WHERE key = ?',
          key
        )?.value ?? null,
      set: (key: string, value: string) => {
        db.runSync(
          'INSERT INTO mobile_preferences(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
          key,
          value
        )
      }
    }
  }
}
