import type { Editor } from '@tiptap/core'
import { useEditorState } from '@tiptap/react'
import * as Popover from '@radix-ui/react-popover'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import * as Tooltip from '@radix-ui/react-tooltip'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
  Unlink,
  X
} from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'

import { cn } from '../../../../shared/lib/cn'
import { ColorPicker } from '../settings/ColorPicker'
import { StudySelect } from '../settings/StudySelect'

interface RichTextSettingsProps {
  editor: Editor | null
}

type TextAlignment = 'left' | 'center' | 'right' | 'justify'

interface EditorFormattingState {
  bold: boolean
  italic: boolean
  underline: boolean
  strike: boolean
  code: boolean
  bulletList: boolean
  orderedList: boolean
  canIndentListItem: boolean
  canOutdentListItem: boolean
  alignment: TextAlignment
  fontSize: string
  color: string
  backgroundColor: string
  highlightActive: boolean
  href: string
  linkActive: boolean
  canUndo: boolean
  canRedo: boolean
}

interface SavedSelection {
  from: number
  to: number
}

const defaultEditorState: EditorFormattingState = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  code: false,
  bulletList: false,
  orderedList: false,
  canIndentListItem: false,
  canOutdentListItem: false,
  alignment: 'left',
  fontSize: 'default',
  color: '#f2f3f5',
  backgroundColor: '#4c1d95',
  highlightActive: false,
  href: '',
  linkActive: false,
  canUndo: false,
  canRedo: false
}

const fontSizes = [
  {
    value: 'default',
    label: 'По умолчанию'
  },
  {
    value: '0.875rem',
    label: 'Мелкий'
  },
  {
    value: '1rem',
    label: 'Обычный'
  },
  {
    value: '1.125rem',
    label: 'Средний'
  },
  {
    value: '1.35rem',
    label: 'Большой'
  },
  {
    value: '1.65rem',
    label: 'Крупный'
  },
  {
    value: '2rem',
    label: 'Очень крупный'
  }
]

const highlightColors = [
  '#3f3f46',
  '#4c1d95',
  '#1e3a8a',
  '#164e63',
  '#064e3b',
  '#713f12',
  '#7f1d1d',
  '#701a75'
]

export function RichTextSettings({ editor }: RichTextSettingsProps): React.JSX.Element {
  if (!editor || editor.isDestroyed) {
    return <UnavailableEditorSettings />
  }

  return <ConnectedRichTextSettings editor={editor} />
}

