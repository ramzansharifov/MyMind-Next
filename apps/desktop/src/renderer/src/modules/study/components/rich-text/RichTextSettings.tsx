import type { Editor } from '@tiptap/core'
import { useEditorState } from '@tiptap/react'
import * as Popover from '@radix-ui/react-popover'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  CircleCheck,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
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
import { Tooltip } from '../../../../shared/ui/tooltip'
import { STUDY_OPEN_INTERNAL_LINK_PICKER_EVENT } from '../../lib/study-internal-link'
import { ColorPicker } from '../settings/ColorPicker'
import { SegmentedChoice } from '../settings/SegmentedChoice'
import { FontSizeRuler } from './FontSizeRuler'
import { changeSelectedTextCase, type TextCase } from './text-case'

interface RichTextSettingsProps {
  editor: Editor | null
  compact?: boolean
  children?: ReactNode
}

type TextAlignment = 'left' | 'center' | 'right' | 'justify'

interface EditorFormattingState {
  bold: boolean
  italic: boolean
  underline: boolean
  strike: boolean
  code: boolean
  blockquote: boolean
  bulletList: boolean
  orderedList: boolean
  taskList: boolean
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
  selectionEmpty: boolean
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
  blockquote: false,
  bulletList: false,
  orderedList: false,
  taskList: false,
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
  canRedo: false,
  selectionEmpty: true
}

