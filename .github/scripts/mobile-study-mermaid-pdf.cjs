const fs = require('node:fs')

function read(path) {
  return fs.readFileSync(path, 'utf8')
}

function write(path, value) {
  fs.writeFileSync(path, value)
}

function replaceOnce(text, needle, replacement, label) {
  const first = text.indexOf(needle)
  if (first < 0) throw new Error(`${label}: target not found`)
  if (text.indexOf(needle, first + needle.length) >= 0) {
    throw new Error(`${label}: target matched more than once`)
  }
  return text.slice(0, first) + replacement + text.slice(first + needle.length)
}

const mermaidDomPath = 'apps/mobile/src/modules/study/StudyMermaidExportDom.tsx'
write(
  mermaidDomPath,
  [
    "'use dom'",
    '',
    "import mermaid from 'mermaid'",
    "import { useDOMImperativeHandle, type DOMImperativeFactory } from 'expo/dom'",
    "import type { Ref } from 'react'",
    '',
    "export type StudyMermaidExportTheme = 'dark' | 'default' | 'neutral' | 'forest'",
    '',
    'export interface StudyMermaidPdfItem {',
    '  id: string',
    '  source: string',
    '  theme?: StudyMermaidExportTheme',
    '}',
    '',
    'export interface StudyMermaidPdfResult {',
    '  id: string',
    '  svg: string | null',
    '  error: string | null',
    '}',
    '',
    'export interface StudyMermaidExportDomRef extends DOMImperativeFactory {',
    '  render: (items: StudyMermaidPdfItem[]) => Promise<StudyMermaidPdfResult[]>',
    '}',
    '',
    'interface StudyMermaidExportDomProps {',
    '  ref: Ref<StudyMermaidExportDomRef>',
    "  dom?: import('expo/dom').DOMProps",
    '}',
    '',
    'function messageFor(reason: unknown): string {',
    "  return reason instanceof Error ? reason.message : 'Не удалось построить диаграмму Mermaid'",
    '}',
    '',
    'export default function StudyMermaidExportDom({',
    '  ref',
    '}: StudyMermaidExportDomProps): React.JSX.Element {',
    '  useDOMImperativeHandle(',
    '    ref,',
    '    () => ({',
    '      render: async (items) => {',
    '        const results: StudyMermaidPdfResult[] = []',
    '        for (const item of items) {',
    '          try {',
    '            mermaid.initialize({',
    '              startOnLoad: false,',
    "              securityLevel: 'strict',",
    "              theme: item.theme ?? 'default',",
    '              suppressErrorRendering: true,',
    '              flowchart: { htmlLabels: false }',
    '            })',
    "            const renderId = 'mymind-pdf-mermaid-' + item.id + '-' + Date.now() + '-' + Math.random().toString(36).slice(2)",
    '            const rendered = await mermaid.render(renderId, item.source)',
    '            results.push({ id: item.id, svg: rendered.svg, error: null })',
    '          } catch (reason) {',
    '            results.push({ id: item.id, svg: null, error: messageFor(reason) })',
    '          }',
    '        }',
    '        return results',
    '      }',
    '    }),',
    '    []',
    '  )',
    '',
    '  return <main aria-hidden="true" style={{ width: 1, height: 1, overflow: \'hidden\' }} />',
    '}',
    ''
  ].join('\n')
)

const pdfPath = 'apps/mobile/src/modules/study/studyPdf.ts'
let pdf = read(pdfPath)
pdf = replaceOnce(
  pdf,
  "  resolveAssetDataUri?: (asset: StudyLocalAsset) => Promise<string | null>\n  resolveInternalLinkTarget?: (link: StudyRichTextInternalLink) => StudyInternalLinkTarget | null\n}",
  "  resolveAssetDataUri?: (asset: StudyLocalAsset) => Promise<string | null>\n  resolveInternalLinkTarget?: (link: StudyRichTextInternalLink) => StudyInternalLinkTarget | null\n  resolveMermaidSvg?: (blockId: string) => string | null\n}",
  'studyPdf options'
)

