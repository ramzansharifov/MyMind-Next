import type { Database } from 'sql.js'
import { mobileSchemaV1 } from '@mymind/persistence/mobile-schema'
import { mobileSchemaV2 } from '@mymind/persistence/mobile-schema-v2'
import { mobileSchemaV3 } from '@mymind/persistence/mobile-schema-v3'
import { mobileSchemaV4 } from '@mymind/persistence/mobile-schema-v4'
import { mobileSchemaV5 } from '@mymind/persistence/mobile-schema-v5'
import { mobileSchemaV6 } from '@mymind/persistence/mobile-schema-v6'
import { mobileSchemaV7 } from '@mymind/persistence/mobile-schema-v7'
import { mobileSchemaV8 } from '@mymind/persistence/mobile-schema-v8'
import { mobileSchemaV9 } from '@mymind/persistence/mobile-schema-v9'

export const PWA_SCHEMA_VERSION = 9
const migrations = [
  [
    ...mobileSchemaV1,
    'CREATE TABLE mobile_preferences (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)'
  ],
  mobileSchemaV2,
  mobileSchemaV3,
  mobileSchemaV4,
  mobileSchemaV5,
  mobileSchemaV6,
  mobileSchemaV7,
  mobileSchemaV8,
  mobileSchemaV9
]

export function migrateDatabase(db: Database): void {
  const version = Number(db.exec('PRAGMA user_version')[0]?.values[0]?.[0] ?? 0)
  if (version > PWA_SCHEMA_VERSION)
    throw new Error('Данные созданы более новой версией MyMind. Обновите PWA.')
  db.run('PRAGMA foreign_keys = ON')
  for (let index = version; index < migrations.length; index++) {
    db.run('BEGIN')
    try {
      for (const sql of migrations[index]) db.run(sql)
      db.run(`PRAGMA user_version = ${index + 1}`)
      db.run('COMMIT')
    } catch (error) {
      db.run('ROLLBACK')
      throw error
    }
  }
  const integrity = db.exec('PRAGMA integrity_check')[0]?.values[0]?.[0]
  if (integrity !== 'ok')
    throw new Error('Локальная база повреждена. Восстановите резервную копию.')
  if (db.exec('PRAGMA foreign_key_check').some((result) => result.values.length)) {
    throw new Error('В базе нарушены связи между записями.')
  }
}

/** Ignore only the optional tables/triggers installed by the shared LAN-sync repository. */
export function applicationSchema(db: Database): string {
  const rows =
    db.exec(`SELECT type, name, tbl_name, sql FROM sqlite_master
    WHERE name NOT LIKE 'sqlite_%'
      AND name NOT IN ('local_profile', 'password_vault_sync_identity', 'sync_runtime', 'sync_row_versions', 'sync_tombstones')
      AND name NOT LIKE 'sync_%'
    ORDER BY type, name, tbl_name`)[0]?.values ?? []
  return JSON.stringify(
    rows.map((row) =>
      row.map((value) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : value))
    )
  )
}
