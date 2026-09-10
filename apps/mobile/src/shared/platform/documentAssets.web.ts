import * as DocumentPicker from 'expo-document-picker'
import { randomUUID } from 'expo-crypto'
import type { NoteVoiceRecordingMimeType } from '@mymind/contracts/notes'
import type {
  StudyAssetKind,
  StudyBlock,
  StudyDocument,
  StudyLocalAsset
} from '@mymind/contracts/study'
import { STUDY_SAFE_ID_PATTERN } from '@mymind/contracts/study'
import { noteVoiceRecordingFileName } from '@mymind/core/note-voice-recording'
import {
  isSupportedStudyAssetExtension,
  sanitizeStudyAssetFileName,
  studyAssetExtension,
  studyAssetMimeType
} from '@mymind/core/study-asset-file'
import { createCanonicalStudyAssetUrl, isSafeStudyAssetFileName } from '@mymind/core/study-assets'

type AssetBlock = Extract<StudyBlock, { type: 'image' | 'video' | 'audio' | 'file' }>

const sessionAssetUris = new Map<string, string>()

function key(ownerId: string, assetId: string): string {
  return `${ownerId}:${assetId}`
}

function assertSafeId(value: string, label: string): void {
  if (!STUDY_SAFE_ID_PATTERN.test(value)) throw new Error(`Некорректный ${label}`)
}

function isAssetBlock(block: StudyBlock): block is AssetBlock {
  return (
    block.type === 'image' ||
    block.type === 'video' ||
    block.type === 'audio' ||
    block.type === 'file'
  )
}

function localAssets(document: StudyDocument): StudyLocalAsset[] {
  return document.blocks.flatMap((block) => {
    if (!isAssetBlock(block) || block.source.type !== 'local' || !block.source.asset) return []
    return [block.source.asset]
  })
}

function replaceAsset(block: AssetBlock, asset: StudyLocalAsset): AssetBlock {
  const source = { type: 'local' as const, asset }
  switch (block.type) {
    case 'image':
      return { ...block, source }
    case 'video':
      return { ...block, source }
    case 'audio':
      return { ...block, source }
    case 'file':
      return { ...block, source }
  }
}

function pickerMimeTypes(kind: StudyAssetKind): string | string[] {
  if (kind === 'image') return 'image/*'
  if (kind === 'video') return 'video/*'
  if (kind === 'audio') return 'audio/*'
  return '*/*'
}

function assertAssetMetadata(ownerId: string, asset: StudyLocalAsset): void {
  assertSafeId(ownerId, 'идентификатор документа')
  assertSafeId(asset.id, 'идентификатор вложения')
  if (asset.materialId !== ownerId)
    throw new Error(`Вложение «${asset.name}» принадлежит другому документу`)
  if (!isSafeStudyAssetFileName(asset.name)) throw new Error('Некорректное имя вложения')
  const expectedUrl = createCanonicalStudyAssetUrl({
    materialId: ownerId,
    assetId: asset.id,
    fileName: asset.name
  })
  if (asset.url !== expectedUrl) throw new Error(`Некорректный URL вложения «${asset.name}»`)
}

async function blobSize(uri: string): Promise<number> {
  try {
    const response = await fetch(uri)
    const blob = await response.blob()
    return blob.size
  } catch {
    return 0
  }
}

