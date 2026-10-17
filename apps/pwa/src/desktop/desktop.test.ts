import 'fake-indexeddb/auto'
import initSqlJs from 'sql.js'
import { describe, expect, it } from 'vitest'
import { createNotesRepository } from '@mymind/persistence/notes'
import { createBoardSnapshotEnvelope } from '@mymind/contracts/boards'
import { createPwaAssetStore } from '../storage/assets'
import { PwaDatabase } from '../storage/database'
import { migrateDatabase } from '../storage/migrations'
import { openPwaDisk } from '../storage/indexed-db'
import { createDesktopRepositories } from './repositories'
import { bindDesktopRuntime } from './runtime'
import { createDesktopBridge } from './bridge'

async function fixture(): Promise<{
  db: PwaDatabase
  api: ReturnType<typeof createDesktopBridge>
  repositories: Awaited<ReturnType<typeof createDesktopRepositories>>
}> {
  const engine = await initSqlJs()
  const sqlite = new engine.Database()
  migrateDatabase(sqlite)
  const db = new PwaDatabase(sqlite, await openPwaDisk(crypto.randomUUID()), engine)
  const notes = createNotesRepository({
    database: () => db,
    createId: () => crypto.randomUUID(),
    now: Date.now
  })
  const assets = await createPwaAssetStore(db.disk)
  const repositories = await createDesktopRepositories(db, assets, notes)
  bindDesktopRuntime(db, repositories)
  return { db, api: createDesktopBridge(), repositories }
}

