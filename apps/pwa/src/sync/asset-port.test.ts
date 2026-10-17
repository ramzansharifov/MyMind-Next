import 'fake-indexeddb/auto'
import initSqlJs from 'sql.js'
import { describe, expect, it } from 'vitest'
import { createNotesRepository } from '@mymind/persistence/notes'
import { captureSyncSnapshot } from '@mymind/persistence/sync'
import { createCanonicalStudyAssetUrl } from '@mymind/core/study-assets'
import { PwaDatabase } from '../storage/database'
import { migrateDatabase } from '../storage/migrations'
import { openPwaDisk } from '../storage/indexed-db'
import { createPwaSyncAssets } from './asset-port'
import { digestBlob } from '../storage/backup'
import type { SyncAssetManifestEntry } from '@mymind/contracts/profile-sync'

async function fixture(): Promise<PwaDatabase> {
  const engine = await initSqlJs()
  const sqlite = new engine.Database()
  migrateDatabase(sqlite)
  return new PwaDatabase(sqlite, await openPwaDisk(crypto.randomUUID()), engine)
}
describe('browser sync attachment port', () => {
  it('maps native sync paths to durable browser files and transfers checked chunks through IndexedDB staging', async () => {
    const source = await fixture()
    const target = await fixture()
    const notes = createNotesRepository({
      database: () => source,
      createId: () => crypto.randomUUID(),
      now: Date.now
    })
    const note = notes.createNote({ title: 'With attachment', groupId: null })
    const id = crypto.randomUUID()
    const name = 'file.txt'
    const blob = new Blob(['local asset content'], { type: 'text/plain' })
    const asset = {
      id,
      materialId: note.id,
      name,
      mimeType: 'text/plain',
      size: blob.size,
      url: createCanonicalStudyAssetUrl({ materialId: note.id, assetId: id, fileName: name })
    }
    await source.disk.putAsset({ path: `document-assets/${note.id}/${id}/${name}`, blob })
    await notes.saveNote({
      id: note.id,
      document: {
        version: 1,
        blocks: [{ id: crypto.randomUUID(), type: 'file', source: { type: 'local', asset } }]
      }
    })
    const sender = createPwaSyncAssets(source)
    const receiver = createPwaSyncAssets(target)
    const manifest = await sender.collectMobileSyncAssetManifest(
      captureSyncSnapshot(source, ['notes'])
    )
    expect(manifest).toHaveLength(1)
    expect(manifest[0].path).toBe(`notes/${note.id}/${id}/${name}`)
    await sender.readMobileSyncAssetChunks(manifest[0], async (offset, bytes) => {
      await receiver.stageMobileSyncAssetChunk(
        'plan-1',
        manifest[0],
        offset,
        receiver.decodeSyncBase64(sender.encodeSyncBase64(bytes))
      )
    })
    await receiver.commitMobileSyncAssets('plan-1', manifest)
    expect(await (await target.disk.listAssets())[0].blob.text()).toBe('local asset content')
    await receiver.cleanupMobileSyncAssetStage('plan-1')
    expect(await target.disk.readState(`sync-stage:plan-1:${manifest[0].path}:0`)).toBeUndefined()
    await source.flush()
    await target.flush()
    source.sqlite.close()
    target.sqlite.close()
  })
  it('rejects altered, out-of-order and malformed chunks before replacing files', async () => {
    const db = await fixture()
    const port = createPwaSyncAssets(db)
    const blob = new Blob(['good'])
    const ownerId = crypto.randomUUID()
    const assetId = crypto.randomUUID()
    const entry: SyncAssetManifestEntry = {
      kind: 'note-asset',
      ownerId,
      assetId,
      fileName: 'a.txt',
      path: `notes/${ownerId}/${assetId}/a.txt`,
      size: 4,
      sha256: await digestBlob(blob)
    }
    await expect(
      port.stageMobileSyncAssetChunk('bad-order', entry, 2, new Uint8Array([1]))
    ).rejects.toThrow('порядок')
    await port.stageMobileSyncAssetChunk('bad-content', entry, 0, new TextEncoder().encode('evil'))
    await expect(port.commitMobileSyncAssets('bad-content', [entry])).rejects.toThrow('Повреждено')
    expect(await db.disk.listAssets()).toEqual([])
    expect(() => port.decodeSyncBase64('bad')).toThrow('кодировка')
    await port.cleanupMobileSyncAssetStage('bad-content')
    db.sqlite.close()
  })
})
