'use dom'

import Editor from 'react-simple-code-editor'
import Prism from 'prismjs'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-latex'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import mermaid from 'mermaid'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useEffect, useMemo, useRef, useState } from 'react'

import { getStudyCodeLanguage, normalizeStudyCodeLanguage } from './studySourceLanguages'

export type StudySourceKind = 'code' | 'markdown' | 'latex' | 'mermaid'
export type StudySourceViewMode = 'write' | 'split' | 'preview'
export type StudySourceMermaidTheme = 'dark' | 'default' | 'neutral' | 'forest'

interface StudySourceBlockDomProps {
  dom?: import('expo/dom').DOMProps
  kind: StudySourceKind
  source: string
  editable: boolean
  viewMode?: StudySourceViewMode
  language?: string
  latexDisplayMode?: 'display' | 'inline'
  latexAlignment?: 'left' | 'center' | 'right'
  latexScale?: number
  mermaidTheme?: StudySourceMermaidTheme
  mermaidScale?: number
  colorScheme: 'light' | 'dark'
  textColor: string
  mutedColor: string
  borderColor: string
  surfaceColor: string
  codeSurfaceColor: string
  accentColor: string
  onSourceChange: (source: string) => Promise<void>
  onHeightChange: (height: number) => Promise<void>
}

interface MermaidState {
  status: 'idle' | 'loading' | 'success' | 'error'
  svg: string
  error: string
}

const EMPTY_MERMAID: MermaidState = {
  status: 'idle',
  svg: '',
  error: ''
}

registerMermaidGrammar()

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function normalizeLegacyCodeSource(source: string): string {
  return source.replace(/^[\t ]*\n/, '')
}

function highlightCode(source: string, language: string): string {
  const option = getStudyCodeLanguage(language)
  if (option.prismLanguage === 'plain') return escapeHtml(source)
  const grammar = Prism.languages[option.prismLanguage]
  return grammar ? Prism.highlight(source, grammar, option.prismLanguage) : escapeHtml(source)
}

function highlightMarkdown(source: string): string {
  const grammar = Prism.languages.markdown
  return grammar ? Prism.highlight(source, grammar, 'markdown') : escapeHtml(source)
}

function highlightLatex(source: string): string {
  const grammar = Prism.languages.latex
  return grammar ? Prism.highlight(source, grammar, 'latex') : escapeHtml(source)
}

function registerMermaidGrammar(): void {
  if (Prism.languages.mermaid) return
  Prism.languages.mermaid = {
    comment: /%%.*$/m,
    directive: {
      pattern: /%%\{[\s\S]*?\}%%/,
      alias: 'keyword'
    },
    keyword:
      /\b(?:flowchart|graph|subgraph|end|sequenceDiagram|participant|actor|classDiagram|class|stateDiagram-v2|stateDiagram|state|erDiagram|gantt|section|dateFormat|axisFormat|pie|journey|mindmap|timeline|gitGraph|quadrantChart|requirementDiagram|C4Context|C4Container|C4Component|C4Dynamic|sankey-beta|xychart-beta|block-beta|packet-beta|kanban|architecture-beta)\b/,
    string: /"[^"\n]*"|'[^'\n]*'/,
    arrow: {
      pattern: /(?:<-->|-->|---|-\.->|==>|->>|-->>|-\)|-\]|~~~)/,
      alias: 'operator'
    },
    number: /\b\d+(?:\.\d+)?\b/,
    punctuation: /[()[\]{}:;|,]/
  }
}

function highlightMermaid(source: string): string {
  return Prism.highlight(source, Prism.languages.mermaid, 'mermaid')
}

function clampLatexScale(value: number): number {
  return Math.max(70, Math.min(180, value))
}

function clampMermaidScale(value: number): number {
  return Math.max(60, Math.min(180, value))
}

function LineNumbers({ source }: { source: string }): React.JSX.Element {
  const lineCount = Math.max(1, source.split('\n').length)
  const digits = Math.max(2, String(lineCount).length)

  return (
    <div className="line-numbers" style={{ minWidth: `calc(${digits}ch + 1.5rem)` }}>
      {Array.from({ length: lineCount }, (_, index) => (
        <span key={index}>{index + 1}</span>
      ))}
    </div>
  )
}

