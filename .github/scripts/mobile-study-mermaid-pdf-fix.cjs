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
  if (text.indexOf(needle, first + needle.length) >= 0) throw new Error(`${label}: duplicate target`)
  return text.slice(0, first) + replacement + text.slice(first + needle.length)
}

write(
  'apps/mobile/src/modules/study/StudyMermaidExportDom.tsx',
  [
    "'use dom'",
    '',
    "import mermaid from 'mermaid'",
    "import { useEffect } from 'react'",
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
    'export interface StudyMermaidPdfRequest {',
    '  requestId: number',
    '  items: StudyMermaidPdfItem[]',
    '}',
    '',
    'export interface StudyMermaidPdfResponse {',
    '  requestId: number',
    '  results: StudyMermaidPdfResult[]',
    '}',
    '',
    'interface StudyMermaidExportDomProps {',
    '  request: StudyMermaidPdfRequest | null',
    '  onRendered: (response: StudyMermaidPdfResponse) => Promise<void>',
    "  dom?: import('expo/dom').DOMProps",
    '}',
    '',
    'function messageFor(reason: unknown): string {',
    "  return reason instanceof Error ? reason.message : 'Не удалось построить диаграмму Mermaid'",
    '}',
    '',
    'export default function StudyMermaidExportDom({',
    '  request,',
    '  onRendered',
    '}: StudyMermaidExportDomProps): React.JSX.Element {',
    '  useEffect(() => {',
    '    if (!request) return undefined',
    '    let active = true',
    '    const render = async (): Promise<void> => {',
    '      const results: StudyMermaidPdfResult[] = []',
    '      for (const item of request.items) {',
    '        try {',
    '          mermaid.initialize({',
    '            startOnLoad: false,',
    "            securityLevel: 'strict',",
    "            theme: item.theme ?? 'default',",
    '            suppressErrorRendering: true,',
    '            flowchart: { htmlLabels: false }',
    '          })',
    "          const renderId = 'mymind-pdf-mermaid-' + item.id + '-' + Date.now() + '-' + Math.random().toString(36).slice(2)",
    '          const rendered = await mermaid.render(renderId, item.source)',
    '          results.push({ id: item.id, svg: rendered.svg, error: null })',
    '        } catch (reason) {',
    '          results.push({ id: item.id, svg: null, error: messageFor(reason) })',
    '        }',
    '      }',
    '      if (active) await onRendered({ requestId: request.requestId, results })',
    '    }',
    '    void render()',
    '    return () => {',
    '      active = false',
    '    }',
    '  }, [onRendered, request])',
    '',
    '  return <main aria-hidden="true" style={{ width: 1, height: 1, overflow: \'hidden\' }} />',
    '}',
    ''
  ].join('\n')
)

const screenPath = 'apps/mobile/src/modules/study/StudyScreen.tsx'
let screen = read(screenPath)
screen = replaceOnce(
  screen,
  "import StudyMermaidExportDom, {\n  type StudyMermaidExportDomRef,\n  type StudyMermaidPdfItem\n} from './StudyMermaidExportDom'",
  "import StudyMermaidExportDom, {\n  type StudyMermaidPdfItem,\n  type StudyMermaidPdfRequest,\n  type StudyMermaidPdfResponse,\n  type StudyMermaidPdfResult\n} from './StudyMermaidExportDom'",
  'StudyScreen Mermaid imports'
)
screen = replaceOnce(
  screen,
  '  const queueRef = useRef<AutosaveQueue<StudyDocument> | null>(null)\n  const mermaidExportRef = useRef<StudyMermaidExportDomRef>(null)\n  const revealSequenceRef = useRef(0)',
  [
    '  const queueRef = useRef<AutosaveQueue<StudyDocument> | null>(null)',
    '  const [mermaidPdfRequest, setMermaidPdfRequest] = useState<StudyMermaidPdfRequest | null>(null)',
    '  const mermaidPdfSequenceRef = useRef(0)',
    '  const mermaidPdfPendingRef = useRef<{',
    '    requestId: number',
    '    resolve(results: StudyMermaidPdfResult[]): void',
    '    timeout: ReturnType<typeof setTimeout>',
    '  } | null>(null)',
    '  const revealSequenceRef = useRef(0)'
  ].join('\n'),
  'StudyScreen Mermaid refs'
)

