import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

import { closeDatabase, getDatabase, initializeDatabaseForTesting } from '../database/client'
import { runDatabaseMigrationsFrom } from '../database/migrate'
import { appMeta, studyCodeBlockNames, studyCodeNodeNames, studyNodes } from '../database/schema'
import {
  createStudyNode,
  getStudyMaterial,
  listStudyNodes,
  saveStudyMaterial
} from '../repositories/study.repository'
import { setStudyAssetsRootForTesting } from './study-assets'
import {
  applyStudyCode,
  getStudyCodeSnapshot,
  previewStudyCode
} from './study-code-service'

let testRoot = ''
let assetsRoot = ''

beforeAll(async () => {
  testRoot = await mkdtemp(join(tmpdir(), 'mymind-study-code-readable-'))
  assetsRoot = join(testRoot, 'attachments')
  await mkdir(assetsRoot, { recursive: true })
  initializeDatabaseForTesting(join(testRoot, 'study-code-readable.sqlite'))
  runDatabaseMigrationsFrom(resolve(process.cwd(), 'drizzle'))
  setStudyAssetsRootForTesting(assetsRoot)
})

beforeEach(() => {
  const database = getDatabase()
  database.delete(studyNodes).run()
  database.delete(appMeta).run()
})

afterAll(async () => {
  setStudyAssetsRootForTesting(null)
  closeDatabase()
  await rm(testRoot, { recursive: true, force: true })
})