function SourceEditor({
  source,
  placeholder,
  highlight,
  lineNumbers,
  onChange
}: {
  source: string
  placeholder: string
  highlight(value: string): string
  lineNumbers: boolean
  onChange(value: string): void
}): React.JSX.Element {
  return (
    <div className="source-scroll">
      <div className="source-body">
        {lineNumbers ? <LineNumbers source={source} /> : null}
        <Editor
          value={source}
          insertSpaces
          tabSize={2}
          padding={16}
          placeholder={placeholder}
          highlight={highlight}
          className="source-editor"
          textareaClassName="source-textarea"
          preClassName="source-pre"
          style={{
            minHeight: '3.45rem',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '0.875rem',
            lineHeight: '1.65'
          }}
          onValueChange={onChange}
        />
      </div>
    </div>
  )
}

function ReadOnlyCode({ source, language }: { source: string; language: string }): React.JSX.Element {
  const normalized = normalizeLegacyCodeSource(source)
  return (
    <div className="source-scroll">
      <div className="source-body">
        <LineNumbers source={normalized} />
        <Editor
          value={normalized}
          readOnly
          ignoreTabKey
          insertSpaces
          tabSize={2}
          padding={16}
          placeholder="Пустой блок кода"
          highlight={(value) => highlightCode(value, language)}
          className="source-editor"
          textareaClassName="source-textarea"
          preClassName="source-pre"
          style={{
            minHeight: '6rem',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '0.875rem',
            lineHeight: '1.65'
          }}
          onValueChange={() => undefined}
        />
      </div>
    </div>
  )
}

const markdownComponents: Components = {
  a({ href, children }) {
    const internal = href?.startsWith('#') ?? false
    return (
      <a
        href={href}
        target={internal ? undefined : '_blank'}
        rel={internal ? undefined : 'noopener noreferrer'}
      >
        {children}
      </a>
    )
  },
  code({ children, className }) {
    const rawSource = String(children)
    const match = /language-([\w+-]+)/i.exec(className ?? '')
    const blockCode = Boolean(match) || rawSource.includes('\n') || rawSource.endsWith('\n')
    if (!blockCode) return <code className={className}>{children}</code>

    const source = rawSource.replace(/\n$/, '')
    const language = normalizeStudyCodeLanguage(match?.[1])
    return (
      <div className="markdown-code-block">
        <ReadOnlyCode source={source} language={language} />
      </div>
    )
  },
  pre({ children }) {
    return <>{children}</>
  },
  table({ children }) {
    return (
      <div className="markdown-table-wrap">
        <table>{children}</table>
      </div>
    )
  }
}

function MarkdownPreview({ source }: { source: string }): React.JSX.Element {
  if (!source.trim()) return <p className="muted">Пустой Markdown-блок</p>
  return (
    <article className="markdown-preview">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents} skipHtml>
        {source}
      </ReactMarkdown>
    </article>
  )
}

function LatexPreview({
  source,
  displayMode,
  alignment,
  scale
}: {
  source: string
  displayMode: 'display' | 'inline'
  alignment: 'left' | 'center' | 'right'
  scale: number
}): React.JSX.Element {
  const result = useMemo(() => {
    if (!source.trim()) return { html: '', error: '' }
    try {
      return {
        html: katex.renderToString(source, {
          displayMode: displayMode === 'display',
          throwOnError: true,
          strict: 'warn',
          trust: false,
          output: 'htmlAndMathml'
        }),
        error: ''
      }
    } catch (reason) {
      return {
        html: '',
        error: reason instanceof Error ? reason.message : 'Не удалось построить формулу'
      }
    }
  }, [displayMode, source])

  if (!source.trim()) return <p className="muted">Пустой LaTeX-блок</p>
  if (result.error) {
    return (
      <div className="error-panel">
        <strong>Ошибка в формуле</strong>
        <span>{result.error}</span>
      </div>
    )
  }

  return (
    <div
      className="latex-preview"
      style={{
        textAlign: alignment,
        fontSize: `${clampLatexScale(scale) / 100}rem`
      }}
      dangerouslySetInnerHTML={{ __html: result.html }}
    />
  )
}

