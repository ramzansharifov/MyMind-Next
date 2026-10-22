import { sha256 } from '@noble/hashes/sha2.js'
import type { Database } from 'sql.js'
import type { MobileBackupSummary } from '../../../mobile/src/shared/backup/mobileBackup'
import {
  MOBILE_BACKUP_FORMAT,
  MOBILE_BACKUP_VERSION,
  MOBILE_BACKUP_HEADER_SIZE,
  MOBILE_BACKUP_MAX_TOTAL_BYTES,
  MOBILE_BACKUP_MAX_MANIFEST_BYTES,
  decodeMobileBackupHeader,
  decodeMobileBackupManifest,
  encodeMobileBackupHeader,
  encodeMobileBackupManifest,
  type MobileBackupEntry,
  type MobileBackupManifestV1
} from '../../../mobile/src/shared/backup/archive'
import type { PwaDatabase } from './database'
import { applicationSchema, migrateDatabase, PWA_SCHEMA_VERSION } from './migrations'
import type { StoredAsset } from './indexed-db'
import { validateLibraryAssets } from './library-validation'
import { studyAssetExtension, studyAssetMimeType } from '@mymind/core/study-asset-file'

export const PWA_BACKUP_MAX_BYTES =
  MOBILE_BACKUP_MAX_TOTAL_BYTES + MOBILE_BACKUP_MAX_MANIFEST_BYTES + MOBILE_BACKUP_HEADER_SIZE
export async function digestBlob(blob: Blob): Promise<string> {
  const hash = sha256.create()
  const reader = blob.stream().getReader()
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      hash.update(chunk.value)
    }
    return [...hash.digest()].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  } finally {
    reader.releaseLock()
  }
}

export async function exportBackup(db: PwaDatabase): Promise<Blob> {
  await db.flush()
  const bytes = db.sqlite.export()
  db.sqlite.run('PRAGMA foreign_keys = ON')
  const assets = await db.disk.listAssets()
  const total = bytes.byteLength + assets.reduce((size, asset) => size + asset.blob.size, 0)
  if (total > MOBILE_BACKUP_MAX_TOTAL_BYTES)
    throw new Error('Размер резервной копии превышает ограничение формата MyMind (4 ГБ).')
  const entries: MobileBackupEntry[] = []
  const parts: BlobPart[] = []
  let offset = 0
  const add = async (path: string, kind: 'file' | 'database', blob: Blob): Promise<void> => {
    entries.push({ path, kind, size: blob.size, offset, sha256: await digestBlob(blob) })
    parts.push(blob)
    offset += blob.size
  }
  await add('database/mymind.sqlite', 'database', new Blob([new Uint8Array(bytes)]))
  for (const asset of assets) await add(asset.path, 'file', asset.blob)
  const manifest: MobileBackupManifestV1 = {
    format: MOBILE_BACKUP_FORMAT,
    version: MOBILE_BACKUP_VERSION,
    schemaVersion: PWA_SCHEMA_VERSION,
    createdAt: Date.now(),
    entries
  }
  const encoded = encodeMobileBackupManifest(manifest)
  return new Blob(
    [new Uint8Array(encodeMobileBackupHeader(encoded.length)), new Uint8Array(encoded), ...parts],
    { type: 'application/octet-stream' }
  )
}

// Read and validate the complete archive without touching IndexedDB or the
// live SQLite handle. Reuse this exact validation for inspection and restore.
async function readVerifiedBackup(
  db: PwaDatabase,
  file: Blob
): Promise<{ candidate: Database; assets: StoredAsset[]; summary: MobileBackupSummary }> {
  if (file.size > PWA_BACKUP_MAX_BYTES)
    throw new Error('Размер резервной копии превышает ограничение формата MyMind (4 ГБ).')
  const header = new Uint8Array(await file.slice(0, MOBILE_BACKUP_HEADER_SIZE).arrayBuffer())
  const length = decodeMobileBackupHeader(header)
  const payloadStart = MOBILE_BACKUP_HEADER_SIZE + length
  const manifest = decodeMobileBackupManifest(
    new Uint8Array(await file.slice(MOBILE_BACKUP_HEADER_SIZE, payloadStart).arrayBuffer()),
    file.size
  )
  if (manifest.schemaVersion > PWA_SCHEMA_VERSION)
    throw new Error('Обновите MyMind для восстановления этой копии.')
  const assets: StoredAsset[] = []
  let databaseBytes: Uint8Array | undefined
  for (const entry of manifest.entries) {
    const blob = file.slice(payloadStart + entry.offset, payloadStart + entry.offset + entry.size)
    if (blob.size !== entry.size || (await digestBlob(blob)) !== entry.sha256)
      throw new Error(`Резервная копия повреждена: ${entry.path}`)
    if (entry.kind === 'database') databaseBytes = new Uint8Array(await blob.arrayBuffer())
    else
      assets.push({
        path: entry.path,
        blob: blob.slice(0, blob.size, studyAssetMimeType(studyAssetExtension(entry.path)))
      })
  }
  if (!databaseBytes) throw new Error('В копии отсутствует база данных')
  const candidate = new db.engine.Database(databaseBytes)
  try {
    const actualVersion = Number(candidate.exec('PRAGMA user_version')[0]?.values[0]?.[0])
    if (actualVersion !== manifest.schemaVersion)
      throw new Error('Версия базы не совпадает с манифестом копии')
    const names = new Set(
      candidate
        .exec("SELECT name FROM sqlite_master WHERE type='table'")[0]
        ?.values.map(([name]) => String(name))
    )
    for (const table of ['tasks', 'notes', 'habits', 'mobile_preferences']) {
      if (!names.has(table)) throw new Error('Это не база MyMind')
    }
    migrateDatabase(candidate)
    const expected = new db.engine.Database()
    try {
      migrateDatabase(expected)
      if (applicationSchema(candidate) !== applicationSchema(expected)) {
        throw new Error('Структура базы не соответствует MyMind. Текущие данные сохранены.')
      }
    } finally {
      expected.close()
    }
    validateLibraryAssets(candidate, assets)
    return {
      candidate,
      assets,
      summary: {
        createdAt: manifest.createdAt,
        files: manifest.entries.filter((entry) => entry.kind === 'file').length,
        bytes: manifest.entries.reduce((total, entry) => total + entry.size, 0)
      }
    }
  } catch (error) {
    candidate.close()
    throw error
  }
}

/** Verify hashes, structure, foreign keys and attachments without importing. */
export async function verifyBackup(db: PwaDatabase, file: Blob): Promise<MobileBackupSummary> {
  const { candidate, summary } = await readVerifiedBackup(db, file)
  candidate.close()
  return summary
}

export async function restoreBackup(db: PwaDatabase, file: Blob): Promise<void> {
  const { candidate, assets } = await readVerifiedBackup(db, file)
  try {
    await db.replace(candidate, assets)
  } catch (error) {
    candidate.close()
    throw error
  }
}
