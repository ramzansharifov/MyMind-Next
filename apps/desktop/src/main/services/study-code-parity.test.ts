import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

import type { StudyDocument, StudyLocalAsset } from '../../shared/contracts/study'
import { createCanonicalStudyAssetUrl } from '../../shared/study-assets'
import { closeDatabase, getDatabase, initializeDatabaseForTesting } from '../database/client'
import { runDatabaseMigrationsFrom } from '../database/migrate'
import { appMeta, studyNodes } from '../database/schema'
import {
  createStudyNode,
  getStudyMaterial,
  saveStudyMaterial
} from '../repositories/study.repository'
import { setStudyAssetsRootForTesting } from './study-assets'
import { applyStudyCode, getStudyCodeSnapshot, previewStudyCode } from './study-code-service'

let testRoot = ''
let assetsRoot = ''

beforeAll(async () => {
  testRoot = await mkdtemp(join(tmpdir(), 'mymind-study-code-parity-'))
  assetsRoot = join(testRoot, 'attachments')
  await mkdir(assetsRoot, { recursive: true })
  initializeDatabaseForTesting(join(testRoot, 'study-code-parity.sqlite'))
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

async function createLocalAsset(
  materialId: string,
  id: string,
  name: string,
  mimeType: string,
  content: string
): Promise<StudyLocalAsset> {
  const directory = join(assetsRoot, materialId, id)
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, name), content)

  return {
    id,
    materialId,
    name,
    mimeType,
    size: Buffer.byteLength(content),
    url: createCanonicalStudyAssetUrl({ materialId, assetId: id, fileName: name })
  }
}

