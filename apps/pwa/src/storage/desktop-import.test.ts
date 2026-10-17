import 'fake-indexeddb/auto'
import initSqlJs from 'sql.js'
import { describe, expect, it } from 'vitest'
import { PwaDatabase } from './database'
import { migrateDatabase } from './migrations'
import { openPwaDisk } from './indexed-db'
import { importDesktopLibrary } from './desktop-import'
import { createCanonicalStudyAssetUrl } from '@mymind/core/study-assets'
import { createNotesRepository } from '@mymind/persistence/notes'

async function fixture(): Promise<PwaDatabase> {
  const engine = await initSqlJs()
  const sqlite = new engine.Database()
  migrateDatabase(sqlite)
  return new PwaDatabase(sqlite, await openPwaDisk(crypto.randomUUID()), engine)
}
async function sourceLibrary(): Promise<{
  db: PwaDatabase
  files: Array<{ path: string; file: Blob }>
  noteId: string
}> {
  const db = await fixture()
  db.prepare(
    'CREATE TABLE app_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at INTEGER NOT NULL)'
  ).run()
  db.prepare('INSERT INTO app_meta VALUES(?,?,?)').run(
    'preferences.appearance',
    JSON.stringify({ version: 1, theme: 'light', accent: 'blue' }),
    Date.now()
  )
  const notes = createNotesRepository({
    database: () => db,
    createId: () => crypto.randomUUID(),
    now: Date.now
  })
  const note = notes.createNote({ title: 'Desktop note', groupId: null })
  const id = crypto.randomUUID()
  const name = 'photo.png'
  await notes.saveNote({
    id: note.id,
    document: {
      version: 1,
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'image',
          source: {
            type: 'local',
            asset: {
              id,
              materialId: note.id,
              name,
              mimeType: 'image/png',
              size: 5,
              url: createCanonicalStudyAssetUrl({
                materialId: note.id,
                assetId: id,
                fileName: name
              })
            }
          }
        }
      ]
    }
  })
  await db.flush()
  const bytes = db.sqlite.export()
  return {
    db,
    noteId: note.id,
    files: [
      { path: 'MyMind/data/mymind.sqlite', file: new Blob([new Uint8Array(bytes)]) },
      {
        path: `MyMind/Attachments/${note.id}/${id}/${name}`,
        file: new Blob(['photo'], { type: 'image/png' })
      }
    ]
  }
}

describe('desktop library migration into PWA', () => {
  it('imports all tables, local attachments and appearance without changing source files', async () => {
    const source = await sourceLibrary()
    const target = await fixture()
    const before = await source.files[0].file.arrayBuffer()
    const result = await importDesktopLibrary(target, source.files)
    expect(result.files).toBe(1)
    expect(target.prepare('SELECT title FROM notes WHERE id=?').get(source.noteId)).toEqual({
      title: 'Desktop note'
    })
    expect(await (await target.disk.listAssets())[0].blob.text()).toBe('photo')
    expect(
      JSON.parse(
        (
          target.prepare("SELECT value FROM mobile_preferences WHERE key='appearance'").get() as {
            value: string
          }
        ).value
      )
    ).toMatchObject({ theme: 'light', accent: 'blue' })
    expect(await source.files[0].file.arrayBuffer()).toEqual(before)
    expect(target.sqlite.exec('PRAGMA foreign_key_check')).toEqual([])
    source.db.sqlite.close()
    target.sqlite.close()
  })
  it('refuses an active WAL and a folder missing attachments, keeping the current PWA database', async () => {
    const source = await sourceLibrary()
    const target = await fixture()
    target.prepare('INSERT INTO mobile_preferences VALUES(?,?)').run('keep', 'original')
    await target.flush()
    await expect(
      importDesktopLibrary(target, [
        ...source.files,
        { path: 'MyMind/data/mymind.sqlite-wal', file: new Blob(['active']) }
      ])
    ).rejects.toThrow('закройте desktop')
    await expect(importDesktopLibrary(target, [source.files[0]])).rejects.toThrow(
      'отсутствует вложение'
    )
    await expect(
      importDesktopLibrary(target, [
        source.files[0],
        { ...source.files[1], file: new Blob(['truncated']) }
      ])
    ).rejects.toThrow('Размер вложения')
    expect(target.prepare("SELECT value FROM mobile_preferences WHERE key='keep'").get()).toEqual({
      value: 'original'
    })
    expect(await target.disk.listAssets()).toEqual([])
    source.db.sqlite.close()
    target.sqlite.close()
  })
})
