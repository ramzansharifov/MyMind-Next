import type { StudyMermaidTheme } from '../../../../../../shared/contracts/study'

type MermaidApi = (typeof import('mermaid'))['default']

export interface StudyMermaidRenderResult {
  svg: string
  diagramType: string
}

let mermaidPromise: Promise<MermaidApi> | null = null

let renderQueue: Promise<void> = Promise.resolve()

export function renderStudyMermaid(
  source: string,
  theme: StudyMermaidTheme
): Promise<StudyMermaidRenderResult> {
  const task = renderQueue.then(() => renderStudyMermaidNow(source, theme))

  renderQueue = task.then(
    () => undefined,
    () => undefined
  )

  return task
}

async function renderStudyMermaidNow(
  source: string,
  theme: StudyMermaidTheme
): Promise<StudyMermaidRenderResult> {
  const mermaid = await getMermaid()

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    suppressErrorRendering: true,
    theme,
    htmlLabels: false,
    maxTextSize: 50_000,
    maxEdges: 500,
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    secure: [
      'securityLevel',
      'startOnLoad',
      'suppressErrorRendering',
      'theme',
      'htmlLabels',
      'maxTextSize',
      'maxEdges'
    ]
  })

  await mermaid.parse(source)

  const diagramType = mermaid.detectType(source)

  const renderId = `mymind-mermaid-${crypto.randomUUID()}`

  const result = await mermaid.render(renderId, source)

  return {
    svg: sanitizeStudyMermaidSvg(result.svg),
    diagramType
  }
}

async function getMermaid(): Promise<MermaidApi> {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((module) => module.default)
  }

  return mermaidPromise
}

export function sanitizeStudyMermaidSvg(svg: string): string {
  const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml')

  if (parsed.querySelector('parsererror')) {
    throw new Error('Mermaid вернул некорректный SVG')
  }

  const svgElement = parsed.documentElement

  parsed.querySelectorAll('script, foreignObject, iframe, object, embed').forEach((element) => {
    element.remove()
  })

  parsed.querySelectorAll('a').forEach((link) => {
    link.replaceWith(...Array.from(link.childNodes))
  })

  const elements = [svgElement, ...Array.from(svgElement.querySelectorAll('*'))]

  elements.forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase()

      const value = attribute.value.trim()

      if (name.startsWith('on')) {
        element.removeAttribute(attribute.name)
        return
      }

      if (value.toLowerCase().includes('javascript:')) {
        element.removeAttribute(attribute.name)
        return
      }

      if ((name === 'href' || name === 'xlink:href') && !value.startsWith('#')) {
        element.removeAttribute(attribute.name)
      }
    })
  })

  return new XMLSerializer().serializeToString(svgElement)
}

export function getStudyMermaidErrorMessage(reason: unknown): string {
  if (!(reason instanceof Error)) {
    return 'Не удалось построить диаграмму'
  }

  const message = reason.message.replace(/^Error:\s*/i, '').trim()

  if (!message) {
    return 'Не удалось построить диаграмму'
  }

  return message.slice(0, 1200)
}
