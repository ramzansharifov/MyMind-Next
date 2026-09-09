import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite'
import { initializeMobileDatabase } from './sqlite'

async function runWebMigrationTransaction(
  db: SQLiteDatabase,
  operation: (tx: SQLiteDatabase) => Promise<void>
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await operation(db)
  })
}

export async function openMobileDatabase(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync('mymind.sqlite')
  try {
    return await initializeMobileDatabase(db, runWebMigrationTransaction)
  } catch (error) {
    await db.closeAsync()
    throw error
  }
}
