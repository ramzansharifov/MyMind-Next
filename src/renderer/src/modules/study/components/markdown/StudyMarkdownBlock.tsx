import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { Columns2, Eye, PencilLine } from 'lucide-react'
import Prism from 'prismjs'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-markdown'
import Editor from 'react-simple-code-editor'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useId, type ReactNode } from 'react'

import type { StudyMarkdownViewMode } from '../../../../../../shared/contracts/study'
import { cn } from '../../../../shared/lib/cn'
import { normalizeStudyCodeLanguage } from '../code/code-languages'
import { StudyCodeBlock } from '../code/StudyCodeBlock'
import { StudySourceBlockShell } from '../source/StudySourceBlockShell'

interface StudyMarkdownBlockProps {
  source: string
  mode: 'edit' | 'read'
  viewMode?: StudyMarkdownViewMode
  onChange?: (source: string) => void
  onViewModeChange?: (viewMode: StudyMarkdownViewMode) => void
}

const markdownModes = [
  {
    value: 'write',
    label: 'Код',
    Icon: PencilLine
  },
  {
    value: 'split',
    label: 'Разделить',
    Icon: Columns2
  },
  {
    value: 'preview',
    label: 'Просмотр',
    Icon: Eye
  }
] satisfies Array<{
  value: StudyMarkdownViewMode
  label: string
  Icon: typeof PencilLine
}>

const markdownComponents = {
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

  blockquote({ children }) {
    return <blockquote>{children}</blockquote>
  },

  code({ children, className }) {
    const rawSource = String(children)
    const languageMatch = /language-([\w+-]+)/i.exec(className ?? '')
    const blockCode = Boolean(languageMatch) || rawSource.includes('\n') || rawSource.endsWith('\n')

    if (!blockCode) {
      return <code className={className}>{children}</code>
    }

    const source = rawSource.replace(/\n$/, '')
    const language = normalizeStudyCodeLanguage(languageMatch?.[1])

    return <StudyCodeBlock mode="read" source={source} language={language} />
  },

  img({ src, alt }) {
    if (!src) {
      return <span className="text-[var(--app-muted)]">{alt || 'Изображение'}</span>
    }

    return <img src={src} alt={alt ?? ''} loading="lazy" referrerPolicy="no-referrer" />
  },

  input({ type, checked }) {
    if (type !== 'checkbox') {
      return null
    }

    return <input type="checkbox" checked={checked} disabled readOnly />
  },

  pre({ children }) {
    return <>{children}</>
  },

  table({ children }) {
    return (
      <div className="study-markdown-table-wrap">
        <table>{children}</table>
      </div>
    )
  }
} satisfies Components

