import katex from 'katex'
import mermaid from 'mermaid'
import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export type RichContentKind = 'html' | 'markdown' | 'latex' | 'mermaid'

export interface RichContentInternalLinkTarget {
  kind: 'material' | 'heading'
  materialId: string
  headingId: string | null
}
type MermaidTheme = 'dark' | 'default' | 'neutral' | 'forest'
type TextAlignment = 'left' | 'center' | 'right'

export interface RichContentDomProps {
  dom?: import('expo/dom').DOMProps
  kind: RichContentKind
  source: string
  colorScheme: 'light' | 'dark'
  textColor: string
  mutedColor: string
  borderColor: string
  surfaceColor: string
  accentColor: string
  mermaidTheme?: MermaidTheme
  mermaidScale?: number
  latexDisplayMode?: 'display' | 'inline'
  latexAlignment?: TextAlignment
  latexScale?: number
  onOpenInternalLink?: (target: RichContentInternalLinkTarget) => Promise<void>
  onOpenExternalLink?: (href: string) => Promise<void>
}

function messageFor(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'Не удалось отобразить содержимое'
}

function LatexContent({
  source,
  displayMode,
  alignment,
  scale
}: {
  source: string
  displayMode: 'display' | 'inline'
  alignment: TextAlignment
  scale: number
}): React.JSX.Element {
  const rendered = useMemo(() => {
    try {
      return {
        html: katex.renderToString(source, {
          displayMode: displayMode === 'display',
          throwOnError: true,
          strict: 'warn',
          trust: false,
          output: 'mathml'
        }),
        error: null
      }
    } catch (reason) {
      return { html: '', error: messageFor(reason) }
    }
  }, [displayMode, source])

  if (rendered.error) return <ErrorPanel message={rendered.error} />
  return (
    <div
      className="latex-content"
      style={{ textAlign: alignment, fontSize: `${Math.max(0.5, Math.min(3, scale))}em` }}
      dangerouslySetInnerHTML={{ __html: rendered.html }}
    />
  )
}

function MermaidContent({
  source,
  theme,
  colorScheme,
  scale
}: {
  source: string
  theme: MermaidTheme
  colorScheme: 'light' | 'dark'
  scale: number
}): React.JSX.Element {
  const [state, setState] = useState<{ svg: string; error: string | null }>({
    svg: '',
    error: null
  })

  useEffect(() => {
    let active = true
    const render = async (): Promise<void> => {
      try {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: theme === 'default' && colorScheme === 'dark' ? 'dark' : theme,
          suppressErrorRendering: true
        })
        const id = `mymind-mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`
        const result = await mermaid.render(id, source)
        if (active) setState({ svg: result.svg, error: null })
      } catch (reason) {
        if (active) setState({ svg: '', error: messageFor(reason) })
      }
    }
    void render()
    return () => {
      active = false
    }
  }, [colorScheme, source, theme])

  if (state.error) return <ErrorPanel message={state.error} />
  if (!state.svg) return <p className="muted">Построение диаграммы…</p>
  return (
    <div
      className="mermaid-content"
      style={{ zoom: Math.max(0.5, Math.min(2, scale)) } as React.CSSProperties}
      dangerouslySetInnerHTML={{ __html: state.svg }}
    />
  )
}

function HtmlContent({
  source,
  onOpenInternalLink,
  onOpenExternalLink
}: {
  source: string
  onOpenInternalLink?: (target: RichContentInternalLinkTarget) => Promise<void>
  onOpenExternalLink?: (href: string) => Promise<void>
}): React.JSX.Element {
  const openTarget = (event: React.MouseEvent<HTMLElement>): void => {
    const element = event.target instanceof Element ? event.target : null
    if (!element) return

    const internalLink = element.closest<HTMLElement>('[data-study-internal-link="true"]')
    if (internalLink) {
      event.preventDefault()
      event.stopPropagation()
      if (!onOpenInternalLink) return
      const materialId = internalLink.dataset.materialId ?? ''
      if (!materialId) return
      void onOpenInternalLink({
        kind: internalLink.dataset.targetKind === 'heading' ? 'heading' : 'material',
        materialId,
        headingId: internalLink.dataset.headingId ?? null
      })
      return
    }

    const anchor = element.closest<HTMLAnchorElement>('a[href]')
    if (!anchor || !onOpenExternalLink) return
    event.preventDefault()
    event.stopPropagation()
    void onOpenExternalLink(anchor.href)
  }

  return (
    <article
      className="html-content"
      onClick={openTarget}
      dangerouslySetInnerHTML={{ __html: source }}
    />
  )
}

function ErrorPanel({ message }: { message: string }): React.JSX.Element {
  return (
    <div className="error-panel" role="alert">
      <strong>Не удалось отобразить блок</strong>
      <span>{message}</span>
    </div>
  )
}

