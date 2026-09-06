import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import type { RepositoryRuntime, SqlDatabasePort } from '@mymind/contracts/storage'
import type { StudyDocument } from '@mymind/contracts/study'
import { mobileSchemaV3 } from './mobile-schema-v3'
import { createStudyRepository } from './study'

const databases: Database.Database[] = []

function setup(hooks: Parameters<typeof createStudyRepository>[1] = {}) {
  const db = new Database(':memory:')
  databases.push(db)
  db.pragma('foreign_keys = ON')
  for (const sql of mobileSchemaV3) db.exec(sql)
  let id = 0
  let now = 1_000
  const runtime: RepositoryRuntime = {
    database: () => db as unknown as SqlDatabasePort,
    createId: () => `id-${++id}`,
    now: () => ++now
  }
  return { db, study: createStudyRepository(runtime, hooks) }
}

function deferred() {
  let resolve!: () => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function document(text: string, heading = 'Раздел'): StudyDocument {
  return {
    version: 1,
    blocks: [
      { id: 'heading-1', type: 'heading', text: heading, level: 2 },
      { id: 'text-1', type: 'text', text }
    ]
  }
}

afterEach(() => {
  for (const db of databases.splice(0)) db.close()
})

describe('shared Study persistence', () => {
  it('persists a nested tree, searchable material content and heading targets', async () => {
    const { study } = setup()
    const folder = study.createNode({ type: 'folder', parentId: null, title: 'Frontend' })
    const material = study.createNode({
      type: 'material',
      parentId: folder.id,
      title: 'React'
    })

    const saved = await study.saveMaterial({
      nodeId: material.id,
      document: document('Состояние и эффекты', 'Hooks')
    })

    expect(saved.plainText).toContain('Состояние и эффекты')
    expect(study.listNodes()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: folder.id, type: 'folder', title: 'Frontend' }),
        expect.objectContaining({ id: material.id, parentId: folder.id, title: 'React' })
      ])
    )
    expect(study.searchInternalLinkTargets({ query: 'hooks' })[0]).toEqual(
      expect.objectContaining({
        kind: 'heading',
        materialId: material.id,
        title: 'Hooks',
        materialTitle: 'React',
        folderPath: ['Frontend']
      })
    )

    study.renameNode(folder.id, 'Web')
    expect(study.searchInternalLinkTargets({ query: 'web' })[0]).toEqual(
      expect.objectContaining({ materialId: material.id, folderPath: ['Web'] })
    )
  })

  it('moves and duplicates subtrees while rejecting cycles and remapping internal links', async () => {
    const { study } = setup()
    const source = study.createNode({ type: 'folder', parentId: null, title: 'Курс' })
    const child = study.createNode({ type: 'folder', parentId: source.id, title: 'Глава' })
    const first = study.createNode({ type: 'material', parentId: source.id, title: 'Введение' })
    const second = study.createNode({ type: 'material', parentId: child.id, title: 'Практика' })
    await study.saveMaterial({
      nodeId: first.id,
      document: {
        version: 1,
        blocks: [
          {
            id: 'text-link',
            type: 'text',
            text: 'Открыть практику',
            html: `<p data-material-id="${second.id}">Открыть</p>`
          }
        ]
      }
    })

    expect(() => study.moveNode({ id: source.id, parentId: child.id, position: 0 })).toThrow(
      'потомка'
    )

    const duplicated = await study.duplicateNode(source.id)
    const duplicateRoot = duplicated.nodes.find((node) => node.id === duplicated.rootId)
    expect(duplicateRoot?.title).toBe('Курс — копия')
    const duplicateMaterials = duplicated.nodes.filter(
      (node) =>
        node.type === 'material' &&
        (node.parentId === duplicated.rootId ||
          duplicated.nodes.find((parent) => parent.id === node.parentId)?.parentId === duplicated.rootId)
    )
    expect(duplicateMaterials).toHaveLength(2)
    const copiedIntro = duplicateMaterials.find((node) => node.title === 'Введение')
    const copiedPractice = duplicateMaterials.find((node) => node.title === 'Практика')
    expect(copiedIntro && copiedPractice).toBeTruthy()
    const copiedDocument = study.getMaterial(copiedIntro!.id).document
    const html = copiedDocument.blocks[0]?.type === 'text' ? copiedDocument.blocks[0].html : undefined
    expect(html).toContain(copiedPractice!.id)
    expect(html).not.toContain(second.id)
  })

  it('serializes deletion behind an in-progress save', async () => {
    const gate = deferred()
    const { db, study } = setup({ validateDocumentAssets: async () => gate.promise })
    const material = study.createNode({ type: 'material', parentId: null, title: 'Очередь' })

    const saving = study.saveMaterial({ nodeId: material.id, document: document('Новая версия') })
    await Promise.resolve()
    const deleting = study.deleteNode(material.id)

    expect(db.prepare('SELECT COUNT(*) AS count FROM study_nodes').get()).toEqual({ count: 1 })
    gate.resolve()
    await saving
    await expect(deleting).resolves.toBe(true)
    expect(db.prepare('SELECT COUNT(*) AS count FROM study_nodes').get()).toEqual({ count: 0 })
  })

  it('allows a queued delete to continue after a failed save', async () => {
    let fail = true
    const { db, study } = setup({
      validateDocumentAssets: async () => {
        if (fail) {
          fail = false
          throw new Error('asset unavailable')
        }
      }
    })
    const material = study.createNode({ type: 'material', parentId: null, title: 'Ошибка' })

    const saving = study.saveMaterial({ nodeId: material.id, document: document('Не сохранится') })
    const deleting = study.deleteNode(material.id)

    await expect(saving).rejects.toThrow('asset unavailable')
    await expect(deleting).resolves.toBe(true)
    expect(db.prepare('SELECT COUNT(*) AS count FROM study_nodes').get()).toEqual({ count: 0 })
  })
})
