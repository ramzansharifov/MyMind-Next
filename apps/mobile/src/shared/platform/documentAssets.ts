import * as DocumentPicker from 'expo-document-picker'
import { randomUUID } from 'expo-crypto'
import { Directory, File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import type {
  StudyAssetKind,
  StudyBlock,
  StudyDocument,
  StudyLocalAsset
} from '@mymind/contracts/study'
import { STUDY_SAFE_ID_PATTERN } from '@mymind/contracts/study'
import {
  isSupportedStudyAssetExtension,
  sanitizeStudyAssetFileName,
  studyAssetExtension,
  studyAssetMimeType
} from '@mymind/core/study-asset-file'
import { createCanonicalStudyAssetUrl, isSafeStudyAssetFileName } from '@mymind/core/study-assets'

const ASSET_ROOT = 'document-assets'
const RESERVATION_TTL_MS = 10 * 60_000

interface AssetReservation {
  ownerId: string
  assetId: string
  createdAt: number
}

const reservations = new Map<string, AssetReservation>()

type AssetBlock = Extract<StudyBlock, { type: 'image' | 'video' | 'audio' | 'file' }>

function reservationKey(ownerId: string, assetId: string): string {
  return `${ownerId}:${assetId}`
}

function reserve(ownerId: string, assetId: string): void {
  reservations.set(reservationKey(ownerId, assetId), {
    ownerId,
    assetId,
    createdAt: Date.now()
  })
}

function activeReservations(ownerId: string): Set<string> {
  const now = Date.now()
  const result = new Set<string>()
  for (const [key, reservation] of reservations) {
    if (now - reservation.createdAt >= RESERVATION_TTL_MS) reservations.delete(key)
    else if (reservation.ownerId === ownerId) result.add(reservation.assetId)
  }
  return result
}

function assertSafeId(value: string, label: string): void {
  if (!STUDY_SAFE_ID_PATTERN.test(value)) throw new Error(`Некорректный ${label}`)
}

function ownerDirectory(ownerId: string): Directory {
  assertSafeId(ownerId, 'идентификатор документа')
  return new Directory(Paths.document, ASSET_ROOT, ownerId)
}

function assetDirectory(ownerId: string, assetId: string): Directory {
  assertSafeId(assetId, 'идентификатор вложения')
  return new Directory(ownerDirectory(ownerId), assetId)
}

function assetFile(asset: StudyLocalAsset): File {
  assertSafeId(asset.materialId, 'идентификатор документа')
  assertSafeId(asset.id, 'идентификатор вложения')
  if (!isSafeStudyAssetFileName(asset.name)) throw new Error('Некорректное имя вложения')
  const expectedUrl = createCanonicalStudyAssetUrl({
    materialId: asset.materialId,
    assetId: asset.id,
    fileName: asset.name
  })
  if (asset.url !== expectedUrl) throw new Error(`Некорректный URL вложения «${asset.name}»`)
  return new File(assetDirectory(asset.materialId, asset.id), asset.name)
}

function isAssetBlock(block: StudyBlock): block is AssetBlock {
  return (
    block.type === 'image' ||
    block.type === 'video' ||
    block.type === 'audio' ||
    block.type === 'file'
  )
}

function pickerMimeTypes(kind: StudyAssetKind): string | string[] {
  if (kind === 'image') return 'image/*'
  if (kind === 'video') return 'video/*'
  if (kind === 'audio') return 'audio/*'
  return '*/*'
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

export interface MobileDocumentAssetStore {
  importAsset(ownerId: string, kind: StudyAssetKind): Promise<StudyLocalAsset | null>
  validateDocumentAssets(ownerId: string, document: StudyDocument): Promise<void>
  duplicateDocumentAssets(
    sourceOwnerId: string,
    targetOwnerId: string,
    document: StudyDocument
  ): Promise<StudyDocument>
  cleanupDocumentAssets(ownerId: string, document: StudyDocument): Promise<void>
  removeAssetsForOwners(ownerIds: string[]): Promise<void>
  reconcileDocuments(documents: ReadonlyMap<string, StudyDocument>): Promise<void>
  resolveAssetUri(asset: StudyLocalAsset): string | null
  openAsset(asset: StudyLocalAsset): Promise<void>
}

export function createMobileDocumentAssetStore(): MobileDocumentAssetStore {
  async function importAsset(
    ownerId: string,
    kind: StudyAssetKind
  ): Promise<StudyLocalAsset | null> {
    assertSafeId(ownerId, 'идентификатор документа')
    const result = await DocumentPicker.getDocumentAsync({
      type: pickerMimeTypes(kind),
      copyToCacheDirectory: true,
      multiple: false
    })
    if (result.canceled) return null
    const selected = result.assets[0]
    if (!selected) return null

    const extension = studyAssetExtension(selected.name)
    if (!isSupportedStudyAssetExtension(kind, extension))
      throw new Error('Формат выбранного файла не поддерживается для этого типа блока')

    const fileName = sanitizeStudyAssetFileName(selected.name)
    if (!isSafeStudyAssetFileName(fileName)) throw new Error('Некорректное имя вложения')

    const id = randomUUID()
    const directory = assetDirectory(ownerId, id)
    const target = new File(directory, fileName)
    try {
      directory.create({ intermediates: true, idempotent: false })
      await new File(selected.uri).copy(target)
      if (!target.exists) throw new Error('Не удалось сохранить вложение')
      reserve(ownerId, id)
      return {
        id,
        materialId: ownerId,
        name: fileName,
        mimeType: selected.mimeType || target.type || studyAssetMimeType(extension),
        size: target.size,
        url: createCanonicalStudyAssetUrl({ materialId: ownerId, assetId: id, fileName })
      }
    } catch (reason) {
      if (directory.exists) directory.delete()
      throw reason
    }
  }

  async function validateDocumentAssets(ownerId: string, document: StudyDocument): Promise<void> {
    assertSafeId(ownerId, 'идентификатор документа')
    for (const asset of localAssets(document)) {
      if (asset.materialId !== ownerId)
        throw new Error(`Вложение «${asset.name}» принадлежит другому документу`)
      const file = assetFile(asset)
      if (!file.exists) throw new Error(`Вложение «${asset.name}» не найдено`)
    }
  }

  async function duplicateDocumentAssets(
    sourceOwnerId: string,
    targetOwnerId: string,
    document: StudyDocument
  ): Promise<StudyDocument> {
    assertSafeId(sourceOwnerId, 'идентификатор исходного документа')
    assertSafeId(targetOwnerId, 'идентификатор копии документа')
    const duplicated = new Map<string, StudyLocalAsset>()
    try {
      const blocks: StudyBlock[] = []
      for (const block of document.blocks) {
        if (!isAssetBlock(block) || block.source.type !== 'local' || !block.source.asset) {
          blocks.push(block)
          continue
        }
        const sourceAsset = block.source.asset
        if (sourceAsset.materialId !== sourceOwnerId)
          throw new Error(`Вложение «${sourceAsset.name}» принадлежит другому документу`)
        const key = `${sourceAsset.materialId}:${sourceAsset.id}`
        let nextAsset = duplicated.get(key)
        if (!nextAsset) {
          const sourceFile = assetFile(sourceAsset)
          if (!sourceFile.exists) throw new Error(`Вложение «${sourceAsset.name}» не найдено`)
          const id = randomUUID()
          const directory = assetDirectory(targetOwnerId, id)
          const target = new File(directory, sourceAsset.name)
          directory.create({ intermediates: true, idempotent: false })
          await sourceFile.copy(target)
          if (!target.exists) throw new Error(`Не удалось скопировать «${sourceAsset.name}»`)
          nextAsset = {
            ...sourceAsset,
            id,
            materialId: targetOwnerId,
            size: target.size,
            url: createCanonicalStudyAssetUrl({
              materialId: targetOwnerId,
              assetId: id,
              fileName: sourceAsset.name
            })
          }
          duplicated.set(key, nextAsset)
        }
        blocks.push(replaceAsset(block, nextAsset))
      }
      return { ...document, blocks }
    } catch (reason) {
      const directory = ownerDirectory(targetOwnerId)
      if (directory.exists) directory.delete()
      throw reason
    }
  }

  async function cleanupDocumentAssets(ownerId: string, document: StudyDocument): Promise<void> {
    assertSafeId(ownerId, 'идентификатор документа')
    const referenced = new Set(
      localAssets(document)
        .filter((asset) => asset.materialId === ownerId)
        .map((asset) => asset.id)
    )
    for (const assetId of referenced) reservations.delete(reservationKey(ownerId, assetId))
    const reserved = activeReservations(ownerId)
    const directory = ownerDirectory(ownerId)
    if (!directory.exists) return
    for (const entry of directory.list()) {
      if (
        !(entry instanceof Directory) ||
        (!referenced.has(entry.name) && !reserved.has(entry.name))
      )
        entry.delete()
    }
    if (directory.exists && directory.list().length === 0) directory.delete()
  }

  async function removeAssetsForOwners(ownerIds: string[]): Promise<void> {
    for (const ownerId of [...new Set(ownerIds)]) {
      if (!STUDY_SAFE_ID_PATTERN.test(ownerId)) continue
      for (const [key, reservation] of reservations) {
        if (reservation.ownerId === ownerId) reservations.delete(key)
      }
      const directory = ownerDirectory(ownerId)
      if (directory.exists) directory.delete()
    }
  }

  async function reconcileDocuments(documents: ReadonlyMap<string, StudyDocument>): Promise<void> {
    const root = new Directory(Paths.document, ASSET_ROOT)
    if (root.exists) {
      for (const entry of root.list()) {
        if (
          !(entry instanceof Directory) ||
          !STUDY_SAFE_ID_PATTERN.test(entry.name) ||
          !documents.has(entry.name)
        ) {
          entry.delete()
        }
      }
    }
    for (const [ownerId, document] of documents) await cleanupDocumentAssets(ownerId, document)
  }

  function resolveAssetUri(asset: StudyLocalAsset): string | null {
    try {
      const file = assetFile(asset)
      return file.exists ? file.uri : null
    } catch {
      return null
    }
  }

  async function openAsset(asset: StudyLocalAsset): Promise<void> {
    const file = assetFile(asset)
    if (!file.exists) throw new Error(`Вложение «${asset.name}» не найдено`)
    if (!(await Sharing.isAvailableAsync()))
      throw new Error('Открытие локальных файлов недоступно на этом устройстве')
    await Sharing.shareAsync(file.uri, {
      dialogTitle: asset.name,
      mimeType: asset.mimeType
    })
  }

  return {
    importAsset,
    validateDocumentAssets,
    duplicateDocumentAssets,
    cleanupDocumentAssets,
    removeAssetsForOwners,
    reconcileDocuments,
    resolveAssetUri,
    openAsset
  }
}
