import * as Dialog from '@radix-ui/react-dialog'
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
import { Check, Copy, Maximize2, Minimize2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { cn } from '../../../../shared/lib/cn'
import { Tooltip, TooltipProvider } from '../../../../shared/ui/tooltip'
import { getStudyCodeLanguage } from './code-languages'

interface StudyCodeBlockProps {
  source: string
  language: string
  mode: 'edit' | 'read'
  onChange?: (source: string) => void
}

type CopyState = 'idle' | 'copied' | 'error'

const headerButtonClassName = [
  'flex size-7 shrink-0 items-center justify-center rounded-md',
  'text-[var(--app-muted)] outline-none',
  'transition-colors',
  'hover:bg-white/[0.06] hover:text-[var(--app-text)]',
  'focus-visible:ring-2 focus-visible:ring-violet-500/35'
].join(' ')

export function StudyCodeBlock({
  source,
  language,
  mode,
  onChange
}: StudyCodeBlockProps): React.JSX.Element {
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const [fullscreenOpen, setFullscreenOpen] = useState(false)

  const resetTimerRef = useRef<number | null>(null)

  const languageOption = getStudyCodeLanguage(language)
  const editable = mode === 'edit'

  const lineNumbers = useMemo(() => createStudyCodeLineNumbers(source), [source])
  const lineNumberDigits = Math.max(2, String(lineNumbers.length).length)

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current)
      }
    }
  }, [])

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
        : 'Копировать код'

  const copyAnnouncement =
    copyState === 'copied'
      ? 'Код скопирован'
      : copyState === 'error'
        ? 'Не удалось скопировать код'
        : ''

  function renderCodeBlock(fullscreen: boolean): React.JSX.Element {
    const fullscreenLabel = fullscreen ? 'Свернуть блок кода' : 'Развернуть блок кода'

    return (
      <section
        data-study-code-block
        data-mode={mode}
        data-fullscreen={fullscreen ? 'true' : 'false'}
        className={cn(
          'study-code-block overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-code-surface)]',
          fullscreen && 'flex h-full min-h-0 flex-col rounded-2xl shadow-2xl shadow-black/40'
        )}
      >
        <header className="flex h-10 shrink-0 items-center justify-between border-b border-[var(--app-border)] bg-white/[0.025] px-3">
          <span className="truncate text-[11px] font-semibold tracking-[0.08em] text-[var(--app-muted)] uppercase">
            {languageOption.label}
          </span>

          <div className="flex shrink-0 items-center gap-1">
            <Tooltip content={copyLabel} side="top">
              <button
                type="button"
                aria-label={copyLabel}
                disabled={!source}
                className={cn(
                  headerButtonClassName,
                  'disabled:cursor-not-allowed disabled:opacity-30',
                  copyState === 'copied' && 'text-emerald-300'
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

            <Tooltip content={fullscreenLabel} side="top">
              <button
                type="button"
                aria-label={fullscreenLabel}
                aria-keyshortcuts={fullscreen ? 'Escape' : undefined}
                className={headerButtonClassName}
                onClick={() => {
                  setFullscreenOpen(!fullscreen)
                }}
              >
                {fullscreen ? (
                  <Minimize2 aria-hidden="true" className="size-4" />
                ) : (
                  <Maximize2 aria-hidden="true" className="size-4" />
                )}
              </button>
            </Tooltip>
          </div>
        </header>

        <div
          data-study-code-scroll
          className={cn(
            'study-code-block__scroll min-h-0 overflow-x-auto overflow-y-auto',
            fullscreen ? 'flex-1' : 'max-h-[32rem]'
          )}
        >
          <div className="study-code-block__body">
            <div
              aria-hidden="true"
              data-study-code-line-numbers
              className="study-code-block__line-numbers"
              style={{
                minWidth: `calc(${lineNumberDigits}ch + 1.5rem)`
              }}
            >
              {lineNumbers.map((lineNumber) => (
                <span
                  key={lineNumber}
                  data-study-code-line-number={lineNumber}
                  className="study-code-block__line-number"
                >
                  {lineNumber}
                </span>
              ))}
            </div>

            <Editor
              value={source}
              readOnly={!editable}
              ignoreTabKey={!editable}
              insertSpaces
              tabSize={2}
              padding={16}
              placeholder={editable ? 'Код…' : 'Пустой блок кода'}
              className="study-code-block__editor"
              textareaClassName="study-code-block__textarea"
              preClassName="study-code-block__pre"
              highlight={(value) => highlightStudyCode(value, languageOption.prismLanguage)}
              style={{
                minHeight: editable ? '3.45rem' : '6rem',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: '0.875rem',
                lineHeight: '1.65'
              }}
              onValueChange={(value) => {
                if (editable) {
                  onChange?.(value)
                }
              }}
            />
          </div>
        </div>
      </section>
    )
  }

  return (
    <TooltipProvider delayDuration={250}>
      <Dialog.Root open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        {renderCodeBlock(false)}

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[69] bg-black/75 backdrop-blur-[3px]" />

          <Dialog.Content className="fixed inset-0 z-[70] min-h-0 min-w-0 overflow-hidden bg-[var(--app-workspace)] p-3 outline-none">
            <Dialog.Title className="sr-only">Блок кода на весь экран</Dialog.Title>

            <Dialog.Description className="sr-only">
              Полноэкранный просмотр и редактирование блока кода. Нажмите Escape или кнопку
              сворачивания, чтобы вернуться к материалу.
            </Dialog.Description>

            {renderCodeBlock(true)}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <span aria-live="polite" className="sr-only">
        {copyAnnouncement}
      </span>
    </TooltipProvider>
  )
}

function createStudyCodeLineNumbers(source: string): number[] {
  const lineCount = source.split('\n').length

  return Array.from(
    {
      length: Math.max(lineCount, 1)
    },
    (_value, index) => index + 1
  )
}

function highlightStudyCode(source: string, prismLanguage: string): string {
  if (prismLanguage === 'plain') {
    return escapeHtml(source)
  }

  const grammar = Prism.languages[prismLanguage]

  if (!grammar) {
    return escapeHtml(source)
  }

  return Prism.highlight(source, grammar, prismLanguage)
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
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
