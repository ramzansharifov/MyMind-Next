import { ChevronDown, ChevronRight, ChevronUp, Replace, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '../../../../shared/lib/cn'
import { Tooltip } from '../../../../shared/ui/tooltip'
import {
  findStudyCodeMatches,
  getStudyCodeMatchSegments,
  getStudyCodeSourcePosition,
  replaceAllStudyCodeMatches,
  replaceStudyCodeMatch,
  type StudyCodeFindOptions
} from './study-code-find'

interface StudyCodeFindReplaceProps {
  source: string
  disabled?: boolean
  editorScrollRef: RefObject<HTMLDivElement | null>
  onSourceChange: (value: string) => void
}

const optionButtonClassName =
  'flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-[11px] font-semibold text-[var(--app-muted)] transition-colors outline-none hover:bg-white/[0.06] hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-accent-500/35'

const smallButtonClassName =
  'flex h-7 items-center justify-center rounded-md px-2 text-[11px] font-medium text-[var(--app-muted)] transition-colors outline-none hover:bg-white/[0.06] hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-accent-500/35 disabled:cursor-not-allowed disabled:opacity-35'

const headerButtonClassName =
  'order-[-1] flex h-9 items-center gap-2 rounded-lg border border-[var(--app-border)] bg-white/[0.025] px-3 text-xs font-medium text-[var(--app-muted)] transition-colors outline-none hover:bg-white/[0.055] hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-accent-500/35 disabled:cursor-not-allowed disabled:opacity-40'

export function StudyCodeFindReplace({
  source,
  disabled = false,
  editorScrollRef,
  onSourceChange
}: StudyCodeFindReplaceProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [replaceOpen, setReplaceOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const [matchCase, setMatchCase] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [activeMatchIndex, setActiveMatchIndex] = useState(-1)
  const [highlightHost, setHighlightHost] = useState<HTMLElement | null>(null)
  const [toolbarHost, setToolbarHost] = useState<HTMLElement | null>(null)
  const findInputRef = useRef<HTMLInputElement>(null)

  const options = useMemo<StudyCodeFindOptions>(
    () => ({ matchCase, wholeWord, useRegex }),
    [matchCase, wholeWord, useRegex]
  )
  const result = useMemo(
    () => findStudyCodeMatches(source, query, options),
    [source, query, options]
  )
  const activeMatch = activeMatchIndex >= 0 ? result.matches[activeMatchIndex] : undefined
  const activeSegments = useMemo(
    () => (activeMatch ? getStudyCodeMatchSegments(source, activeMatch) : []),
    [activeMatch, source]
  )

  function getEditorTextarea(): HTMLTextAreaElement | null {
    return editorScrollRef.current?.querySelector('textarea') ?? null
  }

  function focusFindInput(): void {
    window.setTimeout(() => {
      findInputRef.current?.focus()
      findInputRef.current?.select()
    }, 0)
  }

  function openFind(showReplace = false): void {
    const textarea = getEditorTextarea()
    const selected = textarea
      ? textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)
      : ''

    if (selected && selected.length <= 500 && !selected.includes('\n')) {
      setQuery(selected)
    }

    setOpen(true)
    setReplaceOpen(showReplace)
    focusFindInput()
  }

  function closeFind(): void {
    setOpen(false)
    window.setTimeout(() => getEditorTextarea()?.focus({ preventScroll: true }), 0)
  }

  useEffect(() => {
    const workspace = editorScrollRef.current?.closest('[data-study-code-workspace]')
    setToolbarHost(workspace?.querySelector<HTMLElement>('header > div:last-child') ?? null)
  }, [editorScrollRef])

  useEffect(() => {
    if (!open) {
      setHighlightHost(null)
      return
    }

    setHighlightHost(
      editorScrollRef.current?.querySelector<HTMLElement>(
        '[data-study-code-editor-scroll-content]'
      ) ?? null
    )
  }, [editorScrollRef, open])

  useEffect(() => {
    const workspace = editorScrollRef.current?.closest('[data-study-code-workspace]')
    if (!workspace) return undefined

    const handleKeyDown = (event: Event): void => {
      if (!(event instanceof KeyboardEvent)) return
      const key = event.key.toLowerCase()
      const command = event.ctrlKey || event.metaKey

      if (command && key === 'f' && !event.shiftKey) {
        event.preventDefault()
        event.stopPropagation()
        openFind(false)
        return
      }

      if (command && key === 'h' && !event.shiftKey) {
        event.preventDefault()
        event.stopPropagation()
        openFind(true)
        return
      }

      if (open && event.key === 'F3') {
        event.preventDefault()
        event.stopPropagation()
        moveMatch(event.shiftKey ? -1 : 1)
        return
      }

      if (open && event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        closeFind()
      }
    }

    workspace.addEventListener('keydown', handleKeyDown)
    return () => workspace.removeEventListener('keydown', handleKeyDown)
  })

  useEffect(() => {
    setActiveMatchIndex(result.matches.length > 0 ? 0 : -1)
  }, [query, matchCase, wholeWord, useRegex])

  useEffect(() => {
    setActiveMatchIndex((current) => {
      if (result.matches.length === 0) return -1
      if (current < 0) return 0
      return Math.min(current, result.matches.length - 1)
    })
  }, [source, result.matches.length])

  useEffect(() => {
    if (!open || !activeMatch) return
    revealMatch(activeMatch.start, activeMatch.end, source, editorScrollRef)
  }, [activeMatch, editorScrollRef, open, source])

  function moveMatch(direction: 1 | -1): void {
    if (result.matches.length === 0) return

    setActiveMatchIndex((current) => {
      if (current < 0) return direction === 1 ? 0 : result.matches.length - 1
      return (current + direction + result.matches.length) % result.matches.length
    })
  }

  function replaceCurrent(): void {
    if (disabled || !activeMatch) return

    const replaced = replaceStudyCodeMatch(source, query, replacement, activeMatch, options)
    if (!replaced.replaced || replaced.error) return

    const oldLength = activeMatch.end - activeMatch.start
    const insertedLength = replaced.source.length - (source.length - oldLength)
    const nextResult = findStudyCodeMatches(replaced.source, query, options)
    const nextIndex = nextResult.matches.findIndex(
      (match) => match.start >= activeMatch.start + insertedLength
    )

    onSourceChange(replaced.source)
    setActiveMatchIndex(nextResult.matches.length === 0 ? -1 : nextIndex >= 0 ? nextIndex : 0)
  }

  function replaceAll(): void {
    if (disabled || !query || result.error) return
    const replaced = replaceAllStudyCodeMatches(source, query, replacement, options)
    if (replaced.error || replaced.replacements === 0) return
    onSourceChange(replaced.source)
    setActiveMatchIndex(-1)
  }

  function handleFindKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key !== 'Enter') return
    event.preventDefault()
    moveMatch(event.shiftKey ? -1 : 1)
  }

  function handleReplaceKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key !== 'Enter') return
    event.preventDefault()
    replaceCurrent()
  }

  const resultLabel = getResultLabel(
    query,
    result.error,
    result.matches.length,
    activeMatchIndex,
    result.truncated
  )

  return (
    <>
      {toolbarHost &&
        createPortal(
          <>
            <Tooltip content="Найти в коде (Ctrl+F)" side="bottom">
              <button
                type="button"
                aria-label="Найти в коде"
                className={headerButtonClassName}
                disabled={!source || disabled}
                onClick={() => openFind(false)}
              >
                <Search aria-hidden="true" className="size-3.5" />
                <span className="max-[1040px]:hidden">Найти</span>
              </button>
            </Tooltip>

            <Tooltip content="Найти и заменить (Ctrl+H)" side="bottom">
              <button
                type="button"
                aria-label="Найти и заменить в коде"
                className={headerButtonClassName}
                disabled={!source || disabled}
                onClick={() => openFind(true)}
              >
                <Replace aria-hidden="true" className="size-3.5" />
                <span className="max-[1040px]:hidden">Заменить</span>
              </button>
            </Tooltip>
          </>,
          toolbarHost
        )}

      {open && (
        <>
          <div
            data-study-code-find-widget
            className="absolute top-6 right-6 z-30 w-[min(640px,calc(100%_-_3rem))] rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-2 shadow-2xl shadow-black/35 max-[720px]:top-4 max-[720px]:right-4 max-[720px]:w-[calc(100%_-_2rem)]"
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <Tooltip content={replaceOpen ? 'Скрыть замену' : 'Показать замену'} side="top">
                <button
                  type="button"
                  className={smallButtonClassName}
                  aria-label={replaceOpen ? 'Скрыть замену' : 'Показать замену'}
                  onClick={() => setReplaceOpen((current) => !current)}
                >
                  {replaceOpen ? (
                    <ChevronDown aria-hidden="true" className="size-3.5" />
                  ) : (
                    <ChevronRight aria-hidden="true" className="size-3.5" />
                  )}
                </button>
              </Tooltip>

              <div
                className={cn(
                  'flex min-w-0 flex-1 items-center rounded-lg border bg-black/10 focus-within:ring-2',
                  result.error
                    ? 'border-red-500/55 focus-within:ring-red-500/20'
                    : 'focus-within:border-accent-400/45 focus-within:ring-accent-500/15 border-[var(--app-border)]'
                )}
              >
                <Search
                  aria-hidden="true"
                  className="ml-2.5 size-3.5 shrink-0 text-[var(--app-muted)]"
                />
                <input
                  ref={findInputRef}
                  value={query}
                  aria-label="Найти в коде"
                  placeholder="Найти"
                  spellCheck={false}
                  className="h-8 min-w-0 flex-1 bg-transparent px-2 text-xs text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60"
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={handleFindKeyDown}
                />

                <Tooltip content="Учитывать регистр" side="top">
                  <button
                    type="button"
                    aria-label="Учитывать регистр"
                    aria-pressed={matchCase}
                    className={cn(
                      optionButtonClassName,
                      matchCase && 'bg-accent-500/16 text-accent-200'
                    )}
                    onClick={() => setMatchCase((current) => !current)}
                  >
                    Aa
                  </button>
                </Tooltip>
                <Tooltip content="Только целые слова" side="top">
                  <button
                    type="button"
                    aria-label="Только целые слова"
                    aria-pressed={wholeWord}
                    className={cn(
                      optionButtonClassName,
                      wholeWord && 'bg-accent-500/16 text-accent-200'
                    )}
                    onClick={() => setWholeWord((current) => !current)}
                  >
                    ab
                  </button>
                </Tooltip>
                <Tooltip content="Регулярное выражение" side="top">
                  <button
                    type="button"
                    aria-label="Регулярное выражение"
                    aria-pressed={useRegex}
                    className={cn(
                      optionButtonClassName,
                      useRegex && 'bg-accent-500/16 text-accent-200'
                    )}
                    onClick={() => setUseRegex((current) => !current)}
                  >
                    .*
                  </button>
                </Tooltip>
              </div>

              {result.error ? (
                <Tooltip content={result.error} side="top">
                  <span
                    aria-live="polite"
                    tabIndex={0}
                    className={cn('w-[84px] shrink-0 text-center text-[11px]', 'text-red-300')}
                  >
                    {resultLabel}
                  </span>
                </Tooltip>
              ) : (
                <span
                  aria-live="polite"
                  className="w-[84px] shrink-0 text-center text-[11px] text-[var(--app-muted)]"
                >
                  {resultLabel}
                </span>
              )}

              <Tooltip content="Предыдущее совпадение" side="top">
                <button
                  type="button"
                  aria-label="Предыдущее совпадение"
                  className={smallButtonClassName}
                  disabled={result.matches.length === 0}
                  onClick={() => moveMatch(-1)}
                >
                  <ChevronUp aria-hidden="true" className="size-3.5" />
                </button>
              </Tooltip>
              <Tooltip content="Следующее совпадение" side="top">
                <button
                  type="button"
                  aria-label="Следующее совпадение"
                  className={smallButtonClassName}
                  disabled={result.matches.length === 0}
                  onClick={() => moveMatch(1)}
                >
                  <ChevronDown aria-hidden="true" className="size-3.5" />
                </button>
              </Tooltip>
              <Tooltip content="Закрыть поиск" side="top">
                <button
                  type="button"
                  aria-label="Закрыть поиск"
                  className={smallButtonClassName}
                  onClick={closeFind}
                >
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              </Tooltip>
            </div>

            {replaceOpen && (
              <div className="mt-1.5 flex min-w-0 items-center gap-1.5 pl-[34px]">
                <input
                  value={replacement}
                  aria-label="Заменить на"
                  placeholder="Заменить"
                  spellCheck={false}
                  disabled={disabled}
                  className="focus:border-accent-400/45 focus:ring-accent-500/15 h-8 min-w-0 flex-1 rounded-lg border border-[var(--app-border)] bg-black/10 px-2.5 text-xs text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:ring-2 disabled:opacity-50"
                  onChange={(event) => setReplacement(event.target.value)}
                  onKeyDown={handleReplaceKeyDown}
                />
                <button
                  type="button"
                  className={smallButtonClassName}
                  disabled={disabled || !activeMatch || Boolean(result.error)}
                  onClick={replaceCurrent}
                >
                  Заменить
                </button>
                <button
                  type="button"
                  aria-label="Заменить все"
                  className={smallButtonClassName}
                  disabled={disabled || result.matches.length === 0 || Boolean(result.error)}
                  onClick={replaceAll}
                >
                  Все
                </button>
              </div>
            )}

            {result.error && (
              <Tooltip content={result.error} side="bottom">
                <p className="mt-1.5 truncate pl-[34px] text-[11px] text-red-300" tabIndex={0}>
                  {result.error}
                </p>
              </Tooltip>
            )}
          </div>

          {highlightHost &&
            activeMatch &&
            createPortal(
              <div aria-hidden="true" data-study-code-find-highlight-layer>
                {activeSegments.map((segment, index) => (
                  <span
                    key={`${segment.line}:${segment.column}:${index}`}
                    data-study-code-active-find-match
                    style={{
                      top: `calc(var(--study-code-editor-padding) + ${segment.line * 1.65}rem)`,
                      left: `calc(3.25rem + var(--study-code-editor-padding) + ${segment.column}ch)`,
                      width: `${segment.length}ch`,
                      height: 'var(--study-code-line-height)'
                    }}
                  />
                ))}
              </div>,
              highlightHost
            )}
        </>
      )}
    </>
  )
}

