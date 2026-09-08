import type { RepositoryRuntime } from '@mymind/contracts/storage'
import type {
  CreateNoteInput,
  NoteDocument,
  NoteGroup,
  NoteRecord,
  NoteSummary,
  NotesOverview,
  SaveNoteInput
} from '@mymind/contracts/notes'
import type { StudyFolderIconName } from '@mymind/contracts/study'
import { documentToPlainText } from '@mymind/core/study-document'
import {
  createNoteInputSchema,
  noteDocumentSchema,
  noteGroupSchema,
  noteRecordSchema,
  noteSummarySchema,
  saveNoteInputSchema
} from '@mymind/core/validation/notes'

export interface NotesPersistenceHooks {
  validateDocumentAssets?(noteId: string, document: NoteDocument): Promise<void>
  afterDocumentSaved?(noteId: string, document: NoteDocument): void | Promise<void>
  afterNoteDeleted?(noteId: string): void | Promise<void>
}

export interface NotesRepository {
  listNotesOverview(): NotesOverview
  createNoteGroup(title?: string): NoteGroup
  renameNoteGroup(id: string, title: string): NoteGroup
  updateNoteGroupIcon(id: string, icon: StudyFolderIconName): NoteGroup
  deleteNoteGroup(id: string): boolean
  createNote(input: CreateNoteInput): NoteRecord
  renameNote(id: string, title: string): NoteSummary
  moveNote(id: string, groupId: string | null): NoteSummary
  getNote(id: string): NoteRecord
  saveNote(input: SaveNoteInput): Promise<NoteRecord>
  deleteNote(id: string): Promise<boolean>
  listUngroupedNotes(): NoteSummary[]
}

interface NoteGroupRow {
  id: string
  title: string
  icon: StudyFolderIconName
  created_at: number
  updated_at: number
}

interface NoteRow {
  id: string
  group_id: string | null
  title: string
  document: string
  plain_text: string
  created_at: number
  updated_at: number
}

const NOTE_GROUP_SELECT = `SELECT id, title, icon, created_at, updated_at FROM note_groups`
const NOTE_SELECT = `SELECT id, group_id, title, document, plain_text, created_at, updated_at FROM notes`