describe('Study Code Mode parity with the visual material editor', () => {
  it('round-trips every persisted non-board block capability without losing settings', async () => {
    const material = createStudyNode({ type: 'material', parentId: null, title: 'Полный материал' })

    const imageAsset = await createLocalAsset(
      material.id,
      '11111111-1111-4111-8111-111111111111',
      'photo.png',
      'image/png',
      'image'
    )
    const videoAsset = await createLocalAsset(
      material.id,
      '22222222-2222-4222-8222-222222222222',
      'clip.mp4',
      'video/mp4',
      'video'
    )
    const audioAsset = await createLocalAsset(
      material.id,
      '33333333-3333-4333-8333-333333333333',
      'voice.mp3',
      'audio/mpeg',
      'audio'
    )
    const fileAsset = await createLocalAsset(
      material.id,
      '44444444-4444-4444-8444-444444444444',
      'notes.pdf',
      'application/pdf',
      'file'
    )

    const headingId = 'heading-parity'
    const richHtml = `<p style="text-align: center"><strong><em><u><s><code>Форматирование</code></s></u></em></strong></p><blockquote><p>Цитата</p></blockquote><ul><li><p>Список</p></li></ul><p><a target="_blank" rel="noopener noreferrer" href="https://example.com">Внешняя ссылка</a></p><p><span data-study-internal-link="true" data-target-kind="heading" data-material-id="${material.id}" data-heading-id="${headingId}" data-heading-level="2" data-label-mode="custom" data-label="Перейти" data-material-title="Полный материал" data-folder-path="[]">Перейти</span></p>`

    const document: StudyDocument = {
      version: 1,
      blocks: [
        {
          id: 'text-parity',
          type: 'text',
          text: 'Форматирование\n\nЦитата\n\nСписок\n\nВнешняя ссылка\n\nПерейти',
          html: richHtml
        },
        {
          id: headingId,
          type: 'heading',
          text: 'Заголовок',
          level: 2,
          color: '#FACC15',
          backgroundColor: '#422006'
        },
        {
          id: 'code-parity',
          type: 'code',
          source: 'const answer: number = 42',
          language: 'typescript'
        },
        {
          id: 'markdown-parity',
          type: 'markdown',
          source: '# Markdown\n\n| A | B |\n|---|---|\n| 1 | 2 |',
          viewMode: 'preview'
        },
        {
          id: 'latex-parity',
          type: 'latex',
          source: '\\int_0^1 x^2 dx',
          viewMode: 'split',
          displayMode: 'inline',
          alignment: 'right',
          scale: 135
        },
        {
          id: 'mermaid-parity',
          type: 'mermaid',
          source: 'flowchart LR\n  A --> B',
          viewMode: 'preview',
          theme: 'forest',
          scale: 140
        },
        {
          id: 'image-local-parity',
          type: 'image',
          source: { type: 'local', asset: imageAsset },
          title: 'Локальное фото',
          imageFit: 'cover',
          imageHeight: 620
        },
        {
          id: 'image-url-parity',
          type: 'image',
          source: { type: 'url', url: 'https://example.com/photo.jpg' },
          title: 'Фото по ссылке',
          imageFit: 'contain',
          imageHeight: 380
        },
        {
          id: 'video-local-parity',
          type: 'video',
          source: { type: 'local', asset: videoAsset },
          title: 'Локальное видео'
        },
        {
          id: 'video-url-parity',
          type: 'video',
          source: { type: 'url', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
          title: 'YouTube'
        },
        {
          id: 'audio-parity',
          type: 'audio',
          source: { type: 'local', asset: audioAsset },
          title: 'Аудио'
        },
        {
          id: 'file-parity',
          type: 'file',
          source: { type: 'local', asset: fileAsset },
          title: 'Файл'
        },
        {
          id: 'divider-parity',
          type: 'divider',
          variant: 'dotted',
          thickness: 7,
          color: '#A78BFA'
        }
      ]
    }

    await saveStudyMaterial({ nodeId: material.id, document })

    const snapshot = getStudyCodeSnapshot(material.id)

    expect(snapshot.source).toContain('html """')
    expect(snapshot.source).toContain('language="typescript"')
    expect(snapshot.source).toContain('view="preview"')
    expect(snapshot.source).toContain('display="inline"')
    expect(snapshot.source).toContain('align="right"')
    expect(snapshot.source).toContain('theme="forest"')
    expect(snapshot.source).toContain('fit="cover"')
    expect(snapshot.source).toContain('height=620')
    expect(snapshot.source).toContain('variant="dotted"')
    expect(snapshot.source).not.toContain('\n  board ')

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

  it('creates every non-board block type and its visual settings directly from DSL', async () => {
    const material = createStudyNode({ type: 'material', parentId: null, title: 'Из DSL' })
    const snapshot = getStudyCodeSnapshot(material.id)

    const source = `@version(1)\n\nmaterial "Из DSL" {\n  text """\n    Обычный текст\n  """\n  html """\n    <p><strong>Жирный</strong> и <em>курсив</em></p>\n  """\n\n  heading 3 "Заголовок" color="#FFFFFF" background="#7C3AED"\n\n  code language="cpp" """\n    int main() { return 0; }\n  """\n\n  markdown view="split" """\n    ## Markdown\n  """\n\n  latex view="preview" display="display" align="center" scale=120 """\n    E = mc^2\n  """\n\n  mermaid view="preview" theme="neutral" scale=110 """\n    flowchart LR\n      A --> B\n  """\n\n  image url="https://example.com/image.png" title="Картинка" fit="cover" height=420\n\n  video url="https://youtu.be/dQw4w9WgXcQ" title="Видео"\n\n  audio title="Аудио"\n\n  file title="Файл"\n\n  divider variant="dashed" thickness=4 color="#38BDF8"\n}\n`

    const preview = previewStudyCode({
      nodeId: material.id,
      source,
      baseRevision: snapshot.revision
    })
    expect(preview.valid).toBe(true)

    await applyStudyCode({
      nodeId: material.id,
      source,
      baseRevision: snapshot.revision,
      confirmDestructive: true
    })

    const blocks = getStudyMaterial(material.id).document.blocks

    expect(blocks.map((block) => block.type)).toEqual([
      'text',
      'heading',
      'code',
      'markdown',
      'latex',
      'mermaid',
      'image',
      'video',
      'audio',
      'file',
      'divider'
    ])

    expect(blocks[0]).toMatchObject({
      type: 'text',
      text: 'Обычный текст',
      html: '<p><strong>Жирный</strong> и <em>курсив</em></p>'
    })
    expect(blocks[1]).toMatchObject({
      type: 'heading',
      level: 3,
      color: '#FFFFFF',
      backgroundColor: '#7C3AED'
    })
    expect(blocks[2]).toMatchObject({ type: 'code', language: 'cpp' })
    expect(blocks[3]).toMatchObject({ type: 'markdown', viewMode: 'split' })
    expect(blocks[4]).toMatchObject({
      type: 'latex',
      viewMode: 'preview',
      displayMode: 'display',
      alignment: 'center',
      scale: 120
    })
    expect(blocks[5]).toMatchObject({
      type: 'mermaid',
      viewMode: 'preview',
      theme: 'neutral',
      scale: 110
    })
    expect(blocks[6]).toMatchObject({
      type: 'image',
      source: { type: 'url', url: 'https://example.com/image.png' },
      title: 'Картинка',
      imageFit: 'cover',
      imageHeight: 420
    })
    expect(blocks[7]).toMatchObject({
      type: 'video',
      source: { type: 'url', url: 'https://youtu.be/dQw4w9WgXcQ' },
      title: 'Видео'
    })
    expect(blocks[8]).toMatchObject({ type: 'audio', source: { type: 'local' }, title: 'Аудио' })
    expect(blocks[9]).toMatchObject({ type: 'file', source: { type: 'local' }, title: 'Файл' })
    expect(blocks[10]).toMatchObject({
      type: 'divider',
      variant: 'dashed',
      thickness: 4,
      color: '#38BDF8'
    })
  })

  it('keeps folder structure, ordering and folder icons declarative in DSL', async () => {
    const root = createStudyNode({ type: 'folder', parentId: null, title: 'Обучение' })
    const snapshot = getStudyCodeSnapshot(root.id)
    const source = `@version(1)\n\nfolder "Обучение" icon="history" {\n  folder "Античность" icon="book" {\n    material "Рим" {\n      text """\n        Конспект\n      """\n    }\n  }\n\n  material "Новое время" {\n    heading 1 "Революции"\n  }\n}\n`

    const preview = previewStudyCode({
      nodeId: root.id,
      source,
      baseRevision: snapshot.revision
    })
    expect(preview.valid).toBe(true)

    const result = await applyStudyCode({
      nodeId: root.id,
      source,
      baseRevision: snapshot.revision,
      confirmDestructive: true
    })

    const rootNode = result.nodes.find((node) => node.id === root.id)
    const antiquity = result.nodes.find((node) => node.title === 'Античность')
    const rome = result.nodes.find((node) => node.title === 'Рим')
    const modern = result.nodes.find((node) => node.title === 'Новое время')

    expect(rootNode?.icon).toBe('history')
    expect(antiquity).toMatchObject({ type: 'folder', parentId: root.id, position: 0, icon: 'book' })
    expect(rome).toMatchObject({ type: 'material', parentId: antiquity?.id, position: 0 })
    expect(modern).toMatchObject({ type: 'material', parentId: root.id, position: 1 })
  })
})
