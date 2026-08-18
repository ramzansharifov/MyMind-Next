import Prism from 'prismjs'
import Editor from 'react-simple-code-editor'
import {
  AlertTriangle,
  Braces,
  Check,
  Copy,
  LoaderCircle,
  RefreshCw,
  Save,
  WandSparkles
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import type {
  StudyCodeApplyResult,
  StudyCodeChangeSummary,
  StudyCodeDiagnostic,
  StudyCodePreviewResult,
  StudyNode
} from '../../../../../../shared/contracts/study'
import { validateStudyCodeConstraints } from '../../../../../../shared/study-code-constraints'
import {
  formatStudyCodeSource,
  parseStudyCodeSafe,
  STUDY_CODE_MAX_SOURCE_LENGTH
} from '../../../../../../shared/study-code'
import '../../../../assets/study-code-editor.css'
import { cn } from '../../../../shared/lib/cn'
import { writeClipboard } from '../../../../shared/lib/write-clipboard'
import { AppDialog } from '../../../../shared/ui/AppDialog'
import { Tooltip } from '../../../../shared/ui/tooltip'
import { studyClient } from '../../api/study-client'
import { registerStudyDraftHandle } from '../../lib/study-draft-lifecycle'

interface StudyCodeWorkspaceProps {
  node: StudyNode
  onApplied: (result: StudyCodeApplyResult) => void | Promise<void>
  onDirtyChange?: (dirty: boolean) => void
}

type SaveState = 'loading' | 'saved' | 'dirty' | 'saving' | 'error'

const iconButtonClassName =
  'flex h-9 items-center gap-2 rounded-lg border border-[var(--app-border)] bg-white/[0.025] px-3 text-xs font-medium text-[var(--app-muted)] transition-colors outline-none hover:bg-white/[0.055] hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-violet-500/35 disabled:cursor-not-allowed disabled:opacity-40'

const STUDY_CODE_LIVE_PARSE_MAX_LENGTH = 300_000
const STUDY_CODE_HIGHLIGHT_MAX_LENGTH = 300_000

registerStudyCodeGrammar()

export function StudyCodeWorkspace({
  node,
  onApplied,
  onDirtyChange
}: StudyCodeWorkspaceProps): React.JSX.Element {
  const [source, setSource] = useState('')
  const [savedSource, setSavedSource] = useState('')
  const [revision, setRevision] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('loading')
  const [diagnostics, setDiagnostics] = useState<StudyCodeDiagnostic[]>([])
  const [pendingPreview, setPendingPreview] = useState<StudyCodePreviewResult | null>(null)
  const [reloadConfirmOpen, setReloadConfirmOpen] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const dirtyRef = useRef(false)
  const savingRef = useRef(false)

  const dirty = source !== savedSource
  dirtyRef.current = dirty

  useEffect(() => {
    onDirtyChange?.(dirty)
    setSaveState((current) => {
      if (current === 'loading' || current === 'saving' || current === 'error') return current
      const next = dirty ? 'dirty' : 'saved'
      return current === next ? current : next
    })
  }, [dirty, onDirtyChange])

  useEffect(() => {
    let active = true
    setSource('')
    setSavedSource('')
    setRevision(null)
    setSaveState('loading')
    setDiagnostics([])
    setPendingPreview(null)
    setReloadConfirmOpen(false)

    void studyClient
      .getCodeSnapshot({ nodeId: node.id })
      .then((snapshot) => {
        if (!active) return
        setSource(snapshot.source)
        setSavedSource(snapshot.source)
        setRevision(snapshot.revision)
        setSaveState('saved')
      })
      .catch((reason: unknown) => {
        if (!active) return
        setSaveState('error')
        setDiagnostics([
          {
            severity: 'error',
            line: 1,
            column: 1,
            message: reason instanceof Error ? reason.message : 'Не удалось открыть режим «Код»'
          }
        ])
      })

    return () => {
      active = false
      onDirtyChange?.(false)
    }
  }, [node.id, onDirtyChange])

  useEffect(() => {
    if (!revision) return undefined

    return registerStudyDraftHandle({
      materialId: node.id,
      hasUnsavedChanges: () => dirtyRef.current,
      flush: async () => {
        if (dirtyRef.current) {
          throw new Error(
            'В режиме «Код» есть несохранённые изменения. Сохраните их или отмените перед переходом.'
          )
        }
      },
      suspendForDeletion: () => ({
        commit: () => undefined,
        rollback: () => Promise.resolve()
      })
    })
  }, [node.id, revision])

  const liveDiagnostic = useMemo<StudyCodeDiagnostic | null>(() => {
    if (!source) return null

    if (source.length > STUDY_CODE_MAX_SOURCE_LENGTH) {
      return {
        severity: 'error',
        line: 1,
        column: 1,
        message: 'Код превышает допустимый размер'
      }
    }

    // Full parsing on every keystroke is useful for regular documents but too expensive for huge folders.
    // Large sources still receive the same parser and semantic validation when the user saves them.
    if (source.length > STUDY_CODE_LIVE_PARSE_MAX_LENGTH) return null

    const parsed = parseStudyCodeSafe(source)
    if (!parsed.success) return { severity: 'error', ...parsed.diagnostic }

    const constraint = validateStudyCodeConstraints(source)[0]
    return constraint ? { severity: 'error', ...constraint } : null
  }, [source])

  const visibleDiagnostics = liveDiagnostic ? [liveDiagnostic] : diagnostics
  const lineNumberText = useMemo(() => createLineNumberText(source), [source])

  async function reloadSnapshot(): Promise<void> {
    try {
      setSaveState('loading')
      setDiagnostics([])
      const snapshot = await studyClient.getCodeSnapshot({ nodeId: node.id })
      setSource(snapshot.source)
      setSavedSource(snapshot.source)
      setRevision(snapshot.revision)
      setSaveState('saved')
      setReloadConfirmOpen(false)
    } catch (reason: unknown) {
      setSaveState('error')
      setDiagnostics([toDiagnostic(reason, 'Не удалось обновить код')])
    }
  }

  async function requestSave(): Promise<void> {
    if (!revision || savingRef.current || !dirty) return
    if (liveDiagnostic) {
      setDiagnostics([liveDiagnostic])
      setSaveState('error')
      return
    }

    savingRef.current = true
    setSaveState('saving')
    setDiagnostics([])

    try {
      const preview = await studyClient.previewCode({
        nodeId: node.id,
        source,
        baseRevision: revision
      })

      if (!preview.valid) {
        setDiagnostics(preview.diagnostics)
        setSaveState('error')
        return
      }

      if (preview.destructive) {
        setPendingPreview(preview)
        setSaveState('dirty')
        return
      }

      await applyPreview(false)
    } catch (reason: unknown) {
      setDiagnostics([toDiagnostic(reason, 'Не удалось проверить изменения')])
      setSaveState('error')
    } finally {
      savingRef.current = false
    }
  }

  async function applyPreview(confirmDestructive: boolean): Promise<void> {
    if (!revision) return

    savingRef.current = true
    setSaveState('saving')
    setDiagnostics([])

    try {
      const result = await studyClient.applyCode({
        nodeId: node.id,
        source,
        baseRevision: revision,
        confirmDestructive
      })

      setSource(result.source)
      setSavedSource(result.source)
      setRevision(result.revision)
      setPendingPreview(null)
      setSaveState('saved')
      await onApplied(result)
    } catch (reason: unknown) {
      setDiagnostics([toDiagnostic(reason, 'Не удалось применить изменения')])
      setPendingPreview(null)
      setSaveState('error')
    } finally {
      savingRef.current = false
    }
  }

  function formatCode(): void {
    try {
      const formatted = formatStudyCodeSource(source)
      setSource(formatted)
      setDiagnostics([])
      setSaveState(formatted === savedSource ? 'saved' : 'dirty')
    } catch (reason: unknown) {
      setDiagnostics([toDiagnostic(reason, 'Не удалось форматировать код')])
      setSaveState('error')
    }
  }

  async function copyCode(): Promise<void> {
    try {
      await writeClipboard(source)
      setCopyFeedback(true)
      window.setTimeout(() => setCopyFeedback(false), 1300)
    } catch (reason: unknown) {
      setDiagnostics([toDiagnostic(reason, 'Не удалось скопировать код')])
    }
  }

  function handleEditorKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault()
      void requestSave()
      return
    }

    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'f') {
      event.preventDefault()
      formatCode()
    }
  }

  return (
    <section
      className="flex h-full min-h-0 flex-col bg-[var(--app-workspace)]"
      data-study-code-workspace
    >
      <header className="flex min-h-14 shrink-0 items-center gap-3 border-b border-[var(--app-border)] px-5 max-[720px]:px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Braces aria-hidden="true" className="size-4 shrink-0 text-violet-300" />
          <span className="truncate text-sm font-medium text-[var(--app-text)]">{node.title}</span>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <Tooltip content="Обновить из текущих данных" side="bottom">
            <button
              type="button"
              aria-label="Обновить код"
              className={iconButtonClassName}
              disabled={saveState === 'loading' || saveState === 'saving'}
              onClick={() => {
                if (dirty) setReloadConfirmOpen(true)
                else void reloadSnapshot()
              }}
            >
              <RefreshCw aria-hidden="true" className="size-3.5" />
              <span className="max-[880px]:hidden">Обновить</span>
            </button>
          </Tooltip>

          <Tooltip content="Форматировать (Ctrl+Shift+F)" side="bottom">
            <button
              type="button"
              className={iconButtonClassName}
              disabled={!source || saveState === 'loading' || saveState === 'saving'}
              onClick={formatCode}
            >
              <WandSparkles aria-hidden="true" className="size-3.5" />
              <span className="max-[880px]:hidden">Форматировать</span>
            </button>
          </Tooltip>

          <Tooltip content="Копировать DSL" side="bottom">
            <button
              type="button"
              className={iconButtonClassName}
              disabled={!source}
              onClick={() => void copyCode()}
            >
              {copyFeedback ? (
                <Check aria-hidden="true" className="size-3.5 text-emerald-300" />
              ) : (
                <Copy aria-hidden="true" className="size-3.5" />
              )}
              <span className="max-[880px]:hidden">
                {copyFeedback ? 'Скопировано' : 'Копировать'}
              </span>
            </button>
          </Tooltip>

          <button
            type="button"
            className="flex h-9 items-center gap-2 rounded-lg bg-violet-500/16 px-3 text-xs font-semibold text-violet-200 transition-colors outline-none hover:bg-violet-500/24 focus-visible:ring-2 focus-visible:ring-violet-500/45 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={
              !dirty ||
              Boolean(liveDiagnostic) ||
              saveState === 'loading' ||
              saveState === 'saving'
            }
            onClick={() => void requestSave()}
          >
            {saveState === 'saving' ? (
              <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
            ) : (
              <Save aria-hidden="true" className="size-3.5" />
            )}
            Сохранить
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden p-4 max-[720px]:p-2">
        <div
          data-study-code-editor-scroll
          className="h-full min-h-0 overflow-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-code-surface)]"
          onKeyDown={handleEditorKeyDown}
        >
          <div data-study-code-editor-scroll-content>
            <pre aria-hidden="true" data-study-code-line-numbers>
              {lineNumberText}
            </pre>

            <Editor
              value={source}
              aria-label={`DSL-код ${node.type === 'folder' ? 'папки' : 'материала'} «${node.title}»`}
              insertSpaces
              tabSize={2}
              padding={16}
              readOnly={saveState === 'loading' || saveState === 'saving'}
              className="study-code-editor__root font-mono text-sm"
              textareaClassName="study-code-editor__textarea outline-none"
              preClassName="study-code-editor__highlight"
              highlight={highlightStudyCodeSource}
              style={{
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: '0.875rem',
                lineHeight: '1.65rem'
              }}
              onValueChange={(value) => {
                setSource(value)
                setDiagnostics([])
                setSaveState((current) => {
                  if (current !== 'error') return current
                  return value === savedSource ? 'saved' : 'dirty'
                })
              }}
            />
          </div>
        </div>
      </div>

      <footer className="flex min-h-11 shrink-0 items-center gap-3 border-t border-[var(--app-border)] px-5 text-xs max-[720px]:px-3">
        <CodeSaveState state={saveState} dirty={dirty} />
        {visibleDiagnostics[0] && (
          <div role="alert" className="ml-auto flex min-w-0 items-center gap-2 text-red-300">
            <AlertTriangle aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate" title={visibleDiagnostics[0].message}>
              Строка {visibleDiagnostics[0].line}:{visibleDiagnostics[0].column} —{' '}
              {visibleDiagnostics[0].message}
            </span>
          </div>
        )}
      </footer>

      <AppDialog
        open={pendingPreview !== null}
        onOpenChange={(open) => {
          if (!open && saveState !== 'saving') setPendingPreview(null)
        }}
        title="Применить удаления?"
        description="DSL содержит изменения, удаляющие существующие данные."
        icon={<AlertTriangle aria-hidden="true" />}
        tone="warning"
        busy={saveState === 'saving'}
        footer={
          <>
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-sm text-[var(--app-muted)] hover:bg-white/[0.04]"
              disabled={saveState === 'saving'}
              onClick={() => setPendingPreview(null)}
            >
              Отмена
            </button>
            <button
              type="button"
              className="rounded-lg bg-amber-500/15 px-3 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/20"
              disabled={saveState === 'saving'}
              onClick={() => void applyPreview(true)}
            >
              Применить изменения
            </button>
          </>
        }
      >
        {pendingPreview && <ChangeSummary summary={pendingPreview.summary} />}
      </AppDialog>

      <AppDialog
        open={reloadConfirmOpen}
        onOpenChange={setReloadConfirmOpen}
        title="Отменить изменения кода?"
        description="Текущий локальный DSL будет заменён актуальными данными MyMind."
        footer={
          <>
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-sm text-[var(--app-muted)] hover:bg-white/[0.04]"
              onClick={() => setReloadConfirmOpen(false)}
            >
              Остаться
            </button>
            <button
              type="button"
              className="rounded-lg bg-violet-500/15 px-3 py-2 text-sm font-medium text-violet-200 hover:bg-violet-500/20"
              onClick={() => void reloadSnapshot()}
            >
              Обновить код
            </button>
          </>
        }
      >
        <p className="text-sm text-[var(--app-muted)]">
          Несохранённые изменения DSL будут потеряны.
        </p>
      </AppDialog>
    </section>
  )
}

