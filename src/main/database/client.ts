import { app } from 'electron'
import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

import * as schema from './schema'

let sqlite: Database.Database | null = null
let database: BetterSQLite3Database<typeof schema> | null = null

export function initializeDatabase(): void {
  const databaseDirectory = join(app.getPath('userData'), 'data')

  mkdirSync(databaseDirectory, {
    recursive: true
  })

  const databasePath = join(databaseDirectory, 'mymind.sqlite')

  sqlite = new Database(databasePath)

  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('synchronous = NORMAL')
  sqlite.pragma('foreign_keys = ON')
  sqlite.pragma('busy_timeout = 5000')

  database = drizzle(sqlite, {
    schema
  })
}

export function getDatabase(): BetterSQLite3Database<typeof schema> {
  if (!database) {
    throw new Error('Database has not been initialized')
  }

  return database
}

export function getSqlite(): Database.Database {
  if (!sqlite) {
    throw new Error('SQLite has not been initialized')
  }

  return sqlite
}

export function closeDatabase(): void {
  sqlite?.close()

  sqlite = null
  database = null
}