function ConnectedRichTextSettings({ editor }: { editor: Editor }): React.JSX.Element {
  const savedSelectionRef = useRef<SavedSelection | null>(null)

  const editorState =
    useEditorState({
      editor,
      selector: ({ editor: currentEditor }) => {
        if (!currentEditor || currentEditor.isDestroyed) {
          return defaultEditorState
        }

        const textStyle = currentEditor.getAttributes('textStyle')
        const paragraph = currentEditor.getAttributes('paragraph')
        const link = currentEditor.getAttributes('link')
        const highlight = currentEditor.getAttributes('highlight')

        return {
          bold: currentEditor.isActive('bold'),
          italic: currentEditor.isActive('italic'),
          underline: currentEditor.isActive('underline'),
          strike: currentEditor.isActive('strike'),
          code: currentEditor.isActive('code'),
          bulletList: currentEditor.isActive('bulletList'),
          orderedList: currentEditor.isActive('orderedList'),
          canIndentListItem: canRunEditorCommand(currentEditor, (candidate) =>
            candidate.can().chain().sinkListItem('listItem').run()
          ),
          canOutdentListItem: canRunEditorCommand(currentEditor, (candidate) =>
            candidate.can().chain().liftListItem('listItem').run()
          ),
          alignment: getTextAlignment(paragraph.textAlign),
          fontSize: typeof textStyle.fontSize === 'string' ? textStyle.fontSize : 'default',
          color: normalizeColor(textStyle.color, '#f2f3f5'),
          backgroundColor: normalizeColor(highlight.color, '#4c1d95'),
          highlightActive: currentEditor.isActive('highlight'),
          href: typeof link.href === 'string' ? link.href : '',
          linkActive: currentEditor.isActive('link'),
          canUndo: canRunEditorCommand(currentEditor, (candidate) =>
            candidate.can().chain().undo().run()
          ),
          canRedo: canRunEditorCommand(currentEditor, (candidate) =>
            candidate.can().chain().redo().run()
          )
        } satisfies EditorFormattingState
      }
    }) ?? defaultEditorState

  useEffect(() => {
    function rememberSelection(): void {
      if (!editor || editor.isDestroyed) {
        return
      }

      savedSelectionRef.current = {
        from: editor.state.selection.from,
        to: editor.state.selection.to
      }
    }

    rememberSelection()

    editor.on('selectionUpdate', rememberSelection)
    editor.on('blur', rememberSelection)
    editor.on('focus', rememberSelection)

    return () => {
      editor.off('selectionUpdate', rememberSelection)
      editor.off('blur', rememberSelection)
      editor.off('focus', rememberSelection)
    }
  }, [editor])

  const activeMarks = [
    editorState.bold && 'bold',
    editorState.italic && 'italic',
    editorState.underline && 'underline',
    editorState.strike && 'strike',
    editorState.code && 'code'
  ].filter((value): value is string => Boolean(value))

  function createCommandChain(): ReturnType<Editor['chain']> | null {
    if (!editor || editor.isDestroyed) {
      return null
    }

    const chain = editor.chain().focus()
    const selection = savedSelectionRef.current

    if (!selection) {
      return chain
    }

    const maxPosition = editor.state.doc.content.size
    const from = Math.max(1, Math.min(selection.from, maxPosition))
    const to = Math.max(from, Math.min(selection.to, maxPosition))

    return chain.setTextSelection({
      from,
      to
    })
  }

  function applyMarkValues(nextValues: string[]): void {
    const chain = createCommandChain()

    if (!chain) {
      return
    }

    const next = new Set(nextValues)

    if (next.has('bold') !== editorState.bold) {
      chain.toggleBold()
    }

    if (next.has('italic') !== editorState.italic) {
      chain.toggleItalic()
    }

    if (next.has('underline') !== editorState.underline) {
      chain.toggleUnderline()
    }

    if (next.has('strike') !== editorState.strike) {
      chain.toggleStrike()
    }

    if (next.has('code') !== editorState.code) {
      chain.toggleCode()
    }

    chain.run()
  }

  function applyAlignment(value: string): void {
    if (!isTextAlignment(value)) {
      return
    }

    createCommandChain()?.setTextAlign(value).run()
  }

  function applyFontSize(value: string): void {
    const chain = createCommandChain()

    if (!chain) {
      return
    }

    if (value === 'default') {
      chain.unsetFontSize().run()
      return
    }

    chain.setFontSize(value).run()
  }

  function applyColor(value: string): void {
    createCommandChain()?.setColor(value).run()
  }

  function clearColor(): void {
    createCommandChain()?.unsetColor().run()
  }

  function applyBackgroundColor(value: string): void {
    createCommandChain()
      ?.setHighlight({
        color: value
      })
      .run()
  }

  function clearBackgroundColor(): void {
    createCommandChain()?.unsetHighlight().run()
  }

  function clearFormatting(): void {
    createCommandChain()?.unsetAllMarks().clearNodes().setTextAlign('left').run()
  }

  function applyLink(rawHref: string): boolean {
    const linkText = rawHref.trim()
    const href = normalizeHref(linkText)

    if (!href) {
      return false
    }

    const selection = savedSelectionRef.current ?? {
      from: editor.state.selection.from,
      to: editor.state.selection.to
    }

    const chain = createCommandChain()

    if (!chain) {
      return false
    }

    if (editorState.linkActive) {
      chain
        .extendMarkRange('link')
        .setLink({
          href
        })
        .run()

      return true
    }

    if (selection.from === selection.to) {
      chain
        .insertContent({
          type: 'text',
          text: linkText,
          marks: [
            {
              type: 'link',
              attrs: {
                href
              }
            }
          ]
        })
        .run()

      return true
    }

    chain
      .setLink({
        href
      })
      .run()

    return true
  }

  function removeLink(): void {
    const chain = createCommandChain()

    if (!chain) {
      return
    }

    if (editorState.linkActive) {
      chain.extendMarkRange('link')
    }

    chain.unsetLink().run()
  }

  return (
    <Tooltip.Provider delayDuration={300}>
      <div className="space-y-4">
        <SettingsSection title="Быстро">
          <ToolbarButton
            label="Отменить"
            disabled={!editorState.canUndo}
            onClick={() => {
              editor.chain().focus().undo().run()
            }}
          >
            <Undo2 className="size-4" />
          </ToolbarButton>

          <ToolbarButton
            label="Повторить"
            disabled={!editorState.canRedo}
            onClick={() => {
              editor.chain().focus().redo().run()
            }}
          >
            <Redo2 className="size-4" />
          </ToolbarButton>

          <ToolbarButton label="Очистить" onClick={clearFormatting}>
            <RemoveFormatting className="size-4" />
          </ToolbarButton>
        </SettingsSection>

        <SettingsSection title="Текст">
          <ToggleGroup.Root
            type="multiple"
            value={activeMarks}
            aria-label="Форматирование текста"
            className="flex flex-wrap gap-2"
            onValueChange={applyMarkValues}
          >
            <ToolbarToggle value="bold" label="Жирный">
              <Bold className="size-4" />
            </ToolbarToggle>

            <ToolbarToggle value="italic" label="Курсив">
              <Italic className="size-4" />
            </ToolbarToggle>

            <ToolbarToggle value="underline" label="Подчёркивание">
              <Underline className="size-4" />
            </ToolbarToggle>

            <ToolbarToggle value="strike" label="Зачёркивание">
              <Strikethrough className="size-4" />
            </ToolbarToggle>

            <ToolbarToggle value="code" label="Код">
              <Code2 className="size-4" />
            </ToolbarToggle>
          </ToggleGroup.Root>
        </SettingsSection>

        <SettingsSection title="Списки">
          <ToggleGroup.Root
            type="single"
            value={editorState.bulletList ? 'bullet' : editorState.orderedList ? 'ordered' : ''}
            aria-label="Тип списка"
            className="flex flex-wrap gap-2"
            onValueChange={(value) => {
              if (!value) {
                if (editorState.bulletList) {
                  createCommandChain()?.toggleBulletList().run()
                } else if (editorState.orderedList) {
                  createCommandChain()?.toggleOrderedList().run()
                }

                return
              }

              if (value === 'bullet') {
                createCommandChain()?.toggleBulletList().run()
              }

              if (value === 'ordered') {
                createCommandChain()?.toggleOrderedList().run()
              }
            }}
          >
            <ToolbarToggle value="bullet" label="Маркированный список">
              <List className="size-4" />
            </ToolbarToggle>

            <ToolbarToggle value="ordered" label="Нумерованный список">
              <ListOrdered className="size-4" />
            </ToolbarToggle>
          </ToggleGroup.Root>

          <ToolbarButton
            label="Увеличить вложенность — Tab"
            disabled={!editorState.canIndentListItem}
            onClick={() => {
              createCommandChain()?.sinkListItem('listItem').run()
            }}
          >
            <IndentIncrease className="size-4" />
          </ToolbarButton>

          <ToolbarButton
            label="Уменьшить вложенность — Shift+Tab"
            disabled={!editorState.canOutdentListItem}
            onClick={() => {
              createCommandChain()?.liftListItem('listItem').run()
            }}
          >
            <IndentDecrease className="size-4" />
          </ToolbarButton>
        </SettingsSection>

        <SettingsSection title="Выравнивание">
          <ToggleGroup.Root
            type="single"
            value={editorState.alignment}
            aria-label="Выравнивание"
            className="flex flex-wrap gap-2"
            onValueChange={applyAlignment}
          >
            <ToolbarToggle value="left" label="Слева">
              <AlignLeft className="size-4" />
            </ToolbarToggle>

            <ToolbarToggle value="center" label="По центру">
              <AlignCenter className="size-4" />
            </ToolbarToggle>

            <ToolbarToggle value="right" label="Справа">
              <AlignRight className="size-4" />
            </ToolbarToggle>

            <ToolbarToggle value="justify" label="По ширине">
              <AlignJustify className="size-4" />
            </ToolbarToggle>
          </ToggleGroup.Root>
        </SettingsSection>

        <SettingsSection title="Оформление" vertical>
          <SettingsField label="Размер">
            <StudySelect
              value={editorState.fontSize}
              options={fontSizes}
              ariaLabel="Размер текста"
              onValueChange={applyFontSize}
            />
          </SettingsField>

          <div className="grid grid-cols-2 gap-3">
            <SettingsField label="Текст">
              <ColorPicker
                value={editorState.color}
                ariaLabel="Цвет текста"
                clearLabel="Сбросить"
                onChange={applyColor}
                onClear={clearColor}
              />
            </SettingsField>

            <SettingsField label="Фон">
              <ColorPicker
                value={editorState.backgroundColor}
                ariaLabel="Фон выделенного текста"
                colors={highlightColors}
                clearLabel="Убрать"
                onChange={applyBackgroundColor}
                onClear={clearBackgroundColor}
              />
            </SettingsField>
          </div>
        </SettingsSection>

        <SettingsSection title="Ссылка">
          <LinkPopover
            disabled={false}
            active={editorState.linkActive}
            currentHref={editorState.href}
            onApply={applyLink}
            onRemove={removeLink}
          />
        </SettingsSection>
      </div>
    </Tooltip.Provider>
  )
}