const fontSizes = [
  {
    value: 'default',
    label: 'Авто',
    ariaLabel: 'Автоматический размер'
  },
  {
    value: '0.75rem',
    label: '12',
    ariaLabel: 'Размер 12 пикселей'
  },
  {
    value: '0.875rem',
    label: '14',
    ariaLabel: 'Размер 14 пикселей'
  },
  {
    value: '1rem',
    label: '16',
    ariaLabel: 'Размер 16 пикселей'
  },
  {
    value: '1.125rem',
    label: '18',
    ariaLabel: 'Размер 18 пикселей'
  },
  {
    value: '1.35rem',
    label: '22',
    ariaLabel: 'Размер 22 пикселя'
  },
  {
    value: '1.65rem',
    label: '26',
    ariaLabel: 'Размер 26 пикселей'
  },
  {
    value: '2rem',
    label: '32',
    ariaLabel: 'Размер 32 пикселя'
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

const activeFormattingControlClassName =
  'border-[color-mix(in_srgb,var(--app-accent-500)_72%,white_8%)] bg-[color-mix(in_srgb,var(--app-accent-500)_24%,var(--app-workspace))] text-[color-mix(in_srgb,var(--app-accent-400)_88%,white)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--app-accent-500)_22%,transparent),0_0_14px_color-mix(in_srgb,var(--app-accent-500)_14%,transparent)]'

export function RichTextSettings({
  editor,
  compact = false,
  children
}: RichTextSettingsProps): React.JSX.Element {
  if (!editor || editor.isDestroyed) {
    return <UnavailableEditorSettings />
  }

  return (
    <ConnectedRichTextSettings editor={editor} compact={compact}>
      {children}
    </ConnectedRichTextSettings>
  )
}

function ConnectedRichTextSettings({
  editor,
  compact,
  children
}: {
  editor: Editor
  compact: boolean
  children?: ReactNode
}): React.JSX.Element {
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
          blockquote: currentEditor.isActive('blockquote'),
          bulletList: currentEditor.isActive('bulletList'),
          orderedList: currentEditor.isActive('orderedList'),
          taskList: currentEditor.isActive('taskList'),
          canIndentListItem: canRunEditorCommand(currentEditor, (candidate) =>
            candidate
              .can()
              .chain()
              .sinkListItem(candidate.isActive('taskList') ? 'taskItem' : 'listItem')
              .run()
          ),
          canOutdentListItem: canRunEditorCommand(currentEditor, (candidate) =>
            candidate
              .can()
              .chain()
              .liftListItem(candidate.isActive('taskList') ? 'taskItem' : 'listItem')
              .run()
          ),
          alignment: getTextAlignment(paragraph.textAlign),
          fontSize: typeof textStyle.fontSize === 'string' ? textStyle.fontSize : 'default',
          color: normalizeColor(textStyle.color, '#f2f3f5'),
          backgroundColor: normalizeColor(highlight.color, '#4c1d95'),
          highlightActive: currentEditor.isActive('highlight'),
          href: typeof link.href === 'string' ? link.href : '',
          linkActive: currentEditor.isActive('link'),
          selectionEmpty: currentEditor.state.selection.empty,
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

  function applyTextCase(mode: TextCase): void {
    createCommandChain()?.command(changeSelectedTextCase(mode)).run()
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
    <div className="space-y-4" data-rich-text-settings data-compact={compact ? 'true' : 'false'}>
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
        <div className={compact ? 'flex w-full justify-between gap-2' : 'contents'}>
          <ToggleGroup.Root
            type="multiple"
            value={activeMarks}
            aria-label="Форматирование текста"
            className={compact ? 'contents' : 'flex flex-wrap gap-2'}
            onValueChange={applyMarkValues}
          >
            <ToolbarToggle value="bold" label="Жирный" active={editorState.bold}>
              <Bold className="size-4" />
            </ToolbarToggle>

            <ToolbarToggle value="italic" label="Курсив" active={editorState.italic}>
              <Italic className="size-4" />
            </ToolbarToggle>

            <ToolbarToggle value="underline" label="Подчёркивание" active={editorState.underline}>
              <Underline className="size-4" />
            </ToolbarToggle>

            <ToolbarToggle value="strike" label="Зачёркивание" active={editorState.strike}>
              <Strikethrough className="size-4" />
            </ToolbarToggle>

            <ToolbarToggle value="code" label="Код" active={editorState.code}>
              <Code2 className="size-4" />
            </ToolbarToggle>
          </ToggleGroup.Root>

          <ToggleGroup.Root
            type="single"
            value={editorState.blockquote ? 'blockquote' : ''}
            aria-label="Стиль цитаты"
            className={compact ? 'contents' : 'flex flex-wrap gap-2'}
            onValueChange={() => {
              createCommandChain()?.toggleBlockquote().run()
            }}
          >
            <ToolbarToggle value="blockquote" label="Цитата" active={editorState.blockquote}>
              <Quote className="size-4" />
            </ToolbarToggle>
          </ToggleGroup.Root>
        </div>
        {compact && (
          <div
            className="flex w-full flex-wrap justify-between gap-2 pt-1"
            aria-label="Цвета, ссылки и регистр текста"
          >
            <LinkPopover
              disabled={false}
              active={editorState.linkActive}
              currentHref={editorState.href}
              label="Ссылка"
              ariaLabel="ссылку"
              iconOnly
              onApply={applyLink}
              onRemove={removeLink}
            />
            <ColorPicker
              value={editorState.color}
              ariaLabel="Цвет текста"
              triggerVariant="text"
              clearLabel="Сбросить"
              onChange={applyColor}
              onClear={clearColor}
            />
            <ColorPicker
              value={editorState.backgroundColor}
              ariaLabel="Фон выделенного текста"
              triggerVariant="highlight"
              colors={highlightColors}
              clearLabel="Убрать"
              onChange={applyBackgroundColor}
              onClear={clearBackgroundColor}
            />
            <TextCaseButtons disabled={editorState.selectionEmpty} onApply={applyTextCase} />
          </div>
        )}
        {compact && (
          <div className="w-full pt-1">
            <FontSizeRuler value={editorState.fontSize} onChange={applyFontSize} />
          </div>
        )}
      </SettingsSection>

      <SettingsSection title="Списки">
        <ToggleGroup.Root
          type="single"
          value={
            editorState.taskList
              ? 'task'
              : editorState.bulletList
                ? 'bullet'
                : editorState.orderedList
                  ? 'ordered'
                  : ''
          }
          aria-label="Тип списка"
          className="flex flex-wrap gap-2"
          onValueChange={(value) => {
            if (!value) {
              if (editorState.taskList) {
                createCommandChain()?.toggleTaskList().run()
              } else if (editorState.bulletList) {
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
            if (value === 'task') {
              createCommandChain()?.toggleTaskList().run()
            }
          }}
        >
          <ToolbarToggle
            value="bullet"
            label="Маркированный список"
            active={editorState.bulletList}
          >
            <List className="size-4" />
          </ToolbarToggle>

          <ToolbarToggle
            value="ordered"
            label="Нумерованный список"
            active={editorState.orderedList}
          >
            <ListOrdered className="size-4" />
          </ToolbarToggle>
          {compact && (
            <ToolbarToggle value="task" label="Список с чекбоксами" active={editorState.taskList}>
              <CircleCheck className="size-4" />
            </ToolbarToggle>
          )}
        </ToggleGroup.Root>

        <ToolbarButton
          label="Увеличить вложенность — Tab"
          disabled={!editorState.canIndentListItem}
          onClick={() => {
            createCommandChain()
              ?.sinkListItem(editorState.taskList ? 'taskItem' : 'listItem')
              .run()
          }}
        >
          <IndentIncrease className="size-4" />
        </ToolbarButton>

        <ToolbarButton
          label="Уменьшить вложенность — Shift+Tab"
          disabled={!editorState.canOutdentListItem}
          onClick={() => {
            createCommandChain()
              ?.liftListItem(editorState.taskList ? 'taskItem' : 'listItem')
              .run()
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
          <ToolbarToggle value="left" label="Слева" active={editorState.alignment === 'left'}>
            <AlignLeft className="size-4" />
          </ToolbarToggle>

          <ToolbarToggle
            value="center"
            label="По центру"
            active={editorState.alignment === 'center'}
          >
            <AlignCenter className="size-4" />
          </ToolbarToggle>

          <ToolbarToggle value="right" label="Справа" active={editorState.alignment === 'right'}>
            <AlignRight className="size-4" />
          </ToolbarToggle>

          <ToolbarToggle
            value="justify"
            label="По ширине"
            active={editorState.alignment === 'justify'}
          >
            <AlignJustify className="size-4" />
          </ToolbarToggle>
        </ToggleGroup.Root>
      </SettingsSection>

      {!compact && (
        <SettingsSection title="Оформление" vertical>
          <SettingsField label="Размер">
            <SegmentedChoice
              value={editorState.fontSize}
              options={fontSizes}
              ariaLabel="Размер текста"
              columns={4}
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
      )}

      {!compact && (
        <SettingsSection title="Ссылки" vertical>
          <div data-testid="link-actions" className="grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-label="Создать внутреннюю ссылку"
              className="hover:border-accent-500/35 hover:bg-accent-500/10 flex h-10 min-w-0 items-center justify-center gap-2 rounded-lg border border-(--app-border) bg-(--app-workspace) px-2 text-xs font-medium text-(--app-text) transition-colors outline-none focus-visible:ring-2 focus-visible:ring-(--app-accent-500)/40"
              onMouseDown={(event) => {
                event.preventDefault()
              }}
              onClick={() => {
                editor.view.dom.dispatchEvent(
                  new CustomEvent(STUDY_OPEN_INTERNAL_LINK_PICKER_EVENT)
                )
              }}
            >
              <Link2 aria-hidden="true" className="text-accent-300 size-4 shrink-0" />
              <span className="truncate">Внутренняя</span>
            </button>

            <LinkPopover
              disabled={false}
              active={editorState.linkActive}
              currentHref={editorState.href}
              label="Обычная"
              ariaLabel="обычную ссылку"
              onApply={applyLink}
              onRemove={removeLink}
            />
          </div>

          <p className="text-xs leading-5 text-(--app-muted)">
            Внутреннюю ссылку также можно создать через [[ или Ctrl+Shift+K.
          </p>
        </SettingsSection>
      )}
      {children}
    </div>
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
    <section
      data-rich-text-settings-section
      className="space-y-2 border-b border-(--app-border) pb-4 last:border-b-0 last:pb-0"
    >
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
    <label data-rich-text-settings-field className="grid gap-2">
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
    <Tooltip content={label} side="top" delayDuration={300}>
      <button
        type="button"
        aria-label={label}
        data-rich-text-formatting-control
        disabled={disabled}
        className={cn(
          'flex size-9 items-center justify-center rounded-lg border',
          'border-(--app-border) bg-(--app-workspace) text-(--app-muted)',
          'transition-colors outline-none',
          'hover:bg-white/[0.05] hover:text-(--app-text)',
          'focus-visible:ring-2 focus-visible:ring-(--app-accent-500)/40',
          'disabled:cursor-not-allowed disabled:opacity-35'
        )}
        onMouseDown={(event) => {
          event.preventDefault()
        }}
        onClick={onClick}
      >
        {children}
      </button>
    </Tooltip>
  )
}

function ToolbarToggle({
  value,
  label,
  active,
  children
}: {
  value: string
  label: string
  active: boolean
  children: ReactNode
}): React.JSX.Element {
  return (
    <Tooltip content={label} side="top" delayDuration={300}>
      <ToggleGroup.Item
        value={value}
        aria-label={label}
        data-rich-text-formatting-control
        data-active={active ? 'true' : 'false'}
        className={cn(
          'flex size-9 items-center justify-center rounded-lg border',
          active
            ? activeFormattingControlClassName
            : 'border-(--app-border) bg-(--app-workspace) text-(--app-muted)',
          'transition-colors outline-none',
          'hover:bg-white/[0.05] hover:text-(--app-text)',
          'focus-visible:ring-2 focus-visible:ring-(--app-accent-500)/40'
        )}
        onMouseDown={(event) => {
          event.preventDefault()
        }}
      >
        {children}
      </ToggleGroup.Item>
    </Tooltip>
  )
}

function TextCaseButtons({
  disabled,
  onApply
}: {
  disabled: boolean
  onApply: (mode: TextCase) => void
}): React.JSX.Element {
  const options: { value: TextCase; label: string; sample: string }[] = [
    { value: 'lower', label: 'Все строчные', sample: 'аа' },
    { value: 'upper', label: 'Все прописные', sample: 'АА' },
    { value: 'title', label: 'Каждое слово с большой буквы', sample: 'Аа' }
  ]

  return (
    <>
      {options.map((option) => (
        <ToolbarButton
          key={option.value}
          label={option.label}
          disabled={disabled}
          onClick={() => onApply(option.value)}
        >
          <span aria-hidden="true" className="text-xs font-semibold">
            {option.sample}
          </span>
        </ToolbarButton>
      ))}
    </>
  )
}

function LinkPopover({
  disabled,
  active,
  currentHref,
  label,
  ariaLabel,
  iconOnly = false,
  onApply,
  onRemove
}: {
  disabled: boolean
  active: boolean
  currentHref: string
  label: string
  ariaLabel: string
  iconOnly?: boolean
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
      <Tooltip
        content={active ? `Изменить ${ariaLabel}` : `Добавить ${ariaLabel}`}
        side="top"
        disabled={!iconOnly}
      >
        <Popover.Trigger asChild>
          <button
            type="button"
            aria-label={active ? `Изменить ${ariaLabel}` : `Добавить ${ariaLabel}`}
            data-rich-text-formatting-control={iconOnly ? 'true' : undefined}
            disabled={disabled}
            className={cn(
              iconOnly
                ? 'flex size-9 items-center justify-center rounded-lg border'
                : 'flex h-10 w-full min-w-0 items-center justify-center gap-2 rounded-lg border px-2 text-xs font-medium',
              active
                ? activeFormattingControlClassName
                : 'border-(--app-border) bg-(--app-workspace) text-(--app-muted)',
              'hover:bg-white/[0.05] hover:text-(--app-text)',
              'focus-visible:ring-2 focus-visible:ring-(--app-accent-500)/40 focus-visible:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-35'
            )}
            onMouseDown={(event) => {
              if (iconOnly) event.preventDefault()
            }}
          >
            <Link2 aria-hidden="true" className="size-4 shrink-0" />
            {!iconOnly && <span className="truncate">{active ? 'Изменить' : label}</span>}
          </button>
        </Popover.Trigger>
      </Tooltip>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-[90] w-80 rounded-xl border border-(--app-border) bg-(--app-surface-raised) p-4 text-(--app-text) outline-none"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Ссылка</p>

            <Tooltip content="Закрыть" side="top">
              <Popover.Close asChild>
                <button
                  type="button"
                  aria-label="Закрыть"
                  className="flex size-7 items-center justify-center rounded-md text-(--app-muted) hover:bg-white/[0.06] hover:text-(--app-text)"
                >
                  <X className="size-4" />
                </button>
              </Popover.Close>
            </Tooltip>
          </div>

          <form className="mt-3 grid gap-3" onSubmit={handleSubmit}>
            <input
              autoFocus
              value={href}
              placeholder="https://example.com"
              className="focus:border-accent-500/50 h-10 rounded-lg border border-(--app-border) bg-(--app-workspace) px-3 text-sm text-(--app-text) outline-none placeholder:text-(--app-muted)/60"
              onChange={(event) => {
                setHref(event.target.value)
                setError(null)
              }}
            />

            {error && <p className="text-xs leading-5 text-red-300">{error}</p>}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="submit"
                className="bg-accent-500 hover:bg-accent-400 flex h-9 items-center justify-center gap-2 rounded-lg text-sm font-medium text-white"
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
