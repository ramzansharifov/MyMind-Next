import * as ToggleGroup from '@radix-ui/react-toggle-group'
import {
  Check,
  CircleAlert,
  Columns2,
  Copy,
  Download,
  Eye,
  LoaderCircle,
  PencilLine,
  Workflow
} from 'lucide-react'
import Prism from 'prismjs'
import Editor from 'react-simple-code-editor'
import { useEffect, useId, useRef, useState } from 'react'

import type {
  StudyMermaidTheme,
  StudyMermaidViewMode
} from '../../../../../../shared/contracts/study'
import { cn } from '../../../../shared/lib/cn'
import { Tooltip, TooltipProvider } from '../../../../shared/ui/tooltip'
import {
  getStudyMermaidErrorMessage,
  renderStudyMermaid,
  type StudyMermaidRenderResult
} from './mermaid-renderer'

interface StudyMermaidBlockProps {
  source: string
  mode: 'edit' | 'read'
  viewMode?: StudyMermaidViewMode
  theme?: StudyMermaidTheme
  scale?: number
  onChange?: (source: string) => void
  onViewModeChange?: (viewMode: StudyMermaidViewMode) => void
}

type CopyState = 'idle' | 'copied' | 'error'

type MermaidRenderState =
  | {
      status: 'idle' | 'loading'
      svg: null
      diagramType: null
      error: null
    }
  | {
      status: 'success'
      svg: string
      diagramType: string
      error: null
    }
  | {
      status: 'error'
      svg: null
      diagramType: null
      error: string
    }

const emptyRenderState: MermaidRenderState = {
  status: 'idle',
  svg: null,
  diagramType: null,
  error: null
}

const mermaidViewModes = [
  {
    value: 'write',
    label: 'Код',
    Icon: PencilLine
  },
  {
    value: 'split',
    label: '2 окна',
    Icon: Columns2
  },
  {
    value: 'preview',
    label: 'Просмотр',
    Icon: Eye
  }
] satisfies Array<{
  value: StudyMermaidViewMode
  label: string
  Icon: typeof PencilLine
}>

registerMermaidGrammar()

