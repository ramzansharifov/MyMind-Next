import { createStudyRepository, type StudyRepository } from '@mymind/persistence/study'
import { createBoardsRepository, type BoardsRepository } from '@mymind/persistence/boards'
import { createWorkoutsRepository, type WorkoutsRepository } from '@mymind/persistence/workouts'
import type { NotesRepository } from '@mymind/persistence/notes'
import type { WorkoutProgressPhotoRecord } from '@mymind/contracts/workouts'
import type { PwaDatabase } from '../storage/database'
import type { createPwaAssetStore } from '../storage/assets'
import { pickFile } from '../platform/files'
import { createCanonicalStudyAssetUrl } from '@mymind/core/study-assets'
import {
  isSupportedStudyAssetExtension,
  sanitizeStudyAssetFileName,
  studyAssetExtension
} from '@mymind/core/study-asset-file'

export interface PwaDesktopRepositories {
  study: StudyRepository
  boards: BoardsRepository
  workouts: WorkoutsRepository
  notes: NotesRepository
  assets: Awaited<ReturnType<typeof createPwaAssetStore>>
  photoUri(photo: WorkoutProgressPhotoRecord): string
  reloadAssets(): Promise<void>
  dispose(): void
}

export async function createDesktopRepositories(
  db: PwaDatabase,
  assets: PwaDesktopRepositories['assets'],
  notes: NotesRepository
): Promise<PwaDesktopRepositories> {
  const runtime = { database: () => db, createId: () => crypto.randomUUID(), now: Date.now }
  const photoUris = new Map<string, string>()
  const reloadAssets = async (): Promise<void> => {
    const files = await db.disk.listAssets()
    for (const uri of photoUris.values()) URL.revokeObjectURL(uri)
    photoUris.clear()
    for (const asset of files) {
      if (asset.path.startsWith('workout-progress/'))
        photoUris.set(asset.path, URL.createObjectURL(asset.blob))
    }
  }
  await reloadAssets()
  const photoPath = (photo: WorkoutProgressPhotoRecord): string =>
    `workout-progress/${photo.entryId}/${photo.assetId}/${photo.fileName}`
  const boards = createBoardsRepository(runtime, {
    async removeStudyBoardBlock(materialId, blockId, boardId) {
      const material = study.getMaterial(materialId)
      await study.saveMaterial({
        nodeId: materialId,
        document: {
          ...material.document,
          blocks: material.document.blocks.filter(
            (block) =>
              !(
                block.type === 'board' &&
                block.id === blockId &&
                (!block.boardId || block.boardId === boardId)
              )
          )
        }
      })
    },
    async removeNoteBoardBlock(noteId, blockId, boardId) {
      const note = notes.getNote(noteId)
      await notes.saveNote({
        id: noteId,
        document: {
          ...note.document,
          blocks: note.document.blocks.filter(
            (block) =>
              !(
                block.type === 'board' &&
                block.id === blockId &&
                (!block.boardId || block.boardId === boardId)
              )
          )
        }
      })
    }
  })
  const study = createStudyRepository(runtime, {
    validateDocumentAssets: assets.validateDocumentAssets,
    duplicateDocumentAssets: assets.duplicateDocumentAssets,
    async afterDocumentSaved(id, document) {
      boards.cleanupStudyDocument(id, document)
      await db.flush()
      await assets.cleanupDocumentAssets(id, document)
    },
    async afterMaterialsDeleted(ids) {
      await db.flush()
      await assets.removeAssetsForOwners(ids)
    }
  })
  const workouts = createWorkoutsRepository(runtime, {
    async importProgressPhoto(entryId) {
      const file = await pickFile('image/*')
      if (!file) return null
      if (!isSupportedStudyAssetExtension('image', studyAssetExtension(file.name)))
        throw new Error('Формат фотографии не поддерживается')
      const id = crypto.randomUUID()
      const name = sanitizeStudyAssetFileName(file.name)
      const path = `workout-progress/${entryId}/${id}/${name}`
      await db.disk.putAsset({ path, blob: file })
      photoUris.set(path, URL.createObjectURL(file))
      return {
        id,
        name,
        mimeType: file.type,
        size: file.size,
        url: createCanonicalStudyAssetUrl({
          materialId: `workout-progress-${entryId}`,
          assetId: id,
          fileName: name
        })
      }
    },
    async deleteProgressPhotoAsset(photo) {
      await db.flush()
      const path = photoPath(photo)
      await db.disk.deleteAssets([path])
      const uri = photoUris.get(path)
      if (uri) URL.revokeObjectURL(uri)
      photoUris.delete(path)
    }
  })
  return {
    study,
    boards,
    workouts,
    notes,
    assets,
    reloadAssets,
    dispose() {
      for (const uri of photoUris.values()) URL.revokeObjectURL(uri)
      photoUris.clear()
    },
    photoUri: (photo) => photoUris.get(photoPath(photo)) ?? ''
  }
}
