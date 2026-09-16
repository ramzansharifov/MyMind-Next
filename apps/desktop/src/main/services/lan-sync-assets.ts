import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import {
  appendFile,
  mkdir,
  readFile,
  rename,
  rm,
  stat
} from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

import type {
  SyncAssetManifestEntry,
  SyncAssetReference,
  SyncDataSnapshot
} from '@mymind/contracts/profile-sync'
import { listSyncAssetReferences, parseSyncAssetPath } from '@mymind/core/sync-assets'
import type { SqlDatabasePort } from '@mymind/contracts/storage'
import { createCanonicalStudyAssetUrl } from '../../shared/study-assets'
import { getStudyAttachmentsRoot } from './storage-location'

const MAX_CHUNK_BYTES = 1024 * 1024

async function sha256File(path: string): Promise<string> {
  const hash = createHash('sha256')
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const stream = createReadStream(path)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.once('end', resolvePromise)
    stream.once('error', rejectPromise)
  })
  return hash.digest('hex')
}

function physicalPath(reference: SyncAssetReference): string {
  const root = resolve(getStudyAttachmentsRoot())
  const path =
    reference.kind === 'note-asset'
      ? resolve(root, reference.ownerId, reference.assetId, reference.fileName)
      : resolve(
          root,
          `workout-progress-${reference.ownerId}`,
          reference.assetId,
          reference.fileName
        )
  if (!path.startsWith(root + (process.platform === 'win32' ? '\\' : '/'))) {
    throw new Error('Некорректный путь sync asset')
  }
  return path
}

function temporaryPath(reference: SyncAssetReference, planId: string): string {
  const finalPath = physicalPath(reference)
  if (!/^[a-zA-Z0-9_-]{1,120}$/.test(planId)) throw new Error('Некорректный sync plan id')
  return `${finalPath}.sync-${planId}.tmp`
}

export async function collectDesktopSyncAssetManifest(
  snapshot: SyncDataSnapshot
): Promise<SyncAssetManifestEntry[]> {
  const result: SyncAssetManifestEntry[] = []
  for (const reference of listSyncAssetReferences(snapshot)) {
    const path = physicalPath(reference)
    const info = await stat(path).catch(() => null)
    if (!info?.isFile() || info.size <= 0) continue
    result.push({
      ...reference,
      size: info.size,
      sha256: await sha256File(path)
    })
  }
  return result
}

export async function readDesktopSyncAssetChunk(
  path: string,
  offset: number,
  length: number
): Promise<Buffer> {
  const reference = parseSyncAssetPath(path)
  if (
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    !Number.isSafeInteger(length) ||
    length <= 0 ||
    length > MAX_CHUNK_BYTES
  ) {
    throw new Error('Некорректный диапазон sync asset')
  }

  const filePath = physicalPath(reference)
  const info = await stat(filePath).catch(() => null)
  if (!info?.isFile()) throw new Error('Файл sync asset не найден')
  if (offset > info.size) throw new Error('Некорректное смещение sync asset')
  const bytesToRead = Math.min(length, info.size - offset)
  if (bytesToRead === 0) return Buffer.alloc(0)

  const handle = await import('node:fs/promises').then(({ open }) => open(filePath, 'r'))
  try {
    const buffer = Buffer.allocUnsafe(bytesToRead)
    const { bytesRead } = await handle.read(buffer, 0, bytesToRead, offset)
    return buffer.subarray(0, bytesRead)
  } finally {
    await handle.close()
  }
}

export async function stageDesktopSyncAssetChunk(
  planId: string,
  expected: SyncAssetManifestEntry,
  offset: number,
  bytes: Uint8Array
): Promise<{ received: number; complete: boolean }> {
  const reference = parseSyncAssetPath(expected.path)
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_CHUNK_BYTES) {
    throw new Error('Некорректный размер sync asset chunk')
  }
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > expected.size) {
    throw new Error('Некорректное смещение sync asset chunk')
  }

  const temp = temporaryPath(reference, planId)
  const current = await stat(temp).catch(() => null)
  const currentSize = current?.isFile() ? current.size : 0
  if (currentSize !== offset) throw new Error('Нарушен порядок загрузки sync asset')
  if (offset + bytes.byteLength > expected.size) {
    throw new Error('Sync asset превышает заявленный размер')
  }

  await mkdir(dirname(temp), { recursive: true })
  await appendFile(temp, bytes)
  const received = offset + bytes.byteLength
  const complete = received === expected.size

  if (complete) {
    const digest = await sha256File(temp)
    if (digest !== expected.sha256) {
      await rm(temp, { force: true })
      throw new Error('Контрольная сумма загруженного sync asset не совпадает')
    }
  }

  return { received, complete }
}

export async function commitDesktopSyncAssets(
  planId: string,
  uploads: readonly SyncAssetManifestEntry[]
): Promise<void> {
  for (const entry of uploads) {
    const reference = parseSyncAssetPath(entry.path)
    const temp = temporaryPath(reference, planId)
    const staged = await stat(temp).catch(() => null)
    if (!staged?.isFile() || staged.size !== entry.size) {
      throw new Error(`Файл «${entry.fileName}» загружен не полностью`)
    }
    if ((await sha256File(temp)) !== entry.sha256) {
      throw new Error(`Файл «${entry.fileName}» повреждён во время синхронизации`)
    }

    const destination = physicalPath(reference)
    const existing = await stat(destination).catch(() => null)
    if (existing?.isFile()) {
      if (existing.size === entry.size && (await sha256File(destination)) === entry.sha256) {
        await rm(temp, { force: true })
        continue
      }
      throw new Error(`Локальный файл «${entry.fileName}» изменился во время синхронизации`)
    }

    await mkdir(dirname(destination), { recursive: true })
    await rename(temp, destination)
  }
}

export async function cleanupDesktopSyncAssetStage(
  planId: string,
  uploads: readonly SyncAssetManifestEntry[]
): Promise<void> {
  for (const entry of uploads) {
    const reference = parseSyncAssetPath(entry.path)
    await rm(temporaryPath(reference, planId), { force: true }).catch(() => undefined)
  }
}

export function normalizeDesktopWorkoutPhotoUrls(
  database: SqlDatabasePort,
  snapshot: SyncDataSnapshot
): void {
  const workouts = snapshot.modules.find((module) => module.module === 'workouts')
  const photos = workouts?.tables.find((table) => table.table === 'workout_progress_photos')
  if (!photos) return

  const statement = database.prepare(
    'UPDATE workout_progress_photos SET url = ? WHERE id = ? AND entry_id = ? AND asset_id = ?'
  )
  for (const row of photos.rows) {
    const id = row.data.id
    const entryId = row.data.entry_id
    const assetId = row.data.asset_id
    const fileName = row.data.file_name
    if (
      typeof id !== 'string' ||
      typeof entryId !== 'string' ||
      typeof assetId !== 'string' ||
      typeof fileName !== 'string'
    ) {
      throw new Error('Некорректная фотография прогресса в sync snapshot')
    }
    statement.run(
      createCanonicalStudyAssetUrl({
        materialId: `workout-progress-${entryId}`,
        assetId,
        fileName
      }),
      id,
      entryId,
      assetId
    )
  }
}