const mermaidHelper = [
  'function sanitizeMermaidSvg(svg: string): string | null {',
  '  const trimmed = svg.trim()',
  "  if (!/^<svg\\b/i.test(trimmed) || !/<\\/svg>\\s*$/i.test(trimmed)) return null",
  '  return trimmed',
  "    .replace(/<script\\b[^>]*>[\\s\\S]*?<\\/script\\s*>/gi, '')",
  "    .replace(/<foreignObject\\b[^>]*>[\\s\\S]*?<\\/foreignObject\\s*>/gi, '')",
  "    .replace(/\\s+on[a-z]+\\s*=\\s*(?:\"[^\"]*\"|'[^']*'|[^\\s>]+)/gi, '')",
  "    .replace(/\\s+(href|xlink:href)\\s*=\\s*(\"|')\\s*javascript:[\\s\\S]*?\\2/gi, ' $1=\"#\"')",
  '}',
  '',
  'function renderMermaidForPdf(',
  "  block: Extract<StudyBlock, { type: 'mermaid' }>,",
  "  resolver: StudyPdfBuildOptions['resolveMermaidSvg']",
  '): string {',
  "  const rendered = resolver ? sanitizeMermaidSvg(resolver(block.id) ?? '') : null",
  '  if (rendered) {',
  "    return '<figure class=\"mermaid-block\">' + rendered + '</figure>'",
  '  }',
  "  return '<section class=\"source-fallback mermaid-fallback\"><div class=\"source-label\">Диаграмма Mermaid</div><pre>' + escapeHtml(block.source) + '</pre><p>Исходный код диаграммы сохранён в PDF.</p></section>'",
  '}',
  '',
  ''
].join('\n')

pdf = replaceOnce(pdf, 'function formatFileSize(size: number): string {', mermaidHelper + 'function formatFileSize(size: number): string {', 'studyPdf Mermaid helper')
pdf = replaceOnce(
  pdf,
  "    case 'mermaid':\n      return `<section class=\"source-fallback mermaid-fallback\"><div class=\"source-label\">Диаграмма Mermaid</div><pre>${escapeHtml(block.source)}</pre><p>Исходный код диаграммы сохранён в PDF.</p></section>`",
  "    case 'mermaid':\n      return renderMermaidForPdf(block, options.resolveMermaidSvg)",
  'studyPdf Mermaid block'
)
pdf = replaceOnce(
  pdf,
  '.latex-block math { max-width: 100%; color: #111827; }\n',
  '.latex-block math { max-width: 100%; color: #111827; }\n.mermaid-block { width: 100%; margin-left: 0; margin-right: 0; padding: 2mm; border: 1px solid #e5e7eb; border-radius: 3mm; background: #fff; break-inside: avoid-page; }\n.mermaid-block svg { display: block; width: auto; max-width: 100%; height: auto; max-height: 235mm; margin: 0 auto; }\n',
  'studyPdf Mermaid styles'
)
write(pdfPath, pdf)

const exportPath = 'apps/mobile/src/modules/study/studyPdfExport.ts'
let pdfExport = read(exportPath)
pdfExport = replaceOnce(
  pdfExport,
  "  resolveAssetUri: (asset: StudyLocalAsset) => string | null\n  resolveInternalLinkTarget?: (link: StudyRichTextInternalLink) => StudyInternalLinkTarget | null\n}",
  "  resolveAssetUri: (asset: StudyLocalAsset) => string | null\n  resolveInternalLinkTarget?: (link: StudyRichTextInternalLink) => StudyInternalLinkTarget | null\n  renderedMermaidSvg?: Readonly<Record<string, string>>\n}",
  'studyPdfExport options'
)
pdfExport = replaceOnce(
  pdfExport,
  '    resolveInternalLinkTarget: options.resolveInternalLinkTarget,\n    resolveAssetDataUri: (asset) => {',
  '    resolveInternalLinkTarget: options.resolveInternalLinkTarget,\n    resolveMermaidSvg: (blockId) => options.renderedMermaidSvg?.[blockId] ?? null,\n    resolveAssetDataUri: (asset) => {',
  'studyPdfExport resolver'
)
write(exportPath, pdfExport)