export function StudyMermaidBlock({
  source,
  mode,
  viewMode = 'split',
  theme = 'dark',
  scale = 100,
  onChange,
  onViewModeChange
}: StudyMermaidBlockProps): React.JSX.Element {
  const editorId = useId()

  const renderState = useMermaidRender(source, theme)

  const [copyState, setCopyState] = useState<CopyState>('idle')

  const resetTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current)
      }
    }
  }, [])

  if (mode === 'read') {
    return <StudyMermaidPreview source={source} state={renderState} scale={scale} framed />
  }

  const activeViewMode = isMermaidViewMode(viewMode) ? viewMode : 'split'

  async function handleCopy(): Promise<void> {
    try {
      await writeClipboard(source)
      setCopyState('copied')
    } catch {
      setCopyState('error')
    }

    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current)
    }

    resetTimerRef.current = window.setTimeout(() => {
      setCopyState('idle')
    }, 1600)
  }

  const copyLabel =
    copyState === 'copied'
      ? 'Скопировано'
      : copyState === 'error'
        ? 'Не удалось скопировать'
        : 'Копировать Mermaid-код'

  return (
    <TooltipProvider delayDuration={250}>
      <section className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[#0c0d10]">
        <header className="flex min-h-11 items-center justify-between gap-3 border-b border-[var(--app-border)] bg-white/[0.025] px-3">
          <div className="flex min-w-0 items-center gap-2">
            <Workflow aria-hidden="true" className="size-4 shrink-0 text-violet-300" />

            <span className="text-[11px] font-semibold tracking-[0.08em] text-[var(--app-muted)] uppercase">
              Mermaid
            </span>
          </div>

          <div className="flex items-center gap-1">
            <ToggleGroup.Root
              type="single"
              value={activeViewMode}
              aria-label="Режим Mermaid-блока"
              className="flex items-center gap-1"
              onValueChange={(value) => {
                if (isMermaidViewMode(value)) {
                  onViewModeChange?.(value)
                }
              }}
            >
              {mermaidViewModes.map(({ value, label, Icon }) => (
                <ToggleGroup.Item
                  key={value}
                  value={value}
                  aria-label={label}
                  title={label}
                  className={cn(
                    'flex h-7 items-center gap-1.5 rounded-md px-2',
                    'text-xs text-[var(--app-muted)] outline-none',
                    'transition-colors',
                    'hover:bg-white/[0.06] hover:text-[var(--app-text)]',
                    'focus-visible:ring-2 focus-visible:ring-violet-500/35',
                    'data-[state=on]:bg-violet-500/15',
                    'data-[state=on]:text-violet-200'
                  )}
                >
                  <Icon aria-hidden="true" className="size-3.5" />

                  <span className="max-[780px]:hidden">{label}</span>
                </ToggleGroup.Item>
              ))}
            </ToggleGroup.Root>

            <Tooltip content={copyLabel} side="top">
              <button
                type="button"
                aria-label={copyLabel}
                disabled={!source.trim()}
                className={cn(
                  'flex size-7 items-center justify-center rounded-md',
                  'text-[var(--app-muted)] outline-none',
                  'transition-colors',
                  'hover:bg-white/[0.06] hover:text-[var(--app-text)]',
                  'focus-visible:ring-2 focus-visible:ring-violet-500/35',
                  'disabled:cursor-not-allowed disabled:opacity-30',
                  copyState === 'copied' && 'text-emerald-300',
                  copyState === 'error' && 'text-red-300'
                )}
                onClick={() => {
                  void handleCopy()
                }}
              >
                {copyState === 'copied' ? (
                  <Check aria-hidden="true" className="size-4" />
                ) : (
                  <Copy aria-hidden="true" className="size-4" />
                )}
              </button>
            </Tooltip>

            <Tooltip content="Скачать SVG" side="top">
              <button
                type="button"
                aria-label="Скачать Mermaid как SVG"
                disabled={renderState.status !== 'success'}
                className={cn(
                  'flex size-7 items-center justify-center rounded-md',
                  'text-[var(--app-muted)] outline-none',
                  'transition-colors',
                  'hover:bg-white/[0.06] hover:text-[var(--app-text)]',
                  'focus-visible:ring-2 focus-visible:ring-violet-500/35',
                  'disabled:cursor-not-allowed disabled:opacity-30'
                )}
                onClick={() => {
                  if (renderState.status === 'success') {
                    downloadMermaidSvg(renderState.svg, renderState.diagramType)
                  }
                }}
              >
                <Download aria-hidden="true" className="size-4" />
              </button>
            </Tooltip>
          </div>
        </header>

        {activeViewMode === 'write' && (
          <MermaidSourceEditor id={editorId} source={source} onChange={onChange} />
        )}

        {activeViewMode === 'preview' && (
          <StudyMermaidPreview source={source} state={renderState} scale={scale} />
        )}

        {activeViewMode === 'split' && (
          <div className="grid min-h-80 grid-cols-2 divide-x divide-[var(--app-border)] max-[900px]:grid-cols-1 max-[900px]:divide-x-0 max-[900px]:divide-y">
            <div className="min-w-0">
              <MermaidPanelLabel>Mermaid</MermaidPanelLabel>

              <MermaidSourceEditor id={editorId} source={source} onChange={onChange} />
            </div>

            <div className="min-w-0">
              <MermaidPanelLabel>Диаграмма</MermaidPanelLabel>

              <StudyMermaidPreview source={source} state={renderState} scale={scale} />
            </div>
          </div>
        )}
      </section>
    </TooltipProvider>
  )
}

function MermaidSourceEditor({
  id,
  source,
  onChange
}: {
  id: string
  source: string
  onChange?: (source: string) => void
}): React.JSX.Element {
  return (
    <>
      <label htmlFor={id} className="sr-only">
        Исходный Mermaid-код
      </label>

      <div className="max-h-[40rem] overflow-auto">
        <Editor
          value={source}
          textareaId={id}
          insertSpaces
          tabSize={2}
          padding={16}
          placeholder={`flowchart LR
  A[Начало] --> B[Результат]`}
          className="study-mermaid-source"
          textareaClassName="study-mermaid-source__textarea"
          preClassName="study-mermaid-source__pre"
          highlight={highlightMermaid}
          style={{
            minHeight: '18rem',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '0.875rem',
            lineHeight: '1.65'
          }}
          onValueChange={(value) => {
            onChange?.(value)
          }}
        />
      </div>
    </>
  )
}

