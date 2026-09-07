import { describe, expect, it, vi } from 'vitest'
import type { StudyDocument, StudyLocalAsset } from '@mymind/contracts/study'
import { buildStudyMaterialPdfHtml, renderMarkdownForPdf } from './studyPdf'

const imageAsset: StudyLocalAsset = {
  id: 'image-1',
  materialId: 'material-1',
  name: 'diagram.png',
  mimeType: 'image/png',
  size: 2048,
  url: 'study-asset://material-1/image-1/diagram.png'
}

const audioAsset: StudyLocalAsset = {
  id: 'audio-1',
  materialId: 'material-1',
  name: 'voice.m4a',
  mimeType: 'audio/mp4',
  size: 4096,
  url: 'study-asset://material-1/audio-1/voice.m4a'
}

describe('mobile Study PDF serializer', () => {
  it('renders GFM-like structure without allowing raw HTML', () => {
    const html = renderMarkdownForPdf(
      '# Title\n\n**Bold** and [site](https://example.com)\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n```ts\nconst x = 1 < 2\n```'
    )

    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('<strong>Bold</strong>')
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('<table>')
    expect(html).toContain('const x = 1 &lt; 2')
  })

  it('serializes every Study block family, embeds local images and refreshes auto link labels', async () => {
    const resolveAssetDataUri = vi.fn(async (asset: StudyLocalAsset) =>
      asset.id === imageAsset.id ? 'data:image/png;base64,AAAA' : null
    )
    const document: StudyDocument = {
      version: 1,
      blocks: [
        {
          id: 'text-1',
          type: 'text',
          text: 'Stored label',
          html: '<p onclick="evil()">See <span data-study-internal-link="true" data-target-kind="material" data-material-id="material-2" data-heading-id="" data-heading-level="" data-label-mode="auto" data-label="Stored label" data-material-title="Old title" data-folder-path="[]">Stored label</span></p><script>alert(1)</script>'
        },
        { id: 'heading-1', type: 'heading', text: 'Heading', level: 2, alignment: 'center' },
        { id: 'code-1', type: 'code', source: 'console.log("ok")', language: 'ts' },
        { id: 'markdown-1', type: 'markdown', source: '## Markdown\n\n- one\n- two' },
        { id: 'latex-1', type: 'latex', source: 'x^2 + y^2', displayMode: 'display' },
        { id: 'mermaid-1', type: 'mermaid', source: 'graph TD; A-->B;' },
        {
          id: 'image-1',
          type: 'image',
          source: { type: 'local', asset: imageAsset },
          title: 'Diagram'
        },
        {
          id: 'video-1',
          type: 'video',
          source: { type: 'url', url: 'https://example.com/video.mp4' },
          title: 'Video'
        },
        {
          id: 'audio-1',
          type: 'audio',
          source: { type: 'local', asset: audioAsset },
          title: 'Voice'
        },
        { id: 'file-1', type: 'file', source: { type: 'local' }, title: 'Document' },
        { id: 'divider-1', type: 'divider', variant: 'dashed', thickness: 2 },
        { id: 'board-1', type: 'board', boardId: 'board-1', title: 'Ideas board' }
      ]
    }

    const html = await buildStudyMaterialPdfHtml({
      title: 'Material <One>',
      document,
      resolveAssetDataUri,
      resolveInternalLinkTarget: (link) =>
        link.materialId === 'material-2'
          ? {
              kind: 'material',
              materialId: 'material-2',
              headingId: null,
              title: 'Live title',
              materialTitle: 'Live title',
              folderPath: [],
              headingLevel: null
            }
          : null
    })

    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('Material &lt;One&gt;')
    expect(html).toContain('Live title')
    expect(html).not.toContain('onclick=')
    expect(html).not.toContain('<script')
    expect(html).toContain('id="study-heading-heading-1"')
    expect(html).toContain('console.log(&quot;ok&quot;)')
    expect(html).toContain('<h2>Markdown</h2>')
    expect(html).toContain('<math')
    expect(html).toContain('graph TD; A--&gt;B;')
    expect(html).toContain('mermaid-fallback')
    expect(html).toContain('src="data:image/png;base64,AAAA"')
    expect(html).toContain('Video')
    expect(html).toContain('Voice')
    expect(html).toContain('Document')
    expect(html).toContain('border-top:2px dashed')
    expect(html).toContain('Ideas board')
    expect(resolveAssetDataUri).toHaveBeenCalledOnce()
  })

  it('embeds sanitized rendered Mermaid SVG and removes active content', async () => {
    const html = await buildStudyMaterialPdfHtml({
      title: 'Mermaid',
      document: {
        version: 1,
        blocks: [{ id: 'mermaid-1', type: 'mermaid', source: 'graph TD; A-->B;' }]
      },
      resolveMermaidSvg: () =>
        '<svg viewBox="0 0 100 50" onclick="evil()"><script>alert(1)</script><a href="javascript:evil()"><path d="M0 0L10 10" /></a><text>Diagram</text></svg>'
    })

    expect(html).toContain('class="mermaid-block"')
    expect(html).toContain('<svg viewBox="0 0 100 50"')
    expect(html).toContain('Diagram')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('onclick=')
    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('mermaid-fallback')
  })

  it('falls back to escaped Mermaid source when rendered SVG is invalid', async () => {
    const html = await buildStudyMaterialPdfHtml({
      title: 'Mermaid fallback',
      document: {
        version: 1,
        blocks: [{ id: 'mermaid-1', type: 'mermaid', source: 'graph TD; A-->B;' }]
      },
      resolveMermaidSvg: () => '<div>not svg</div>'
    })

    expect(html).toContain('mermaid-fallback')
    expect(html).toContain('graph TD; A--&gt;B;')
  })

  it('marks unresolved internal-link targets while preserving the stored label', async () => {
    const html = await buildStudyMaterialPdfHtml({
      title: 'Links',
      document: {
        version: 1,
        blocks: [
          {
            id: 'text-1',
            type: 'text',
            text: 'Missing',
            html: '<p><span data-study-internal-link="true" data-target-kind="material" data-material-id="missing" data-label-mode="auto" data-label="Missing" data-material-title="Missing" data-folder-path="[]">Missing</span></p>'
          }
        ]
      },
      resolveInternalLinkTarget: () => null
    })

    expect(html).toContain('Missing')
    expect(html).toContain('(недоступно)')
  })
})
