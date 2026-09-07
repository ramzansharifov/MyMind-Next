'use dom'

import katex from 'katex'
import mermaid from 'mermaid'
import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type RichContentKind = 'markdown' | 'latex' | 'mermaid'
type MermaidTheme = 'dark' | 'default' | 'neutral' | 'forest'
type TextAlignment = 'left' | 'center' | 'right'

interface RichContentDomProps {
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
  latexDisplayMode?: 'display' | 'inline'
  latexAlignment?: TextAlignment
  latexScale?: number
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
  colorScheme
}: {
  source: string
  theme: MermaidTheme
  colorScheme: 'light' | 'dark'
}): React.JSX.Element {
  const [state, setState] = useState<{ svg: string; error: string | null }>({ svg: '', error: null })

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
  return <div className="mermaid-content" dangerouslySetInnerHTML={{ __html: state.svg }} />
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
  latexDisplayMode = 'display',
  latexAlignment = 'center',
  latexScale = 1
}: RichContentDomProps): React.JSX.Element {
  return (
    <main
      className={`rich-root ${colorScheme}`}
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
      {kind === 'markdown' ? (
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
        <MermaidContent source={source} theme={mermaidTheme} colorScheme={colorScheme} />
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
