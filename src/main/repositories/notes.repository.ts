import { asc, desc, eq, isNull } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'

import type {
  CreateNoteInput,
  NoteDocument,
  NoteGroup,
  NoteRecord,
  NoteSummary,
  NotesOverview,
  SaveNoteInput
} from '../../shared/contracts/notes'
import type { StudyFolderIconName } from '../../shared/contracts/study'
import {
  noteDocumentSchema,
  noteGroupSchema,
  noteRecordSchema,
  noteSummarySchema
} from '../../shared/validation/notes'
import { documentToPlainText } from '../domain/study-document-index'
import { getDatabase } from '../database/client'
import { noteGroups, notes } from '../database/schema'
import {
  cleanupStudyAssetsForDocument,
  removeStudyAssetsForMaterials,
  validateStudyDocumentAssets
} from '../services/study-assets'
import { studyMaterialCoordinator } from '../services/study-material-coordinator'

function createEmptyNoteDocument(): NoteDocument {
  return {
    version: 1,
    blocks: [
      {
        id: randomUUID(),
        type: 'text',
        text: '',
        html: '<p></p>'
      }
    ]
  }
}

function mapNoteGroup(row: typeof noteGroups.$inferSelect): NoteGroup {
  return noteGroupSchema.parse({
    ...row,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime()
  })
}

function mapNoteSummary(row: typeof notes.$inferSelect): NoteSummary {
  return noteSummarySchema.parse({
    id: row.id,
    groupId: row.groupId,
    title: row.title,
    plainText: row.plainText,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime()
  })
}

function mapNoteRecord(row: typeof notes.$inferSelect): NoteRecord {
  return noteRecordSchema.parse({
    ...mapNoteSummary(row),
    document: row.document
  })
}

function assertGroupExists(groupId: string | null): void {
  if (groupId === null) {
    return
  }

  const group = getDatabase().select().from(noteGroups).where(eq(noteGroups.id, groupId)).get()

  if (!group) {
    throw new Error('Группа заметок не найдена')
  }
}

export function listNotesOverview(): NotesOverview {
  const database = getDatabase()

  return {
    groups: database
      .select()
      .from(noteGroups)
      .orderBy(asc(noteGroups.title))
      .all()
      .map(mapNoteGroup),
    notes: database
      .select()
      .from(notes)
      .orderBy(desc(notes.updatedAt), asc(notes.title))
      .all()
      .map(mapNoteSummary)
  }
}

export function createNoteGroup(title?: string): NoteGroup {
  const database = getDatabase()
  const now = new Date()
  const id = randomUUID()

  database
    .insert(noteGroups)
    .values({
      id,
      title: title?.trim() || 'Новая группа',
      icon: 'folder',
      createdAt: now,
      updatedAt: now
    })
    .run()

  const created = database.select().from(noteGroups).where(eq(noteGroups.id, id)).get()

  if (!created) {
    throw new Error('Не удалось создать группу заметок')
  }

  return mapNoteGroup(created)
}

export function renameNoteGroup(id: string, title: string): NoteGroup {
  const database = getDatabase()
  const now = new Date()

  const result = database
    .update(noteGroups)
    .set({ title: title.trim(), updatedAt: now })
    .where(eq(noteGroups.id, id))
    .run()

  if (result.changes === 0) {
    throw new Error('Группа заметок не найдена')
  }

  const updated = database.select().from(noteGroups).where(eq(noteGroups.id, id)).get()

  if (!updated) {
    throw new Error('Группа заметок не найдена')
  }

  return mapNoteGroup(updated)
}

export function updateNoteGroupIcon(id: string, icon: StudyFolderIconName): NoteGroup {
  const database = getDatabase()
  const now = new Date()
  const result = database
    .update(noteGroups)
    .set({ icon, updatedAt: now })
    .where(eq(noteGroups.id, id))
    .run()

  if (result.changes === 0) {
    throw new Error('Группа заметок не найдена')
  }

  const updated = database.select().from(noteGroups).where(eq(noteGroups.id, id)).get()

  if (!updated) {
    throw new Error('Группа заметок не найдена')
  }

  return mapNoteGroup(updated)
}