describe('Study Code Mode readable identities', () => {
  it('hides internal UUIDs and keeps generated names stable between snapshots', async () => {
    const material = createStudyNode({ type: 'material', parentId: null, title: 'История' })
    await saveStudyMaterial({
      nodeId: material.id,
      document: {
        version: 1,
        blocks: [{ id: 'visual-block-id', type: 'text', text: 'Введение' }]
      }
    })

    const first = getStudyCodeSnapshot(material.id)
    const second = getStudyCodeSnapshot(material.id)

    expect(first.source).toBe(second.source)
    expect(first.source).toContain('material Material1 "История"')
    expect(first.source).toContain('text Text1')
    expect(first.source).not.toContain('@id(')
    expect(first.source).not.toContain(material.id)
    expect(first.source).not.toContain('visual-block-id')

    expect(getDatabase().select().from(studyCodeNodeNames).all()).toEqual(
      expect.arrayContaining([expect.objectContaining({ nodeId: material.id, name: 'Material1' })])
    )
    expect(getDatabase().select().from(studyCodeBlockNames).all()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          blockId: 'visual-block-id',
          materialId: material.id,
          name: 'Text1'
        })
      ])
    )
  })

  it('accepts completely anonymous new blocks and assigns readable names after apply', async () => {
    const material = createStudyNode({
      type: 'material',
      parentId: null,
      title: 'Новый материал'
    })
    const snapshot = getStudyCodeSnapshot(material.id)
    const source = `@version(1)\n\nmaterial "Новый материал" {\n  heading 1 "Французская революция"\n\n  text """\n    Представьте Францию конца XVIII века.\n  """\n}\n`

    const preview = previewStudyCode({
      nodeId: material.id,
      source,
      baseRevision: snapshot.revision
    })

    expect(preview.valid).toBe(true)

    const result = await applyStudyCode({
      nodeId: material.id,
      source,
      baseRevision: snapshot.revision,
      confirmDestructive: true
    })

    expect(result.source).toContain('material Material1 "Новый материал"')
    expect(result.source).toMatch(/heading Heading\d+ 1 "Французская революция"/)
    expect(result.source).toMatch(/text Text\d+ """/)
    expect(result.source).not.toContain('@id(')

    const blocks = getStudyMaterial(material.id).document.blocks
    expect(blocks).toHaveLength(2)
    expect(blocks[0]?.type).toBe('heading')
    expect(blocks[1]?.type).toBe('text')
    expect(blocks.every((block) => block.id !== 'Heading1' && block.id !== 'Text1')).toBe(true)
  })

  it('preserves custom readable names for new tree entities', async () => {
    const root = createStudyNode({ type: 'folder', parentId: null, title: 'История' })
    const snapshot = getStudyCodeSnapshot(root.id)
    const source = `@version(1)\n\nfolder Folder1 "История" {\n  material FrenchRevolution "Французская революция" {\n    heading MainTitle 1 "Французская революция 1789–1799"\n\n    text Introduction """\n      Представьте Францию конца XVIII века.\n    """\n  }\n}\n`

    const preview = previewStudyCode({
      nodeId: root.id,
      source,
      baseRevision: snapshot.revision
    })
    expect(preview.valid).toBe(true)

    const result = await applyStudyCode({
      nodeId: root.id,
      source,
      baseRevision: snapshot.revision
    })

    expect(result.source).toContain('material FrenchRevolution "Французская революция"')
    expect(result.source).toContain('heading MainTitle 1 "Французская революция 1789–1799"')
    expect(result.source).toContain('text Introduction')
    expect(result.source).not.toContain('@id(')

    const created = listStudyNodes().find((node) => node.title === 'Французская революция')
    expect(created?.type).toBe('material')
    expect(created?.id).not.toBe('FrenchRevolution')
  })

  it('uses a readable name to edit the same entity instead of recreating it', async () => {
    const root = createStudyNode({ type: 'folder', parentId: null, title: 'Root' })
    const material = createStudyNode({ type: 'material', parentId: root.id, title: 'Before' })
    await saveStudyMaterial({
      nodeId: material.id,
      document: {
        version: 1,
        blocks: [{ id: 'stable-text-block', type: 'text', text: 'Before' }]
      }
    })

    const snapshot = getStudyCodeSnapshot(root.id)
    expect(snapshot.source).toContain('material Material1 "Before"')
    expect(snapshot.source).toContain('text Text1')

    const source = snapshot.source
      .replace('material Material1 "Before"', 'material Material1 "After"')
      .replace('Before\n', 'After\n')

    const result = await applyStudyCode({
      nodeId: root.id,
      source,
      baseRevision: snapshot.revision
    })

    const sameMaterial = listStudyNodes().find((node) => node.id === material.id)
    expect(sameMaterial?.title).toBe('After')
    expect(getStudyMaterial(material.id).document.blocks[0]?.id).toBe('stable-text-block')
    expect(result.source).toContain('material Material1 "After"')
  })

  it('allows the same block name in different materials but rejects duplicates inside one material', async () => {
    const root = createStudyNode({ type: 'folder', parentId: null, title: 'Root' })
    const snapshot = getStudyCodeSnapshot(root.id)
    const validSource = `@version(1)\n\nfolder Folder1 "Root" {\n  material FirstLesson "Первый" {\n    text Intro """\n      Первый текст\n    """\n  }\n\n  material SecondLesson "Второй" {\n    text Intro """\n      Второй текст\n    """\n  }\n}\n`

    const validPreview = previewStudyCode({
      nodeId: root.id,
      source: validSource,
      baseRevision: snapshot.revision
    })
    expect(validPreview.valid).toBe(true)

    const duplicateSource = `@version(1)\n\nfolder Folder1 "Root" {\n  material Lesson "Урок" {\n    text Intro """\n      Один\n    """\n\n    text intro """\n      Два\n    """\n  }\n}\n`
    const duplicatePreview = previewStudyCode({
      nodeId: root.id,
      source: duplicateSource,
      baseRevision: snapshot.revision
    })

    expect(duplicatePreview.valid).toBe(false)
    expect(duplicatePreview.diagnostics[0]?.message).toContain('несколько раз')
  })

  it('rejects a repeated legacy block id even when both blocks are new', () => {
    const root = createStudyNode({ type: 'folder', parentId: null, title: 'Root' })
    const snapshot = getStudyCodeSnapshot(root.id)
    const source = `@version(1)\n\nfolder Folder1 "Root" {\n  material FirstLesson "Первый" {\n    text @id("legacy-shared-block") """\n      Первый текст\n    """\n  }\n\n  material SecondLesson "Второй" {\n    text @id("legacy-shared-block") """\n      Второй текст\n    """\n  }\n}\n`

    const preview = previewStudyCode({
      nodeId: root.id,
      source,
      baseRevision: snapshot.revision
    })

    expect(preview.valid).toBe(false)
    expect(preview.diagnostics[0]?.message).toContain('несколько раз')
  })

  it('does not allow a readable board block to attach an arbitrary board id', async () => {
    const material = createStudyNode({ type: 'material', parentId: null, title: 'Board' })
    await saveStudyMaterial({
      nodeId: material.id,
      document: {
        version: 1,
        blocks: [{ id: 'board-block', type: 'board', title: 'Architecture' }]
      }
    })

    const snapshot = getStudyCodeSnapshot(material.id)
    const source = snapshot.source.replace(
      'board Board1 "Architecture"',
      'board Board1 "Architecture" board="foreign-board"'
    )
    const preview = previewStudyCode({
      nodeId: material.id,
      source,
      baseRevision: snapshot.revision
    })

    expect(preview.valid).toBe(false)
    expect(preview.diagnostics[0]?.message).toContain('связанную доску')
  })

  it('keeps legacy @id input compatible and returns readable DSL after save', async () => {
    const material = createStudyNode({ type: 'material', parentId: null, title: 'Legacy' })
    await saveStudyMaterial({
      nodeId: material.id,
      document: {
        version: 1,
        blocks: [{ id: 'legacy-text', type: 'text', text: 'Before' }]
      }
    })
    const snapshot = getStudyCodeSnapshot(material.id)
    const legacySource = `@version(1)\n\nmaterial "Legacy" @id("${material.id}") {\n  text @id("legacy-text") """\n    After\n  """\n}\n`

    const result = await applyStudyCode({
      nodeId: material.id,
      source: legacySource,
      baseRevision: snapshot.revision
    })

    expect(result.source).toContain('material Material1 "Legacy"')
    expect(result.source).toContain('text Text1')
    expect(result.source).not.toContain('@id(')
    expect(getStudyMaterial(material.id).document.blocks[0]?.id).toBe('legacy-text')
  })
})