const screenPath = 'apps/mobile/src/modules/study/StudyScreen.tsx'
let screen = read(screenPath)
screen = replaceOnce(
  screen,
  "import { StudyCodeWorkspace } from './StudyCodeWorkspace'\nimport { exportStudyMaterialPdf } from './studyPdfExport'\n",
  "import { StudyCodeWorkspace } from './StudyCodeWorkspace'\nimport StudyMermaidExportDom, {\n  type StudyMermaidExportDomRef,\n  type StudyMermaidPdfItem\n} from './StudyMermaidExportDom'\nimport { exportStudyMaterialPdf } from './studyPdfExport'\n",
  'StudyScreen imports'
)
screen = replaceOnce(
  screen,
  '  const queueRef = useRef<AutosaveQueue<StudyDocument> | null>(null)\n  const revealSequenceRef = useRef(0)\n',
  '  const queueRef = useRef<AutosaveQueue<StudyDocument> | null>(null)\n  const mermaidExportRef = useRef<StudyMermaidExportDomRef>(null)\n  const revealSequenceRef = useRef(0)\n',
  'StudyScreen ref'
)

const oldExport = [
  '        await exportStudyMaterialPdf({',
  '          title,',
  '          document,',
  '          resolveAssetUri: documentAssets.resolveAssetUri,',
  '          resolveInternalLinkTarget: (link) =>',
  '            api.resolveInternalLinkTarget({',
  '              kind: link.kind,',
  '              materialId: link.materialId,',
  '              headingId: link.headingId',
  '            })',
  '        })'
].join('\n')
const newExport = [
  '        const mermaidItems: StudyMermaidPdfItem[] = document.blocks',
  "          .filter((block) => block.type === 'mermaid')",
  '          .map((block) => ({ id: block.id, source: block.source, theme: block.theme }))',
  '        const renderedMermaidSvg: Record<string, string> = {}',
  '        if (mermaidItems.length > 0 && mermaidExportRef.current) {',
  '          const rendered = await mermaidExportRef.current.render(mermaidItems)',
  '          for (const item of rendered) {',
  '            if (item.svg) renderedMermaidSvg[item.id] = item.svg',
  '          }',
  '        }',
  '        await exportStudyMaterialPdf({',
  '          title,',
  '          document,',
  '          resolveAssetUri: documentAssets.resolveAssetUri,',
  '          renderedMermaidSvg,',
  '          resolveInternalLinkTarget: (link) =>',
  '            api.resolveInternalLinkTarget({',
  '              kind: link.kind,',
  '              materialId: link.materialId,',
  '              headingId: link.headingId',
  '            })',
  '        })'
].join('\n')
screen = replaceOnce(screen, oldExport, newExport, 'StudyScreen export')

const readerStart = [
  '    return (',
  '      <View style={{ flex: 1 }}>',
  '        {editorError ? <ErrorState message={editorError} retry={() => void flush()} /> : null}',
  '        {reading ? ('
].join('\n')
const readerWithRenderer = [
  '    return (',
  '      <View style={{ flex: 1 }}>',
  '        <View',
  '          pointerEvents="none"',
  "          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' }}",
  '        >',
  '          <StudyMermaidExportDom',
  '            ref={mermaidExportRef}',
  '            dom={{ scrollEnabled: false, style: { width: 1, height: 1 } }}',
  '          />',
  '        </View>',
  '        {editorError ? <ErrorState message={editorError} retry={() => void flush()} /> : null}',
  '        {reading ? ('
].join('\n')
screen = replaceOnce(screen, readerStart, readerWithRenderer, 'StudyScreen hidden renderer')
write(screenPath, screen)

