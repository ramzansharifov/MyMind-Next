import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { Columns2, Download, Eye, PencilLine, Workflow } from 'lucide-react'
import Prism from 'prismjs'
import Editor from 'react-simple-code-editor'
import { useEffect, useId, useState } from 'react'

import type {
  StudyMermaidTheme,
  StudyMermaidViewMode
} from '../../../../../../shared/contracts/study'
import { cn } from '../../../../shared/lib/cn'
import { Tooltip } from '../../../../shared/ui/tooltip'
import { StudySourceBlockShell } from '../source/StudySourceBlockShell'
import {
  clampMermaidViewportScale,
  MERMAID_VIEWPORT_SCALE_STEP,
  MermaidViewportControls,
  StudyMermaidPreview,
  type MermaidRenderState,
  type MermaidViewportOffset
} from './MermaidViewport'
import { getStudyMermaidErrorMessage, renderStudyMermaid } from './mermaid-renderer'

interface StudyMermaidBlockProps {
  source: string
  mode: 'edit' | 'read'
  viewMode?: StudyMermaidViewMode
  theme?: StudyMermaidTheme
  scale?: number
  onChange?: (source: string) => void
  onViewModeChange?: (viewMode: StudyMermaidViewMode) => void
}

const emptyRenderState: MermaidRenderState = {
  status: 'idle',
  svg: null,
  diagramType: null,
  error: null
}

const mermaidViewModes = [
  { value: 'write', label: 'Код', Icon: PencilLine },
  { value: 'split', label: '2 окна', Icon: Columns2 },
  { value: 'preview', label: 'Просмотр', Icon: Eye }
] satisfies Array<{
  value: StudyMermaidViewMode
  label: string
  Icon: typeof PencilLine
}>

