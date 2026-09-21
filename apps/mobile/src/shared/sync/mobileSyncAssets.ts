import { Directory, File, FileMode, Paths } from 'expo-file-system'
import { sha256 } from '@noble/hashes/sha2.js'
import type {
  SyncAssetManifestEntry,
  SyncAssetReference,
  SyncDataSnapshot
} from '@mymind/contracts/profile-sync'
import { listSyncAssetReferences, parseSyncAssetPath } from '@mymind/core/sync-assets'

const CHUNK_SIZE = 1024 * 1024
const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function toHex(bytes: Uint8Array): string {
  let result = ''
  for (const byte of bytes) result += byte.toString(16).padStart(2, '0')
  return result
}

export function encodeSyncBase64(bytes: Uint8Array): string {
  let output = ''
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index] ?? 0
    const hasB = index + 1 < bytes.length
    const hasC = index + 2 < bytes.length
    const b = bytes[index + 1] ?? 0
    const c = bytes[index + 2] ?? 0
    output += BASE64[a >> 2]
    output += BASE64[((a & 3) << 4) | (b >> 4)]
    output += hasB ? BASE64[((b & 15) << 2) | (c >> 6)] : '='
    output += hasC ? BASE64[c & 63] : '='
  }
  return output
}

export function decodeSyncBase64(value: string): Uint8Array {
  if (
    value.length % 4 !== 0 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)
  ) {
    throw new Error('Повреждённый sync asset chunk')
  }
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0
  const output = new Uint8Array((value.length / 4) * 3 - padding)
  let cursor = 0
  for (let index = 0; index < value.length; index += 4) {
    const a = BASE64.indexOf(value[index] ?? '')
    const b = BASE64.indexOf(value[index + 1] ?? '')
    const cChar = value[index + 2] ?? '='
    const dChar = value[index + 3] ?? '='
    const c = cChar === '=' ? 0 : BASE64.indexOf(cChar)
    const d = dChar === '=' ? 0 : BASE64.indexOf(dChar)
    if (a < 0 || b < 0 || c < 0 || d < 0) throw new Error('Повреждённый sync asset chunk')
    if (cursor < output.length) output[cursor++] = (a << 2) | (b >> 4)
    if (cursor < output.length) output[cursor++] = ((b & 15) << 4) | (c >> 2)
    if (cursor < output.length) output[cursor++] = ((c & 3) << 6) | d
  }
  return output
}

function assertMobileAsset(reference: SyncAssetReference): void {
  parseSyncAssetPath(reference.path)
  if (reference.kind !== 'note-asset') {
    throw new Error('Этот тип файла не поддерживается мобильной синхронизацией')
  }
}