function StudyMermaidPreview({
  source,
  state,
  scale,
  framed = false
}: {
  source: string
  state: MermaidRenderState
  scale: number
  framed?: boolean
}): React.JSX.Element {
  const normalizedScale = clampMermaidScale(scale)

  return (
    <div
      data-framed={framed}
      aria-busy={state.status === 'loading'}
      className={cn(
        'study-mermaid-preview',
        framed && 'rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)]'
      )}
    >
      {!source.trim() && <p className="text-sm text-[var(--app-muted)]">Пустой Mermaid-блок</p>}

      {source.trim() && (state.status === 'idle' || state.status === 'loading') && (
        <div className="flex items-center gap-2 text-sm text-[var(--app-muted)]">
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          Построение диаграммы…
        </div>
      )}

      {state.status === 'error' && (
        <div
          role="alert"
          className="flex max-w-xl items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4 text-left"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-red-300" />

          <div className="min-w-0">
            <p className="text-sm font-medium text-red-200">Ошибка в диаграмме</p>

            <pre className="mt-1 max-h-44 overflow-auto font-mono text-xs leading-5 whitespace-pre-wrap text-red-300/80">
              {state.error}
            </pre>
          </div>
        </div>
      )}

      {state.status === 'success' && (
        <div className="study-mermaid-viewport">
          <div
            className="study-mermaid-svg"
            style={{
              width: `${normalizedScale}%`
            }}
            dangerouslySetInnerHTML={{
              __html: state.svg
            }}
          />
        </div>
      )}
    </div>
  )
}

function MermaidPanelLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="border-b border-[var(--app-border)] px-4 py-2 text-[10px] font-semibold tracking-[0.08em] text-[var(--app-muted)] uppercase">
      {children}
    </div>
  )
}

function useMermaidRender(source: string, theme: StudyMermaidTheme): MermaidRenderState {
  const [state, setState] = useState<MermaidRenderState>(emptyRenderState)

  useEffect(() => {
    if (!source.trim()) {
      return
    }

    let active = true

    const timer = window.setTimeout(() => {
      if (!active) {
        return
      }

      setState({
        status: 'loading',
        svg: null,
        diagramType: null,
        error: null
      })

      void renderStudyMermaid(source, theme)
        .then((result) => {
          if (!active) {
            return
          }

          setState({
            status: 'success',
            svg: result.svg,
            diagramType: result.diagramType,
            error: null
          })
        })
        .catch((reason: unknown) => {
          if (!active) {
            return
          }

          setState({
            status: 'error',
            svg: null,
            diagramType: null,
            error: getStudyMermaidErrorMessage(reason)
          })
        })
    }, 320)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [source, theme])

  return source.trim() ? state : emptyRenderState
}

function registerMermaidGrammar(): void {
  if (Prism.languages.mermaid) {
    return
  }

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

function highlightMermaid(value: string): string {
  return Prism.highlight(value, Prism.languages.mermaid, 'mermaid')
}

function isMermaidViewMode(value: string): value is StudyMermaidViewMode {
  return value === 'write' || value === 'split' || value === 'preview'
}

function clampMermaidScale(value: number): number {
  return Math.max(60, Math.min(180, value))
}

function downloadMermaidSvg(svg: string, diagramType: string): void {
  const blob = new Blob([svg], {
    type: 'image/svg+xml;charset=utf-8'
  })

  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')

  const safeType = diagramType
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()

  anchor.href = url
  anchor.download = `${safeType || 'mermaid'}-${Date.now()}.svg`

  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  window.setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 0)
}

async function writeClipboard(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement('textarea')

  textarea.value = value
  textarea.setAttribute('aria-hidden', 'true')

  Object.assign(textarea.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '1px',
    height: '1px',
    opacity: '0',
    pointerEvents: 'none'
  })

  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()

  const copied = document.execCommand('copy')

  textarea.remove()

  if (!copied) {
    throw new Error('Clipboard is unavailable')
  }
}