function CodeSaveState({ state, dirty }: { state: SaveState; dirty: boolean }): React.JSX.Element {
  if (state === 'loading') {
    return (
      <span className="flex items-center gap-2 text-[var(--app-muted)]">
        <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
        Загрузка
      </span>
    )
  }

  if (state === 'saving') {
    return (
      <span className="flex items-center gap-2 text-[var(--app-muted)]">
        <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
        Сохранение
      </span>
    )
  }

  if (state === 'error') return <span className="text-red-300">Нужно исправить</span>
  if (dirty || state === 'dirty') return <span className="text-amber-300">Есть изменения</span>

  return (
    <span className="flex items-center gap-1.5 text-emerald-300">
      <Check aria-hidden="true" className="size-3.5" />
      Сохранено
    </span>
  )
}

function ChangeSummary({ summary }: { summary: StudyCodeChangeSummary }): React.JSX.Element {
  const items = [
    ['Создано папок', summary.createdFolders],
    ['Создано материалов', summary.createdMaterials],
    ['Переименовано элементов', summary.renamedNodes],
    ['Перемещено / переупорядочено', summary.movedNodes],
    ['Создано блоков', summary.createdBlocks],
    ['Изменено блоков', summary.updatedBlocks],
    ['Удалено блоков', summary.deletedBlocks],
    ['Удалено материалов', summary.deletedMaterials],
    ['Удалено папок', summary.deletedFolders]
  ].filter(([, value]) => Number(value) > 0)

  return (
    <div className="grid gap-2">
      {items.map(([label, value]) => (
        <div
          key={String(label)}
          className="flex items-center justify-between rounded-lg border border-[var(--app-border)] px-3 py-2 text-sm"
        >
          <span className="text-[var(--app-muted)]">{label}</span>
          <span
            className={cn(
              'font-medium',
              String(label).startsWith('Удалено') && 'text-amber-300'
            )}
          >
            {value}
          </span>
        </div>
      ))}
    </div>
  )
}

