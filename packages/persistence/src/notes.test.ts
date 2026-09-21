import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import type { RepositoryRuntime, SqlDatabasePort } from '@mymind/contracts/storage'
import type { NoteDocument } from '@mymind/contracts/notes'
import { createNotesRepository } from './notes'

const databases: Database.Database[] = []

function setup(): { db: Database.Database; runtime: RepositoryRuntime } {
  const db = new Database(':memory:')
  databases.push(db)
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE note_groups (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      icon TEXT DEFAULT 'folder' NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE notes (
      id TEXT PRIMARY KEY NOT NULL,
      group_id TEXT REFERENCES note_groups(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      document TEXT NOT NULL,
      plain_text TEXT DEFAULT '' NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `)
  let id = 0
  let now = 1_000
  const runtime: RepositoryRuntime = {
    database: () => db as unknown as SqlDatabasePort,
    createId: () => `id-${++id}`,
    now: () => ++now
  }
  return { db, runtime }
}

function deferred(): {
  promise: Promise<void>
  resolve(): void
  reject(reason?: unknown): void
} {
  let resolve!: () => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const document = (text: string): NoteDocument => ({
  version: 1,
  blocks: [{ id: 'block-test', type: 'text', text }]
})

afterEach(() => {
  for (const db of databases.splice(0)) db.close()
})

describe('shared notes persistence', () => {
  it('preserves desktop group semantics and derives searchable plain text', async () => {
    const { runtime } = setup()
    const notes = createNotesRepository(runtime)
    const group = notes.createNoteGroup('Работа')
    const note = notes.createNote({ groupId: group.id, title: 'План' })

    const saved = await notes.saveNote({ id: note.id, document: document('Содержимое') })
    expect(saved.plainText).toBe('Содержимое')
    expect(notes.listNotesOverview().notes[0]?.plainText).toBe('Содержимое')

    expect(notes.deleteNoteGroup(group.id)).toBe(true)
    expect(notes.getNote(note.id).groupId).toBeNull()
  })

  it('serializes deletion behind an in-progress save for the same note', async () => {
    const gate = deferred()
    const { db, runtime } = setup()
    const notes = createNotesRepository(runtime, {
      validateDocumentAssets: async () => gate.promise
    })
    const note = notes.createNote({ groupId: null, title: 'Очередь' })

    const saving = notes.saveNote({ id: note.id, document: document('Новая версия') })
    await Promise.resolve()
    const deleting = notes.deleteNote(note.id)

    expect(db.prepare('SELECT COUNT(*) AS count FROM notes').get()).toEqual({ count: 1 })
    gate.resolve()
    await saving
    await expect(deleting).resolves.toBe(true)
    expect(db.prepare('SELECT COUNT(*) AS count FROM notes').get()).toEqual({ count: 0 })
  })

  it('allows a queued delete to continue after a failed save', async () => {
    const { db, runtime } = setup()
    let fail = true
    const notes = createNotesRepository(runtime, {
      validateDocumentAssets: async () => {
        if (fail) {
          fail = false
          throw new Error('asset unavailable')
        }
      }
    })
    const note = notes.createNote({ groupId: null, title: 'Ошибка' })

    const saving = notes.saveNote({ id: note.id, document: document('Не сохранится') })
    const deleting = notes.deleteNote(note.id)

    await expect(saving).rejects.toThrow('asset unavailable')
    await expect(deleting).resolves.toBe(true)
    expect(db.prepare('SELECT COUNT(*) AS count FROM notes').get()).toEqual({ count: 0 })
  })


  it('upserts a mobile text block without rewriting existing desktop blocks', async () => {
    const { runtime } = setup()
    const notes = createNotesRepository(runtime)
    const note = notes.createNote({ groupId: null, title: 'Смешанная заметка' })
    const desktopDocument: NoteDocument = {
      version: 1,
      blocks: [
        { id: 'heading-1', type: 'heading', text: 'Раздел', level: 2 },
        { id: 'code-1', type: 'code', source: 'const value = 1', language: 'ts' }
      ]
    }
    await notes.saveNote({ id: note.id, document: desktopDocument })

    const first = await notes.upsertTextBlock(note.id, {
      id: 'mobile-append-1',
      type: 'text',
      text: 'Дополнение с телефона',
      html: '<p>Дополнение с телефона</p>'
    })

    expect(first.document.blocks.slice(0, 2)).toEqual(desktopDocument.blocks)
    expect(first.document.blocks[2]).toMatchObject({
      id: 'mobile-append-1',
      type: 'text',
      text: 'Дополнение с телефона'
    })

    const second = await notes.upsertTextBlock(note.id, {
      id: 'mobile-append-1',
      type: 'text',
      text: 'Обновлённое дополнение',
      html: '<p>Обновлённое дополнение</p>'
    })

    expect(second.document.blocks).toHaveLength(3)
    expect(second.document.blocks.slice(0, 2)).toEqual(desktopDocument.blocks)
    expect(second.document.blocks[2]).toMatchObject({
      id: 'mobile-append-1',
      text: 'Обновлённое дополнение'
    })
  })
})
