import type {
  OpenStudyAssetInput,
  StudyAssetKind,
  StudyBlock,
  StudyFolderIconName,
  StudyLocalAsset
} from './study'

export const NOTE_BLOCK_TYPES = [
  'text',
  'heading',
  'image',
  'audio',
  'video',
  'file',
  'divider',
  'board'
] as const

export type NoteBlockType = (typeof NOTE_BLOCK_TYPES)[number]
export type NoteBlock = Extract<StudyBlock, { type: NoteBlockType }>
export type NoteAssetKind = StudyAssetKind
export type NoteLocalAsset = StudyLocalAsset
export type OpenNoteAssetInput = OpenStudyAssetInput

export interface NoteDocument {
  version: 1
  blocks: NoteBlock[]
}

export interface NoteGroup {
  id: string
  title: string
  icon: StudyFolderIconName
  createdAt: number
  updatedAt: number
}

export interface NoteSummary {
  id: string
  groupId: string | null
  title: string
  plainText: string
  createdAt: number
  updatedAt: number
}

export interface NoteRecord extends NoteSummary {
  document: NoteDocument
}

export interface NotesOverview {
  groups: NoteGroup[]
  notes: NoteSummary[]
}

export interface CreateNoteGroupInput {
  title?: string
}

export interface RenameNoteGroupInput {
  id: string
  title: string
}

export interface UpdateNoteGroupIconInput {
  id: string
  icon: StudyFolderIconName
}

export interface CreateNoteInput {
  groupId: string | null
  title?: string
}

export interface RenameNoteInput {
  id: string
  title: string
}

export interface MoveNoteInput {
  id: string
  groupId: string | null
}

export interface SaveNoteInput {
  id: string
  document: NoteDocument
}

export interface ImportNoteAssetInput {
  noteId: string
  kind: NoteAssetKind
}

export const NOTES_IPC_CHANNELS = {
  listOverview: 'notes:list-overview',
  createGroup: 'notes:create-group',
  renameGroup: 'notes:rename-group',
  updateGroupIcon: 'notes:update-group-icon',
  deleteGroup: 'notes:delete-group',
  createNote: 'notes:create-note',
  renameNote: 'notes:rename-note',
  moveNote: 'notes:move-note',
  deleteNote: 'notes:delete-note',
  getNote: 'notes:get-note',
  saveNote: 'notes:save-note',
  importAsset: 'notes:import-asset',
  openAsset: 'notes:open-asset'
} as const

export interface NotesApi {
  listOverview(): Promise<NotesOverview>
  createGroup(input: CreateNoteGroupInput): Promise<NoteGroup>
  renameGroup(input: RenameNoteGroupInput): Promise<NoteGroup>
  updateGroupIcon(input: UpdateNoteGroupIconInput): Promise<NoteGroup>
  deleteGroup(groupId: string): Promise<boolean>
  createNote(input: CreateNoteInput): Promise<NoteRecord>
  renameNote(input: RenameNoteInput): Promise<NoteSummary>
  moveNote(input: MoveNoteInput): Promise<NoteSummary>
  deleteNote(noteId: string): Promise<boolean>
  getNote(noteId: string): Promise<NoteRecord>
  saveNote(input: SaveNoteInput): Promise<NoteRecord>
  importAsset(input: ImportNoteAssetInput): Promise<NoteLocalAsset | null>
  openAsset(input: OpenNoteAssetInput): Promise<void>
}
