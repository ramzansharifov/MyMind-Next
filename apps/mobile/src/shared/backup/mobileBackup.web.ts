import type { SQLiteDatabase } from 'expo-sqlite'

export interface MobileBackupSummary {
  createdAt: number
  files: number
  bytes: number
}

export interface MobileRestoreResult extends MobileBackupSummary {
  restored: boolean
}

const unsupportedMessage =
  'Резервное копирование файлов доступно в мобильной версии MyMind и недоступно в web preview.'

export async function exportMobileBackup(_db: SQLiteDatabase): Promise<MobileBackupSummary> {
  throw new Error(unsupportedMessage)
}

export async function restoreMobileBackup(_db: SQLiteDatabase): Promise<MobileRestoreResult> {
  throw new Error(unsupportedMessage)
}
