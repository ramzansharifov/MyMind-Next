import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite'
import { initializeMobileDatabase } from './sqlite'

export async function openMobileDatabase(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync('mymind.sqlite')
  try {
    return await initializeMobileDatabase(db)
  } catch (error) {
    await db.closeAsync()
    throw error
  }
}
