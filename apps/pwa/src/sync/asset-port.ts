import { sha256 } from '@noble/hashes/sha2.js'
import type {
  SyncAssetManifestEntry,
  SyncAssetReference,
  SyncDataSnapshot
} from '@mymind/contracts/profile-sync'
import { listSyncAssetReferences, parseSyncAssetPath } from '@mymind/core/sync-assets'
import { studyAssetExtension, studyAssetMimeType } from '@mymind/core/study-asset-file'
import type { PwaDatabase } from '../storage/database'
import { digestBlob } from '../storage/backup'

const CHUNK_BYTES = 1024 * 1024
export function localSyncAssetPath(reference: SyncAssetReference): string {
  const parsed = parseSyncAssetPath(reference.path)
  return `${parsed.kind === 'note-asset' ? 'document-assets' : 'workout-progress'}/${parsed.ownerId}/${parsed.assetId}/${parsed.fileName}`
}

export interface SyncAssetPort {
  collectMobileSyncAssetManifest(snapshot: SyncDataSnapshot): Promise<SyncAssetManifestEntry[]>
  readMobileSyncAssetChunks(
    entry: SyncAssetManifestEntry,
    operation: (offset: number, bytes: Uint8Array) => Promise<void>
  ): Promise<void>
  stageMobileSyncAssetChunk(
    plan: string,
    entry: SyncAssetManifestEntry,
    offset: number,
    bytes: Uint8Array
  ): Promise<void>
  verifyStagedMobileSyncAsset(plan: string, entry: SyncAssetManifestEntry): Promise<void>
  commitMobileSyncAssets(plan: string, entries: readonly SyncAssetManifestEntry[]): Promise<void>
  cleanupMobileSyncAssetStage(plan: string): Promise<void>
  removeMobileSyncAssets(references: readonly SyncAssetReference[]): Promise<void>
  encodeSyncBase64(bytes: Uint8Array): string
  decodeSyncBase64(value: string): Uint8Array
}

export function createPwaSyncAssets(db: PwaDatabase): SyncAssetPort {
  type Part = { key: string; size: number }
  const stages = new Map<string, Map<string, Part[]>>()
  const prefix = (plan: string): string => {
    if (!/^[a-zA-Z0-9_-]{1,120}$/.test(plan)) throw new Error('Некорректный план передачи вложений')
    return `sync-stage:${plan}:`
  }
  const read = async (entry: SyncAssetReference): Promise<Blob | undefined> => {
    parseSyncAssetPath(entry.path)
    return (await db.disk.listAssets()).find((asset) => asset.path === localSyncAssetPath(entry))
      ?.blob
  }
  const staged = (plan: string, entry: SyncAssetManifestEntry): Part[] => {
    parseSyncAssetPath(entry.path)
    const chunks = stages.get(plan)?.get(entry.path)
    if (!chunks) throw new Error(`Не загружено вложение «${entry.fileName}»`)
    return chunks
  }
  const verify = async (plan: string, entry: SyncAssetManifestEntry): Promise<void> => {
    const chunks = staged(plan, entry)
    const hash = sha256.create()
    let size = 0
    for (const chunk of chunks) {
      const blob = await db.disk.readState<Blob>(chunk.key)
      if (!blob || blob.size !== chunk.size)
        throw new Error('Часть вложения отсутствует в локальном хранилище')
      size += blob.size
      hash.update(new Uint8Array(await blob.arrayBuffer()))
    }
    const actual = [...hash.digest()].map((byte) => byte.toString(16).padStart(2, '0')).join('')
    if (size !== entry.size || actual !== entry.sha256)
      throw new Error(`Повреждено вложение «${entry.fileName}»`)
  }
  return {
    async collectMobileSyncAssetManifest(snapshot) {
      const files = new Map((await db.disk.listAssets()).map((asset) => [asset.path, asset.blob]))
      const entries: SyncAssetManifestEntry[] = []
      for (const reference of listSyncAssetReferences(snapshot)) {
        parseSyncAssetPath(reference.path)
        const blob = files.get(localSyncAssetPath(reference))
        if (blob)
          entries.push({
            ...reference,
            size: blob.size,
            sha256: await digestBlob(blob)
          })
      }
      return entries
    },
    async readMobileSyncAssetChunks(entry, operation) {
      const blob = await read(entry)
      if (!blob || blob.size !== entry.size)
        throw new Error(`Не найдено вложение «${entry.fileName}»`)
      const hash = sha256.create()
      if (!blob.size) await operation(0, new Uint8Array())
      for (let offset = 0; offset < blob.size; offset += CHUNK_BYTES) {
        const bytes = new Uint8Array(await blob.slice(offset, offset + CHUNK_BYTES).arrayBuffer())
        hash.update(bytes)
        await operation(offset, bytes)
      }
      const actual = [...hash.digest()].map((byte) => byte.toString(16).padStart(2, '0')).join('')
      if (actual !== entry.sha256) throw new Error('Вложение изменилось во время отправки')
    },
    async stageMobileSyncAssetChunk(plan, entry, offset, bytes) {
      parseSyncAssetPath(entry.path)
      if (offset < 0 || bytes.length > CHUNK_BYTES || offset + bytes.length > entry.size)
        throw new Error('Некорректный размер части вложения')
      let files = stages.get(plan)
      if (!files) {
        files = new Map()
        stages.set(plan, files)
      }
      let chunks = files.get(entry.path)
      if (!chunks) {
        chunks = []
        files.set(entry.path, chunks)
      }
      if (chunks.reduce((sum, chunk) => sum + chunk.size, 0) !== offset)
        throw new Error('Нарушен порядок частей вложения')
      const key = `${prefix(plan)}${entry.path}:${offset}`
      await db.disk.writeState(key, new Blob([new Uint8Array(bytes)]))
      chunks.push({ key, size: bytes.length })
    },
    verifyStagedMobileSyncAsset: verify,
    async commitMobileSyncAssets(plan, entries) {
      for (const entry of entries) await verify(plan, entry)
      for (const entry of entries) {
        const chunks: Blob[] = []
        for (const part of staged(plan, entry)) {
          const blob = await db.disk.readState<Blob>(part.key)
          if (!blob) throw new Error('Часть вложения не найдена')
          chunks.push(blob)
        }
        await db.disk.putAsset({
          path: localSyncAssetPath(entry),
          blob: new Blob(chunks, { type: studyAssetMimeType(studyAssetExtension(entry.fileName)) })
        })
      }
    },
    cleanupMobileSyncAssetStage: async (plan) => {
      await db.disk.clearStates(prefix(plan))
      stages.delete(plan)
    },
    async removeMobileSyncAssets(references) {
      await db.flush()
      for (const reference of references) parseSyncAssetPath(reference.path)
      await db.disk.deleteAssets(references.map(localSyncAssetPath))
    },
    encodeSyncBase64(bytes) {
      let binary = ''
      for (let offset = 0; offset < bytes.length; offset += 16_384)
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 16_384))
      return btoa(binary)
    },
    decodeSyncBase64(value) {
      if (
        value.length > 2 * CHUNK_BYTES ||
        value.length % 4 !== 0 ||
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)
      )
        throw new Error('Некорректная кодировка вложения')
      return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
    }
  }
}
