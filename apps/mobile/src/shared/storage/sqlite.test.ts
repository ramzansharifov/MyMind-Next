import Database from 'better-sqlite3'
import type { SQLiteDatabase } from 'expo-sqlite'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('expo-sqlite', () => ({ openDatabaseAsync: vi.fn() }))
import { openDatabaseAsync } from 'expo-sqlite'
import { adaptSqlite, openMobileDatabase } from './sqlite'

const databases: Database.Database[] = []
function nativeDriver(): { db: Database.Database; expo: SQLiteDatabase } {
  const db = new Database(':memory:')
  databases.push(db)
  const driver = {
    getFirstSync: (sql: string, parameters: unknown[] = []) =>
      db.prepare(sql).get(...parameters) ?? null,
    getAllSync: (sql: string, parameters: unknown[] = []) => db.prepare(sql).all(...parameters),
    runSync: (sql: string, parameters: unknown[] = []) => db.prepare(sql).run(...parameters),
    execSync: (sql: string) => {
      db.exec(sql)
    },
    execAsync: async (sql: string) => {
      db.exec(sql)
    },
    getFirstAsync: async (sql: string) => db.prepare(sql).get(),
    withExclusiveTransactionAsync: async (operation: (tx: unknown) => Promise<void>) => {
      db.exec('BEGIN')
      try {
        await operation(driver)
        db.exec('COMMIT')
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
      }
    },
    closeAsync: vi.fn(async () => {})
  }
  return { db, expo: driver as unknown as SQLiteDatabase }
}
afterEach(() => {
  for (const db of databases.splice(0)) db.close()
})

describe('Expo SQLite adapter', () => {
  it('rolls back nested writes and safely binds text and booleans', () => {
    const { db, expo } = nativeDriver()
    db.exec('CREATE TABLE records (id TEXT PRIMARY KEY, enabled INTEGER)')
    const port = adaptSqlite(expo)
    const insert = port.prepare('INSERT INTO records VALUES (?, ?)')
    port.transaction(() => {
      insert.run("quote'; DROP TABLE records;--", true)
      expect(() =>
        port.transaction(() => {
          insert.run('rollback', false)
          throw new Error('failure')
        })()
      ).toThrow('failure')
      insert.run('kept', false)
    })()
    expect(port.prepare('SELECT enabled FROM records ORDER BY id').all()).toEqual([
      { enabled: 0 },
      { enabled: 1 }
    ])
    expect(port.prepare('SELECT * FROM records WHERE id = ?').get('rollback')).toBeUndefined()
    expect(() => insert.run('bad', {})).toThrow('Неподдерживаемый параметр')
  })
  it('migrates only once and preserves existing user data', async () => {
    const { db, expo } = nativeDriver()
    vi.mocked(openDatabaseAsync).mockResolvedValue(expo)
    await openMobileDatabase()
    db.prepare('INSERT INTO mobile_preferences VALUES (?, ?)').run('test', 'saved')
    await openMobileDatabase()
    expect(db.pragma('user_version', { simple: true })).toBe(1)
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1)
    expect(db.prepare('SELECT value FROM mobile_preferences WHERE key = ?').get('test')).toEqual({
      value: 'saved'
    })
  })
  it('does not reset an unknown newer database', async () => {
    const { db, expo } = nativeDriver()
    db.pragma('user_version = 99')
    vi.mocked(openDatabaseAsync).mockResolvedValue(expo)
    await expect(openMobileDatabase()).rejects.toThrow('новой версией')
    expect(db.pragma('user_version', { simple: true })).toBe(99)
    expect(expo.closeAsync).toHaveBeenCalledOnce()
  })
  it('rolls back schema creation when a migration fails', async () => {
    const { db, expo } = nativeDriver()
    db.exec('CREATE TABLE mobile_preferences (key TEXT PRIMARY KEY, value TEXT)')
    vi.mocked(openDatabaseAsync).mockResolvedValue(expo)
    await expect(openMobileDatabase()).rejects.toThrow()
    expect(db.pragma('user_version', { simple: true })).toBe(0)
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()).toEqual([
      { name: 'mobile_preferences' }
    ])
  })
})