export function createNotesRepository(
  runtime: RepositoryRuntime,
  hooks: NotesPersistenceHooks = {}
): NotesRepository {
  const queues = new Map<string, Promise<void>>()

  function runExclusive<Result>(id: string, operation: () => Promise<Result>): Promise<Result> {
    const previous = queues.get(id) ?? Promise.resolve()
    const result = previous.catch(() => undefined).then(operation)
    const settled = result.then(
      () => undefined,
      () => undefined
    )
    queues.set(id, settled)
    void settled.finally(() => {
      if (queues.get(id) === settled) queues.delete(id)
    })
    return result
  }

  function mapGroup(row: NoteGroupRow): NoteGroup {
    return noteGroupSchema.parse({
      id: row.id,
      title: row.title,
      icon: row.icon,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })
  }

  function parseDocument(value: string): NoteDocument {
    let parsed: unknown
    try {
      parsed = JSON.parse(value)
    } catch {
      throw new Error('Документ заметки повреждён')
    }
    return noteDocumentSchema.parse(parsed)
  }

  function mapSummary(row: NoteRow): NoteSummary {
    return noteSummarySchema.parse({
      id: row.id,
      groupId: row.group_id,
      title: row.title,
      plainText: row.plain_text,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })
  }

  function mapRecord(row: NoteRow): NoteRecord {
    return noteRecordSchema.parse({
      ...mapSummary(row),
      document: parseDocument(row.document)
    })
  }

  function findGroup(id: string): NoteGroup | null {
    const row = runtime.database().prepare(`${NOTE_GROUP_SELECT} WHERE id = ?`).get(id) as
      NoteGroupRow | undefined
    return row ? mapGroup(row) : null
  }

  function assertGroupExists(groupId: string | null): void {
    if (groupId !== null && !findGroup(groupId)) throw new Error('Группа заметок не найдена')
  }

  function findNote(id: string): NoteRecord | null {
    const row = runtime.database().prepare(`${NOTE_SELECT} WHERE id = ?`).get(id) as
      NoteRow | undefined
    return row ? mapRecord(row) : null
  }

  function requireNote(id: string): NoteRecord {
    const note = findNote(id)
    if (!note) throw new Error('Заметка не найдена')
    return note
  }

  function listNotesOverview(): NotesOverview {
    const database = runtime.database()
    const groups = database
      .prepare(`${NOTE_GROUP_SELECT} ORDER BY title ASC`)
      .all() as NoteGroupRow[]
    const notes = database
      .prepare(`${NOTE_SELECT} ORDER BY updated_at DESC, title ASC`)
      .all() as NoteRow[]
    return { groups: groups.map(mapGroup), notes: notes.map(mapSummary) }
  }

  function createNoteGroup(title?: string): NoteGroup {
    const normalized = title?.trim() || 'Новая группа'
    const id = runtime.createId()
    const now = runtime.now()
    runtime
      .database()
      .prepare(
        'INSERT INTO note_groups(id, title, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      )
      .run(id, normalized, 'folder', now, now)
    const created = findGroup(id)
    if (!created) throw new Error('Не удалось создать группу заметок')
    return created
  }

  function renameNoteGroup(id: string, title: string): NoteGroup {
    const normalized = title.trim()
    if (!normalized) throw new Error('Название группы не должно быть пустым')
    const now = runtime.now()
    const result = runtime
      .database()
      .prepare('UPDATE note_groups SET title = ?, updated_at = ? WHERE id = ?')
      .run(normalized, now, id)
    if (result.changes === 0) throw new Error('Группа заметок не найдена')
    const updated = findGroup(id)
    if (!updated) throw new Error('Группа заметок не найдена')
    return updated
  }

  function updateNoteGroupIcon(id: string, icon: StudyFolderIconName): NoteGroup {
    const parsed = noteGroupSchema.shape.icon.parse(icon)
    const now = runtime.now()
    const result = runtime
      .database()
      .prepare('UPDATE note_groups SET icon = ?, updated_at = ? WHERE id = ?')
      .run(parsed, now, id)
    if (result.changes === 0) throw new Error('Группа заметок не найдена')
    const updated = findGroup(id)
    if (!updated) throw new Error('Группа заметок не найдена')
    return updated
  }

  function deleteNoteGroup(id: string): boolean {
    const database = runtime.database()
    const now = runtime.now()
    return database.transaction(() => {
      database
        .prepare('UPDATE notes SET group_id = NULL, updated_at = ? WHERE group_id = ?')
        .run(now, id)
      return database.prepare('DELETE FROM note_groups WHERE id = ?').run(id).changes > 0
    })()
  }

  function createNote(input: CreateNoteInput): NoteRecord {
    const valid = createNoteInputSchema.parse(input)
    assertGroupExists(valid.groupId)
    const database = runtime.database()
    const id = runtime.createId()
    const now = runtime.now()
    const document: NoteDocument = {
      version: 1,
      blocks: [{ id: runtime.createId(), type: 'text', text: '', html: '<p></p>' }]
    }
    database
      .prepare(
        'INSERT INTO notes(id, group_id, title, document, plain_text, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        id,
        valid.groupId,
        valid.title?.trim() || 'Новая заметка',
        JSON.stringify(document),
        '',
        now,
        now
      )
    if (valid.groupId) {
      database.prepare('UPDATE note_groups SET updated_at = ? WHERE id = ?').run(now, valid.groupId)
    }
    return requireNote(id)
  }

  function renameNote(id: string, title: string): NoteSummary {
    const normalized = title.trim()
    if (!normalized) throw new Error('Название заметки не должно быть пустым')
    const now = runtime.now()
    const result = runtime
      .database()
      .prepare('UPDATE notes SET title = ?, updated_at = ? WHERE id = ?')
      .run(normalized, now, id)
    if (result.changes === 0) throw new Error('Заметка не найдена')
    return mapSummary(runtime.database().prepare(`${NOTE_SELECT} WHERE id = ?`).get(id) as NoteRow)
  }

  function moveNote(id: string, groupId: string | null): NoteSummary {
    assertGroupExists(groupId)
    const database = runtime.database()
    const now = runtime.now()
    const result = database
      .prepare('UPDATE notes SET group_id = ?, updated_at = ? WHERE id = ?')
      .run(groupId, now, id)
    if (result.changes === 0) throw new Error('Заметка не найдена')
    if (groupId) {
      database.prepare('UPDATE note_groups SET updated_at = ? WHERE id = ?').run(now, groupId)
    }
    return mapSummary(database.prepare(`${NOTE_SELECT} WHERE id = ?`).get(id) as NoteRow)
  }

  function getNote(id: string): NoteRecord {
    return requireNote(id)
  }

  async function saveNote(input: SaveNoteInput): Promise<NoteRecord> {
    const valid = saveNoteInputSchema.parse(input)
    return runExclusive(valid.id, async () => {
      const document = noteDocumentSchema.parse(valid.document)
      await hooks.validateDocumentAssets?.(valid.id, document)
      const existing = requireNote(valid.id)
      const now = runtime.now()
      const saved = noteRecordSchema.parse({
        ...existing,
        document,
        plainText: documentToPlainText(document),
        updatedAt: now
      })
      const result = runtime
        .database()
        .prepare('UPDATE notes SET document = ?, plain_text = ?, updated_at = ? WHERE id = ?')
        .run(JSON.stringify(saved.document), saved.plainText, now, valid.id)
      if (result.changes === 0) throw new Error('Заметка не найдена')
      await hooks.afterDocumentSaved?.(valid.id, saved.document)
      return saved
    })
  }

  function deleteNote(id: string): Promise<boolean> {
    return runExclusive(id, async () => {
      const result = runtime.database().prepare('DELETE FROM notes WHERE id = ?').run(id)
      if (result.changes > 0) await hooks.afterNoteDeleted?.(id)
      return result.changes > 0
    })
  }

  function listUngroupedNotes(): NoteSummary[] {
    const rows = runtime
      .database()
      .prepare(`${NOTE_SELECT} WHERE group_id IS NULL ORDER BY updated_at DESC`)
      .all() as NoteRow[]
    return rows.map(mapSummary)
  }

  return {
    listNotesOverview,
    createNoteGroup,
    renameNoteGroup,
    updateNoteGroupIcon,
    deleteNoteGroup,
    createNote,
    renameNote,
    moveNote,
    getNote,
    saveNote,
    deleteNote,
    listUngroupedNotes
  }
}