function SettingsSection({
  title,
  children,
  vertical = false
}: {
  title: string
  children: ReactNode
  vertical?: boolean
}): React.JSX.Element {
  return (
    <section className="space-y-2 border-b border-(--app-border) pb-4 last:border-b-0 last:pb-0">
      <h3 className="text-[11px] font-semibold tracking-[0.08em] text-(--app-muted) uppercase">
        {title}
      </h3>

      <div className={cn(vertical ? 'grid gap-3' : 'flex flex-wrap gap-2')}>{children}</div>
    </section>
  )
}

function SettingsField({
  label,
  children
}: {
  label: string
  children: ReactNode
}): React.JSX.Element {
  return (
    <label className="grid gap-2">
      <span className="text-[11px] font-medium text-(--app-muted)">{label}</span>

      {children}
    </label>
  )
}

function ToolbarButton({
  label,
  disabled = false,
  children,
  onClick
}: {
  label: string
  disabled?: boolean
  children: ReactNode
  onClick: () => void
}): React.JSX.Element {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          disabled={disabled}
          className={cn(
            'flex size-9 items-center justify-center rounded-lg border',
            'border-(--app-border) bg-(--app-workspace) text-(--app-muted)',
            'transition-colors outline-none',
            'hover:bg-white/[0.05] hover:text-(--app-text)',
            'focus-visible:ring-2 focus-visible:ring-violet-500/35',
            'disabled:cursor-not-allowed disabled:opacity-35'
          )}
          onMouseDown={(event) => {
            event.preventDefault()
          }}
          onClick={onClick}
        >
          {children}
        </button>
      </Tooltip.Trigger>

      <ToolbarTooltipContent label={label} />
    </Tooltip.Root>
  )
}

