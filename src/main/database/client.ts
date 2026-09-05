import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

import { getDatabaseFilePath } from '../services/storage-location'

import * as schema from './schema'

let sqlite: Database.Database | null = null
let database: BetterSQLite3Database<typeof schema> | null = null

export function initializeDatabase(): void {
  const databasePath = getDatabaseFilePath()

  mkdirSync(dirname(databasePath), {
    recursive: true
  })

  initializeDatabaseAtPath(databasePath)
}

export function initializeDatabaseForTesting(databasePath: string): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('The test database initializer is only available while running tests')
  }

  initializeDatabaseAtPath(databasePath)
}

function initializeDatabaseAtPath(databasePath: string): void {
  closeDatabase()

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
