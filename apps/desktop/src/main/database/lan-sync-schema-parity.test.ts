import Database from 'better-sqlite3'
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import type { SqlDatabasePort } from '@mymind/contracts/storage'
import { mobileSchemaV1 } from '@mymind/persistence/mobile-schema'
import { mobileSchemaV2 } from '@mymind/persistence/mobile-schema-v2'
import { mobileSchemaV3 } from '@mymind/persistence/mobile-schema-v3'
import { mobileSchemaV4 } from '@mymind/persistence/mobile-schema-v4'
import { mobileSchemaV5 } from '@mymind/persistence/mobile-schema-v5'
import { mobileSchemaV6 } from '@mymind/persistence/mobile-schema-v6'
import { mobileSchemaV7 } from '@mymind/persistence/mobile-schema-v7'
import { mobileSchemaV8 } from '@mymind/persistence/mobile-schema-v8'
import {
  SYNC_MODULE_REGISTRY,
  captureSyncSnapshot,
  ensureSyncInfrastructure
} from '@mymind/persistence/sync'

const statementBreakpoint = '--> statement-breakpoint'

function adapt(sqlite: Database.Database): SqlDatabasePort {
  return {
    prepare(sql) {
      const statement = sqlite.prepare(sql)
      return {
        get: (...parameters) => statement.get(...parameters),
        all: (...parameters) => statement.all(...parameters) as unknown[],
        run: (...parameters) => ({ changes: statement.run(...parameters).changes })
      }
    },
    transaction(operation) {
      return sqlite.transaction(operation)
    }
  }
}

async function createDesktopDatabase(): Promise<Database.Database> {
  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')
  const migrationsDirectory = resolve(process.cwd(), 'drizzle')
  const migrations = (await readdir(migrationsDirectory))
    .filter((name) => /^\d+_.+\.sql$/.test(name))
    .sort((left, right) => left.localeCompare(right, 'en'))

  for (const migration of migrations) {
    const source = await readFile(resolve(migrationsDirectory, migration), 'utf8')
    for (const statement of source.split(statementBreakpoint)) {
      if (statement.trim()) sqlite.exec(statement)
    }
  }
  return sqlite
}

function createMobileDatabase(): Database.Database {
  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')
  for (const migration of [
    mobileSchemaV1,
    mobileSchemaV2,
    mobileSchemaV3,
    mobileSchemaV4,
    mobileSchemaV5,
    mobileSchemaV6,
    mobileSchemaV7,
    mobileSchemaV8
  ]) {
    for (const statement of migration) sqlite.exec(statement)
  }
  return sqlite
}

function columns(sqlite: Database.Database, table: string): string[] {
  return (
    sqlite.prepare(`PRAGMA table_info("${table}")`).all() as Array<{ name: string }>
  ).map((column) => column.name)
}

describe('desktop/mobile LAN sync schema parity', () => {
  it('keeps every synchronized table structurally identical on both platforms', async () => {
    const desktop = await createDesktopDatabase()
    const mobile = createMobileDatabase()

    try {
      const syncedTables = [
        ...new Set(
          SYNC_MODULE_REGISTRY.flatMap((module) => module.tables.map((table) => table.table))
        )
      ]

      for (const table of syncedTables) {
        const desktopColumns = columns(desktop, table)
        const mobileColumns = columns(mobile, table)
        expect(desktopColumns, `${table} is missing from desktop`).not.toEqual([])
        expect(mobileColumns, `${table} is missing from mobile`).not.toEqual([])
        expect(desktopColumns, `${table} column order/schema differs`).toEqual(mobileColumns)
      }

      const desktopPort = adapt(desktop)
      const mobilePort = adapt(mobile)
      ensureSyncInfrastructure(desktopPort)
      ensureSyncInfrastructure(mobilePort)
      const modules = SYNC_MODULE_REGISTRY.map((module) => module.module)

      expect(captureSyncSnapshot(desktopPort, modules).modules).toEqual(
        captureSyncSnapshot(mobilePort, modules).modules
      )
    } finally {
      desktop.close()
      mobile.close()
    }
  })
})
