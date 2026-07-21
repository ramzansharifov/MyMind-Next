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
import { useMemo } from 'react'

import { cn } from '../../../../shared/lib/cn'
import { StudySourceBlockShell } from '../source/StudySourceBlockShell'
import { getStudyCodeLanguage } from './code-languages'

interface StudyCodeBlockProps {
  source: string
  language: string
  mode: 'edit' | 'read'
  onChange?: (source: string) => void
}

export function StudyCodeBlock({
  source,
  language,
  mode,
  onChange
}: StudyCodeBlockProps): React.JSX.Element {
  const languageOption = getStudyCodeLanguage(language)
  const editable = mode === 'edit'
  const lineNumbers = useMemo(() => createStudyCodeLineNumbers(source), [source])
  const lineNumberDigits = Math.max(2, String(lineNumbers.length).length)

  return (
    <StudySourceBlockShell
      source={source}
      copyLabel="Копировать код"
      copiedAnnouncement="Код скопирован"
      copyErrorAnnouncement="Не удалось скопировать код"
      expandLabel="Развернуть блок кода"
      collapseLabel="Свернуть блок кода"
      dialogTitle="Блок кода на весь экран"
      dialogDescription="Полноэкранный просмотр и редактирование блока кода. Нажмите Escape или кнопку сворачивания, чтобы вернуться к материалу."
    >
      {({ fullscreen, actions }) => (
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

            <div className="flex shrink-0 items-center gap-1">{actions}</div>
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
      )}
    </StudySourceBlockShell>
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
