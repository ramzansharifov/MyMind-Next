import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

import { closeDatabase, getDatabase, initializeDatabaseForTesting } from '../database/client'
import { runDatabaseMigrationsFrom } from '../database/migrate'
import { appMeta, studyNodes } from '../database/schema'
import { createStudyNode, getStudyMaterial } from '../repositories/study.repository'
import { applyStudyCode, getStudyCodeSnapshot, previewStudyCode } from './study-code-service'

let testRoot = ''

beforeAll(async () => {
  testRoot = await mkdtemp(join(tmpdir(), 'mymind-study-folder-code-'))
  initializeDatabaseForTesting(join(testRoot, 'study-folder-code.sqlite'))
  runDatabaseMigrationsFrom(resolve(process.cwd(), 'drizzle'))
})

beforeEach(() => {
  const database = getDatabase()
  database.delete(studyNodes).run()
  database.delete(appMeta).run()
})

afterAll(async () => {
  closeDatabase()
  await rm(testRoot, { recursive: true, force: true })
})

describe('Study folder Code Mode structure editing', () => {
  it('creates a nested folder tree and several populated materials in one apply', async () => {
    const root = createStudyNode({ type: 'folder', parentId: null, title: 'Курс' })
    const snapshot = getStudyCodeSnapshot(root.id)
    const source = `@version(1)\n\nfolder "Курс" icon="book" {\n  material "Введение" {\n    text """\n      Базовый материал\n    """\n  }\n\n  folder "Раздел 1" icon="folder" {\n    material "Лекция 1" {\n      heading 1 "Первая лекция"\n      text """\n        Теория\n      """\n    }\n\n    material "Практика 1" {\n      markdown """\n        - Задача 1\n        - Задача 2\n      """\n    }\n  }\n\n  folder "Раздел 2" icon="folder" {\n    material "Лекция 2" {\n      latex """\n        x^2 + y^2\n      """\n    }\n  }\n}\n`

    const preview = previewStudyCode({
      nodeId: root.id,
      source,
      baseRevision: snapshot.revision
    })

    expect(preview.valid).toBe(true)
    expect(preview.destructive).toBe(false)
    expect(preview.summary).toMatchObject({
      createdFolders: 2,
      createdMaterials: 4,
      createdBlocks: 5
    })

    const result = await applyStudyCode({
      nodeId: root.id,
      source,
      baseRevision: snapshot.revision,
      confirmDestructive: false
    })

    const byTitle = new Map(result.nodes.map((node) => [node.title, node]))
    const introduction = byTitle.get('Введение')
    const sectionOne = byTitle.get('Раздел 1')
    const sectionTwo = byTitle.get('Раздел 2')
    const lectureOne = byTitle.get('Лекция 1')
    const practiceOne = byTitle.get('Практика 1')
    const lectureTwo = byTitle.get('Лекция 2')

    expect(introduction).toMatchObject({ type: 'material', parentId: root.id, position: 0 })
    expect(sectionOne).toMatchObject({ type: 'folder', parentId: root.id, position: 1 })
    expect(sectionTwo).toMatchObject({ type: 'folder', parentId: root.id, position: 2 })
    expect(lectureOne).toMatchObject({ type: 'material', parentId: sectionOne?.id, position: 0 })
    expect(practiceOne).toMatchObject({ type: 'material', parentId: sectionOne?.id, position: 1 })
    expect(lectureTwo).toMatchObject({ type: 'material', parentId: sectionTwo?.id, position: 0 })

    expect(getStudyMaterial(lectureOne!.id).document.blocks.map((block) => block.type)).toEqual([
      'heading',
      'text'
    ])
    expect(getStudyMaterial(practiceOne!.id).document.blocks[0]).toMatchObject({ type: 'markdown' })
    expect(getStudyMaterial(lectureTwo!.id).document.blocks[0]).toMatchObject({ type: 'latex' })

    const savedSnapshot = getStudyCodeSnapshot(root.id)
    expect(savedSnapshot.source).toContain('folder')
    expect(savedSnapshot.source).toContain('material')
    expect(savedSnapshot.source).toContain('"Раздел 1"')
    expect(savedSnapshot.source).toContain('"Лекция 2"')
    expect(savedSnapshot.source).not.toContain('@id(')
  })

  it('does not partially create a folder tree when any nested declaration is invalid', async () => {
    const root = createStudyNode({ type: 'folder', parentId: null, title: 'Курс' })
    const snapshot = getStudyCodeSnapshot(root.id)
    const invalidSource = `@version(1)\n\nfolder "Курс" {\n  material "Корректный материал" {\n    text """\n      Этот материал не должен появиться частично\n    """\n  }\n\n  folder "Некорректный раздел" icon="несуществующая-иконка" {\n    material "Вложенный материал" {\n      text """\n        Текст\n      """\n    }\n  }\n}\n`

    await expect(
      applyStudyCode({
        nodeId: root.id,
        source: invalidSource,
        baseRevision: snapshot.revision,
        confirmDestructive: false
      })
    ).rejects.toThrow()

    const rows = getDatabase().select().from(studyNodes).all()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ id: root.id, title: 'Курс', type: 'folder' })
  })

  it('rejects a stale folder snapshot when the subtree changed after Code Mode was opened', () => {
    const root = createStudyNode({ type: 'folder', parentId: null, title: 'Курс' })
    const snapshot = getStudyCodeSnapshot(root.id)

    createStudyNode({ type: 'material', parentId: root.id, title: 'Добавлен снаружи' })

    const preview = previewStudyCode({
      nodeId: root.id,
      source: snapshot.source,
      baseRevision: snapshot.revision
    })

    expect(preview.valid).toBe(false)
    expect(preview.diagnostics).toHaveLength(1)
    expect(preview.summary).toMatchObject({ createdFolders: 0, createdMaterials: 0 })
  })
})