function ToolbarToggle({
  value,
  label,
  children
}: {
  value: string
  label: string
  children: ReactNode
}): React.JSX.Element {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <ToggleGroup.Item
          value={value}
          aria-label={label}
          className={cn(
            'flex size-9 items-center justify-center rounded-lg border',
            'border-(--app-border) bg-(--app-workspace) text-(--app-muted)',
            'transition-colors outline-none',
            'hover:bg-white/[0.05] hover:text-(--app-text)',
            'focus-visible:ring-2 focus-visible:ring-violet-500/35',
            'data-[state=on]:border-violet-500/45',
            'data-[state=on]:bg-violet-500/15',
            'data-[state=on]:text-violet-200'
          )}
          onMouseDown={(event) => {
            event.preventDefault()
          }}
        >
          {children}
        </ToggleGroup.Item>
      </Tooltip.Trigger>

      <ToolbarTooltipContent label={label} />
    </Tooltip.Root>
  )
}

function ToolbarTooltipContent({ label }: { label: string }): React.JSX.Element {
  return (
    <Tooltip.Portal>
      <Tooltip.Content
        side="top"
        sideOffset={6}
        className="z-[100] rounded-md border border-(--app-tooltip-border) bg-(--app-tooltip) px-2 py-1 text-xs text-(--app-text)"
      >
        {label}

        <Tooltip.Arrow className="fill-(--app-tooltip)" />
      </Tooltip.Content>
    </Tooltip.Portal>
  )
}

