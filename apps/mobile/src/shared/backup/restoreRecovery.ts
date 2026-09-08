import { randomUUID } from 'expo-crypto'
import { Directory, File, FileMode, Paths } from 'expo-file-system'
import { backupDatabaseAsync, deserializeDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite'
import { MOBILE_BACKUP_MAX_DATABASE_BYTES } from './archive'
import {
  MOBILE_RESTORE_PENDING_FILE,
  MOBILE_RESTORE_ROLLBACK_PREFIX,
  decodeMobileRestoreRecoveryMarker,
  encodeMobileRestoreRecoveryMarker,
  isMobileRestoreArtifactDirectoryName
} from './restoreRecoveryState'

export const MOBILE_DURABLE_FILE_ROOTS = ['document-assets', 'workout-progress'] as const

const ROLLBACK_DATABASE_FILE = 'mymind.sqlite.snapshot'
const MAX_MARKER_BYTES = 4096
const CHUNK_SIZE = 1024 * 1024
const encoder = new TextEncoder()
const decoder = new TextDecoder()

export type MobileDurableFileRoot = (typeof MOBILE_DURABLE_FILE_ROOTS)[number]

function pendingMarkerFile(): File {
  return new File(Paths.document, MOBILE_RESTORE_PENDING_FILE)
}

function rollbackDirectory(name: string): Directory {
  return new Directory(Paths.document, name)
}

function writeBytes(file: File, bytes: Uint8Array): void {
  file.create({ overwrite: true })
  const handle = file.open(FileMode.Truncate)
  try {
    handle.writeBytes(bytes)
  } finally {
    handle.close()
  }
  if (!file.exists || file.size !== bytes.length) {
    throw new Error('Не удалось сохранить служебную точку отката MyMind')
  }
}

function readBytes(file: File, maxBytes: number): Uint8Array {
  if (!file.exists || file.size <= 0 || file.size > maxBytes) {
    throw new Error('Служебная точка отката MyMind повреждена')
  }
  const result = new Uint8Array(file.size)
  const handle = file.open(FileMode.ReadOnly)
  try {
    let offset = 0
    while (offset < result.length) {
      const chunk = handle.readBytes(Math.min(CHUNK_SIZE, result.length - offset))
      if (chunk.length === 0) throw new Error('Служебная точка отката MyMind повреждена')
      result.set(chunk, offset)
      offset += chunk.length
    }
  } finally {
    handle.close()
  }
  return result
}

function readMarker(): ReturnType<typeof decodeMobileRestoreRecoveryMarker> | null {
  const file = pendingMarkerFile()
  if (!file.exists) return null
  return decodeMobileRestoreRecoveryMarker(decoder.decode(readBytes(file, MAX_MARKER_BYTES)))
}

function writeMarker(rollbackName: string): void {
  const file = pendingMarkerFile()
  if (file.exists) throw new Error('Предыдущее восстановление MyMind не было завершено')
  writeBytes(file, encoder.encode(encodeMobileRestoreRecoveryMarker(rollbackName)))
}

async function copyLiveRoots(target: Directory): Promise<void> {
  for (const rootName of MOBILE_DURABLE_FILE_ROOTS) {
    const live = new Directory(Paths.document, rootName)
    if (live.exists) await live.copy(new Directory(target, rootName))
  }
}

async function restoreRoots(source: Directory): Promise<void> {
  for (const rootName of MOBILE_DURABLE_FILE_ROOTS) {
    const live = new Directory(Paths.document, rootName)
    if (live.exists) live.delete()
    const saved = new Directory(source, rootName)
    if (saved.exists) await saved.copy(live)
  }
}

async function assertRecoveredDatabaseHealthy(db: SQLiteDatabase): Promise<void> {
  const integrity = await db.getAllAsync<Record<string, unknown>>('PRAGMA integrity_check')
  if (
    integrity.length !== 1 ||
    String(Object.values(integrity[0] ?? {})[0] ?? '').toLocaleLowerCase('en-US') !== 'ok'
  ) {
    throw new Error('Проверка целостности восстановленной базы данных не пройдена')
  }
  const foreignKeys = await db.getAllAsync('PRAGMA foreign_key_check')
  if (foreignKeys.length > 0) {
    throw new Error('В восстановленной базе данных нарушены внешние ключи')
  }
}

async function restoreDatabaseSnapshot(rollback: Directory, db: SQLiteDatabase): Promise<void> {
  const bytes = readBytes(
    new File(rollback, ROLLBACK_DATABASE_FILE),
    MOBILE_BACKUP_MAX_DATABASE_BYTES
  )
  const snapshot = await deserializeDatabaseAsync(bytes)
  try {
    await backupDatabaseAsync({
      sourceDatabase: snapshot,
      sourceDatabaseName: 'main',
      destDatabase: db,
      destDatabaseName: 'main'
    })
  } finally {
    await snapshot.closeAsync()
  }
  await db.execAsync(
    'PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA wal_checkpoint(TRUNCATE);'
  )
  await assertRecoveredDatabaseHealthy(db)
}

function clearMarkerFor(rollbackName: string): void {
  const file = pendingMarkerFile()
  if (!file.exists) return
  const marker = readMarker()
  if (!marker || marker.rollbackDirectory !== rollbackName) {
    throw new Error('Служебная точка отката MyMind не соответствует текущему восстановлению')
  }
  file.delete()
}

export function cleanupStaleMobileRestoreArtifacts(): void {
  for (const child of Paths.document.list()) {
    if (!(child instanceof Directory) || !isMobileRestoreArtifactDirectoryName(child.name)) continue
    try {
      child.delete()
    } catch {
      // Stale internal restore data never overrides app startup; retry cleanup on the next launch.
    }
  }
}

export async function createDurableMobileRestoreRollback(db: SQLiteDatabase): Promise<Directory> {
  if (pendingMarkerFile().exists) {
    throw new Error('Сначала необходимо завершить предыдущее восстановление MyMind')
  }
  const name = `${MOBILE_RESTORE_ROLLBACK_PREFIX}${randomUUID()}`
  const rollback = rollbackDirectory(name)
  try {
    rollback.create({ intermediates: true, idempotent: false })
    await copyLiveRoots(rollback)
    const database = await db.serializeAsync()
    if (database.length > MOBILE_BACKUP_MAX_DATABASE_BYTES) {
      throw new Error('Локальная база данных слишком большая для безопасного восстановления')
    }
    writeBytes(new File(rollback, ROLLBACK_DATABASE_FILE), database)
    writeMarker(name)
    return rollback
  } catch (reason) {
    const marker = pendingMarkerFile()
    if (marker.exists) marker.delete()
    if (rollback.exists) rollback.delete()
    throw reason
  }
}

export async function rollbackDurableMobileRestore(
  db: SQLiteDatabase,
  rollback: Directory
): Promise<void> {
  await restoreRoots(rollback)
  await restoreDatabaseSnapshot(rollback, db)
  clearMarkerFor(rollback.name)
  if (rollback.exists) rollback.delete()
}

export function commitDurableMobileRestore(rollback: Directory): void {
  clearMarkerFor(rollback.name)
  try {
    if (rollback.exists) rollback.delete()
  } catch {
    // The restore is already committed once the marker is removed; stale rollback data is harmless.
  }
}

export async function recoverInterruptedMobileRestore(db: SQLiteDatabase): Promise<boolean> {
  const marker = readMarker()
  if (!marker) return false
  const rollback = rollbackDirectory(marker.rollbackDirectory)
  if (!rollback.exists) {
    throw new Error('Не найдена служебная точка отката незавершённого восстановления MyMind')
  }
  await restoreRoots(rollback)
  await restoreDatabaseSnapshot(rollback, db)
  clearMarkerFor(rollback.name)
  try {
    if (rollback.exists) rollback.delete()
  } catch {
    // The previous state has already been restored; cleanup can remain best-effort.
  }
  return true
}
