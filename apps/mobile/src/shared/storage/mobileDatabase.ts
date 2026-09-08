import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite'
import {
  cleanupStaleMobileRestoreArtifacts,
  recoverInterruptedMobileRestore
} from '../backup/restoreRecovery'
import { initializeMobileDatabase } from './sqlite'

export async function openMobileDatabase(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync('mymind.sqlite')
  try {
    await recoverInterruptedMobileRestore(db)
    cleanupStaleMobileRestoreArtifacts()
    return await initializeMobileDatabase(db)
  } catch (error) {
    await db.closeAsync()
    throw error
  }
}
