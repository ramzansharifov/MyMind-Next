import { app } from 'electron'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { join } from 'node:path'

import { getDatabase } from './client'

export function runDatabaseMigrations(): void {
  const migrationsFolder = app.isPackaged
    ? join(process.resourcesPath, 'drizzle')
    : join(app.getAppPath(), 'drizzle')

  migrate(getDatabase(), {
    migrationsFolder
  })
}