const testPath = 'apps/mobile/src/modules/study/studyPdf.test.ts'
let tests = read(testPath)
tests = replaceOnce(
  tests,
  "    expect(html).toContain('graph TD; A--&gt;B;')",
  "    expect(html).toContain('graph TD; A--&gt;B;')\n    expect(html).toContain('mermaid-fallback')",
  'studyPdf fallback assertion'
)
const testAnchor = "  it('marks unresolved internal-link targets while preserving the stored label', async () => {"
const mermaidTests = [
  "  it('embeds sanitized rendered Mermaid SVG and removes active content', async () => {",
  '    const html = await buildStudyMaterialPdfHtml({',
  "      title: 'Mermaid',",
  '      document: {',
  '        version: 1,',
  "        blocks: [{ id: 'mermaid-1', type: 'mermaid', source: 'graph TD; A-->B;' }]",
  '      },',
  '      resolveMermaidSvg: () =>',
  "        '<svg viewBox=\"0 0 100 50\" onclick=\"evil()\"><script>alert(1)</script><a href=\"javascript:evil()\"><path d=\"M0 0L10 10\" /></a><text>Diagram</text></svg>'",
  '    })',
  '',
  "    expect(html).toContain('class=\"mermaid-block\"')",
  "    expect(html).toContain('<svg viewBox=\"0 0 100 50\"')",
  "    expect(html).toContain('Diagram')",
  "    expect(html).not.toContain('<script')",
  "    expect(html).not.toContain('onclick=')",
  "    expect(html).not.toContain('javascript:')",
  "    expect(html).not.toContain('mermaid-fallback')",
  '  })',
  '',
  "  it('falls back to escaped Mermaid source when rendered SVG is invalid', async () => {",
  '    const html = await buildStudyMaterialPdfHtml({',
  "      title: 'Mermaid fallback',",
  '      document: {',
  '        version: 1,',
  "        blocks: [{ id: 'mermaid-1', type: 'mermaid', source: 'graph TD; A-->B;' }]",
  '      },',
  "      resolveMermaidSvg: () => '<div>not svg</div>'",
  '    })',
  '',
  "    expect(html).toContain('mermaid-fallback')",
  "    expect(html).toContain('graph TD; A--&gt;B;')",
  '  })',
  '',
  ''
].join('\n')
tests = replaceOnce(tests, testAnchor, mermaidTests + testAnchor, 'studyPdf Mermaid tests')
write(testPath, tests)

const parityPath = 'MOBILE_PARITY.md'
let parity = read(parityPath)
const lines = parity.split('\n')
const studyIndex = lines.findIndex((line) => line.startsWith('| Study     |'))
if (studyIndex < 0) throw new Error('MOBILE_PARITY: Study row missing')
lines[studyIndex] = '| Study     | Nested folders/materials, versioned block documents, read/edit/focus, resource navigation, code workspace, links, assets, PDF, duplicate, reorder, autosave, deletion barriers                                        | Shared contracts, V3 SQLite repository, native tree CRUD, lossless block editor, serialized autosave, local attachments, dedicated read/focus mode, Markdown/LaTeX/Mermaid reader, mobile code workspace, desktop-compatible internal-link navigation/back history and segment-preserving internal-link authoring, plus native A4 PDF export with offline local-image and safely rendered Mermaid SVG embedding | Physical-device PDF/share + rich-content smoke tests and remaining visual polish. Unsupported blocks remain lossless. |'
parity = lines.join('\n')
const parityMarker = 'Repository-wide formatting and desktop ESLint are not currently clean baseline gates:'
const checkpoint = 'Study Mermaid-in-PDF checkpoint verified on 2026-09-07 with scoped formatting, mobile lint, root typecheck, mobile/shared tests, full desktop regression tests, DB check, production bundle, Android Expo export and whitespace validation. Mermaid diagrams are rendered offline in a dedicated Expo DOM surface with `securityLevel: strict`, sanitized again before PDF embedding, and fall back to escaped source when rendering is unavailable or invalid.\n\n'
parity = replaceOnce(parity, parityMarker, checkpoint + parityMarker, 'MOBILE_PARITY checkpoint')
parity = parity.replace(
  'Next close Mermaid-in-PDF rendering, then continue the remaining physical-device/native-only validation and presentation gaps.',
  'Next continue the remaining physical-device/native-only validation and presentation gaps.'
)
write(parityPath, parity)
