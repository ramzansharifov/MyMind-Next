import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

import { appMeta, studyLinkTargets, studyNodes } from '../database/schema'
import { closeDatabase, getDatabase, initializeDatabaseForTesting } from '../database/client'
import { runDatabaseMigrationsFrom } from '../database/migrate'
import { setStudyAssetsRootForTesting } from '../services/study-assets'
import {
  createStudyNode,
  deleteStudyNode,
  duplicateStudyNode,
  getStudyMaterial,
  moveStudyNode,
  renameStudyNode,
  runStudyLinkTargetsMaintenance,
  saveStudyMaterial,
  searchStudyInternalLinkTargets,
  updateStudyNodeExpansion
} from './study.repository'
import { STUDY_DOCUMENT_LIMITS, type StudyDocument } from '../../shared/contracts/study'

let testRoot = ''
let assetsRoot = ''

beforeAll(async () => {
  testRoot = await mkdtemp(join(tmpdir(), 'mymind-study-'))
  assetsRoot = join(testRoot, 'attachments')
  await mkdir(assetsRoot, { recursive: true })
  initializeDatabaseForTesting(join(testRoot, 'study.sqlite'))
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

describe('study repository integration', () => {
  it('rejects children and folder expansion state on material nodes', () => {
    const material = createStudyNode({ type: 'material', parentId: null, title: 'Leaf' })

    expect(() =>
      createStudyNode({ type: 'material', parentId: material.id, title: 'Invalid child' })
    ).toThrow()
    expect(() => updateStudyNodeExpansion(material.id, false)).toThrow()
  })

  it('keeps link targets consistent across create, save, rename, move, duplicate and delete', async () => {
    const firstFolder = createStudyNode({ type: 'folder', parentId: null, title: 'First' })
    const secondFolder = createStudyNode({ type: 'folder', parentId: null, title: 'Second' })
    const material = createStudyNode({
      type: 'material',
      parentId: firstFolder.id,
      title: 'Original'
    })

    await saveStudyMaterial({
      nodeId: material.id,
      document: headingDocument('heading-one', 'Unique heading')
    })
    expect(searchStudyInternalLinkTargets({ query: 'Unique heading' })[0]?.folderPath).toEqual([
      'First'
    ])

    renameStudyNode(material.id, 'Renamed')
    expect(searchStudyInternalLinkTargets({ query: 'Renamed' })[0]?.materialTitle).toBe('Renamed')

    moveStudyNode({ id: material.id, parentId: secondFolder.id, position: 0 })
    expect(searchStudyInternalLinkTargets({ query: 'Unique heading' })[0]?.folderPath).toEqual([
      'Second'
    ])

    const duplicate = await duplicateStudyNode(material.id)
    const duplicateTarget = searchStudyInternalLinkTargets({
      query: 'Unique heading',
      limit: 10
    }).find((target) => target.materialId === duplicate.rootId)
    expect(duplicateTarget).toBeDefined()

    await deleteStudyNode(material.id)
    expect(
      searchStudyInternalLinkTargets({ query: 'Unique heading', limit: 10 }).some(
        (target) => target.materialId === material.id
      )
    ).toBe(false)
  })

  it('ranks an exact result in SQL even when more than one thousand rows match', () => {
    const database = getDatabase()
    const now = new Date()
    const nodes = Array.from({ length: 1_101 }, (_, index) => ({
      id: `bulk-material-${index}`,
      type: 'material' as const,
      parentId: null,
      title: `Needle material ${index}`,
      icon: null,
      position: index,
      isExpanded: true,
      createdAt: now,
      updatedAt: now
    }))

    for (let index = 0; index < nodes.length; index += 100) {
      database
        .insert(studyNodes)
        .values(nodes.slice(index, index + 100))
        .run()
    }

    const targets = nodes.map((node, index) => {
      const exact = index === nodes.length - 1
      const title = exact ? 'needle' : `needle result ${index}`
      return {
        id: `material:${node.id}`,
        kind: 'material' as const,
        materialId: node.id,
        headingId: null,
        title,
        titleSearch: title,
        materialTitle: node.title,
        materialTitleSearch: node.title.toLocaleLowerCase('ru-RU'),
        folderPath: [],
        folderPathSearch: '',
        headingLevel: null,
        position: -1,
        searchText: `${title} ${node.title}`,
        updatedAt: now
      }
    })

    for (let index = 0; index < targets.length; index += 100) {
      database
        .insert(studyLinkTargets)
        .values(targets.slice(index, index + 100))
        .run()
    }

    expect(searchStudyInternalLinkTargets({ query: 'needle', limit: 1 })[0]?.title).toBe('needle')
  })

  it('treats LIKE wildcards as literal search text', async () => {
    const material = createStudyNode({ type: 'material', parentId: null, title: 'Symbols' })
    await saveStudyMaterial({
      nodeId: material.id,
      document: headingDocument('symbols', 'Rate 100%_safe')
    })

    expect(searchStudyInternalLinkTargets({ query: '%_' }).map((target) => target.title)).toContain(
      'Rate 100%_safe'
    )
    expect(searchStudyInternalLinkTargets({ query: '%missing_' })).toEqual([])
  })

  it('runs the legacy target backfill once and preserves searchable headings', async () => {
    const material = createStudyNode({ type: 'material', parentId: null, title: 'Backfill' })
    await saveStudyMaterial({
      nodeId: material.id,
      document: headingDocument('legacy-heading', 'Legacy heading')
    })
    getDatabase().delete(studyLinkTargets).run()

    runStudyLinkTargetsMaintenance()
    const firstRun = searchStudyInternalLinkTargets({ query: 'Legacy heading' })
    runStudyLinkTargetsMaintenance()

    expect(firstRun[0]?.headingId).toBe('legacy-heading')
    expect(searchStudyInternalLinkTargets({ query: 'Legacy heading' })).toEqual(firstRun)
  })

  it('truncates derived plain text before persistence without changing the document', async () => {
    const material = createStudyNode({ type: 'material', parentId: null, title: 'Large' })
    const source = '😀'.repeat(500_000)
    const document: StudyDocument = {
      version: 1,
      blocks: [
        { id: 'large-one', type: 'code', source, language: 'text' },
        { id: 'large-two', type: 'code', source, language: 'text' }
      ]
    }

    const saved = await saveStudyMaterial({ nodeId: material.id, document })

    expect(Array.from(saved.plainText)).toHaveLength(STUDY_DOCUMENT_LIMITS.maxPlainTextLength)
    expect(saved.document).toEqual(document)
    expect(getStudyMaterial(material.id).document).toEqual(document)
  })

  it('rejects an oversized document before replacing the stored material', async () => {
    const material = createStudyNode({ type: 'material', parentId: null, title: 'Atomic' })
    const initial = headingDocument('initial', 'Stored value')
    await saveStudyMaterial({ nodeId: material.id, document: initial })
    const oversized: StudyDocument = {
      version: 1,
      blocks: Array.from({ length: 11 }, (_, index) => ({
        id: `oversized-${index}`,
        type: 'code' as const,
        source: 'x'.repeat(STUDY_DOCUMENT_LIMITS.maxSourceLength),
        language: 'text'
      }))
    }

    await expect(saveStudyMaterial({ nodeId: material.id, document: oversized })).rejects.toThrow()
    expect(getStudyMaterial(material.id).document).toEqual(initial)
  })

  it('validates local assets against the isolated attachment root', async () => {
    const material = createStudyNode({ type: 'material', parentId: null, title: 'Asset' })
    const assetId = '11111111-1111-4111-8111-111111111111'
    const assetDirectory = join(assetsRoot, material.id, assetId)
    await mkdir(assetDirectory, { recursive: true })
    await writeFile(join(assetDirectory, 'photo.png'), 'image')
    const document: StudyDocument = {
      version: 1,
      blocks: [
        {
          id: 'image-one',
          type: 'image',
          source: {
            type: 'local',
            asset: {
              id: assetId,
              materialId: material.id,
              name: 'photo.png',
              mimeType: 'image/png',
              size: 5,
              url: `mymind-asset://local/${material.id}/${assetId}/photo.png`
            }
          }
        }
      ]
    }

    await expect(saveStudyMaterial({ nodeId: material.id, document })).resolves.toMatchObject({
      nodeId: material.id
    })
    const missingAssetDocument: StudyDocument = {
      version: 1,
      blocks: [
        {
          id: 'missing-image',
          type: 'image',
          source: {
            type: 'local',
            asset: {
              id: '22222222-2222-4222-8222-222222222222',
              materialId: material.id,
              name: 'missing.png',
              mimeType: 'image/png',
              size: 1,
              url: `mymind-asset://local/${material.id}/22222222-2222-4222-8222-222222222222/missing.png`
            }
          }
        }
      ]
    }
    await expect(
      saveStudyMaterial({ nodeId: material.id, document: missingAssetDocument })
    ).rejects.toThrow(/не найдено/i)

    const duplicate = await duplicateStudyNode(material.id)
    const duplicatedBlock = getStudyMaterial(duplicate.rootId).document.blocks[0]
    if (
      duplicatedBlock?.type !== 'image' ||
      duplicatedBlock.source.type !== 'local' ||
      !duplicatedBlock.source.asset
    ) {
      throw new Error('Duplicated image asset was not preserved')
    }
    const duplicatedPath = join(
      assetsRoot,
      duplicate.rootId,
      duplicatedBlock.source.asset.id,
      duplicatedBlock.source.asset.name
    )
    await expect(access(duplicatedPath)).resolves.toBeUndefined()

    await deleteStudyNode(material.id)
    await expect(access(assetDirectory)).rejects.toThrow()
  })
})

function headingDocument(id: string, text: string): StudyDocument {
  return {
    version: 1,
    blocks: [{ id, type: 'heading', text, level: 1 }]
  }
}
