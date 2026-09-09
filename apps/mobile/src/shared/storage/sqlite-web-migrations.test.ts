import Database from 'better-sqlite3'
import type { SQLiteDatabase } from 'expo-sqlite'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('expo-sqlite', () => ({ openDatabaseAsync: vi.fn() }))
import { initializeMobileDatabase } from './sqlite'

const databases: Database.Database[] = []

function webDriver(): { db: Database.Database; expo: SQLiteDatabase } {
  const db = new Database(':memory:')
  databases.push(db)
  const driver = {
    execAsync: async (sql: string) => db.exec(sql),
    getFirstAsync: async (sql: string) => db.prepare(sql).get() ?? null,
    closeAsync: vi.fn(async () => {})
  }
  return { db, expo: driver as unknown as SQLiteDatabase }
}

afterEach(() => {
  vi.clearAllMocks()
  for (const db of databases.splice(0)) db.close()
})

describe('Expo SQLite web migrations', () => {
  it('migrates through V8 without requiring an exclusive transaction API', async () => {
    const { db, expo } = webDriver()
    const runTransaction = vi.fn(
      async (database: SQLiteDatabase, operation: (tx: SQLiteDatabase) => Promise<void>) => {
        db.exec('BEGIN')
        try {
          await operation(database)
          db.exec('COMMIT')
        } catch (error) {
          db.exec('ROLLBACK')
          throw error
        }
      }
    )

    await initializeMobileDatabase(expo, runTransaction)

    expect(db.pragma('user_version', { simple: true })).toBe(8)
    expect(runTransaction).toHaveBeenCalledTimes(8)
    expect(
      db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'notes'").get()
    ).toEqual({ name: 'notes' })
  })
})
