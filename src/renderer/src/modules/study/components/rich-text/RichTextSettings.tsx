import type { Editor } from '@tiptap/core'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
  Unlink
} from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'

import { cn } from '../../../../shared/lib/cn'

interface RichTextSettingsProps {
  editor: Editor | null
  revision: number
}

const fontSizes = [
  {
    label: 'Мелкий',
    value: '0.875rem'
  },
  {
    label: 'Обычный',
    value: '1rem'
  },
  {
    label: 'Средний',
    value: '1.125rem'
  },
  {
    label: 'Большой',
    value: '1.35rem'
  },
  {
    label: 'Крупный',
    value: '1.65rem'
  },
  {
    label: 'Очень крупный',
    value: '2rem'
  }
]

export function RichTextSettings({ editor, revision }: RichTextSettingsProps): React.JSX.Element {
  const textStyleAttributes = editor?.getAttributes('textStyle') ?? {}

  const currentFontSize =
    typeof textStyleAttributes.fontSize === 'string' ? textStyleAttributes.fontSize : ''

  const currentColor = normalizeColor(textStyleAttributes.color)

  const currentHref = getCurrentHref(editor)

  function applyLink(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    if (!editor) {
      return
    }

    const formData = new FormData(event.currentTarget)
    const rawHref = String(formData.get('href') ?? '')
    const href = normalizeHref(rawHref)

    if (!href) {
      return
    }

    editor
      .chain()
      .focus()
      .setLink({
        href
      })
      .run()
  }

  return (
    <div className="space-y-5" data-editor-revision={revision}>
      {!editor && (
        <p className="text-sm leading-6 text-[var(--app-muted)]">
          Установи курсор в текстовый блок, чтобы изменить его форматирование.
        </p>
      )}

      <SettingsGroup title="История">
        <EditorButton
          label="Отменить"
          disabled={!editor}
          onClick={() => {
            editor?.chain().focus().undo().run()
          }}
        >
          <Undo2 className="size-4" />
        </EditorButton>

        <EditorButton
          label="Повторить"
          disabled={!editor}
          onClick={() => {
            editor?.chain().focus().redo().run()
          }}
        >
          <Redo2 className="size-4" />
        </EditorButton>

        <EditorButton
          label="Очистить форматирование"
          disabled={!editor}
          onClick={() => {
            editor?.chain().focus().unsetAllMarks().clearNodes().run()
          }}
        >
          <RemoveFormatting className="size-4" />
        </EditorButton>
      </SettingsGroup>

      <SettingsGroup title="Начертание">
        <EditorButton
          label="Жирный"
          active={editor?.isActive('bold')}
          disabled={!editor}
          onClick={() => {
            editor?.chain().focus().toggleBold().run()
          }}
        >
          <Bold className="size-4" />
        </EditorButton>

        <EditorButton
          label="Курсив"
          active={editor?.isActive('italic')}
          disabled={!editor}
          onClick={() => {
            editor?.chain().focus().toggleItalic().run()
          }}
        >
          <Italic className="size-4" />
        </EditorButton>

        <EditorButton
          label="Подчёркивание"
          active={editor?.isActive('underline')}
          disabled={!editor}
          onClick={() => {
            editor?.chain().focus().toggleUnderline().run()
          }}
        >
          <Underline className="size-4" />
        </EditorButton>

        <EditorButton
          label="Зачёркивание"
          active={editor?.isActive('strike')}
          disabled={!editor}
          onClick={() => {
            editor?.chain().focus().toggleStrike().run()
          }}
        >
          <Strikethrough className="size-4" />
        </EditorButton>

        <EditorButton
          label="Моноширный текст"
          active={editor?.isActive('code')}
          disabled={!editor}
          onClick={() => {
            editor?.chain().focus().toggleCode().run()
          }}
        >
          <Code2 className="size-4" />
        </EditorButton>
      </SettingsGroup>

      <SettingsGroup title="Списки">
        <EditorButton
          label="Маркированный список"
          active={editor?.isActive('bulletList')}
          disabled={!editor}
          onClick={() => {
            editor?.chain().focus().toggleBulletList().run()
          }}
        >
          <List className="size-4" />
        </EditorButton>

        <EditorButton
          label="Нумерованный список"
          active={editor?.isActive('orderedList')}
          disabled={!editor}
          onClick={() => {
            editor?.chain().focus().toggleOrderedList().run()
          }}
        >
          <ListOrdered className="size-4" />
        </EditorButton>
      </SettingsGroup>

      <SettingsGroup title="Выравнивание">
        <EditorButton
          label="По левому краю"
          active={editor?.isActive({
            textAlign: 'left'
          })}
          disabled={!editor}
          onClick={() => {
            editor?.chain().focus().setTextAlign('left').run()
          }}
        >
          <AlignLeft className="size-4" />
        </EditorButton>

        <EditorButton
          label="По центру"
          active={editor?.isActive({
            textAlign: 'center'
          })}
          disabled={!editor}
          onClick={() => {
            editor?.chain().focus().setTextAlign('center').run()
          }}
        >
          <AlignCenter className="size-4" />
        </EditorButton>

        <EditorButton
          label="По правому краю"
          active={editor?.isActive({
            textAlign: 'right'
          })}
          disabled={!editor}
          onClick={() => {
            editor?.chain().focus().setTextAlign('right').run()
          }}
        >
          <AlignRight className="size-4" />
        </EditorButton>

        <EditorButton
          label="По ширине"
          active={editor?.isActive({
            textAlign: 'justify'
          })}
          disabled={!editor}
          onClick={() => {
            editor?.chain().focus().setTextAlign('justify').run()
          }}
        >
          <AlignJustify className="size-4" />
        </EditorButton>
      </SettingsGroup>

      <SettingsGroup title="Текст">
        <label className="grid w-full gap-2">
          <span className="text-xs font-medium text-[var(--app-muted)]">Размер</span>

          <select
            value={currentFontSize}
            disabled={!editor}
            className="h-9 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-violet-500/45 disabled:opacity-50"
            onChange={(event) => {
              const value = event.target.value

              if (!value) {
                editor?.chain().focus().unsetFontSize().run()

                return
              }

              editor?.chain().focus().setFontSize(value).run()
            }}
          >
            <option value="">По умолчанию</option>

            {fontSizes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid w-full gap-2">
          <span className="text-xs font-medium text-[var(--app-muted)]">Цвет</span>

          <div className="flex h-9 items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] px-2">
            <input
              type="color"
              value={currentColor}
              disabled={!editor}
              aria-label="Цвет текста"
              className="size-6 cursor-pointer border-0 bg-transparent p-0 disabled:opacity-50"
              onChange={(event) => {
                editor?.chain().focus().setColor(event.target.value).run()
              }}
            />

            <span className="text-xs text-[var(--app-muted)]">{currentColor}</span>
          </div>
        </label>
      </SettingsGroup>

      <SettingsGroup title="Ссылка" vertical>
        <form key={`${revision}:${currentHref}`} className="grid w-full gap-2" onSubmit={applyLink}>
          <input
            name="href"
            type="text"
            defaultValue={currentHref}
            placeholder="https://example.com"
            disabled={!editor}
            className="h-9 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45 disabled:opacity-50"
          />

          <div className="grid grid-cols-2 gap-2">
            <button
              type="submit"
              disabled={!editor}
              className="flex h-9 items-center justify-center gap-2 rounded-lg bg-violet-500 text-sm font-medium text-white hover:bg-violet-400 disabled:opacity-40"
            >
              <Link2 className="size-4" />
              Применить
            </button>

            <button
              type="button"
              disabled={!editor}
              className="flex h-9 items-center justify-center gap-2 rounded-lg border border-[var(--app-border)] text-sm text-[var(--app-muted)] hover:bg-white/[0.05] hover:text-[var(--app-text)] disabled:opacity-40"
              onClick={() => {
                editor?.chain().focus().unsetLink().run()
              }}
            >
              <Unlink className="size-4" />
              Удалить
            </button>
          </div>
        </form>
      </SettingsGroup>
    </div>
  )
}

function SettingsGroup({
  title,
  children,
  vertical = false
}: {
  title: string
  children: ReactNode
  vertical?: boolean
}): React.JSX.Element {
  return (
    <section className="space-y-2 border-b border-[var(--app-border)] pb-4 last:border-b-0 last:pb-0">
      <h3 className="text-[11px] font-semibold tracking-[0.08em] text-[var(--app-muted)] uppercase">
        {title}
      </h3>

      <div className={cn(vertical ? 'grid gap-2' : 'flex flex-wrap gap-2')}>{children}</div>
    </section>
  )
}

function EditorButton({
  label,
  active = false,
  disabled = false,
  children,
  onClick
}: {
  label: string
  active?: boolean
  disabled?: boolean
  children: ReactNode
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      className={cn(
        'flex size-9 items-center justify-center rounded-lg border transition-colors outline-none',
        'focus-visible:ring-2 focus-visible:ring-violet-500/60',
        active
          ? 'border-violet-500/40 bg-violet-500/15 text-violet-200'
          : 'border-[var(--app-border)] bg-[var(--app-workspace)] text-[var(--app-muted)] hover:bg-white/[0.05] hover:text-[var(--app-text)]',
        disabled && 'cursor-not-allowed opacity-40'
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function getCurrentHref(editor: Editor | null): string {
  const href = editor?.getAttributes('link').href

  return typeof href === 'string' ? href : ''
}

function normalizeHref(value: string): string {
  const trimmed = value.trim()

  if (!trimmed) {
    return ''
  }

  const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const url = new URL(candidate)

    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? candidate : ''
  } catch {
    return ''
  }
}

function normalizeColor(value: unknown): string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#e5e7eb'
}