const exportPrefix = [
  '        const mermaidItems: StudyMermaidPdfItem[] = document.blocks',
  "          .filter((block) => block.type === 'mermaid')",
  '          .map((block) => ({ id: block.id, source: block.source, theme: block.theme }))',
  '        const renderedMermaidSvg: Record<string, string> = {}',
  '        if (mermaidItems.length > 0 && mermaidExportRef.current) {',
  '          const rendered = await mermaidExportRef.current.render(mermaidItems)',
  '          for (const item of rendered) {',
  '            if (item.svg) renderedMermaidSvg[item.id] = item.svg',
  '          }',
  '        }'
].join('\n')
const exportReplacement = [
  '        const mermaidItems: StudyMermaidPdfItem[] = document.blocks',
  "          .filter((block) => block.type === 'mermaid')",
  '          .map((block) => ({ id: block.id, source: block.source, theme: block.theme }))',
  '        const renderedMermaidSvg: Record<string, string> = {}',
  '        const rendered = await renderMermaidPdf(mermaidItems)',
  '        for (const item of rendered) {',
  '          if (item.svg) renderedMermaidSvg[item.id] = item.svg',
  '        }'
].join('\n')
screen = replaceOnce(screen, exportPrefix, exportReplacement, 'StudyScreen export bridge')

screen = replaceOnce(
  screen,
  '    [api, document, documentAssets, exportingPdf, flush, material]\n  )',
  '    [api, document, documentAssets, exportingPdf, flush, material, renderMermaidPdf]\n  )',
  'StudyScreen export dependencies'
)

screen = replaceOnce(
  screen,
  '          <StudyMermaidExportDom\n            ref={mermaidExportRef}\n            dom={{ scrollEnabled: false, style: { width: 1, height: 1 } }}\n          />',
  '          <StudyMermaidExportDom\n            request={mermaidPdfRequest}\n            onRendered={handleMermaidPdfRendered}\n            dom={{ scrollEnabled: false, style: { width: 1, height: 1 } }}\n          />',
  'StudyScreen hidden renderer props'
)

const callbackAnchor = '  const exportPdf = useCallback(\n'
const callbacks = [
  '  const renderMermaidPdf = useCallback(',
  '    (items: StudyMermaidPdfItem[]): Promise<StudyMermaidPdfResult[]> => {',
  '      if (items.length === 0) return Promise.resolve([])',
  '      const previous = mermaidPdfPendingRef.current',
  '      if (previous) {',
  '        clearTimeout(previous.timeout)',
  '        previous.resolve([])',
  '      }',
  '      mermaidPdfSequenceRef.current += 1',
  '      const requestId = mermaidPdfSequenceRef.current',
  '      return new Promise((resolve) => {',
  '        const timeout = setTimeout(() => {',
  '          const pending = mermaidPdfPendingRef.current',
  '          if (!pending || pending.requestId !== requestId) return',
  '          mermaidPdfPendingRef.current = null',
  '          setMermaidPdfRequest(null)',
  '          resolve([])',
  '        }, 12000)',
  '        mermaidPdfPendingRef.current = { requestId, resolve, timeout }',
  '        setMermaidPdfRequest({ requestId, items })',
  '      })',
  '    },',
  '    []',
  '  )',
  '',
  '  const handleMermaidPdfRendered = useCallback(',
  '    async (response: StudyMermaidPdfResponse): Promise<void> => {',
  '      const pending = mermaidPdfPendingRef.current',
  '      if (!pending || pending.requestId !== response.requestId) return',
  '      clearTimeout(pending.timeout)',
  '      mermaidPdfPendingRef.current = null',
  '      setMermaidPdfRequest(null)',
  '      pending.resolve(response.results)',
  '    },',
  '    []',
  '  )',
  '',
  '  useEffect(',
  '    () => () => {',
  '      const pending = mermaidPdfPendingRef.current',
  '      if (!pending) return',
  '      clearTimeout(pending.timeout)',
  '      mermaidPdfPendingRef.current = null',
  '      pending.resolve([])',
  '    },',
  '    []',
  '  )',
  '',
  callbackAnchor
].join('\n')
screen = replaceOnce(screen, callbackAnchor, callbacks, 'StudyScreen Mermaid callbacks')
write(screenPath, screen)
