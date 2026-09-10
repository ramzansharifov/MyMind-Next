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
    await initializeMobileDatabase(db, runWebMigrationTransaction)
    // expo-sqlite Web runs in a worker. Finish one async round-trip and yield once before
    // repositories begin using the synchronous compatibility port.
    await db.getFirstAsync('SELECT 1')
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    return db
  } catch (error) {
    await db.closeAsync()
    throw error
  }
}