function MermaidPreview({
  source,
  theme,
  colorScheme,
  scale
}: {
  source: string
  theme: StudySourceMermaidTheme
  colorScheme: 'light' | 'dark'
  scale: number
}): React.JSX.Element {
  const [state, setState] = useState<MermaidState>(EMPTY_MERMAID)

  useEffect(() => {
    if (!source.trim()) {
      setState(EMPTY_MERMAID)
      return undefined
    }

    let active = true
    const timer = window.setTimeout(() => {
      if (!active) return
      setState({ status: 'loading', svg: '', error: '' })
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: theme === 'default' && colorScheme === 'dark' ? 'dark' : theme,
        suppressErrorRendering: true
      })

      const id = `mymind-mobile-mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`
      void mermaid
        .render(id, source)
        .then((result) => {
          if (active) setState({ status: 'success', svg: result.svg, error: '' })
        })
        .catch((reason: unknown) => {
          if (!active) return
          setState({
            status: 'error',
            svg: '',
            error: reason instanceof Error ? reason.message : 'Не удалось построить диаграмму'
          })
        })
    }, 320)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [colorScheme, source, theme])

  if (!source.trim()) return <p className="muted">Пустой Mermaid-блок</p>
  if (state.status === 'idle' || state.status === 'loading') {
    return <p className="muted">Построение диаграммы…</p>
  }
  if (state.status === 'error') {
    return (
      <div className="error-panel">
        <strong>Ошибка в диаграмме</strong>
        <span>{state.error}</span>
      </div>
    )
  }

  return (
    <div className="mermaid-preview">
      <div
        className="mermaid-svg"
        style={{ width: `${clampMermaidScale(scale)}%` }}
        dangerouslySetInnerHTML={{ __html: state.svg }}
      />
    </div>
  )
}

function PanelLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <div className="panel-label">{children}</div>
}