describe('PWA complete desktop editors persistence bridge', () => {
  it('refreshes incoming workout photos and revokes removed URLs after synchronization', async () => {
    const { db, repositories } = await fixture()
    const photo = {
      id: crypto.randomUUID(),
      entryId: crypto.randomUUID(),
      assetId: crypto.randomUUID(),
      fileName: 'photo.png',
      mimeType: 'image/png',
      size: 8,
      url: '',
      view: 'front' as const,
      createdAt: Date.now()
    }
    const path = `workout-progress/${photo.entryId}/${photo.assetId}/${photo.fileName}`
    expect(repositories.photoUri(photo)).toBe('')
    await db.disk.putAsset({ path, blob: new Blob(['received'], { type: 'image/png' }) })
    await repositories.reloadAssets()
    const uri = repositories.photoUri(photo)
    expect(await (await fetch(uri)).text()).toBe('received')
    await db.disk.deleteAssets([path])
    await repositories.reloadAssets()
    expect(repositories.photoUri(photo)).toBe('')
    await expect(fetch(uri)).rejects.toThrow()
    repositories.dispose()
    db.sqlite.close()
  })
  it('preserves study tree, heading search and material content through reopen', async () => {
    const { db, api } = await fixture()
    const folder = await api.study.createNode({ type: 'folder', title: 'Курс', parentId: null })
    const material = await api.study.createNode({
      type: 'material',
      title: 'Глава',
      parentId: folder.id
    })
    await api.study.saveMaterial({
      nodeId: material.id,
      document: {
        version: 1,
        blocks: [
          { id: crypto.randomUUID(), type: 'heading', level: 2, text: 'Архитектура' },
          { id: crypto.randomUUID(), type: 'text', text: 'Офлайн' }
        ]
      }
    })
    expect(
      (await api.study.searchInternalLinkTargets({ query: 'Архитектура' }))[0].materialId
    ).toBe(material.id)
    const reopened = new db.engine.Database(await db.disk.readDatabase())
    expect(
      reopened.exec('SELECT title FROM study_nodes WHERE id = ?', [folder.id])[0].values
    ).toEqual([['Курс']])
    expect(
      String(
        reopened.exec('SELECT document FROM study_materials WHERE node_id = ?', [material.id])[0]
          .values[0][0]
      )
    ).toContain('Офлайн')
    reopened.close()
    db.sqlite.close()
  })
  it('runs the original readable DSL engine and persists ORM changes', async () => {
    const { db, api } = await fixture()
    const material = await api.study.createNode({
      type: 'material',
      title: 'Before',
      parentId: null
    })
    const snapshot = await api.study.getCodeSnapshot({ nodeId: material.id })
    const input = {
      nodeId: material.id,
      baseRevision: snapshot.revision,
      source: snapshot.source.replace('Before', 'After')
    }
    expect((await api.study.previewCode(input)).valid).toBe(true)
    await api.study.applyCode(input)
    expect((await api.study.listNodes()).find((node) => node.id === material.id)?.title).toBe(
      'After'
    )
    const reopened = new db.engine.Database(await db.disk.readDatabase())
    expect(
      reopened.exec('SELECT title FROM study_nodes WHERE id = ?', [material.id])[0].values
    ).toEqual([['After']])
    expect(
      reopened.exec('SELECT count(*) FROM study_code_node_names')[0].values[0][0]
    ).toBeGreaterThan(0)
    reopened.close()
    db.sqlite.close()
  })
  it('stores drawing snapshots and removes linked study blocks when their board is deleted', async () => {
    const { db, api } = await fixture()
    const material = await api.study.createNode({
      type: 'material',
      title: 'Доска',
      parentId: null
    })
    const blockId = crypto.randomUUID()
    await api.study.saveMaterial({
      nodeId: material.id,
      document: { version: 1, blocks: [{ id: blockId, type: 'board' }] }
    })
    const board = await api.boards.ensureStudyBoard({ materialId: material.id, blockId })
    const snapshot = createBoardSnapshotEnvelope('a4', { document: { store: { test: 'drawing' } } })
    await api.boards.saveDocument({ nodeId: board.id, snapshot })
    expect((await api.boards.getDocument(board.id)).snapshot).toEqual(snapshot)
    await api.boards.deleteNode(board.id)
    expect((await api.study.getMaterial(material.id)).document.blocks).toEqual([])
    db.sqlite.close()
  })
  it('creates programs and sessions and calculates workout reports using local SQL', async () => {
    const { db, api } = await fixture()
    const exercise = await api.workouts.createExercise({
      title: 'Test press',
      muscleGroups: ['chest'],
      usesExternalWeight: true,
      status: 'active'
    })
    const program = await api.workouts.createProgram({
      name: 'Program',
      description: '',
      status: 'active',
      exercises: [{ exerciseId: exercise.id }]
    })
    const session = await api.workouts.createSession({
      programId: program.id,
      date: '2026-10-17',
      durationMinutes: 40,
      comment: '',
      exercises: [{ exerciseId: exercise.id, comment: '', sets: [{ reps: 5, weightKg: 80 }] }]
    })
    expect((await api.workouts.getSession({ id: session.id })).exercises[0].sets[0].weightKg).toBe(
      80
    )
    const report = await api.workouts.getReport({
      dateFrom: '2026-10-01',
      dateTo: '2026-10-31',
      programId: null,
      exerciseId: null,
      muscleGroup: null
    })
    expect(report.summary).toMatchObject({ volumeKg: 400, reps: 5 })
    const reopened = new db.engine.Database(await db.disk.readDatabase())
    expect(reopened.exec('SELECT count(*) FROM workout_sessions')[0].values).toEqual([[1]])
    reopened.close()
    db.sqlite.close()
  })
  it('keeps notes with formatting and attachments metadata in the same local library', async () => {
    const { db, api } = await fixture()
    const group = await api.notes.createGroup({ title: 'Учёба' })
    const note = await api.notes.createNote({ groupId: group.id, title: 'Заметка' })
    await api.notes.saveNote({
      id: note.id,
      document: {
        version: 1,
        blocks: [
          {
            id: crypto.randomUUID(),
            type: 'text',
            text: 'Strong',
            html: '<p><strong>Strong</strong></p>'
          }
        ]
      }
    })
    expect((await api.notes.getNote(note.id)).document.blocks[0]).toMatchObject({
      html: '<p><strong>Strong</strong></p>'
    })
    db.sqlite.close()
  })
})
