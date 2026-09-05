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
  testRoot = await mkdtemp(join(tmpdir(), 'mymind-study-code-links-'))
  initializeDatabaseForTesting(join(testRoot, 'study-code-links.sqlite'))
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

describe('Study Code Mode symbolic internal links', () => {
  it('creates folders, materials and cross-links to new materials/headings in one atomic apply', async () => {
    const root = createStudyNode({ type: 'folder', parentId: null, title: 'Базы данных' })
    const snapshot = getStudyCodeSnapshot(root.id)
    const rootName = snapshot.source.match(/folder\s+([A-Za-z_][A-Za-z0-9_]*)\s+"Базы данных"/)?.[1]

    expect(rootName).toBeTruthy()

    const source = `@version(1)\n\nfolder ${rootName} "Базы данных" {\n  folder Basics "01. Основы" {\n    material Intro "Введение в базы данных" {\n      heading Overview 1 "Что такое база данных"\n\n      text """\n        Начните с [[RelationalModel|реляционной модели]], а затем переходите к [[SqlBasics.Select|оператору SELECT]].\n      """\n    }\n\n    material RelationalModel "Реляционная модель" {\n      heading Keys 1 "Ключи и связи"\n\n      text """\n        Реляционная модель организует данные в таблицах.\n      """\n    }\n  }\n\n  folder Sql "02. SQL" {\n    material SqlBasics "Основы SQL" {\n      heading Select 1 "SELECT"\n\n      text """\n        SELECT читает данные из таблиц. Вернуться: [[Intro|к введению]].\n      """\n    }\n  }\n}\n`

    const preview = previewStudyCode({
      nodeId: root.id,
      source,
      baseRevision: snapshot.revision
    })

    expect(preview.valid).toBe(true)
    expect(preview.summary.createdFolders).toBe(2)
    expect(preview.summary.createdMaterials).toBe(3)

    const applied = await applyStudyCode({
      nodeId: root.id,
      source,
      baseRevision: snapshot.revision,
      confirmDestructive: true
    })

    const introNode = applied.nodes.find((node) => node.title === 'Введение в базы данных')
    const relationalNode = applied.nodes.find((node) => node.title === 'Реляционная модель')
    const sqlNode = applied.nodes.find((node) => node.title === 'Основы SQL')

    expect(introNode?.type).toBe('material')
    expect(relationalNode?.type).toBe('material')
    expect(sqlNode?.type).toBe('material')

    const intro = getStudyMaterial(introNode!.id).document
    const sql = getStudyMaterial(sqlNode!.id).document
    const introText = intro.blocks.find((block) => block.type === 'text')
    const selectHeading = sql.blocks.find(
      (block) => block.type === 'heading' && block.text === 'SELECT'
    )

    expect(introText?.type).toBe('text')
    expect(selectHeading?.type).toBe('heading')

    if (introText?.type !== 'text' || selectHeading?.type !== 'heading') {
      throw new Error('Тестовые блоки не созданы')
    }

    expect(introText.html).toContain(`data-material-id="${relationalNode!.id}"`)
    expect(introText.html).toContain(`data-material-id="${sqlNode!.id}"`)
    expect(introText.html).toContain(`data-heading-id="${selectHeading.id}"`)
    expect(introText.text).toContain('реляционной модели')
    expect(introText.text).toContain('оператору SELECT')

    const readable = getStudyCodeSnapshot(root.id).source
    expect(readable).toContain('[[RelationalModel|реляционной модели]]')
    expect(readable).toContain('[[SqlBasics.Select|оператору SELECT]]')
    expect(readable).toContain('[[Intro|к введению]]')
    expect(readable).not.toContain('data-material-id=')
    expect(readable).not.toContain(relationalNode!.id)
    expect(readable).not.toContain(selectHeading.id)
  })

  it('rejects an unknown symbolic target before applying the tree', () => {
    const root = createStudyNode({ type: 'folder', parentId: null, title: 'Базы данных' })
    const snapshot = getStudyCodeSnapshot(root.id)
    const rootName = snapshot.source.match(/folder\s+([A-Za-z_][A-Za-z0-9_]*)\s+"Базы данных"/)?.[1]

    const source = `@version(1)\n\nfolder ${rootName} "Базы данных" {\n  material Intro "Введение" {\n    text """\n      Перейти к [[MissingMaterial]].\n    """\n  }\n}\n`

    const preview = previewStudyCode({
      nodeId: root.id,
      source,
      baseRevision: snapshot.revision
    })

    expect(preview.valid).toBe(false)
    expect(preview.diagnostics[0]?.message).toContain('MissingMaterial')
    expect(preview.diagnostics[0]?.message).toContain('не найден')
    expect(getDatabase().select().from(studyNodes).all()).toHaveLength(1)
  })
})