export default function StudySourceBlockDom({
  kind,
  source,
  editable,
  viewMode = 'split',
  language = 'text',
  latexDisplayMode = 'display',
  latexAlignment = 'center',
  latexScale = 100,
  mermaidTheme = 'dark',
  mermaidScale = 100,
  colorScheme,
  textColor,
  mutedColor,
  borderColor,
  surfaceColor,
  codeSurfaceColor,
  accentColor,
  onSourceChange,
  onHeightChange
}: StudySourceBlockDomProps): React.JSX.Element {
  const rootRef = useRef<HTMLElement | null>(null)
  const emittedSourceRef = useRef(source)
  const [localSource, setLocalSource] = useState(() =>
    kind === 'code' ? normalizeLegacyCodeSource(source) : source
  )

  useEffect(() => {
    if (source === emittedSourceRef.current) return
    const normalized = kind === 'code' ? normalizeLegacyCodeSource(source) : source
    setLocalSource(normalized)
    emittedSourceRef.current = source
  }, [kind, source])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined

    const report = (): void => {
      const height = Math.max(56, Math.ceil(root.scrollHeight))
      void onHeightChange(height)
    }
    const observer = new ResizeObserver(report)
    observer.observe(root)
    const frame = requestAnimationFrame(report)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [kind, localSource, onHeightChange, viewMode])

  const changeSource = (value: string): void => {
    setLocalSource(value)
    emittedSourceRef.current = value
    void onSourceChange(value)
  }

  const activeMode: StudySourceViewMode = editable ? viewMode : 'preview'

  const editor = (() => {
    if (kind === 'code') {
      return editable ? (
        <SourceEditor
          source={localSource}
          placeholder="Код…"
          highlight={(value) => highlightCode(value, language)}
          lineNumbers
          onChange={changeSource}
        />
      ) : (
        <ReadOnlyCode source={localSource} language={language} />
      )
    }

    if (kind === 'markdown') {
      if (activeMode === 'write') {
        return (
          <SourceEditor
            source={localSource}
            placeholder="Начни писать Markdown…"
            highlight={highlightMarkdown}
            lineNumbers
            onChange={changeSource}
          />
        )
      }
      if (activeMode === 'preview') return <MarkdownPreview source={localSource} />
      return (
        <div className="split">
          <div className="panel">
            <PanelLabel>Markdown</PanelLabel>
            <SourceEditor
              source={localSource}
              placeholder="Начни писать Markdown…"
              highlight={highlightMarkdown}
              lineNumbers
              onChange={changeSource}
            />
          </div>
          <div className="panel">
            <PanelLabel>Просмотр</PanelLabel>
            <div className="preview-pad">
              <MarkdownPreview source={localSource} />
            </div>
          </div>
        </div>
      )
    }

    if (kind === 'latex') {
      const preview = (
        <LatexPreview
          source={localSource}
          displayMode={latexDisplayMode}
          alignment={latexAlignment}
          scale={latexScale}
        />
      )
      if (activeMode === 'write') {
        return (
          <SourceEditor
            source={localSource}
            placeholder={String.raw`\frac{-b \pm \sqrt{b^2 - 4ac}}{2a}`}
            highlight={highlightLatex}
            lineNumbers
            onChange={changeSource}
          />
        )
      }
      if (activeMode === 'preview') return <div className="preview-pad">{preview}</div>
      return (
        <div className="split">
          <div className="panel">
            <PanelLabel>LaTeX</PanelLabel>
            <SourceEditor
              source={localSource}
              placeholder={String.raw`\frac{-b \pm \sqrt{b^2 - 4ac}}{2a}`}
              highlight={highlightLatex}
              lineNumbers
              onChange={changeSource}
            />
          </div>
          <div className="panel">
            <PanelLabel>Формула</PanelLabel>
            <div className="preview-pad">{preview}</div>
          </div>
        </div>
      )
    }

    const mermaidPreview = (
      <MermaidPreview
        source={localSource}
        theme={mermaidTheme}
        colorScheme={colorScheme}
        scale={mermaidScale}
      />
    )
    if (activeMode === 'write') {
      return (
        <SourceEditor
          source={localSource}
          placeholder={'flowchart LR\n  A[Начало] --> B[Результат]'}
          highlight={highlightMermaid}
          lineNumbers={false}
          onChange={changeSource}
        />
      )
    }
    if (activeMode === 'preview') return <div className="preview-pad">{mermaidPreview}</div>
    return (
      <div className="split">
        <div className="panel">
          <PanelLabel>Mermaid</PanelLabel>
          <SourceEditor
            source={localSource}
            placeholder={'flowchart LR\n  A[Начало] --> B[Результат]'}
            highlight={highlightMermaid}
            lineNumbers={false}
            onChange={changeSource}
          />
        </div>
        <div className="panel">
          <PanelLabel>Диаграмма</PanelLabel>
          <div className="preview-pad">{mermaidPreview}</div>
        </div>
      </div>
    )
  })()

  return (
    <main
      ref={rootRef}
      className={`source-root ${colorScheme}`}
      style={
        {
          '--text': textColor,
          '--muted': mutedColor,
          '--border': borderColor,
          '--surface': surfaceColor,
          '--code-surface': codeSurfaceColor,
          '--accent': accentColor
        } as React.CSSProperties
      }
    >
      {editor}
      <style>{styles}</style>
    </main>
  )
}

