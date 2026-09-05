import type { SqlDatabasePort } from '@mymind/contracts/storage'
import { mobileSchemaV1 } from '@mymind/persistence/mobile-schema'
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
        // Savepoints support nested repository transactions without committing a parent.
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

export async function openMobileDatabase(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync('mymind.sqlite')
  try {
    await db.execAsync(
      'PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;'
    )
    const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version')
    if ((version?.user_version ?? 0) > 1)
      throw new Error('Данные созданы новой версией MyMind. Обновите приложение.')
    if (!version?.user_version) {
      await db.withExclusiveTransactionAsync(async (tx) => {
        for (const sql of mobileSchemaV1) await tx.execAsync(sql)
        await tx.execAsync(
          'CREATE TABLE mobile_preferences (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL); PRAGMA user_version = 1;'
        )
      })
    }
    return db
  } catch (error) {
    await db.closeAsync()
    throw error
  }
}
