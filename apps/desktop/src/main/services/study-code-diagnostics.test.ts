import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

import { closeDatabase, getDatabase, initializeDatabaseForTesting } from '../database/client'
import { runDatabaseMigrationsFrom } from '../database/migrate'
import { appMeta, studyNodes } from '../database/schema'
import { createStudyNode } from '../repositories/study.repository'
import { setStudyAssetsRootForTesting } from './study-assets'
import { applyStudyCode, getStudyCodeSnapshot, previewStudyCode } from './study-code-service'

let testRoot = ''
let assetsRoot = ''

beforeAll(async () => {
  testRoot = await mkdtemp(join(tmpdir(), 'mymind-study-code-diagnostics-'))
  assetsRoot = join(testRoot, 'attachments')
  await mkdir(assetsRoot, { recursive: true })
  initializeDatabaseForTesting(join(testRoot, 'study-code-diagnostics.sqlite'))
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

describe('Study Code Mode diagnostics', () => {
  it('returns the readable Mermaid line instead of the material line or a raw Zod message', () => {
    const material = createStudyNode({ type: 'material', parentId: null, title: 'Лекция' })
    const snapshot = getStudyCodeSnapshot(material.id)
    const source = `@version(1)\n\nmaterial "Лекция" {\n  heading 1 "Введение"\n\n  mermaid view="preview" theme="dark" scale=1 """\n    flowchart LR\n      A --> B\n  """\n}\n`

    const preview = previewStudyCode({
      nodeId: material.id,
      source,
      baseRevision: snapshot.revision
    })

    expect(preview.valid).toBe(false)
    expect(preview.diagnostics[0]).toMatchObject({
      line: 6,
      message: 'Mermaid: масштаб должен быть от 60 до 180%'
    })
    expect(preview.diagnostics[0]?.message).not.toContain('expected number')
  })

  it('attaches missing local asset errors to the actual DSL block', async () => {
    const material = createStudyNode({ type: 'material', parentId: null, title: 'Медиа' })
    const snapshot = getStudyCodeSnapshot(material.id)
    const source = `@version(1)\n\nmaterial "Медиа" {\n  image asset="8fb6d27a-9e4a-4cdf-9a74-18bdf5db33c5" name="missing.png" mime="image/png" size=100\n}\n`

    await expect(
      applyStudyCode({
        nodeId: material.id,
        source,
        baseRevision: snapshot.revision,
        confirmDestructive: true
      })
    ).rejects.toMatchObject({
      line: 4,
      message: 'Вложение «missing.png» не найдено'
    })
  })
})
