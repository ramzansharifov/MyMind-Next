import 'fake-indexeddb/auto'
import initSqlJs, { type SqlJsStatic } from 'sql.js'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { createTasksRepository } from '@mymind/persistence/tasks'
import { migrateDatabase } from './migrations'
import { PwaDatabase } from './database'
import { openPwaDisk } from './indexed-db'
import { exportBackup, restoreBackup } from './backup'
import { backupSummary } from './backup-summary'
import { createPwaAssetStore } from './assets'
import { createNotesRepository } from '@mymind/persistence/notes'
import { createCanonicalStudyAssetUrl } from '@mymind/core/study-assets'

let engine: SqlJsStatic
beforeAll(async () => {
  engine = await initSqlJs()
})

async function fixture(): Promise<PwaDatabase> {
  const disk = await openPwaDisk(`test-${crypto.randomUUID()}`)
  const sqlite = new engine.Database()
  migrateDatabase(sqlite)
  await disk.saveDatabase(sqlite.export())
  sqlite.run('PRAGMA foreign_keys = ON')
  return new PwaDatabase(sqlite, disk, engine)
}
function tasks(db: PwaDatabase): ReturnType<typeof createTasksRepository> {
  return createTasksRepository({
    database: () => db,
    createId: () => crypto.randomUUID(),
    now: Date.now
  })
}
function preference(db: PwaDatabase, value: string): void {
  db.prepare('INSERT OR REPLACE INTO mobile_preferences(key,value) VALUES (?,?)').run('test', value)
}

describe('PWA local SQLite', () => {
  it('reads existing Blob attachments and persists binary attachments and sync stages across reopen', async () => {
    const name = `compatibility-${crypto.randomUUID()}`
    const disk = await openPwaDisk(name)
    const legacy = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open(name)
      request.onsuccess = () => resolve(request.result)
    })
    await new Promise<void>((resolve, reject) => {
      const tx = legacy.transaction('assets', 'readwrite')
      tx.objectStore('assets').put({ path: 'legacy.txt', blob: new Blob(['old']) })
      tx.oncomplete = () => resolve()
      tx.onabort = () => reject(tx.error)
    })
    legacy.close()
    await disk.putAsset({ path: 'new.txt', blob: new Blob(['new'], { type: 'text/plain' }) })
    await disk.writeState('sync-stage:test', new Blob(['part'], { type: 'audio/webm' }))
    const reopened = await openPwaDisk(name)
    const files = await reopened.listAssets()
    expect(await Promise.all(files.map((file) => file.blob.text()))).toEqual(['old', 'new'])
    expect(files[1].blob.type).toBe('text/plain')
    const part = await reopened.readState<Blob>('sync-stage:test')
    expect(await part!.text()).toBe('part')
    expect(part!.type).toBe('audio/webm')
  })
  it('migrates the shared schema and persists real repository writes across reopen', async () => {
    const db = await fixture()
    const task = tasks(db).createTask({
      title: 'Офлайн-задача',
      description: '',
      groupId: null,
      status: 'active',
      priority: 'normal',
      dueDate: null,
      dueTime: null
    })
    await db.flush()
    const reopened = new engine.Database(await db.disk.readDatabase())
    expect(reopened.exec('SELECT title FROM tasks WHERE id = ?', [task.id])[0].values).toEqual([
      ['Офлайн-задача']
    ])
    expect(reopened.exec('PRAGMA user_version')[0].values).toEqual([[9]])
    expect(db.sqlite.exec('PRAGMA foreign_keys')[0].values).toEqual([[1]])
    reopened.close()
    db.sqlite.close()
  })
  it('rolls back nested transactions without persisting partial writes', async () => {
    const db = await fixture()
    preference(db, 'before')
    await db.flush()
    expect(() =>
      db.transaction(() => {
        preference(db, 'outer')
        db.transaction(() => {
          preference(db, 'inner')
          throw new Error('abort')
        })()
      })()
    ).toThrow('abort')
    await db.flush()
    const reopened = new engine.Database(await db.disk.readDatabase())
    expect(
      reopened.exec("SELECT value FROM mobile_preferences WHERE key='test'")[0].values
    ).toEqual([['before']])
    reopened.close()
    db.sqlite.close()
  })
  it('blocks further writes on storage failure and retries the unsaved snapshot', async () => {
    const db = await fixture()
    const save = vi.spyOn(db.disk, 'saveDatabase').mockRejectedValue(new Error('quota exceeded'))
    preference(db, 'keep me')
    await expect(db.flush()).rejects.toThrow('quota exceeded')
    expect(db.state).toBe('error')
    expect(() => preference(db, 'lost')).toThrow('Повторите сохранение')
    save.mockRestore()
    await db.flush()
    expect(db.state).toBe('saved')
    const reopened = new engine.Database(await db.disk.readDatabase())
    expect(
      reopened.exec("SELECT value FROM mobile_preferences WHERE key='test'")[0].values
    ).toEqual([['keep me']])
    reopened.close()
    db.sqlite.close()
  })
  it('captures a write arriving while an older snapshot is being committed', async () => {
    const db = await fixture()
    const original = db.disk.saveDatabase.bind(db.disk)
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    vi.spyOn(db.disk, 'saveDatabase').mockImplementationOnce(async (bytes) => {
      await gate
      await original(bytes)
    })
    preference(db, 'first')
    const pending = db.flush()
    preference(db, 'latest')
    release()
    await pending
    const reopened = new engine.Database(await db.disk.readDatabase())
    expect(
      reopened.exec("SELECT value FROM mobile_preferences WHERE key='test'")[0].values
    ).toEqual([['latest']])
    reopened.close()
    db.sqlite.close()
  })
  it('rejects future database versions without overwriting them', async () => {
    const sqlite = new engine.Database()
    sqlite.run('PRAGMA user_version = 100')
    expect(() => migrateDatabase(sqlite)).toThrow('более новой')
    expect(sqlite.exec('PRAGMA user_version')[0].values).toEqual([[100]])
    sqlite.close()
  })
})

