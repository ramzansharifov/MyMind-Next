import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

import type { StudyDocument } from '../../shared/contracts/study'
import { closeDatabase, getDatabase, initializeDatabaseForTesting } from '../database/client'
import { runDatabaseMigrationsFrom } from '../database/migrate'
import { appMeta, studyLinkTargets, studyNodes } from '../database/schema'
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
  testRoot = await mkdtemp(join(tmpdir(), 'mymind-study-code-'))
  assetsRoot = join(testRoot, 'attachments')
  await mkdir(assetsRoot, { recursive: true })
  initializeDatabaseForTesting(join(testRoot, 'study-code.sqlite'))
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

describe('Study Code Mode safety service', () => {
  it('rejects a node @id that belongs to another Study branch', async () => {
    const firstRoot = createStudyNode({ type: 'folder', parentId: null, title: 'First' })
    createStudyNode({ type: 'material', parentId: firstRoot.id, title: 'Inside first' })

    const secondRoot = createStudyNode({ type: 'folder', parentId: null, title: 'Second' })
    const foreignMaterial = createStudyNode({
      type: 'material',
      parentId: secondRoot.id,
      title: 'Foreign'
    })

    const snapshot = getStudyCodeSnapshot(firstRoot.id)
    const source = `@version(1)\n\nfolder "First" @id("${firstRoot.id}") {\n  material "Hijacked" @id("${foreignMaterial.id}") {\n  }\n}\n`

    const preview = previewStudyCode({
      nodeId: firstRoot.id,
      source,
      baseRevision: snapshot.revision
    })

    expect(preview.valid).toBe(false)
    expect(preview.diagnostics[0]?.message).toContain('другой ветке')

    await expect(
      applyStudyCode({
        nodeId: firstRoot.id,
        source,
        baseRevision: snapshot.revision,
        confirmDestructive: true
      })
    ).rejects.toThrow('другой ветке')

    const unchangedForeign = listStudyNodes().find((node) => node.id === foreignMaterial.id)
    expect(unchangedForeign?.parentId).toBe(secondRoot.id)
    expect(unchangedForeign?.title).toBe('Foreign')
  })

  it('preserves complete ancestor paths when a nested material is changed through Code Mode', async () => {
    const outer = createStudyNode({ type: 'folder', parentId: null, title: 'Outer' })
    const inner = createStudyNode({ type: 'folder', parentId: outer.id, title: 'Inner' })
    const material = createStudyNode({
      type: 'material',
      parentId: inner.id,
      title: 'Nested material'
    })

    await saveStudyMaterial({
      nodeId: material.id,
      document: {
        version: 1,
        blocks: [{ id: 'heading-path', type: 'heading', text: 'Before', level: 1 }]
      }
    })

    const snapshot = getStudyCodeSnapshot(material.id)
    const source = `@version(1)\n\nmaterial "Nested material" @id("${material.id}") {\n  heading 1 "After" @id("heading-path")\n}\n`

    await applyStudyCode({
      nodeId: material.id,
      source,
      baseRevision: snapshot.revision
    })

    const headingTarget = getDatabase()
      .select()
      .from(studyLinkTargets)
      .all()
      .find((target) => target.materialId === material.id && target.headingId === 'heading-path')

    expect(headingTarget?.folderPath).toEqual(['Outer', 'Inner'])
    expect(headingTarget?.title).toBe('After')
  })

  it('rejects borrowing a block @id from a sibling material in the same edited folder', async () => {
    const root = createStudyNode({ type: 'folder', parentId: null, title: 'Root' })
    const first = createStudyNode({ type: 'material', parentId: root.id, title: 'First material' })
    const second = createStudyNode({ type: 'material', parentId: root.id, title: 'Second material' })

    await saveStudyMaterial({
      nodeId: first.id,
      document: textDocument('shared-block', 'First')
    })
    await saveStudyMaterial({
      nodeId: second.id,
      document: textDocument('second-block', 'Second')
    })

    const snapshot = getStudyCodeSnapshot(root.id)
    const source = `@version(1)\n\nfolder "Root" @id("${root.id}") {\n  material "First material" @id("${first.id}") {\n    text @id("shared-block") """\n      First\n    """\n  }\n\n  material "Second material" @id("${second.id}") {\n    text @id("shared-block") """\n      Second\n    """\n  }\n}\n`

    const preview = previewStudyCode({
      nodeId: root.id,
      source,
      baseRevision: snapshot.revision
    })

    expect(preview.valid).toBe(false)
    expect(preview.diagnostics[0]?.message).toContain('другому материалу')
  })

  it('treats deletion of even one block as destructive and requires confirmation', async () => {
    const material = createStudyNode({ type: 'material', parentId: null, title: 'Delete block' })

    await saveStudyMaterial({
      nodeId: material.id,
      document: {
        version: 1,
        blocks: [
          { id: 'keep-block', type: 'text', text: 'Keep' },
          { id: 'delete-block', type: 'text', text: 'Delete' }
        ]
      }
    })

    const snapshot = getStudyCodeSnapshot(material.id)
    const source = `@version(1)\n\nmaterial "Delete block" @id("${material.id}") {\n  text @id("keep-block") """\n    Keep\n  """\n}\n`
    const preview = previewStudyCode({
      nodeId: material.id,
      source,
      baseRevision: snapshot.revision
    })

    expect(preview.valid).toBe(true)
    expect(preview.summary.deletedBlocks).toBe(1)
    expect(preview.destructive).toBe(true)

    await expect(
      applyStudyCode({
        nodeId: material.id,
        source,
        baseRevision: snapshot.revision
      })
    ).rejects.toThrow('подтвердите деструктивное')

    await applyStudyCode({
      nodeId: material.id,
      source,
      baseRevision: snapshot.revision,
      confirmDestructive: true
    })

    expect(getStudyMaterial(material.id).document.blocks.map((block) => block.id)).toEqual([
      'keep-block'
    ])
  })

  it('rejects stale revisions after the material changes outside Code Mode', async () => {
    const material = createStudyNode({ type: 'material', parentId: null, title: 'Revision' })

    await saveStudyMaterial({
      nodeId: material.id,
      document: textDocument('revision-block', 'Before')
    })

    const snapshot = getStudyCodeSnapshot(material.id)

    await saveStudyMaterial({
      nodeId: material.id,
      document: textDocument('revision-block', 'After')
    })

    const preview = previewStudyCode({
      nodeId: material.id,
      source: snapshot.source,
      baseRevision: snapshot.revision
    })

    expect(preview.valid).toBe(false)
    expect(preview.diagnostics[0]?.message).toContain('изменилось после открытия')

    await expect(
      applyStudyCode({
        nodeId: material.id,
        source: snapshot.source,
        baseRevision: snapshot.revision
      })
    ).rejects.toThrow('изменилось после открытия')
  })

  it('does not allow assigning an arbitrary board id to an unlinked board block', async () => {
    const material = createStudyNode({ type: 'material', parentId: null, title: 'Board' })

    await saveStudyMaterial({
      nodeId: material.id,
      document: {
        version: 1,
        blocks: [{ id: 'board-block', type: 'board', title: 'Architecture' }]
      }
    })

    const snapshot = getStudyCodeSnapshot(material.id)
    const source = `@version(1)\n\nmaterial "Board" @id("${material.id}") {\n  board "Architecture" @id("board-block") board="foreign-board"\n}\n`
    const preview = previewStudyCode({
      nodeId: material.id,
      source,
      baseRevision: snapshot.revision
    })

    expect(preview.valid).toBe(false)
    expect(preview.diagnostics[0]?.message).toContain('связанную доску')
  })

  it('applies create, move and delete operations as one folder-tree change', async () => {
    const root = createStudyNode({ type: 'folder', parentId: null, title: 'Root' })
    const retained = createStudyNode({ type: 'material', parentId: root.id, title: 'Retained' })
    const removed = createStudyNode({ type: 'material', parentId: root.id, title: 'Removed' })

    await saveStudyMaterial({
      nodeId: retained.id,
      document: textDocument('retained-block', 'Retained body')
    })

    const snapshot = getStudyCodeSnapshot(root.id)
    const source = `@version(1)\n\nfolder "Root" @id("${root.id}") {\n  folder "Nested" icon="book" {\n    material "Retained renamed" @id("${retained.id}") {\n      text @id("retained-block") """\n        Retained body\n      """\n    }\n\n    material "Created" {\n      text @id("created-block") """\n        Created body\n      """\n    }\n  }\n}\n`

    const preview = previewStudyCode({
      nodeId: root.id,
      source,
      baseRevision: snapshot.revision
    })

    expect(preview.valid).toBe(true)
    expect(preview.destructive).toBe(true)
    expect(preview.summary.createdFolders).toBe(1)
    expect(preview.summary.createdMaterials).toBe(1)
    expect(preview.summary.deletedMaterials).toBe(1)

    await applyStudyCode({
      nodeId: root.id,
      source,
      baseRevision: snapshot.revision,
      confirmDestructive: true
    })

    const nodes = listStudyNodes()
    const nested = nodes.find((node) => node.title === 'Nested')
    const created = nodes.find((node) => node.title === 'Created')
    const retainedAfter = nodes.find((node) => node.id === retained.id)

    expect(nested?.type).toBe('folder')
    expect(retainedAfter?.title).toBe('Retained renamed')
    expect(retainedAfter?.parentId).toBe(nested?.id)
    expect(created?.parentId).toBe(nested?.id)
    expect(nodes.some((node) => node.id === removed.id)).toBe(false)
    expect(created ? getStudyMaterial(created.id).document.blocks[0]?.id : null).toBe('created-block')
  })
})

function textDocument(blockId: string, text: string): StudyDocument {
  return {
    version: 1,
    blocks: [{ id: blockId, type: 'text', text }]
  }
}