export function createMobileDocumentAssetStore() {
  async function importAsset(
    ownerId: string,
    kind: StudyAssetKind
  ): Promise<StudyLocalAsset | null> {
    assertSafeId(ownerId, 'идентификатор документа')
    const result = await DocumentPicker.getDocumentAsync({
      type: pickerMimeTypes(kind),
      copyToCacheDirectory: false,
      multiple: false
    })
    if (result.canceled) return null
    const selected = result.assets[0]
    if (!selected) return null

    const extension = studyAssetExtension(selected.name)
    if (!isSupportedStudyAssetExtension(kind, extension))
      throw new Error('Формат выбранного файла не поддерживается для этого типа блока')

    const name = sanitizeStudyAssetFileName(selected.name)
    if (!isSafeStudyAssetFileName(name)) throw new Error('Некорректное имя вложения')

    const id = randomUUID()
    const asset: StudyLocalAsset = {
      id,
      materialId: ownerId,
      name,
      mimeType: selected.mimeType || studyAssetMimeType(extension),
      size: selected.size ?? (await blobSize(selected.uri)),
      url: createCanonicalStudyAssetUrl({ materialId: ownerId, assetId: id, fileName: name })
    }
    sessionAssetUris.set(key(ownerId, id), selected.uri)
    return asset
  }

  async function saveRecordedAudio(
    ownerId: string,
    input: { uri: string; mimeType: NoteVoiceRecordingMimeType }
  ): Promise<StudyLocalAsset> {
    assertSafeId(ownerId, 'идентификатор документа')
    const id = randomUUID()
    const name = noteVoiceRecordingFileName(input.mimeType)
    const asset: StudyLocalAsset = {
      id,
      materialId: ownerId,
      name,
      mimeType: input.mimeType,
      size: await blobSize(input.uri),
      url: createCanonicalStudyAssetUrl({ materialId: ownerId, assetId: id, fileName: name })
    }
    sessionAssetUris.set(key(ownerId, id), input.uri)
    return asset
  }

  async function validateDocumentAssets(ownerId: string, document: StudyDocument): Promise<void> {
    for (const asset of localAssets(document)) assertAssetMetadata(ownerId, asset)
  }

  async function duplicateDocumentAssets(
    sourceOwnerId: string,
    targetOwnerId: string,
    document: StudyDocument
  ): Promise<StudyDocument> {
    assertSafeId(sourceOwnerId, 'идентификатор исходного документа')
    assertSafeId(targetOwnerId, 'идентификатор копии документа')
    const duplicated = new Map<string, StudyLocalAsset>()
    const blocks: StudyBlock[] = []

    for (const block of document.blocks) {
      if (!isAssetBlock(block) || block.source.type !== 'local' || !block.source.asset) {
        blocks.push(block)
        continue
      }

      const sourceAsset = block.source.asset
      assertAssetMetadata(sourceOwnerId, sourceAsset)
      const sourceKey = key(sourceOwnerId, sourceAsset.id)
      let nextAsset = duplicated.get(sourceKey)
      if (!nextAsset) {
        const id = randomUUID()
        nextAsset = {
          ...sourceAsset,
          id,
          materialId: targetOwnerId,
          url: createCanonicalStudyAssetUrl({
            materialId: targetOwnerId,
            assetId: id,
            fileName: sourceAsset.name
          })
        }
        const uri = sessionAssetUris.get(sourceKey)
        if (uri) sessionAssetUris.set(key(targetOwnerId, id), uri)
        duplicated.set(sourceKey, nextAsset)
      }
      blocks.push(replaceAsset(block, nextAsset))
    }

    return { ...document, blocks }
  }

  async function cleanupDocumentAssets(ownerId: string, document: StudyDocument): Promise<void> {
    const referenced = new Set(localAssets(document).map((asset) => key(ownerId, asset.id)))
    for (const assetKey of [...sessionAssetUris.keys()]) {
      if (assetKey.startsWith(`${ownerId}:`) && !referenced.has(assetKey)) {
        sessionAssetUris.delete(assetKey)
      }
    }
  }

  async function removeAssetsForOwners(ownerIds: string[]): Promise<void> {
    const owners = new Set(ownerIds)
    for (const assetKey of [...sessionAssetUris.keys()]) {
      const separator = assetKey.indexOf(':')
      if (separator >= 0 && owners.has(assetKey.slice(0, separator))) {
        sessionAssetUris.delete(assetKey)
      }
    }
  }

  async function reconcileDocuments(documents: ReadonlyMap<string, StudyDocument>): Promise<void> {
    for (const assetKey of [...sessionAssetUris.keys()]) {
      const separator = assetKey.indexOf(':')
      if (separator < 0 || !documents.has(assetKey.slice(0, separator))) {
        sessionAssetUris.delete(assetKey)
      }
    }
    for (const [ownerId, document] of documents) await cleanupDocumentAssets(ownerId, document)
  }

  function resolveAssetUri(asset: StudyLocalAsset): string | null {
    try {
      assertAssetMetadata(asset.materialId, asset)
      return sessionAssetUris.get(key(asset.materialId, asset.id)) ?? null
    } catch {
      return null
    }
  }

  async function openAsset(asset: StudyLocalAsset): Promise<void> {
    const uri = resolveAssetUri(asset)
    if (!uri)
      throw new Error(
        'Вложение недоступно после перезагрузки Web preview. Постоянное хранение файлов проверяется на Android.'
      )
    window.open(uri, '_blank', 'noopener,noreferrer')
  }

  return {
    importAsset,
    saveRecordedAudio,
    validateDocumentAssets,
    duplicateDocumentAssets,
    cleanupDocumentAssets,
    removeAssetsForOwners,
    reconcileDocuments,
    resolveAssetUri,
    openAsset
  }
}
