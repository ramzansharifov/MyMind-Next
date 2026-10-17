import type { StudyApi } from '@mymind/contracts/study'
import type { NotesApi } from '@mymind/contracts/notes'
import type { BoardApi } from '@mymind/contracts/boards'
import type {
  WorkoutsApi,
  WorkoutProgressEntryRecord,
  WorkoutProgressPhotoRecord
} from '@mymind/contracts/workouts'
import type { StudyPdfApi } from '../../../desktop/src/shared/contracts/study-pdf'
import { createCanonicalStudyAssetUrl } from '@mymind/core/study-assets'
import { desktopRuntime } from './runtime'
import * as code from '../study-code/service'

export interface PwaDesktopApi {
  notes: NotesApi
  study: StudyApi & StudyPdfApi
  boards: BoardApi
  workouts: WorkoutsApi
}

export function createDesktopBridge(): PwaDesktopApi {
  const {
    db,
    repositories: { study, boards, workouts, notes, assets, photoUri }
  } = desktopRuntime()
  const persisted = async <T>(value: T | Promise<T>): Promise<T> => {
    const result = await value
    await db.flush()
    return result
  }
  const photo = (value: WorkoutProgressPhotoRecord): WorkoutProgressPhotoRecord => ({
    ...value,
    url: photoUri(value)
  })
  const progress = (value: WorkoutProgressEntryRecord): WorkoutProgressEntryRecord => ({
    ...value,
    photos: value.photos.map(photo)
  })
  const print = async (): Promise<{ status: 'cancelled' }> => {
    await db.flush()
    document.documentElement.dataset.pwaPrinting = 'true'
    try {
      await new Promise<void>((resolve, reject) => {
        const finished = (): void => {
          window.removeEventListener('afterprint', finished)
          resolve()
        }
        window.addEventListener('afterprint', finished, { once: true })
        try {
          window.print()
        } catch (error) {
          window.removeEventListener('afterprint', finished)
          reject(error)
        }
      })
    } finally {
      delete document.documentElement.dataset.pwaPrinting
    }
    // Browsers do not report whether the user saved or cancelled their print dialog.
    return { status: 'cancelled' }
  }
  return {
    notes: {
      listOverview: async () => notes.listNotesOverview(),
      createGroup: ({ title }) => persisted(notes.createNoteGroup(title)),
      renameGroup: ({ id, title }) => persisted(notes.renameNoteGroup(id, title)),
      updateGroupIcon: ({ id, icon }) => persisted(notes.updateNoteGroupIcon(id, icon)),
      deleteGroup: (id) => persisted(notes.deleteNoteGroup(id)),
      createNote: (input) => persisted(notes.createNote(input)),
      renameNote: ({ id, title }) => persisted(notes.renameNote(id, title)),
      moveNote: ({ id, groupId }) => persisted(notes.moveNote(id, groupId)),
      deleteNote: (id) => persisted(notes.deleteNote(id)),
      getNote: async (id) => notes.getNote(id),
      saveNote: (input) => persisted(notes.saveNote(input)),
      importAsset: ({ noteId, kind }) => assets.importAsset(noteId, kind),
      saveVoiceRecording: async ({ noteId, data, mimeType }) => {
        const uri = URL.createObjectURL(new Blob([new Uint8Array(data)], { type: mimeType }))
        try {
          return await assets.saveRecordedAudio(noteId, { uri, mimeType })
        } finally {
          URL.revokeObjectURL(uri)
        }
      },
      openAsset: async (input) =>
        assets.openAsset({
          ...input,
          size: 0,
          mimeType: 'application/octet-stream',
          url: createCanonicalStudyAssetUrl({
            materialId: input.materialId,
            assetId: input.id,
            fileName: input.name
          })
        })
    },
    study: {
      listNodes: () => persisted(study.listNodes()),
      createNode: (input) => persisted(study.createNode(input)),
      renameNode: ({ id, title }) => persisted(study.renameNode(id, title)),
      duplicateNode: ({ id }) => persisted(study.duplicateNode(id)),
      updateFolderIcon: ({ id, icon }) => persisted(study.updateFolderIcon(id, icon)),
      deleteNode: (id) => persisted(study.deleteNode(id)),
      updateExpansion: ({ id, isExpanded }) => persisted(study.updateExpansion(id, isExpanded)),
      moveNode: (input) => persisted(study.moveNode(input)),
      getMaterial: async (id) => study.getMaterial(id),
      saveMaterial: (input) => persisted(study.saveMaterial(input)),
      getCodeSnapshot: ({ nodeId }) => persisted(code.getStudyCodeSnapshot(nodeId)),
      previewCode: (input) => persisted(code.previewStudyCode(input)),
      applyCode: (input) => persisted(code.applyStudyCode(input)),
      searchInternalLinkTargets: async (input) => study.searchInternalLinkTargets(input),
      resolveInternalLinkTarget: async (input) => study.resolveInternalLinkTarget(input),
      importAsset: ({ nodeId, kind }) => assets.importAsset(nodeId, kind),
      openAsset: async (input) =>
        assets.openAsset({
          ...input,
          mimeType: 'application/octet-stream',
          size: 0,
          url: createCanonicalStudyAssetUrl({
            materialId: input.materialId,
            assetId: input.id,
            fileName: input.name
          })
        }),
      exportMaterial: print
    },
    boards: {
      listNodes: () => persisted(boards.listNodes()),
      createNode: (input) => persisted(boards.createNode(input)),
      renameNode: ({ id, title }) => persisted(boards.renameNode(id, title)),
      updateFolderIcon: (input) => persisted(boards.updateFolderIcon(input)),
      deleteNode: (id) => persisted(boards.deleteNode(id)),
      updateExpansion: ({ id, isExpanded }) => persisted(boards.updateExpansion(id, isExpanded)),
      moveNode: (input) => persisted(boards.moveNode(input)),
      getDocument: async (id) => boards.getDocument(id),
      saveDocument: ({ nodeId, snapshot }) => persisted(boards.saveDocument(nodeId, snapshot)),
      ensureStudyBoard: (input) => persisted(boards.ensureStudyBoard(input)),
      ensureNoteBoard: (input) => persisted(boards.ensureNoteBoard(input)),
      exportPdf: print
    },
    workouts: {
      listOverview: async () => {
        const overview = workouts.listOverview()
        return { ...overview, progressEntries: overview.progressEntries.map(progress) }
      },
      createExercise: (input) => persisted(workouts.createExercise(input)),
      updateExercise: (input) => persisted(workouts.updateExercise(input)),
      deleteExercise: (input) => persisted(workouts.deleteExercise(input)),
      createProgram: (input) => persisted(workouts.createProgram(input)),
      updateProgram: (input) => persisted(workouts.updateProgram(input)),
      deleteProgram: (input) => persisted(workouts.deleteProgram(input)),
      createSession: (input) => persisted(workouts.createSession(input)),
      updateSession: (input) => persisted(workouts.updateSession(input)),
      deleteSession: (input) => persisted(workouts.deleteSession(input)),
      getSession: async ({ id }) => workouts.getSession(id),
      createProgressEntry: (input) => persisted(progress(workouts.createProgressEntry(input))),
      updateProgressEntry: (input) => persisted(progress(workouts.updateProgressEntry(input))),
      deleteProgressEntry: (input) => persisted(workouts.deleteProgressEntry(input)),
      importProgressPhoto: async (input) => {
        const value = await persisted(workouts.importProgressPhoto(input))
        return value ? photo(value) : null
      },
      deleteProgressPhoto: (input) => persisted(workouts.deleteProgressPhoto(input)),
      getReport: async (input) => workouts.getReport(input)
    }
  }
}

declare global {
  interface Window {
    api: PwaDesktopApi
  }
}
