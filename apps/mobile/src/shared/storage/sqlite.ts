import type { SqlDatabasePort } from '@mymind/contracts/storage'
import { mobileSchemaV1 } from '@mymind/persistence/mobile-schema'
import { mobileSchemaV2 } from '@mymind/persistence/mobile-schema-v2'
import { mobileSchemaV3 } from '@mymind/persistence/mobile-schema-v3'
import { mobileSchemaV4 } from '@mymind/persistence/mobile-schema-v4'
import { openDatabaseAsync, type SQLiteDatabase, type SQLiteBindValue } from 'expo-sqlite'

function bindings(parameters: unknown[]): SQLiteBindValue[] {
  return parameters.map((value) => {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      value instanceof Uint8Array
    )
      return value
    if (typeof value === 'boolean') return value ? 1 : 0
    throw new Error('Неподдерживаемый параметр базы данных')
  })
}

/** Each native statement is finalized by Expo's convenience methods. */
export function adaptSqlite(db: SQLiteDatabase): SqlDatabasePort {
  let savepoint = 0
  return {
    prepare: (sql) => ({
      get: (...parameters) => db.getFirstSync(sql, bindings(parameters)) ?? undefined,
      all: (...parameters) => db.getAllSync(sql, bindings(parameters)),
      run: (...parameters) => db.runSync(sql, bindings(parameters))
    }),
    transaction:
      (operation) =>
      (...args) => {
        const name = `mymind_${++savepoint}`
        db.execSync(`SAVEPOINT ${name}`)
        try {
          const result = operation(...args)
          if (result instanceof Promise)
            throw new Error('Асинхронная операция внутри SQL-транзакции')
          db.execSync(`RELEASE SAVEPOINT ${name}`)
          return result
        } catch (error) {
          db.execSync(`ROLLBACK TO SAVEPOINT ${name}`)
          db.execSync(`RELEASE SAVEPOINT ${name}`)
          throw error
        }
      }
  }
}

async function applyMigration(
  db: SQLiteDatabase,
  statements: readonly string[],
  version: number
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const sql of statements) await tx.execAsync(sql)
    await tx.execAsync(`PRAGMA user_version = ${version}`)
  })
}

export async function openMobileDatabase(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync('mymind.sqlite')
  try {
    await db.execAsync(
      'PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;'
    )
    const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version')
    let currentVersion = version?.user_version ?? 0

    if (currentVersion > 4)
      throw new Error('Данные созданы новой версией MyMind. Обновите приложение.')

    if (currentVersion === 0) {
      await db.withExclusiveTransactionAsync(async (tx) => {
        for (const sql of mobileSchemaV1) await tx.execAsync(sql)
        await tx.execAsync(
          'CREATE TABLE mobile_preferences (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL); PRAGMA user_version = 1;'
        )
      })
      currentVersion = 1
    }

    if (currentVersion === 1) {
      await applyMigration(db, mobileSchemaV2, 2)
      currentVersion = 2
    }

    if (currentVersion === 2) {
      await applyMigration(db, mobileSchemaV3, 3)
      currentVersion = 3
    }

    if (currentVersion === 3) {
      await applyMigration(db, mobileSchemaV4, 4)
      currentVersion = 4
    }

    if (currentVersion !== 4) throw new Error('Не удалось обновить локальную базу MyMind')
    return db
  } catch (error) {
    await db.closeAsync()
    throw error
  }
}