function LinkPopover({
  disabled,
  active,
  currentHref,
  onApply,
  onRemove
}: {
  disabled: boolean
  active: boolean
  currentHref: string
  onApply: (href: string) => boolean
  onRemove: () => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [href, setHref] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(nextOpen: boolean): void {
    setOpen(nextOpen)

    if (nextOpen) {
      setHref(currentHref)
      setError(null)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    if (!onApply(href)) {
      setError('Нужна корректная ссылка')
      return
    }

    setError(null)
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center justify-center gap-2 rounded-lg border',
            active
              ? 'border-violet-500/45 bg-violet-500/15 text-violet-200'
              : 'border-(--app-border) bg-(--app-workspace) text-(--app-muted)',
            'hover:bg-white/[0.05] hover:text-(--app-text)',
            'focus-visible:ring-2 focus-visible:ring-violet-500/35 focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-35'
          )}
        >
          <Link2 aria-hidden="true" className="size-4" />
          {active ? 'Изменить ссылку' : 'Добавить ссылку'}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-[90] w-80 rounded-xl border border-(--app-border) bg-(--app-surface-raised) p-4 text-(--app-text) outline-none"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Ссылка</p>

            <Popover.Close asChild>
              <button
                type="button"
                aria-label="Закрыть"
                className="flex size-7 items-center justify-center rounded-md text-(--app-muted) hover:bg-white/[0.06] hover:text-(--app-text)"
              >
                <X className="size-4" />
              </button>
            </Popover.Close>
          </div>

          <form className="mt-3 grid gap-3" onSubmit={handleSubmit}>
            <input
              autoFocus
              value={href}
              placeholder="https://example.com"
              className="h-10 rounded-lg border border-(--app-border) bg-(--app-workspace) px-3 text-sm text-(--app-text) outline-none placeholder:text-(--app-muted)/60 focus:border-violet-500/50"
              onChange={(event) => {
                setHref(event.target.value)
                setError(null)
              }}
            />

            {error && <p className="text-xs leading-5 text-red-300">{error}</p>}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="submit"
                className="flex h-9 items-center justify-center gap-2 rounded-lg bg-violet-500 text-sm font-medium text-white hover:bg-violet-400"
              >
                <Link2 className="size-4" />
                Применить
              </button>

              <button
                type="button"
                disabled={!active}
                className="flex h-9 items-center justify-center gap-2 rounded-lg border border-(--app-border) text-sm text-(--app-muted) hover:bg-white/[0.05] hover:text-(--app-text) disabled:opacity-35"
                onClick={() => {
                  onRemove()
                  setOpen(false)
                }}
              >
                <Unlink className="size-4" />
                Удалить
              </button>
            </div>
          </form>

          <Popover.Arrow className="fill-(--app-border)" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function UnavailableEditorSettings(): React.JSX.Element {
  return (
    <div className="rounded-lg border border-dashed border-(--app-border) p-3">
      <p className="text-sm text-(--app-muted)">Выбери текстовый блок</p>
    </div>
  )
}

function canRunEditorCommand(editor: Editor | null, command: (editor: Editor) => boolean): boolean {
  if (!editor || editor.isDestroyed) {
    return false
  }

  try {
    return command(editor)
  } catch {
    return false
  }
}

function getTextAlignment(value: unknown): TextAlignment {
  return isTextAlignment(value) ? value : 'left'
}

function isTextAlignment(value: unknown): value is TextAlignment {
  return value === 'left' || value === 'center' || value === 'right' || value === 'justify'
}

function normalizeColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback
}

function normalizeHref(value: string): string | null {
  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const url = new URL(candidate)

    if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) {
      return null
    }

    return url.href
  } catch {
    return null
  }
}