export default function RichContentDom({
  kind,
  source,
  colorScheme,
  textColor,
  mutedColor,
  borderColor,
  surfaceColor,
  accentColor,
  mermaidTheme = 'default',
  mermaidScale = 1,
  latexDisplayMode = 'display',
  latexAlignment = 'center',
  latexScale = 1,
  onOpenInternalLink,
  onOpenExternalLink
}: RichContentDomProps): React.JSX.Element {
  const openExternalTarget = (event: React.MouseEvent<HTMLElement>): void => {
    if (!onOpenExternalLink) return
    const element = event.target instanceof Element ? event.target : null
    const anchor = element?.closest<HTMLAnchorElement>('a[href]')
    if (!anchor) return
    event.preventDefault()
    void onOpenExternalLink(anchor.href)
  }

  return (
    <main
      className={`rich-root ${colorScheme}`}
      onClick={openExternalTarget}
      style={
        {
          '--text': textColor,
          '--muted': mutedColor,
          '--border': borderColor,
          '--surface': surfaceColor,
          '--accent': accentColor
        } as React.CSSProperties
      }
    >
      {kind === 'html' ? (
        <HtmlContent
          source={source}
          onOpenInternalLink={onOpenInternalLink}
          onOpenExternalLink={onOpenExternalLink}
        />
      ) : kind === 'markdown' ? (
        <article className="markdown-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
        </article>
      ) : kind === 'latex' ? (
        <LatexContent
          source={source}
          displayMode={latexDisplayMode}
          alignment={latexAlignment}
          scale={latexScale}
        />
      ) : (
        <MermaidContent
          source={source}
          theme={mermaidTheme}
          colorScheme={colorScheme}
          scale={mermaidScale}
        />
      )}
      <style>{styles}</style>
    </main>
  )
}

const styles = `
  html, body, #root { margin: 0; width: 100%; min-height: 1px; background: transparent; }
  * { box-sizing: border-box; }
  body { overflow: hidden; }
  .rich-root {
    width: 100%;
    color: var(--text);
    background: transparent;
    font: 16px/1.6 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    overflow-wrap: anywhere;
  }
  .html-content > :first-child, .markdown-content > :first-child { margin-top: 0; }
  .html-content > :last-child, .markdown-content > :last-child { margin-bottom: 0; }
  .html-content p { margin: 0 0 0.72em; }
  .html-content strong, .html-content b { font-weight: 700; }
  .html-content em, .html-content i { font-style: italic; }
  .html-content u { text-decoration: underline; }
  .html-content s, .html-content strike { text-decoration: line-through; }
  .html-content a { color: var(--accent); text-decoration: underline; }
  .html-content blockquote {
    margin: 0.5em 0;
    padding: 3px 0 3px 12px;
    border-left: 3px solid var(--accent);
    color: var(--muted);
  }
  .html-content ul, .html-content ol { margin: 0.5em 0; padding-left: 1.55em; }
  .html-content li { margin: 0.22em 0; }
  .html-content code {
    padding: 1px 5px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.9em;
  }
  .html-content mark { border-radius: 3px; padding: 0 1px; color: inherit; }
  .html-content [data-study-internal-link="true"] {
    display: inline;
    cursor: pointer;
    padding: 1px 4px;
    border-radius: 5px;
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    font-weight: 600;
  }
  .markdown-content > :first-child { margin-top: 0; }
  .markdown-content > :last-child { margin-bottom: 0; }
  .markdown-content h1, .markdown-content h2, .markdown-content h3 { line-height: 1.25; }
  .markdown-content h1 { font-size: 1.8em; }
  .markdown-content h2 { font-size: 1.45em; }
  .markdown-content h3 { font-size: 1.2em; }
  .markdown-content a { color: var(--accent); }
  .markdown-content blockquote {
    margin-left: 0;
    padding-left: 14px;
    border-left: 3px solid var(--border);
    color: var(--muted);
  }
  .markdown-content code {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 1px 5px;
  }
  .markdown-content pre {
    overflow-x: auto;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 12px;
  }
  .markdown-content pre code { border: 0; padding: 0; }
  .markdown-content table { width: 100%; border-collapse: collapse; display: block; overflow-x: auto; }
  .markdown-content th, .markdown-content td { border: 1px solid var(--border); padding: 6px 9px; }
  .markdown-content img { max-width: 100%; height: auto; border-radius: 10px; }
  .latex-content { width: 100%; overflow-x: auto; padding: 6px 2px; }
  .latex-content math { color: var(--text); }
  .mermaid-content { width: 100%; overflow-x: auto; text-align: center; }
  .mermaid-content svg { max-width: 100%; height: auto; }
  .muted { color: var(--muted); margin: 0; }
  .error-panel {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px;
    border: 1px solid color-mix(in srgb, #ef4444 40%, transparent);
    border-radius: 10px;
    color: #ef4444;
    background: color-mix(in srgb, #ef4444 7%, transparent);
  }
  .error-panel span { color: var(--muted); font-size: 13px; }
`
