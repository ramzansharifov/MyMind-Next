import type {
  StudyAssetKind,
  StudyBlock,
  StudyDocument,
  StudyLocalAsset
} from '@mymind/contracts/study'
import { STUDY_SAFE_ID_PATTERN } from '@mymind/contracts/study'
import type { DocumentAssetStore } from '../client/shared/platform/documentAssets'
import type { NoteVoiceRecordingMimeType } from '@mymind/contracts/notes'
import {
  assertNoteVoiceRecordingSize,
  noteVoiceRecordingFileName
} from '@mymind/core/note-voice-recording'
import { createCanonicalStudyAssetUrl, isSafeStudyAssetFileName } from '@mymind/core/study-assets'
import {
  isSupportedStudyAssetExtension,
  sanitizeStudyAssetFileName,
  studyAssetExtension
} from '@mymind/core/study-asset-file'
import type { PwaDisk, StoredAsset } from './indexed-db'
import { download, pickFile } from '../platform/files'

type AssetBlock = Extract<StudyBlock, { type: 'image' | 'video' | 'audio' | 'file' }>
function attached(block: StudyBlock): block is AssetBlock {
  return ['image', 'video', 'audio', 'file'].includes(block.type)
}
export function assetPath(asset: StudyLocalAsset): string {
  if (
    !STUDY_SAFE_ID_PATTERN.test(asset.materialId) ||
    !STUDY_SAFE_ID_PATTERN.test(asset.id) ||
    !isSafeStudyAssetFileName(asset.name)
  ) {
    throw new Error('Некорректный путь вложения')
  }
  const url = createCanonicalStudyAssetUrl({
    materialId: asset.materialId,
    assetId: asset.id,
    fileName: asset.name
  })
  if (url !== asset.url) throw new Error('Некорректный URL вложения')
  return `document-assets/${asset.materialId}/${asset.id}/${asset.name}`
}

export async function createPwaAssetStore(
  disk: PwaDisk
): Promise<DocumentAssetStore & { reload(): Promise<void>; dispose(): void }> {
  const assets = new Map<string, { blob: Blob; uri: string }>()
  const reservations = new Map<string, number>()
  const register = ({ path, blob }: StoredAsset): void => {
    const previous = assets.get(path)
    if (previous) URL.revokeObjectURL(previous.uri)
    assets.set(path, { blob, uri: URL.createObjectURL(blob) })
  }
  async function reload(): Promise<void> {
    const saved = await disk.listAssets()
    for (const entry of assets.values()) URL.revokeObjectURL(entry.uri)
    assets.clear()
    for (const asset of saved) register(asset)
  }
  await reload()

  async function save(ownerId: string, name: string, blob: Blob): Promise<StudyLocalAsset> {
    const id = crypto.randomUUID()
    const asset = {
      id,
      materialId: ownerId,
      name,
      mimeType: blob.type || 'application/octet-stream',
      size: blob.size,
      url: createCanonicalStudyAssetUrl({ materialId: ownerId, assetId: id, fileName: name })
    }
    const path = assetPath(asset)
    await disk.putAsset({ path, blob })
    register({ path, blob })
    reservations.set(path, Date.now())
    return asset
  }
  async function remove(paths: string[]): Promise<void> {
    await disk.deleteAssets(paths)
    for (const path of paths) {
      const entry = assets.get(path)
      if (entry) URL.revokeObjectURL(entry.uri)
      assets.delete(path)
      reservations.delete(path)
    }
  }
  function referenced(document: StudyDocument): StudyLocalAsset[] {
    return document.blocks.flatMap((block) =>
      attached(block) && block.source.type === 'local' && block.source.asset
        ? [block.source.asset]
        : []
    )
  }
  return {
    reload,
    dispose() {
      for (const entry of assets.values()) URL.revokeObjectURL(entry.uri)
      assets.clear()
      reservations.clear()
    },
    async importAsset(ownerId: string, kind: StudyAssetKind) {
      const file = await pickFile(kind === 'file' ? '*/*' : `${kind}/*`)
      if (!file) return null
      if (!isSupportedStudyAssetExtension(kind, studyAssetExtension(file.name)))
        throw new Error('Формат файла не поддерживается')
      return save(ownerId, sanitizeStudyAssetFileName(file.name), file)
    },
    async saveRecordedAudio(
      ownerId: string,
      input: { uri: string; mimeType: NoteVoiceRecordingMimeType }
    ) {
      const response = await fetch(input.uri)
      const blob = await response.blob()
      assertNoteVoiceRecordingSize(blob.size)
      return save(ownerId, noteVoiceRecordingFileName(input.mimeType), blob)
    },
    async validateDocumentAssets(ownerId, document) {
      for (const asset of referenced(document)) {
        if (asset.materialId !== ownerId || !assets.has(assetPath(asset)))
          throw new Error(`Вложение «${asset.name}» не найдено на устройстве`)
      }
    },
    async duplicateDocumentAssets(sourceOwnerId, targetOwnerId, document) {
      const duplicated = new Map<string, StudyLocalAsset>()
      const blocks: StudyBlock[] = []
      for (const block of document.blocks) {
        if (!attached(block) || block.source.type !== 'local' || !block.source.asset) {
          blocks.push(block)
          continue
        }
        const source = block.source.asset
        if (source.materialId !== sourceOwnerId)
          throw new Error('Вложение принадлежит другому документу')
        const path = assetPath(source)
        let next = duplicated.get(path)
        if (!next) {
          const entry = assets.get(path)
          if (!entry) throw new Error(`Вложение «${source.name}» не найдено`)
          next = await save(targetOwnerId, source.name, entry.blob)
          duplicated.set(path, next)
        }
        blocks.push({ ...block, source: { type: 'local', asset: next } } as AssetBlock)
      }
      return { ...document, blocks }
    },
    async cleanupDocumentAssets(ownerId, document) {
      const keep = new Set(referenced(document).map(assetPath))
      for (const path of keep) reservations.delete(path)
      await remove(
        [...assets.keys()].filter(
          (path) =>
            path.startsWith(`document-assets/${ownerId}/`) &&
            !keep.has(path) &&
            Date.now() - (reservations.get(path) ?? 0) > 600_000
        )
      )
    },
    async removeAssetsForOwners(ownerIds) {
      const owners = new Set(ownerIds)
      await remove([...assets.keys()].filter((path) => owners.has(path.split('/')[1])))
    },
    async reconcileDocuments() {
      // Do not delete files during startup: restored files may belong to modules not mounted yet.
    },
    resolveAssetUri(asset) {
      try {
        return assets.get(assetPath(asset))?.uri ?? null
      } catch {
        return null
      }
    },
    async openAsset(asset) {
      const entry = assets.get(assetPath(asset))
      if (!entry) throw new Error(`Вложение «${asset.name}» не найдено`)
      download(entry.blob, asset.name)
    }
  }
}
