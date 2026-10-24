import {
  MOBILE_BACKUP_HEADER_SIZE,
  decodeMobileBackupHeader,
  decodeMobileBackupManifest
} from '../client/shared/backup/archive'
import type { BackupSummary } from '../client/shared/backup/types'

// Read the existing shared archive; no extra format or storage keys are introduced.
export async function backupSummary(file: Blob): Promise<BackupSummary> {
  const header = new Uint8Array(await file.slice(0, MOBILE_BACKUP_HEADER_SIZE).arrayBuffer())
  const length = decodeMobileBackupHeader(header)
  const manifest = decodeMobileBackupManifest(
    new Uint8Array(
      await file.slice(MOBILE_BACKUP_HEADER_SIZE, MOBILE_BACKUP_HEADER_SIZE + length).arrayBuffer()
    ),
    file.size
  )
  return {
    createdAt: manifest.createdAt,
    files: manifest.entries.filter((entry) => entry.kind === 'file').length,
    bytes: manifest.entries.reduce((total, entry) => total + entry.size, 0)
  }
}
