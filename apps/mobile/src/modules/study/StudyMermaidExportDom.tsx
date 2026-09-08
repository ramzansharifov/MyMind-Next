'use dom'

import mermaid from 'mermaid'
import { useEffect } from 'react'

export type StudyMermaidExportTheme = 'dark' | 'default' | 'neutral' | 'forest'

export interface StudyMermaidPdfItem {
  id: string
  source: string
  theme?: StudyMermaidExportTheme
}

export interface StudyMermaidPdfResult {
  id: string
  svg: string | null
  error: string | null
}

export interface StudyMermaidPdfRequest {
  requestId: number
  items: StudyMermaidPdfItem[]
}

export interface StudyMermaidPdfResponse {
  requestId: number
  results: StudyMermaidPdfResult[]
}

interface StudyMermaidExportDomProps {
  request: StudyMermaidPdfRequest | null
  onRendered: (response: StudyMermaidPdfResponse) => Promise<void>
  dom?: import('expo/dom').DOMProps
}

function messageFor(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'Не удалось построить диаграмму Mermaid'
}

export default function StudyMermaidExportDom({
  request,
  onRendered
}: StudyMermaidExportDomProps): React.JSX.Element {
  useEffect(() => {
    if (!request) return undefined
    let active = true
    const render = async (): Promise<void> => {
      const results: StudyMermaidPdfResult[] = []
      for (const item of request.items) {
        try {
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'strict',
            theme: item.theme ?? 'default',
            suppressErrorRendering: true,
            flowchart: { htmlLabels: false }
          })
          const renderId =
            'mymind-pdf-mermaid-' +
            item.id +
            '-' +
            Date.now() +
            '-' +
            Math.random().toString(36).slice(2)
          const rendered = await mermaid.render(renderId, item.source)
          results.push({ id: item.id, svg: rendered.svg, error: null })
        } catch (reason) {
          results.push({ id: item.id, svg: null, error: messageFor(reason) })
        }
      }
      if (active) await onRendered({ requestId: request.requestId, results })
    }
    void render()
    return () => {
      active = false
    }
  }, [onRendered, request])

  return <main aria-hidden="true" style={{ width: 1, height: 1, overflow: 'hidden' }} />
}
