import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { CircleAlert, Columns2, Eye, PencilLine, Sigma } from 'lucide-react'
import Prism from 'prismjs'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-latex'
import Editor from 'react-simple-code-editor'
import { useId, useMemo } from 'react'
import 'katex/dist/katex.min.css'

import type {
  StudyLatexAlignment,
  StudyLatexDisplayMode,
  StudyLatexViewMode
} from '../../../../../../shared/contracts/study'
import { cn } from '../../../../shared/lib/cn'
import { StudySourceBlockShell } from '../source/StudySourceBlockShell'
import { renderStudyLatex } from './latex-renderer'

interface StudyLatexBlockProps {
  source: string
  mode: 'edit' | 'read'
  viewMode?: StudyLatexViewMode
  displayMode?: StudyLatexDisplayMode
  alignment?: StudyLatexAlignment
  scale?: number
  onChange?: (source: string) => void
  onViewModeChange?: (viewMode: StudyLatexViewMode) => void
}

const latexViewModes = [
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
  value: StudyLatexViewMode
  label: string
  Icon: typeof PencilLine
}>

export function StudyLatexBlock({
  source,
  mode,
  viewMode = 'split',
  displayMode = 'display',
  alignment = 'center',
  scale = 100,
  onChange,
  onViewModeChange
}: StudyLatexBlockProps): React.JSX.Element {
  const editorId = useId()

  if (mode === 'read') {
    return (
      <StudyLatexPreview
        source={source}
        displayMode={displayMode}
        alignment={alignment}
        scale={scale}
        framed
      />
    )
  }

  const activeViewMode = isLatexViewMode(viewMode) ? viewMode : 'split'

  return (
    <StudySourceBlockShell
      source={source}
      copyLabel="Копировать LaTeX"
      copiedAnnouncement="LaTeX скопирован"
      copyErrorAnnouncement="Не удалось скопировать LaTeX"
      expandLabel="Развернуть LaTeX-блок"
      collapseLabel="Свернуть LaTeX-блок"
      dialogTitle="LaTeX-блок на весь экран"
      dialogDescription="Полноэкранное редактирование и предпросмотр LaTeX. Нажмите Escape или кнопку сворачивания, чтобы вернуться к материалу."
    >
      {({ fullscreen, actions }) => (
        <section
          data-study-latex-block
          data-fullscreen={fullscreen ? 'true' : 'false'}
          className={cn(
            'overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-code-surface)]',
            fullscreen && 'flex h-full min-h-0 flex-col rounded-2xl shadow-2xl shadow-black/40'
          )}
        >
          <header className="flex min-h-11 shrink-0 items-center justify-between gap-3 border-b border-[var(--app-border)] bg-white/[0.025] px-3">
            <div className="flex min-w-0 items-center gap-2">
              <Sigma aria-hidden="true" className="size-4 shrink-0 text-violet-300" />
              <span className="text-[11px] font-semibold tracking-[0.08em] text-[var(--app-muted)] uppercase">
                LaTeX
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <ToggleGroup.Root
                type="single"
                value={activeViewMode}
                aria-label="Режим LaTeX-блока"
                className="flex items-center gap-1"
                onValueChange={(value) => {
                  if (isLatexViewMode(value)) {
                    onViewModeChange?.(value)
                  }
                }}
              >
                {latexViewModes.map(({ value, label, Icon }) => (
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

              {actions}
            </div>
          </header>

          {activeViewMode === 'write' && (
            <LatexSourceEditor
              id={`${editorId}-${fullscreen ? 'fullscreen' : 'inline'}`}
              source={source}
              fullscreen={fullscreen}
              onChange={onChange}
            />
          )}

          {activeViewMode === 'preview' && (
            <div className={cn(fullscreen && 'min-h-0 flex-1 overflow-auto')}>
              <StudyLatexPreview
                source={source}
                displayMode={displayMode}
                alignment={alignment}
                scale={scale}
              />
            </div>
          )}

          {activeViewMode === 'split' && (
            <div
              className={cn(
                'grid grid-cols-2 divide-x divide-[var(--app-border)] max-[900px]:grid-cols-1 max-[900px]:divide-x-0 max-[900px]:divide-y',
                fullscreen && 'min-h-0 flex-1 overflow-hidden'
              )}
            >
              <div className={cn('min-w-0', fullscreen && 'flex min-h-0 flex-col')}>
                <LatexPanelLabel>LaTeX</LatexPanelLabel>
                <LatexSourceEditor
                  id={`${editorId}-${fullscreen ? 'fullscreen' : 'inline'}`}
                  source={source}
                  fullscreen={fullscreen}
                  onChange={onChange}
                />
              </div>

              <div className={cn('min-w-0', fullscreen && 'flex min-h-0 flex-col')}>
                <LatexPanelLabel>Формула</LatexPanelLabel>
                <div className={cn(fullscreen && 'min-h-0 flex-1 overflow-auto')}>
                  <StudyLatexPreview
                    source={source}
                    displayMode={displayMode}
                    alignment={alignment}
                    scale={scale}
                  />
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </StudySourceBlockShell>
  )
}

function LatexSourceEditor({
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
        Исходный LaTeX
      </label>

      <div className={cn(fullscreen ? 'min-h-0 flex-1 overflow-auto' : 'max-h-[36rem] overflow-auto')}>
        <Editor
          value={source}
          textareaId={id}
          insertSpaces
          tabSize={2}
          padding={16}
          placeholder={String.raw`\frac{-b \pm \sqrt{b^2 - 4ac}}{2a}`}
          className="study-latex-source"
          textareaClassName="study-latex-source__textarea"
          preClassName="study-latex-source__pre"
          highlight={highlightLatex}
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

function StudyLatexPreview({
  source,
  displayMode,
  alignment,
  scale,
  framed = false
}: {
  source: string
  displayMode: StudyLatexDisplayMode
  alignment: StudyLatexAlignment
  scale: number
  framed?: boolean
}): React.JSX.Element {
  const result = useMemo(() => renderStudyLatex(source, displayMode), [source, displayMode])
  const normalizedScale = clampLatexScale(scale)

  return (
    <div
      data-alignment={alignment}
      data-framed={framed}
      className={cn(
        'study-latex-preview',
        framed && 'rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)]'
      )}
    >
      {!source.trim() && <p className="text-sm text-[var(--app-muted)]">Пустой LaTeX-блок</p>}

      {result.error && (
        <div
          role="alert"
          className="flex max-w-full items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4 text-left"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-red-300" />

          <div className="min-w-0">
            <p className="text-sm font-medium text-red-200">Ошибка в формуле</p>
            <p className="mt-1 font-mono text-xs leading-5 break-words text-red-300/80">
              {result.error}
            </p>
          </div>
        </div>
      )}

      {result.html && (
        <div
          className="study-latex-render"
          style={{
            fontSize: `${normalizedScale / 100}rem`
          }}
          dangerouslySetInnerHTML={{
            __html: result.html
          }}
        />
      )}
    </div>
  )
}

function LatexPanelLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="shrink-0 border-b border-[var(--app-border)] px-4 py-2 text-[10px] font-semibold tracking-[0.08em] text-[var(--app-muted)] uppercase">
      {children}
    </div>
  )
}

function highlightLatex(value: string): string {
  const grammar = Prism.languages.latex

  if (!grammar) {
    return escapeHtml(value)
  }

  return Prism.highlight(value, grammar, 'latex')
}

function isLatexViewMode(value: string): value is StudyLatexViewMode {
  return value === 'write' || value === 'split' || value === 'preview'
}

function clampLatexScale(value: number): number {
  return Math.max(70, Math.min(180, value))
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