function assetFile(reference: SyncAssetReference): File {
  assertMobileAsset(reference)
  return new File(
    Paths.document,
    'document-assets',
    reference.ownerId,
    reference.assetId,
    reference.fileName
  )
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

export function collectMobileSyncAssetManifest(
  snapshot: SyncDataSnapshot
): SyncAssetManifestEntry[] {
  const result: SyncAssetManifestEntry[] = []
  for (const reference of listSyncAssetReferences(snapshot)) {
    const file = assetFile(reference)
    if (!file.exists) continue
    result.push({
      ...reference,
      size: file.size,
      sha256: hashFile(file)
    })
  }
  return result
}

export function readMobileSyncAssetChunks(
  entry: SyncAssetManifestEntry,
  onChunk: (offset: number, bytes: Uint8Array) => Promise<void>
): Promise<void> {
  const file = assetFile(entry)
  if (!file.exists || file.size !== entry.size) {
    throw new Error(`Файл «${entry.fileName}» изменился перед синхронизацией`)
  }

  return (async () => {
    const digest = sha256.create()
    const handle = file.open(FileMode.ReadOnly)
    try {
      if (entry.size === 0) {
        await onChunk(0, new Uint8Array())
      } else {
        let offset = 0
        while (offset < entry.size) {
          const bytes = handle.readBytes(Math.min(CHUNK_SIZE, entry.size - offset))
          if (bytes.length === 0) throw new Error(`Не удалось прочитать «${entry.fileName}»`)
          digest.update(bytes)
          await onChunk(offset, bytes)
          offset += bytes.length
        }
      }
      const actual = toHex(digest.digest())
      if (actual !== entry.sha256) {
        throw new Error(`Файл «${entry.fileName}» изменился во время синхронизации`)
      }
    } finally {
      handle.close()
    }
  })()
}

function stageDirectory(planId: string, reference: SyncAssetReference): Directory {
  if (!/^[a-zA-Z0-9_-]{1,120}$/.test(planId)) throw new Error('Некорректный sync plan id')
  assertMobileAsset(reference)
  return new Directory(
    Paths.cache,
    'mymind-sync',
    planId,
    'notes',
    reference.ownerId,
    reference.assetId,
    reference.fileName
  )
}

function partFile(planId: string, reference: SyncAssetReference, offset: number): File {
  const directory = stageDirectory(planId, reference)
  directory.create({ intermediates: true, idempotent: true })
  return new File(directory, `${offset}.part`)
}

export function stageMobileSyncAssetChunk(
  planId: string,
  entry: SyncAssetManifestEntry,
  offset: number,
  bytes: Uint8Array
): void {
  const reference = parseSyncAssetPath(entry.path)
  if (
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    bytes.length > CHUNK_SIZE ||
    offset + bytes.length > entry.size
  ) {
    throw new Error('Некорректный диапазон sync asset')
  }
  const file = partFile(planId, reference, offset)
  file.create({ overwrite: true })
  const output = file.open(FileMode.Truncate)
  try {
    output.writeBytes(bytes)
  } finally {
    output.close()
  }
  if (!file.exists || file.size !== bytes.length) {
    throw new Error(`Не удалось сохранить часть файла «${entry.fileName}»`)
  }
}

function sortedParts(planId: string, reference: SyncAssetReference): File[] {
  const directory = stageDirectory(planId, reference)
  if (!directory.exists) return []
  return directory
    .list()
    .filter((entry): entry is File => entry instanceof File && /^\d+\.part$/.test(entry.name))
    .sort(
      (left, right) =>
        Number(left.name.slice(0, -'.part'.length)) - Number(right.name.slice(0, -'.part'.length))
    )
}

export function verifyStagedMobileSyncAsset(
  planId: string,
  entry: SyncAssetManifestEntry
): void {
  const reference = parseSyncAssetPath(entry.path)
  const digest = sha256.create()
  let expectedOffset = 0
  for (const part of sortedParts(planId, reference)) {
    const offset = Number(part.name.slice(0, -'.part'.length))
    if (offset !== expectedOffset) throw new Error(`Файл «${entry.fileName}» загружен не полностью`)
    const input = part.open(FileMode.ReadOnly)
    try {
      let remaining = part.size
      while (remaining > 0) {
        const bytes = input.readBytes(Math.min(CHUNK_SIZE, remaining))
        if (bytes.length === 0) throw new Error(`Не удалось проверить «${entry.fileName}»`)
        digest.update(bytes)
        expectedOffset += bytes.length
        remaining -= bytes.length
      }
    } finally {
      input.close()
    }
  }
  if (entry.size === 0 && expectedOffset === 0) {
    digest.update(new Uint8Array())
  }
  if (expectedOffset !== entry.size || toHex(digest.digest()) !== entry.sha256) {
    throw new Error(`Файл «${entry.fileName}» повреждён во время синхронизации`)
  }
}

export function commitMobileSyncAssets(
  planId: string,
  entries: readonly SyncAssetManifestEntry[]
): void {
  for (const entry of entries) {
    verifyStagedMobileSyncAsset(planId, entry)
    const reference = parseSyncAssetPath(entry.path)
    const target = assetFile(reference)
    assertMobileAsset(reference)
    const parent = new Directory(
      Paths.document,
      'document-assets',
      reference.ownerId,
      reference.assetId
    )
    parent.create({ intermediates: true, idempotent: true })

    target.create({ overwrite: true })
    const output = target.open(FileMode.Truncate)
    try {
      for (const part of sortedParts(planId, reference)) {
        const input = part.open(FileMode.ReadOnly)
        try {
          let remaining = part.size
          while (remaining > 0) {
            const bytes = input.readBytes(Math.min(CHUNK_SIZE, remaining))
            if (bytes.length === 0) throw new Error(`Не удалось применить «${entry.fileName}»`)
            output.writeBytes(bytes)
            remaining -= bytes.length
          }
        } finally {
          input.close()
        }
      }
    } finally {
      output.close()
    }

    if (!target.exists || target.size !== entry.size || hashFile(target) !== entry.sha256) {
      if (target.exists) target.delete()
      throw new Error(`Не удалось проверить сохранённый файл «${entry.fileName}»`)
    }
  }
}

export function cleanupMobileSyncAssetStage(planId: string): void {
  if (!/^[a-zA-Z0-9_-]{1,120}$/.test(planId)) return
  const directory = new Directory(Paths.cache, 'mymind-sync', planId)
  if (directory.exists) directory.delete()
}

export function removeMobileSyncAssets(references: readonly SyncAssetReference[]): void {
  for (const reference of references) {
    if (reference.kind !== 'note-asset') continue
    const file = assetFile(reference)
    const parent = new Directory(
      Paths.document,
      'document-assets',
      reference.ownerId,
      reference.assetId
    )
    try {
      if (parent.exists) parent.delete()
      else if (file.exists) file.delete()
    } catch (reason) {
      console.warn('Failed to remove obsolete synced asset', reference.path, reason)
    }
  }
}
