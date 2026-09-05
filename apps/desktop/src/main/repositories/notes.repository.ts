import type { NoteDocument, SaveNoteInput } from '../../shared/contracts/notes'
import { desktopRepositoryRuntime } from '../database/repository-runtime'
import {
  cleanupStudyAssetsForDocument,
  removeStudyAssetsForMaterials,
  validateStudyDocumentAssets
} from '../services/study-assets'
import { studyMaterialCoordinator } from '../services/study-material-coordinator'
import { createNotesRepository } from '@mymind/persistence/notes'
import { cleanupBoardsForNoteDocument } from './boards.repository'

const repository = createNotesRepository(desktopRepositoryRuntime, {
  validateDocumentAssets: validateStudyDocumentAssets,
  afterDocumentSaved: async (noteId: string, document: NoteDocument) => {
    cleanupBoardsForNoteDocument(noteId, document)
    await cleanupStudyAssetsForDocument(noteId, document).catch((reason: unknown) => {
      console.error('Failed to clean up unreferenced note assets', reason)
    })
  },
  afterNoteDeleted: async (noteId: string) => {
    await removeStudyAssetsForMaterials([noteId]).catch((reason: unknown) => {
      console.error('Failed to remove note assets after deletion', reason)
    })
  }
})

export const listNotesOverview = repository.listNotesOverview
export const createNoteGroup = repository.createNoteGroup
export const renameNoteGroup = repository.renameNoteGroup
export const updateNoteGroupIcon = repository.updateNoteGroupIcon
export const deleteNoteGroup = repository.deleteNoteGroup
export const createNote = repository.createNote
export const renameNote = repository.renameNote
export const moveNote = repository.moveNote
export const getNote = repository.getNote
export const listUngroupedNotes = repository.listUngroupedNotes

export function saveNote(input: SaveNoteInput) {
  return studyMaterialCoordinator.run(input.id, () => repository.saveNote(input))
}

export function deleteNote(id: string) {
  return studyMaterialCoordinator.run(id, () => repository.deleteNote(id))
}
