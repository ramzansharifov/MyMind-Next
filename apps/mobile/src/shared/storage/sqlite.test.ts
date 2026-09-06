import Database from 'better-sqlite3'
import type { SQLiteDatabase } from 'expo-sqlite'
import { mobileSchemaV1 } from '@mymind/persistence/mobile-schema'
import { mobileSchemaV2 } from '@mymind/persistence/mobile-schema-v2'
import { mobileSchemaV3 } from '@mymind/persistence/mobile-schema-v3'
import { mobileSchemaV4 } from '@mymind/persistence/mobile-schema-v4'
import { mobileSchemaV5 } from '@mymind/persistence/mobile-schema-v5'
import { mobileSchemaV6 } from '@mymind/persistence/mobile-schema-v6'
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
    execSync: (sql: string) => db.exec(sql),
    execAsync: async (sql: string) => db.exec(sql),
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

function installThrough(db: Database.Database, version: 1 | 2 | 3 | 4 | 5 | 6): void {
  for (const sql of mobileSchemaV1) db.exec(sql)
  db.exec('CREATE TABLE mobile_preferences (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)')
  if (version >= 2) for (const sql of mobileSchemaV2) db.exec(sql)
  if (version >= 3) for (const sql of mobileSchemaV3) db.exec(sql)
  if (version >= 4) for (const sql of mobileSchemaV4) db.exec(sql)
  if (version >= 5) for (const sql of mobileSchemaV5) db.exec(sql)
  if (version >= 6) for (const sql of mobileSchemaV6) db.exec(sql)
  db.pragma(`user_version = ${version}`)
}

function expectTable(db: Database.Database, name: string): void {
  expect(
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(name)
  ).toEqual({ name })
}