const headerButtonClassName = [
  'flex size-7 shrink-0 items-center justify-center rounded-md',
  'text-[var(--app-muted)] outline-none',
  'transition-colors',
  'hover:bg-white/[0.06] hover:text-[var(--app-text)]',
  'focus-visible:ring-2 focus-visible:ring-violet-500/35',
  'disabled:cursor-not-allowed disabled:opacity-30'
].join(' ')

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
  const [viewportScale, setViewportScale] = useState(() => clampMermaidViewportScale(scale))
  const [viewportOffset, setViewportOffset] = useState<MermaidViewportOffset>({ x: 0, y: 0 })

  useEffect(() => {
    setViewportScale(clampMermaidViewportScale(scale))
    setViewportOffset({ x: 0, y: 0 })
  }, [scale])

  const activeViewMode =
    mode === 'read' ? 'preview' : isMermaidViewMode(viewMode) ? viewMode : 'split'

  function adjustViewportScale(delta: number): void {
    setViewportScale((currentScale) => clampMermaidViewportScale(currentScale + delta))
  }

  function resetViewport(): void {
    setViewportScale(clampMermaidViewportScale(scale))
    setViewportOffset({ x: 0, y: 0 })
  }

  return (
    <StudySourceBlockShell
      source={source}
      copyDisabled={!source.trim()}
      copyLabel="Копировать Mermaid-код"
      copiedAnnouncement="Mermaid-код скопирован"
      copyErrorAnnouncement="Не удалось скопировать Mermaid-код"
      expandLabel="Развернуть Mermaid-блок"
      collapseLabel="Свернуть Mermaid-блок"
      dialogTitle="Mermaid-блок на весь экран"
      dialogDescription={
        mode === 'read'
          ? 'Полноэкранный просмотр Mermaid-диаграммы. Изменяйте масштаб, перетаскивайте диаграмму и нажмите Escape или кнопку сворачивания, чтобы вернуться к материалу.'
          : 'Полноэкранное редактирование и предпросмотр Mermaid-диаграммы. Изменяйте масштаб, перетаскивайте диаграмму и нажмите Escape или кнопку сворачивания, чтобы вернуться к материалу.'
      }
    >
      {({ fullscreen, actions }) => {
        const interactivePreview = fullscreen && activeViewMode !== 'write'

        return (
          <section
            data-study-mermaid-block
            data-mode={mode}
            data-fullscreen={fullscreen ? 'true' : 'false'}
            className={cn(
              'overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-code-surface)]',
              fullscreen && 'flex h-full min-h-0 flex-col rounded-2xl shadow-2xl shadow-black/40'
            )}
          >
            <header className="flex min-h-11 shrink-0 items-center justify-between gap-3 border-b border-[var(--app-border)] bg-white/[0.025] px-3">
              <div className="flex min-w-0 items-center gap-2">
                <Workflow aria-hidden="true" className="size-4 shrink-0 text-violet-300" />
                <span className="text-[11px] font-semibold tracking-[0.08em] text-[var(--app-muted)] uppercase">
                  Mermaid
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {mode === 'edit' && (
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
                )}

                {interactivePreview && (
                  <MermaidViewportControls
                    scale={viewportScale}
                    disabled={!source.trim() || renderState.status !== 'success'}
                    onZoomOut={() => {
                      adjustViewportScale(-MERMAID_VIEWPORT_SCALE_STEP)
                    }}
                    onZoomIn={() => {
                      adjustViewportScale(MERMAID_VIEWPORT_SCALE_STEP)
                    }}
                    onReset={resetViewport}
                  />
                )}

                <Tooltip content="Скачать SVG" side="top">
                  <button
                    type="button"
                    aria-label="Скачать Mermaid как SVG"
                    disabled={renderState.status !== 'success'}
                    className={headerButtonClassName}
                    onClick={() => {
                      if (renderState.status === 'success') {
                        downloadMermaidSvg(renderState.svg, renderState.diagramType)
                      }
                    }}
                  >
                    <Download aria-hidden="true" className="size-4" />
                  </button>
                </Tooltip>

                {actions}
              </div>
            </header>

            {activeViewMode === 'write' && (
              <MermaidSourceEditor
                id={`${editorId}-${fullscreen ? 'fullscreen' : 'inline'}`}
                source={source}
                fullscreen={fullscreen}
                onChange={onChange}
              />
            )}

            {activeViewMode === 'preview' && (
              <div
                className={cn(
                  mode === 'read' && !fullscreen && 'min-h-40',
                  fullscreen && 'min-h-0 flex-1 overflow-hidden'
                )}
              >
                <StudyMermaidPreview
                  source={source}
                  state={renderState}
                  scale={interactivePreview ? viewportScale : scale}
                  interactive={interactivePreview}
                  offset={interactivePreview ? viewportOffset : undefined}
                  onOffsetChange={setViewportOffset}
                  onScaleChange={setViewportScale}
                />
              </div>
            )}

            {activeViewMode === 'split' && (
              <div
                className={cn(
                  'grid grid-cols-2 divide-x divide-[var(--app-border)] max-[900px]:grid-cols-1 max-[900px]:divide-x-0 max-[900px]:divide-y',
                  fullscreen && 'min-h-0 flex-1 overflow-auto min-[901px]:overflow-hidden'
                )}
              >
                <div className={cn('min-w-0', fullscreen && 'flex min-h-0 flex-col')}>
                  <MermaidPanelLabel>Mermaid</MermaidPanelLabel>
                  <MermaidSourceEditor
                    id={`${editorId}-${fullscreen ? 'fullscreen' : 'inline'}`}
                    source={source}
                    fullscreen={fullscreen}
                    onChange={onChange}
                  />
                </div>

                <div className={cn('min-w-0', fullscreen && 'flex min-h-0 flex-col')}>
                  <MermaidPanelLabel>Диаграмма</MermaidPanelLabel>
                  <div className={cn(fullscreen && 'min-h-0 flex-1 overflow-hidden')}>
                    <StudyMermaidPreview
                      source={source}
                      state={renderState}
                      scale={interactivePreview ? viewportScale : scale}
                      interactive={interactivePreview}
                      offset={interactivePreview ? viewportOffset : undefined}
                      onOffsetChange={setViewportOffset}
                      onScaleChange={setViewportScale}
                    />
                  </div>
                </div>
              </div>
            )}
          </section>
        )
      }}
    </StudySourceBlockShell>
  )
}

function MermaidSourceEditor({
  id,
  source,
  fullscreen = false,
  onChange
}: {
  id: string
  source: string
  fullscreen?: boolean
  onChange?: (source: string) => void
}): React.JSX.Element {
  return (
    <>
      <label htmlFor={id} className="sr-only">
        Исходный Mermaid-код
      </label>

      <div className={cn(fullscreen ? 'min-h-0 flex-1 overflow-auto' : 'max-h-[40rem] overflow-auto')}>
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
            minHeight: fullscreen ? '100%' : '3.45rem',
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

function MermaidPanelLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="shrink-0 border-b border-[var(--app-border)] px-4 py-2 text-[10px] font-semibold tracking-[0.08em] text-[var(--app-muted)] uppercase">
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