function createLineNumberText(source: string): string {
  let lineCount = 1
  for (let index = 0; index < source.length; index += 1) {
    if (source.charCodeAt(index) === 10) lineCount += 1
  }

  const numbers = new Array<string>(lineCount)
  for (let index = 0; index < lineCount; index += 1) numbers[index] = String(index + 1)
  return numbers.join('\n')
}

function highlightStudyCodeSource(value: string): string {
  if (value.length > STUDY_CODE_HIGHLIGHT_MAX_LENGTH) return escapeHighlightHtml(value)
  return Prism.highlight(value, Prism.languages.mymindStudyDsl, 'mymind-study-dsl')
}

function escapeHighlightHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function toDiagnostic(reason: unknown, fallback: string): StudyCodeDiagnostic {
  if (
    reason &&
    typeof reason === 'object' &&
    'line' in reason &&
    'column' in reason &&
    typeof reason.line === 'number' &&
    typeof reason.column === 'number'
  ) {
    return {
      severity: 'error',
      line: reason.line,
      column: reason.column,
      message: reason instanceof Error ? reason.message : fallback
    }
  }

  return {
    severity: 'error',
    line: 1,
    column: 1,
    message: reason instanceof Error ? reason.message : fallback
  }
}

function registerStudyCodeGrammar(): void {
  if (Prism.languages.mymindStudyDsl) return

  Prism.languages.mymindStudyDsl = {
    comment: /\/\/.*$/m,
    annotation: {
      pattern: /@(id|version)\s*\([^)]*\)/,
      alias: 'comment'
    },
    keyword:
      /\b(?:folder|material|text|heading|code|markdown|latex|mermaid|image|video|audio|file|divider|board|html)\b/,
    property: /\b[A-Za-z_][A-Za-z0-9_-]*(?=\s*=)/,
    boolean: /\b(?:true|false)\b/,
    number: /\b\d+(?:\.\d+)?\b/,
    string: {
      pattern: /"(?:\\.|[^"\\\r\n])*"/,
      greedy: true
    },
    punctuation: /[{}()=]/
  }
}