describe('PWA backup and persistent attachments', () => {
  it('releases old object URLs when replacing services without deleting durable attachments', async () => {
    const db = await fixture()
    const path = 'document-assets/owner/asset/photo.png'
    await db.disk.putAsset({ path, blob: new Blob(['image']) })
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    const old = await createPwaAssetStore(db.disk)
    const next = await createPwaAssetStore(db.disk)
    old.dispose()
    expect(revoke).toHaveBeenCalledTimes(1)
    expect(await db.disk.listAssets()).toHaveLength(1)
    next.dispose()
    expect(revoke).toHaveBeenCalledTimes(2)
    revoke.mockRestore()
    db.sqlite.close()
  })
  it.each(['missing', 'truncated', 'malformed'] as const)(
    'rejects a checksum-valid archive with %s document data, preserving the prior library',
    async (mode) => {
      const source = await fixture(),
        target = await fixture()
      const notes = createNotesRepository({
        database: () => source,
        createId: () => crypto.randomUUID(),
        now: Date.now
      })
      const note = notes.createNote({ title: 'Imported', groupId: null })
      const id = crypto.randomUUID(),
        name = 'image.png'
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
      if (mode === 'truncated')
        await source.disk.putAsset({
          path: `document-assets/${note.id}/${id}/${name}`,
          blob: new Blob(['bad'])
        })
      if (mode === 'malformed')
        source.prepare('UPDATE notes SET document=? WHERE id=?').run('{broken', note.id)
      preference(target, 'valuable')
      await target.flush()
      await target.disk.putAsset({
        path: 'document-assets/keep/keep/file.txt',
        blob: new Blob(['original'])
      })
      const archive = await exportBackup(source)
      await expect(restoreBackup(target, archive)).rejects.toThrow()
      expect(target.prepare("SELECT value FROM mobile_preferences WHERE key='test'").get()).toEqual(
        { value: 'valuable' }
      )
      expect(await (await target.disk.listAssets())[0].blob.text()).toBe('original')
      source.sqlite.close()
      target.sqlite.close()
    }
  )
  it('rejects a valid SQLite archive with a missing module table before replacing data', async () => {
    const source = await fixture()
    source.sqlite.run('DROP TABLE music_playlist_items')
    const archive = await exportBackup(source)
    const target = await fixture()
    preference(target, 'keep')
    await target.flush()
    await expect(restoreBackup(target, archive)).rejects.toThrow('Структура базы')
    expect(target.prepare("SELECT value FROM mobile_preferences WHERE key='test'").get()).toEqual({
      value: 'keep'
    })
    source.sqlite.close()
    target.sqlite.close()
  })
  it('keeps the prior database and attachments if atomic IndexedDB replacement aborts', async () => {
    const source = await fixture()
    preference(source, 'import')
    const archive = await exportBackup(source)
    const target = await fixture()
    preference(target, 'keep')
    await target.flush()
    await target.disk.putAsset({ path: 'document-assets/a/b/c.txt', blob: new Blob(['keep']) })
    vi.spyOn(target.disk, 'replace').mockRejectedValue(new Error('quota'))
    await expect(restoreBackup(target, archive)).rejects.toThrow('quota')
    expect(target.prepare("SELECT value FROM mobile_preferences WHERE key='test'").get()).toEqual({
      value: 'keep'
    })
    expect(await (await target.disk.listAssets())[0].blob.text()).toBe('keep')
    source.sqlite.close()
    target.sqlite.close()
  })
  it('restores the mobile archive format with both SQL and attachment bytes', async () => {
    const source = await fixture()
    preference(source, 'backup')
    await source.disk.putAsset({
      path: 'document-assets/owner/asset/photo.png',
      blob: new Blob(['photo bytes'], { type: 'image/png' })
    })
    const archive = await exportBackup(source)
    const summary = await backupSummary(archive)
    expect(summary.files).toBe(1)
    expect(summary.bytes).toBeLessThan(archive.size)
    expect(summary.bytes).toBeGreaterThan(11)
    expect(summary.createdAt).toBeGreaterThan(0)
    const target = await fixture()
    preference(target, 'old')
    await target.flush()
    await target.disk.putAsset({
      path: 'document-assets/old/old/file.txt',
      blob: new Blob(['old'])
    })
    await restoreBackup(target, archive)
    const reopened = new engine.Database(await target.disk.readDatabase())
    expect(
      reopened.exec("SELECT value FROM mobile_preferences WHERE key='test'")[0].values
    ).toEqual([['backup']])
    const assets = await target.disk.listAssets()
    expect(assets.map((asset) => asset.path)).toEqual(['document-assets/owner/asset/photo.png'])
    expect(await assets[0].blob.text()).toBe('photo bytes')
    reopened.close()
    source.sqlite.close()
    target.sqlite.close()
  })
  it('leaves existing data and attachments untouched when archive checksum fails', async () => {
    const db = await fixture()
    preference(db, 'valuable')
    await db.disk.putAsset({
      path: 'document-assets/owner/asset/a.txt',
      blob: new Blob(['original'])
    })
    const archive = new Uint8Array(await (await exportBackup(db)).arrayBuffer())
    archive[archive.length - 1] ^= 1
    await expect(restoreBackup(db, new Blob([archive]))).rejects.toThrow('повреждена')
    expect(db.prepare("SELECT value FROM mobile_preferences WHERE key='test'").get()).toEqual({
      value: 'valuable'
    })
    expect(await (await db.disk.listAssets())[0].blob.text()).toBe('original')
    db.sqlite.close()
  })
  it('resolves persisted files after recreating the attachment store', async () => {
    const db = await fixture()
    const { createCanonicalStudyAssetUrl } = await import('@mymind/core/study-assets')
    const asset = {
      id: crypto.randomUUID(),
      materialId: crypto.randomUUID(),
      name: 'photo.png',
      mimeType: 'image/png',
      size: 3,
      url: ''
    }
    asset.url = createCanonicalStudyAssetUrl({
      materialId: asset.materialId,
      assetId: asset.id,
      fileName: asset.name
    })
    await db.disk.putAsset({
      path: `document-assets/${asset.materialId}/${asset.id}/${asset.name}`,
      blob: new Blob(['abc'], { type: 'image/png' })
    })
    const store = await createPwaAssetStore(db.disk)
    expect(store.resolveAssetUri(asset)).toMatch(/^blob:/)
    await store.removeAssetsForOwners([asset.materialId])
    expect(store.resolveAssetUri(asset)).toBeNull()
    expect(await db.disk.listAssets()).toEqual([])
    db.sqlite.close()
  })
})