function getResultLabel(
  query: string,
  error: string | null,
  storedMatches: number,
  activeMatchIndex: number,
  truncated: boolean
): string {
  if (error) return 'Ошибка'
  if (!query) return ''
  if (storedMatches === 0) return 'Нет результатов'
  const total = truncated ? `${storedMatches}+` : String(storedMatches)
  return `${Math.max(activeMatchIndex, 0) + 1} / ${total}`
}

function revealMatch(
  start: number,
  end: number,
  source: string,
  editorScrollRef: RefObject<HTMLDivElement | null>
): void {
  const scroll = editorScrollRef.current
  const textarea = scroll?.querySelector('textarea')
  if (!scroll || !textarea) return

  textarea.setSelectionRange(start, end)

  const { line, column } = getStudyCodeSourcePosition(source, start)
  const computed = window.getComputedStyle(textarea)
  const lineHeight = Number.parseFloat(computed.lineHeight) || 26.4
  const fontSize = Number.parseFloat(computed.fontSize) || 14
  const characterWidth = fontSize * 0.62
  const targetTop = 16 + line * lineHeight
  const targetLeft = 52 + 16 + column * characterWidth
  const topSafeArea = 100
  const bottomSafeArea = 48
  const horizontalSafeArea = 40

  if (
    targetTop < scroll.scrollTop + topSafeArea ||
    targetTop + lineHeight > scroll.scrollTop + scroll.clientHeight - bottomSafeArea
  ) {
    scroll.scrollTop = Math.max(0, targetTop - scroll.clientHeight * 0.42)
  }

  if (
    targetLeft < scroll.scrollLeft + horizontalSafeArea ||
    targetLeft > scroll.scrollLeft + scroll.clientWidth - horizontalSafeArea
  ) {
    scroll.scrollLeft = Math.max(0, targetLeft - scroll.clientWidth * 0.45)
  }
}
