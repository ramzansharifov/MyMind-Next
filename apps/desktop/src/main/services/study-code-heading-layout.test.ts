import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

import type { StudyDocument } from '../../shared/contracts/study'
import { closeDatabase, getDatabase, initializeDatabaseForTesting } from '../database/client'
import { runDatabaseMigrationsFrom } from '../database/migrate'
import { appMeta, studyNodes } from '../database/schema'
import {
  createStudyNode,
  getStudyMaterial,
  saveStudyMaterial
} from '../repositories/study.repository'
import { applyStudyCode, getStudyCodeSnapshot, previewStudyCode } from './study-code-service'

let testRoot = ''

beforeAll(async () => {
  testRoot = await mkdtemp(join(tmpdir(), 'mymind-study-code-heading-layout-'))
  initializeDatabaseForTesting(join(testRoot, 'study-code-heading-layout.sqlite'))
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

describe('Study Code Mode heading layout parity', () => {
  it('exports visual heading alignment and background scope into readable DSL', async () => {
    const material = createStudyNode({ type: 'material', parentId: null, title: 'Заголовки' })
    const document: StudyDocument = {
      version: 1,
      blocks: [
        {
          id: 'heading-layout-export',
          type: 'heading',
          text: 'Центральный заголовок',
          level: 1,
          color: '#FFFFFF',
          backgroundColor: '#7C3AED',
          alignment: 'center',
          backgroundScope: 'container'
        }
      ]
    }

    await saveStudyMaterial({ nodeId: material.id, document })

    const snapshot = getStudyCodeSnapshot(material.id)

    expect(snapshot.source).toContain('align="center"')
    expect(snapshot.source).toContain('background="#7C3AED"')
    expect(snapshot.source).toContain('backgroundScope="container"')

    const preview = previewStudyCode({
      nodeId: material.id,
      source: snapshot.source,
      baseRevision: snapshot.revision
    })
    expect(preview.valid).toBe(true)

    await applyStudyCode({
      nodeId: material.id,
      source: snapshot.source,
      baseRevision: snapshot.revision,
      confirmDestructive: true
    })

    expect(getStudyMaterial(material.id).document).toEqual(document)
  })

  it('applies right alignment and text-only background from DSL back to the visual document', async () => {
    const material = createStudyNode({ type: 'material', parentId: null, title: 'Из кода' })
    const snapshot = getStudyCodeSnapshot(material.id)
    const source = `@version(1)\n\nmaterial "Из кода" {\n  heading 2 "Правый заголовок" align="right" background="#1E3A8A" backgroundScope="text" color="#FFFFFF"\n}\n`

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

    expect(getStudyMaterial(material.id).document.blocks[0]).toMatchObject({
      type: 'heading',
      text: 'Правый заголовок',
      level: 2,
      alignment: 'right',
      backgroundScope: 'text',
      backgroundColor: '#1E3A8A',
      color: '#FFFFFF'
    })
    expect(result.source).toContain('align="right"')
    expect(result.source).toContain('backgroundScope="text"')
  })
})