afterEach(() => {
  vi.clearAllMocks()
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

  it('migrates a fresh database through V7 and preserves preferences across reopen', async () => {
    const { db, expo } = nativeDriver()
    vi.mocked(openDatabaseAsync).mockResolvedValue(expo)

    await openMobileDatabase()
    db.prepare('INSERT INTO mobile_preferences VALUES (?, ?)').run('test', 'saved')
    await openMobileDatabase()

    expect(db.pragma('user_version', { simple: true })).toBe(7)
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1)
    expect(db.prepare('SELECT value FROM mobile_preferences WHERE key = ?').get('test')).toEqual({
      value: 'saved'
    })
    for (const table of [
      'notes',
      'study_nodes',
      'board_nodes',
      'workout_sessions',
      'nutrition_foods',
      'finance_accounts',
      'finance_transactions',
      'finance_transaction_entries'
    ]) {
      expectTable(db, table)
    }
    expect(db.prepare('SELECT COUNT(*) AS count FROM workout_exercises').get()).toEqual({ count: 24 })
    expect(db.prepare('SELECT COUNT(*) AS count FROM nutrition_foods').get()).toEqual({ count: 211 })
  })

  it('upgrades V1 without losing Tasks or preferences', async () => {
    const { db, expo } = nativeDriver()
    installThrough(db, 1)
    db.prepare(
      `INSERT INTO tasks(id, title, description, group_id, status, priority, due_date, due_time, completed_at, created_at, updated_at)
       VALUES (?, ?, '', NULL, 'active', 'normal', NULL, NULL, NULL, ?, ?)`
    ).run('task-before-notes', 'Сохранить меня', 1, 1)
    db.prepare('INSERT INTO mobile_preferences VALUES (?, ?)').run('appearance', 'kept')
    vi.mocked(openDatabaseAsync).mockResolvedValue(expo)

    await openMobileDatabase()

    expect(db.pragma('user_version', { simple: true })).toBe(7)
    expect(db.prepare('SELECT title FROM tasks WHERE id = ?').get('task-before-notes')).toEqual({
      title: 'Сохранить меня'
    })
    expect(db.prepare('SELECT value FROM mobile_preferences WHERE key = ?').get('appearance')).toEqual({
      value: 'kept'
    })
    expectTable(db, 'finance_accounts')
  })

  it('upgrades V2 without losing Notes', async () => {
    const { db, expo } = nativeDriver()
    installThrough(db, 2)
    db.prepare(
      `INSERT INTO notes(id, group_id, title, document, plain_text, created_at, updated_at)
       VALUES (?, NULL, ?, ?, ?, ?, ?)`
    ).run(
      'note-before-study',
      'Старая заметка',
      JSON.stringify({ version: 1, blocks: [{ id: 'block-1', type: 'text', text: 'Текст' }] }),
      'Текст',
      1,
      1
    )
    vi.mocked(openDatabaseAsync).mockResolvedValue(expo)
    await openMobileDatabase()
    expect(db.pragma('user_version', { simple: true })).toBe(7)
    expect(db.prepare('SELECT title FROM notes WHERE id = ?').get('note-before-study')).toEqual({
      title: 'Старая заметка'
    })
  })

  it('upgrades V3 without losing Study material documents', async () => {
    const { db, expo } = nativeDriver()
    installThrough(db, 3)
    db.prepare(
      `INSERT INTO study_nodes(id, type, parent_id, title, icon, position, is_expanded, created_at, updated_at)
       VALUES (?, 'material', NULL, ?, NULL, 0, 1, 1, 1)`
    ).run('material-before-boards', 'Старый материал')
    db.prepare(
      `INSERT INTO study_materials(node_id, document, plain_text, created_at, updated_at)
       VALUES (?, ?, '', 1, 1)`
    ).run(
      'material-before-boards',
      JSON.stringify({ version: 1, blocks: [{ id: 'text-1', type: 'text', text: 'Содержимое' }] })
    )
    vi.mocked(openDatabaseAsync).mockResolvedValue(expo)
    await openMobileDatabase()
    expect(db.pragma('user_version', { simple: true })).toBe(7)
    expect(db.prepare('SELECT title FROM study_nodes WHERE id = ?').get('material-before-boards')).toEqual({
      title: 'Старый материал'
    })
  })

  it('upgrades V4 without losing Boards snapshots', async () => {
    const { db, expo } = nativeDriver()
    installThrough(db, 4)
    db.prepare(
      `INSERT INTO board_nodes(id, type, parent_id, title, icon, position, is_expanded, is_system, created_at, updated_at)
       VALUES (?, 'board', NULL, ?, NULL, 0, 1, 0, 1, 1)`
    ).run('board-before-workouts', 'Старая доска')
    const snapshot = JSON.stringify({ document: { name: 'kept' } })
    db.prepare(
      `INSERT INTO board_documents(node_id, snapshot, created_at, updated_at) VALUES (?, ?, 1, 1)`
    ).run('board-before-workouts', snapshot)
    vi.mocked(openDatabaseAsync).mockResolvedValue(expo)
    await openMobileDatabase()
    expect(db.pragma('user_version', { simple: true })).toBe(7)
    expect(db.prepare('SELECT snapshot FROM board_documents WHERE node_id = ?').get('board-before-workouts')).toEqual({
      snapshot
    })
  })

  it('upgrades V5 without losing Workouts', async () => {
    const { db, expo } = nativeDriver()
    installThrough(db, 5)
    db.prepare(
      `INSERT INTO workout_sessions(
        id, program_id, program_name_snapshot, title, date, duration_minutes, comment, created_at, updated_at
      ) VALUES (?, NULL, NULL, ?, ?, ?, '', 1, 1)`
    ).run('session-before-nutrition', 'Сохранённая тренировка', '2026-09-06', 45)
    vi.mocked(openDatabaseAsync).mockResolvedValue(expo)
    await openMobileDatabase()
    expect(db.pragma('user_version', { simple: true })).toBe(7)
    expect(db.prepare('SELECT title FROM workout_sessions WHERE id = ?').get('session-before-nutrition')).toEqual({
      title: 'Сохранённая тренировка'
    })
    expect(db.prepare('SELECT COUNT(*) AS count FROM nutrition_foods').get()).toEqual({ count: 211 })
  })

  it('upgrades V6 to Finance without losing Nutrition data', async () => {
    const { db, expo } = nativeDriver()
    installThrough(db, 6)
    db.prepare(
      `INSERT INTO nutrition_log_entries(
        id, date, meal_type, custom_meal_name, source_type, source_id, title_snapshot,
        amount_milli, unit_snapshot, calories_milli, protein_milli_g, fat_milli_g,
        carbs_milli_g, fiber_milli_g, sugar_milli_g, sodium_milli_mg, notes, created_at, updated_at
      ) VALUES (?, ?, 'lunch', '', 'custom', NULL, ?, 1000, 'serving', 100000, 0, 0, 0, 0, 0, 0, '', 1, 1)`
    ).run('meal-before-finance', '2026-09-06', 'Сохранённый обед')
    vi.mocked(openDatabaseAsync).mockResolvedValue(expo)

    await openMobileDatabase()

    expect(db.pragma('user_version', { simple: true })).toBe(7)
    expect(db.prepare('SELECT title_snapshot FROM nutrition_log_entries WHERE id = ?').get('meal-before-finance')).toEqual({
      title_snapshot: 'Сохранённый обед'
    })
    expectTable(db, 'finance_settings')
    expectTable(db, 'finance_limit_accounts')
  })

  it('does not reset an unknown newer database', async () => {
    const { db, expo } = nativeDriver()
    db.pragma('user_version = 99')
    vi.mocked(openDatabaseAsync).mockResolvedValue(expo)
    await expect(openMobileDatabase()).rejects.toThrow('новой версией')
    expect(db.pragma('user_version', { simple: true })).toBe(99)
    expect(expo.closeAsync).toHaveBeenCalledOnce()
  })

  it('rolls back schema creation when the initial migration fails', async () => {
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
