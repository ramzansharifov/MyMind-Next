import * as DocumentPicker from 'expo-document-picker'
import { randomUUID } from 'expo-crypto'
import { Directory, File, FileMode, Paths, type FileHandle } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { backupDatabaseAsync, deserializeDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite'
import { sha256 } from '@noble/hashes/sha2.js'
import {
  MOBILE_BACKUP_EXTENSION,
  MOBILE_BACKUP_FORMAT,
  MOBILE_BACKUP_HEADER_SIZE,
  MOBILE_BACKUP_MAX_DATABASE_BYTES,
  MOBILE_BACKUP_MAX_TOTAL_BYTES,
  MOBILE_BACKUP_SCHEMA_VERSION,
  MOBILE_BACKUP_VERSION,
  assertSafeBackupPath,
  decodeMobileBackupHeader,
  decodeMobileBackupManifest,
  encodeMobileBackupHeader,
  encodeMobileBackupManifest,
  type MobileBackupEntry,
  type MobileBackupManifestV1
} from './archive'
import {
  MOBILE_DURABLE_FILE_ROOTS,
  commitDurableMobileRestore,
  createDurableMobileRestoreRollback,
  rollbackDurableMobileRestore,
  type MobileDurableFileRoot
} from './restoreRecovery'

const CHUNK_SIZE = 1024 * 1024

interface SourceFile {
  path: string
  file: File
  size: number
  sha256: string
}

export interface MobileBackupSummary {
  createdAt: number
  files: number
  bytes: number
}

export interface MobileRestoreResult extends MobileBackupSummary {
  restored: boolean
}

function toHex(bytes: Uint8Array): string {
  let result = ''
  for (const byte of bytes) result += byte.toString(16).padStart(2, '0')
  return result
}

function digestBytes(bytes: Uint8Array): string {
  return toHex(sha256(bytes))
}

function readExactly(handle: FileHandle, length: number): Uint8Array {
  const bytes = handle.readBytes(length)
  if (bytes.length !== length) throw new Error('Файл backup обрывается раньше ожидаемого')
  return bytes
}

function hashFile(file: File): string {
  const digest = sha256.create()
  const handle = file.open(FileMode.ReadOnly)
  try {
    let remaining = file.size
    while (remaining > 0) {
      const bytes = handle.readBytes(Math.min(CHUNK_SIZE, remaining))
      if (bytes.length === 0) throw new Error(`Не удалось прочитать «${file.name}»`)
      digest.update(bytes)
      remaining -= bytes.length
    }
    return toHex(digest.digest())
  } finally {
    handle.close()
  }
}

function collectFiles(rootName: MobileDurableFileRoot): SourceFile[] {
  const root = new Directory(Paths.document, rootName)
  if (!root.exists) return []
  const result: SourceFile[] = []

  const visit = (directory: Directory, relative: string[]): void => {
    const children = [...directory.list()].sort((a, b) => a.name.localeCompare(b.name, 'en'))
    for (const child of children) {
      const next = [...relative, child.name]
      if (child instanceof Directory) {
        visit(child, next)
        continue
      }
      const path = [rootName, ...next].join('/')
      assertSafeBackupPath(path)
      result.push({ path, file: child, size: child.size, sha256: hashFile(child) })
    }
  }

  visit(root, [])
  return result
}

async function assertDatabaseHealthy(db: SQLiteDatabase): Promise<void> {
  const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version')
  if (version?.user_version !== MOBILE_BACKUP_SCHEMA_VERSION) {
    throw new Error('Версия локальной базы данных не поддерживается для backup')
  }

  const integrity = await db.getAllAsync<Record<string, unknown>>('PRAGMA integrity_check')
  if (
    integrity.length !== 1 ||
    String(Object.values(integrity[0] ?? {})[0] ?? '').toLocaleLowerCase('en-US') !== 'ok'
  ) {
    throw new Error('Проверка целостности базы данных не пройдена')
  }

  const foreignKeys = await db.getAllAsync('PRAGMA foreign_key_check')
  if (foreignKeys.length > 0) throw new Error('В базе данных нарушены внешние ключи')
}

async function schemaSignature(db: SQLiteDatabase): Promise<string> {
  const rows = await db.getAllAsync<{
    type: string
    name: string
    tbl_name: string
    sql: string | null
  }>(
    "SELECT type, name, tbl_name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name, tbl_name"
  )
  return JSON.stringify(rows)
}

function appendSourceFile(output: FileHandle, source: SourceFile): void {
  if (!source.file.exists || source.file.size !== source.size) {
    throw new Error(`Файл «${source.path}» изменился во время создания backup`)
  }
  const digest = sha256.create()
  const input = source.file.open(FileMode.ReadOnly)
  try {
    let remaining = source.size
    while (remaining > 0) {
      const bytes = input.readBytes(Math.min(CHUNK_SIZE, remaining))
      if (bytes.length === 0) throw new Error(`Не удалось прочитать «${source.path}»`)
      output.writeBytes(bytes)
      digest.update(bytes)
      remaining -= bytes.length
    }
  } finally {
    input.close()
  }
  if (source.file.size !== source.size || toHex(digest.digest()) !== source.sha256) {
    throw new Error(`Файл «${source.path}» изменился во время создания backup`)
  }
}

function createManifest(database: Uint8Array, files: SourceFile[]): MobileBackupManifestV1 {
  if (database.length > MOBILE_BACKUP_MAX_DATABASE_BYTES) {
    throw new Error('Локальная база данных слишком большая для backup')
  }
  let offset = 0
  const entries: MobileBackupEntry[] = [
    {
      path: 'database/mymind.sqlite',
      kind: 'database',
      size: database.length,
      offset,
      sha256: digestBytes(database)
    }
  ]
  offset += database.length
  for (const source of files) {
    entries.push({
      path: source.path,
      kind: 'file',
      size: source.size,
      offset,
      sha256: source.sha256
    })
    offset += source.size
    if (offset > MOBILE_BACKUP_MAX_TOTAL_BYTES) throw new Error('Backup слишком большой')
  }
  return {
    format: MOBILE_BACKUP_FORMAT,
    version: MOBILE_BACKUP_VERSION,
    schemaVersion: MOBILE_BACKUP_SCHEMA_VERSION,
    createdAt: Date.now(),
    entries
  }
}

export async function exportMobileBackup(db: SQLiteDatabase): Promise<MobileBackupSummary> {
  await assertDatabaseHealthy(db)
  const database = await db.serializeAsync()
  const files = MOBILE_DURABLE_FILE_ROOTS.flatMap(collectFiles)
  const manifest = createManifest(database, files)
  const manifestBytes = encodeMobileBackupManifest(manifest)
  const header = encodeMobileBackupHeader(manifestBytes.length)
  const payloadBytes = manifest.entries.reduce((sum, entry) => sum + entry.size, 0)
  const expectedArchiveBytes = header.length + manifestBytes.length + payloadBytes
  const stamp = new Date(manifest.createdAt).toISOString().replace(/[:.]/g, '-')
  const archive = new File(Paths.cache, `MyMind-${stamp}${MOBILE_BACKUP_EXTENSION}`)
  archive.create({ overwrite: true })
  const output = archive.open(FileMode.Truncate)
  try {
    output.writeBytes(header)
    output.writeBytes(manifestBytes)
    output.writeBytes(database)
    for (const source of files) appendSourceFile(output, source)
  } catch (reason) {
    output.close()
    if (archive.exists) archive.delete()
    throw reason
  }
  output.close()

  if (!archive.exists || archive.size !== expectedArchiveBytes) {
    if (archive.exists) archive.delete()
    throw new Error('Не удалось проверить итоговый файл backup')
  }
  if (!(await Sharing.isAvailableAsync())) {
    archive.delete()
    throw new Error('Системный экспорт файлов недоступен на этом устройстве')
  }
  try {
    await Sharing.shareAsync(archive.uri, {
      dialogTitle: 'Сохранить резервную копию MyMind',
      mimeType: 'application/octet-stream'
    })
  } finally {
    if (archive.exists) archive.delete()
  }
  return {
    createdAt: manifest.createdAt,
    files: files.length,
    bytes: payloadBytes
  }
}

function targetFile(stage: Directory, path: string): File {
  const segments = path.split('/')
  const parent = new Directory(stage, ...segments.slice(0, -1))
  parent.create({ intermediates: true, idempotent: true })
  const file = new File(parent, segments[segments.length - 1]!)
  file.create({ overwrite: true })
  return file
}

function extractFileEntry(input: FileHandle, entry: MobileBackupEntry, stage: Directory): string {
  const outputFile = targetFile(stage, entry.path)
  const output = outputFile.open(FileMode.Truncate)
  const digest = sha256.create()
  try {
    let remaining = entry.size
    while (remaining > 0) {
      const bytes = readExactly(input, Math.min(CHUNK_SIZE, remaining))
      output.writeBytes(bytes)
      digest.update(bytes)
      remaining -= bytes.length
    }
  } catch (reason) {
    output.close()
    if (outputFile.exists) outputFile.delete()
    throw reason
  }
  output.close()
  return toHex(digest.digest())
}

function extractDatabaseEntry(input: FileHandle, entry: MobileBackupEntry): Uint8Array {
  const database = new Uint8Array(entry.size)
  const digest = sha256.create()
  let cursor = 0
  while (cursor < entry.size) {
    const bytes = readExactly(input, Math.min(CHUNK_SIZE, entry.size - cursor))
    database.set(bytes, cursor)
    digest.update(bytes)
    cursor += bytes.length
  }
  if (toHex(digest.digest()) !== entry.sha256) {
    throw new Error('Контрольная сумма базы данных backup не совпадает')
  }
  return database
}

async function swapRoots(stage: Directory): Promise<void> {
  for (const rootName of MOBILE_DURABLE_FILE_ROOTS) {
    const live = new Directory(Paths.document, rootName)
    if (live.exists) live.delete()
    const staged = new Directory(stage, rootName)
    if (staged.exists) await staged.move(live)
  }
}

async function restoreDatabase(source: SQLiteDatabase, destination: SQLiteDatabase): Promise<void> {
  await backupDatabaseAsync({
    sourceDatabase: source,
    sourceDatabaseName: 'main',
    destDatabase: destination,
    destDatabaseName: 'main'
  })
  await destination.execAsync(
    'PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA wal_checkpoint(TRUNCATE);'
  )
  await assertDatabaseHealthy(destination)
}

export async function restoreMobileBackup(db: SQLiteDatabase): Promise<MobileRestoreResult> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false
  })
  if (picked.canceled) return { restored: false, createdAt: 0, files: 0, bytes: 0 }
  const selected = picked.assets[0]
  if (!selected) return { restored: false, createdAt: 0, files: 0, bytes: 0 }

  const archive = new File(selected.uri)
  if (!archive.exists || archive.size < MOBILE_BACKUP_HEADER_SIZE) {
    throw new Error('Файл backup пуст или повреждён')
  }
  if (archive.size > MOBILE_BACKUP_MAX_TOTAL_BYTES + 4 * 1024 * 1024 + MOBILE_BACKUP_HEADER_SIZE) {
    throw new Error('Файл backup превышает допустимый размер')
  }

  const stage = new Directory(Paths.document, `.mymind-restore-stage-${randomUUID()}`)
  let restoredDatabase: SQLiteDatabase | null = null
  let databaseBytes: Uint8Array | null = null
  let manifest: MobileBackupManifestV1 | null = null
  const input = archive.open(FileMode.ReadOnly)
  try {
    const header = readExactly(input, MOBILE_BACKUP_HEADER_SIZE)
    const manifestLength = decodeMobileBackupHeader(header)
    const manifestBytes = readExactly(input, manifestLength)
    manifest = decodeMobileBackupManifest(manifestBytes, archive.size)
    if (manifest.schemaVersion !== MOBILE_BACKUP_SCHEMA_VERSION) {
      throw new Error('Backup создан несовместимой версией MyMind')
    }

    stage.create({ intermediates: true, idempotent: false })
    for (const entry of manifest.entries) {
      if (entry.kind === 'database') {
        databaseBytes = extractDatabaseEntry(input, entry)
        continue
      }
      const digest = extractFileEntry(input, entry, stage)
      if (digest !== entry.sha256) throw new Error(`Файл «${entry.path}» повреждён`)
    }
  } finally {
    input.close()
  }

  if (!manifest || !databaseBytes) {
    if (stage.exists) stage.delete()
    throw new Error('Backup не содержит базы данных')
  }

  try {
    restoredDatabase = await deserializeDatabaseAsync(databaseBytes)
    await assertDatabaseHealthy(restoredDatabase)
    if ((await schemaSignature(restoredDatabase)) !== (await schemaSignature(db))) {
      throw new Error('Структура базы данных backup не соответствует этой версии MyMind')
    }

    const rollback = await createDurableMobileRestoreRollback(db)
    try {
      await swapRoots(stage)
      await restoreDatabase(restoredDatabase, db)
      commitDurableMobileRestore(rollback)
    } catch (reason) {
      try {
        await rollbackDurableMobileRestore(db, rollback)
      } catch (rollbackReason) {
        throw new AggregateError(
          [reason, rollbackReason],
          'Восстановление не удалось, а автоматический откат завершился ошибкой. MyMind повторит откат при следующем запуске.'
        )
      }
      throw reason
    }

    return {
      restored: true,
      createdAt: manifest.createdAt,
      files: manifest.entries.filter((entry) => entry.kind === 'file').length,
      bytes: manifest.entries.reduce((sum, entry) => sum + entry.size, 0)
    }
  } finally {
    if (restoredDatabase) await restoredDatabase.closeAsync().catch(() => undefined)
    if (stage.exists) stage.delete()
  }
}