export function deleteNoteGroup(id: string): boolean {
  const database = getDatabase()
  const now = new Date()
  let deleted = false

  database.transaction((transaction) => {
    transaction
      .update(notes)
      .set({ groupId: null, updatedAt: now })
      .where(eq(notes.groupId, id))
      .run()

    deleted = transaction.delete(noteGroups).where(eq(noteGroups.id, id)).run().changes > 0
  })

  return deleted
}

export function createNote(input: CreateNoteInput): NoteRecord {
  assertGroupExists(input.groupId)

  const database = getDatabase()
  const now = new Date()
  const id = randomUUID()
  const document = createEmptyNoteDocument()

  database
    .insert(notes)
    .values({
      id,
      groupId: input.groupId,
      title: input.title?.trim() || 'Новая заметка',
      document,
      plainText: '',
      createdAt: now,
      updatedAt: now
    })
    .run()

  if (input.groupId) {
    database
      .update(noteGroups)
      .set({ updatedAt: now })
      .where(eq(noteGroups.id, input.groupId))
      .run()
  }

  return getNote(id)
}

export function renameNote(id: string, title: string): NoteSummary {
  const database = getDatabase()
  const now = new Date()
  const result = database
    .update(notes)
    .set({ title: title.trim(), updatedAt: now })
    .where(eq(notes.id, id))
    .run()

  if (result.changes === 0) {
    throw new Error('Заметка не найдена')
  }

  const updated = database.select().from(notes).where(eq(notes.id, id)).get()

  if (!updated) {
    throw new Error('Заметка не найдена')
  }

  return mapNoteSummary(updated)
}

export function moveNote(id: string, groupId: string | null): NoteSummary {
  assertGroupExists(groupId)

  const database = getDatabase()
  const now = new Date()
  const result = database
    .update(notes)
    .set({ groupId, updatedAt: now })
    .where(eq(notes.id, id))
    .run()

  if (result.changes === 0) {
    throw new Error('Заметка не найдена')
  }

  if (groupId) {
    database.update(noteGroups).set({ updatedAt: now }).where(eq(noteGroups.id, groupId)).run()
  }

  const updated = database.select().from(notes).where(eq(notes.id, id)).get()

  if (!updated) {
    throw new Error('Заметка не найдена')
  }

  return mapNoteSummary(updated)
}

export function getNote(id: string): NoteRecord {
  const row = getDatabase().select().from(notes).where(eq(notes.id, id)).get()

  if (!row) {
    throw new Error('Заметка не найдена')
  }

  return mapNoteRecord(row)
}

async function saveNoteNow(input: SaveNoteInput): Promise<NoteRecord> {
  const database = getDatabase()
  const document = noteDocumentSchema.parse(input.document)

  await validateStudyDocumentAssets(input.id, document)

  const existing = database.select().from(notes).where(eq(notes.id, input.id)).get()

  if (!existing) {
    throw new Error('Заметка не найдена')
  }

  const now = new Date()
  const saved = noteRecordSchema.parse({
    id: existing.id,
    groupId: existing.groupId,
    title: existing.title,
    document,
    plainText: documentToPlainText(document),
    createdAt: existing.createdAt.getTime(),
    updatedAt: now.getTime()
  })

  database
    .update(notes)
    .set({
      document: saved.document,
      plainText: saved.plainText,
      updatedAt: now
    })
    .where(eq(notes.id, input.id))
    .run()

  await cleanupStudyAssetsForDocument(input.id, saved.document).catch((reason: unknown) => {
    console.error('Failed to clean up unreferenced note assets', reason)
  })

  return saved
}

export function saveNote(input: SaveNoteInput): Promise<NoteRecord> {
  return studyMaterialCoordinator.run(input.id, () => saveNoteNow(input))
}

export function deleteNote(id: string): Promise<boolean> {
  return studyMaterialCoordinator.run(id, async () => {
    const result = getDatabase().delete(notes).where(eq(notes.id, id)).run()

    if (result.changes > 0) {
      await removeStudyAssetsForMaterials([id]).catch((reason: unknown) => {
        console.error('Failed to remove note assets after deletion', reason)
      })
    }

    return result.changes > 0
  })
}

export function listUngroupedNotes(): NoteSummary[] {
  return getDatabase()
    .select()
    .from(notes)
    .where(isNull(notes.groupId))
    .orderBy(desc(notes.updatedAt))
    .all()
    .map(mapNoteSummary)
}