export function StudyMarkdownBlock({
  source,
  mode,
  viewMode = 'split',
  onChange,
  onViewModeChange
}: StudyMarkdownBlockProps): React.JSX.Element {
  const editorId = useId()

  if (mode === 'read') {
    return <StudyMarkdownPreview source={source} />
  }

  const activeMode = isMarkdownViewMode(viewMode) ? viewMode : 'split'

  return (
    <StudySourceBlockShell
      source={source}
      copyLabel="Копировать Markdown"
      copiedAnnouncement="Markdown скопирован"
      copyErrorAnnouncement="Не удалось скопировать Markdown"
      expandLabel="Развернуть Markdown-блок"
      collapseLabel="Свернуть Markdown-блок"
      dialogTitle="Markdown-блок на весь экран"
      dialogDescription="Полноэкранное редактирование и предпросмотр Markdown. Нажмите Escape или кнопку сворачивания, чтобы вернуться к материалу."
    >
      {({ fullscreen, actions }) => (
        <section
          data-study-markdown-block
          data-fullscreen={fullscreen ? 'true' : 'false'}
          className={cn(
            'overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-code-surface)]',
            fullscreen && 'flex h-full min-h-0 flex-col rounded-2xl shadow-2xl shadow-black/40'
          )}
        >
          <header className="flex min-h-11 shrink-0 items-center justify-between gap-3 border-b border-[var(--app-border)] bg-white/[0.025] px-3">
            <span className="text-[11px] font-semibold tracking-[0.08em] text-[var(--app-muted)] uppercase">
              Markdown
            </span>

            <div className="flex shrink-0 items-center gap-1">
              <ToggleGroup.Root
                type="single"
                value={activeMode}
                aria-label="Режим Markdown-блока"
                className="flex items-center gap-1"
                onValueChange={(value) => {
                  if (isMarkdownViewMode(value)) {
                    onViewModeChange?.(value)
                  }
                }}
              >
                {markdownModes.map(({ value, label, Icon }) => (
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

          {activeMode === 'write' && (
            <MarkdownSourceEditor
              id={`${editorId}-${fullscreen ? 'fullscreen' : 'inline'}`}
              source={source}
              fullscreen={fullscreen}
              onChange={onChange}
            />
          )}

          {activeMode === 'preview' && (
            <div className={cn('p-5', fullscreen && 'min-h-0 flex-1 overflow-auto')}>
              <StudyMarkdownPreview source={source} />
            </div>
          )}

          {activeMode === 'split' && (
            <div
              className={cn(
                'grid grid-cols-2 divide-x divide-[var(--app-border)] max-[900px]:grid-cols-1 max-[900px]:divide-x-0 max-[900px]:divide-y',
                fullscreen && 'min-h-0 flex-1 overflow-hidden'
              )}
            >
              <div className={cn('min-w-0', fullscreen && 'flex min-h-0 flex-col')}>
                <MarkdownPanelLabel>Markdown</MarkdownPanelLabel>
                <MarkdownSourceEditor
                  id={`${editorId}-${fullscreen ? 'fullscreen' : 'inline'}`}
                  source={source}
                  fullscreen={fullscreen}
                  onChange={onChange}
                />
              </div>

              <div className={cn('min-w-0', fullscreen && 'flex min-h-0 flex-col')}>
                <MarkdownPanelLabel>Просмотр</MarkdownPanelLabel>
                <div className={cn('p-5', fullscreen && 'min-h-0 flex-1 overflow-auto')}>
                  <StudyMarkdownPreview source={source} />
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </StudySourceBlockShell>
  )
}

function MarkdownSourceEditor({
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
        Исходный текст Markdown
      </label>

      <div className={cn(fullscreen ? 'min-h-0 flex-1 overflow-auto' : 'max-h-[36rem] overflow-auto')}>
        <Editor
          value={source}
          textareaId={id}
          insertSpaces
          tabSize={2}
          padding={16}
          placeholder="Начни писать Markdown…"
          className="study-markdown-source"
          textareaClassName="study-markdown-source__textarea"
          preClassName="study-markdown-source__pre"
          highlight={highlightMarkdown}
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

function MarkdownPanelLabel({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <div className="shrink-0 border-b border-[var(--app-border)] px-4 py-2 text-[10px] font-semibold tracking-[0.08em] text-[var(--app-muted)] uppercase">
      {children}
    </div>
  )
}

function StudyMarkdownPreview({ source }: { source: string }): React.JSX.Element {
  if (!source.trim()) {
    return <p className="text-sm text-[var(--app-muted)]">Пустой Markdown-блок</p>
  }

  return (
    <div className="study-markdown-preview">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
        skipHtml
        urlTransform={transformMarkdownUrl}
      >
        {source}
      </ReactMarkdown>
    </div>
  )
}

function highlightMarkdown(value: string): string {
  const grammar = Prism.languages.markdown

  if (!grammar) {
    return escapeHtml(value)
  }

  return Prism.highlight(value, grammar, 'markdown')
}

function transformMarkdownUrl(url: string, key: string): string {
  if (key === 'href' && url.startsWith('#')) {
    return url
  }

  try {
    const parsed = new URL(url)

    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return ''
    }

    return parsed.href
  } catch {
    return ''
  }
}

function isMarkdownViewMode(value: string): value is StudyMarkdownViewMode {
  return value === 'write' || value === 'split' || value === 'preview'
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
