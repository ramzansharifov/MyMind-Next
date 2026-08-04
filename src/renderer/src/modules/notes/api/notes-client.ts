import type {
  CreateNoteInput,
  ImportNoteAssetInput,
  MoveNoteInput,
  NoteGroup,
  NoteLocalAsset,
  NoteRecord,
  NoteSummary,
  NotesApi,
  NotesOverview,
  OpenNoteAssetInput,
  SaveNoteInput
} from '../../../../../shared/contracts/notes'
import type {
  ImportStudyAssetInput,
  OpenStudyAssetInput,
  StudyLocalAsset
} from '../../../../../shared/contracts/study'

function getNotesApi(): NotesApi {
  if (!window.api?.notes) {
    throw new Error('Notes API is unavailable')
  }

  return window.api.notes
}

export const notesClient = {
  listOverview(): Promise<NotesOverview> {
    return getNotesApi().listOverview()
  },

  createGroup(title?: string): Promise<NoteGroup> {
    return getNotesApi().createGroup({ title })
  },

  renameGroup(id: string, title: string): Promise<NoteGroup> {
    return getNotesApi().renameGroup({ id, title })
  },

  deleteGroup(groupId: string): Promise<boolean> {
    return getNotesApi().deleteGroup(groupId)
  },

  createNote(input: CreateNoteInput): Promise<NoteRecord> {
    return getNotesApi().createNote(input)
  },

  renameNote(id: string, title: string): Promise<NoteSummary> {
    return getNotesApi().renameNote({ id, title })
  },

  moveNote(input: MoveNoteInput): Promise<NoteSummary> {
    return getNotesApi().moveNote(input)
  },

  deleteNote(noteId: string): Promise<boolean> {
    return getNotesApi().deleteNote(noteId)
  },

  getNote(noteId: string): Promise<NoteRecord> {
    return getNotesApi().getNote(noteId)
  },

  saveNote(input: SaveNoteInput): Promise<NoteRecord> {
    return getNotesApi().saveNote(input)
  },

  importAsset(input: ImportNoteAssetInput): Promise<NoteLocalAsset | null> {
    return getNotesApi().importAsset(input)
  },

  openAsset(input: OpenNoteAssetInput): Promise<void> {
    return getNotesApi().openAsset(input)
  }
}

export const notesBlockAssetClient = {
  importAsset(input: ImportStudyAssetInput): Promise<StudyLocalAsset | null> {
    return notesClient.importAsset({
      noteId: input.nodeId,
      kind: input.kind
    })
  },

  openAsset(input: OpenStudyAssetInput): Promise<void> {
    return notesClient.openAsset(input)
  }
}