const styles = `
  html, body, #root { margin: 0; width: 100%; min-height: 1px; background: transparent; }
  * { box-sizing: border-box; }
  body { overflow: hidden; }
  .source-root {
    width: 100%;
    min-height: 56px;
    color: var(--text);
    background: transparent;
    font: 14px/1.65 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .source-scroll {
    max-height: 36rem;
    overflow: auto;
  }
  .source-body {
    position: relative;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    min-width: max-content;
    background: var(--code-surface);
  }
  .line-numbers {
    position: sticky;
    left: 0;
    z-index: 2;
    display: flex;
    flex-direction: column;
    padding: 16px 10px 16px 8px;
    border-right: 1px solid var(--border);
    background: var(--code-surface);
    color: var(--muted);
    text-align: right;
    font: 12px/1.925 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    user-select: none;
  }
  .line-numbers span { height: 23.1px; }
  .source-editor {
    min-width: 0;
    background: var(--code-surface);
    color: var(--text);
  }
  .source-editor textarea,
  .source-editor pre {
    outline: none !important;
    white-space: pre !important;
    overflow-wrap: normal !important;
    word-break: normal !important;
  }
  .source-editor textarea {
    color: transparent !important;
    caret-color: var(--text) !important;
    -webkit-text-fill-color: transparent;
  }
  .source-editor textarea::selection {
    background: color-mix(in srgb, var(--accent) 38%, transparent);
    -webkit-text-fill-color: transparent;
  }
  .source-pre { color: var(--text); }
  .token.comment, .token.prolog, .token.doctype, .token.cdata { color: #7f8c8d; }
  .token.punctuation { color: #c5c8c6; }
  .light .token.punctuation { color: #4b5563; }
  .token.property, .token.tag, .token.boolean, .token.number, .token.constant,
  .token.symbol, .token.deleted { color: #f97316; }
  .token.selector, .token.attr-name, .token.string, .token.char, .token.builtin,
  .token.inserted { color: #84cc16; }
  .token.operator, .token.entity, .token.url, .language-css .token.string,
  .style .token.string { color: #22d3ee; }
  .token.atrule, .token.attr-value, .token.keyword { color: #c084fc; }
  .token.function, .token.class-name { color: #60a5fa; }
  .token.regex, .token.important, .token.variable { color: #fbbf24; }
  .split {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
  .panel { min-width: 0; overflow: hidden; }
  .panel + .panel { border-left: 1px solid var(--border); }
  .panel-label {
    padding: 8px 16px;
    border-bottom: 1px solid var(--border);
    color: var(--muted);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: .08em;
    text-transform: uppercase;
  }
  .preview-pad { padding: 20px; min-width: 0; overflow-x: auto; }
  .muted { margin: 0; color: var(--muted); font-size: 14px; }
  .markdown-preview > :first-child { margin-top: 0; }
  .markdown-preview > :last-child { margin-bottom: 0; }
  .markdown-preview h1, .markdown-preview h2, .markdown-preview h3 { line-height: 1.25; }
  .markdown-preview h1 { font-size: 1.8em; }
  .markdown-preview h2 { font-size: 1.45em; }
  .markdown-preview h3 { font-size: 1.2em; }
  .markdown-preview a { color: var(--accent); }
  .markdown-preview blockquote {
    margin-left: 0;
    padding-left: 14px;
    border-left: 3px solid var(--border);
    color: var(--muted);
  }
  .markdown-preview code {
    padding: 1px 5px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }
  .markdown-code-block { margin: 12px 0; overflow: hidden; border: 1px solid var(--border); border-radius: 12px; }
  .markdown-table-wrap { max-width: 100%; overflow-x: auto; }
  .markdown-preview table { width: 100%; border-collapse: collapse; }
  .markdown-preview th, .markdown-preview td { border: 1px solid var(--border); padding: 6px 9px; }
  .markdown-preview img { max-width: 100%; height: auto; border-radius: 10px; }
  .latex-preview {
    width: 100%;
    min-height: 56px;
    overflow-x: auto;
    color: var(--text);
  }
  .latex-preview .katex { color: var(--text); }
  .mermaid-preview {
    width: 100%;
    min-height: 100px;
    display: flex;
    justify-content: center;
    overflow-x: auto;
  }
  .mermaid-svg { min-width: 0; transition: width 160ms ease-out; }
  .mermaid-svg svg { width: 100%; max-width: 100%; height: auto; }
  .error-panel {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px;
    border: 1px solid color-mix(in srgb, #ef4444 35%, transparent);
    border-radius: 12px;
    color: #ef4444;
    background: color-mix(in srgb, #ef4444 7%, transparent);
  }
  .error-panel span { color: var(--muted); font-size: 12px; }
  @media (max-width: 700px) {
    .split { grid-template-columns: 1fr; }
    .panel + .panel { border-left: 0; border-top: 1px solid var(--border); }
  }
`
