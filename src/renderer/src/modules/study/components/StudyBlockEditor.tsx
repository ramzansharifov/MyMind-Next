import type { Editor } from '@tiptap/core'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Separator from '@radix-ui/react-separator'
import {
  ArrowDown,
  ArrowUp,
  Code2,
  ExternalLink,
  Heading,
  Link2,
  Minus,
  Plus,
  Trash2,
  Type
} from 'lucide-react'
import { useRef, useState } from 'react'

import type {
  StudyBlock,
  StudyBlockType,
  StudyDocument
} from '../../../../../shared/contracts/study'
import { cn } from '../../../shared/lib/cn'
import {
  createStudyBlock,
  DEFAULT_DIVIDER_COLOR,
  DEFAULT_DIVIDER_THICKNESS,
  getStudyTextBlockHtml,
  moveStudyBlock,
  removeStudyBlock,
  replaceStudyBlock
} from '../lib/study-document'
import { BlockSettingsPanel } from './BlockSettingsPanel'
import { BlockSettingsErrorBoundary } from './BlockSettingsErrorBoundary'
import { RichTextBlockEditor, RichTextViewer } from './rich-text/RichTextBlockEditor'

interface StudyBlockEditorProps {
  document: StudyDocument
  mode: 'edit' | 'read'
  onChange: (document: StudyDocument) => void
}

const blockTypes: Array<{
  type: StudyBlockType
  label: string
}> = [
  {
    type: 'text',
    label: 'Форматированный текст'
  },
  {
    type: 'heading',
    label: 'Заголовок'
  },
  {
    type: 'code',
    label: 'Код'
  },
  {
    type: 'link',
    label: 'Ссылка'
  },
  {
    type: 'divider',
    label: 'Разделитель'
  }
]

export function StudyBlockEditor({
  document,
  mode,
  onChange
}: StudyBlockEditorProps): React.JSX.Element {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(document.blocks[0]?.id ?? null)
  const [activeTextEditor, setActiveTextEditor] = useState<Editor | null>(null)

  const editorsRef = useRef(new Map<string, Editor>())

  const activeBlock =
    document.blocks.find((block) => block.id === activeBlockId) ?? document.blocks[0] ?? null

  if (mode === 'read') {
    return (
      <article className="mx-auto max-w-4xl space-y-5">
        {document.blocks.map((block) => (
          <StudyBlockReader key={block.id} block={block} />
        ))}
      </article>
    )
  }

  function updateBlock(replacement: StudyBlock): void {
    onChange(replaceStudyBlock(document, replacement.id, replacement))
  }

  function activateBlock(blockId: string): void {
    setActiveBlockId(blockId)
    setActiveTextEditor(editorsRef.current.get(blockId) ?? null)
  }

  function registerTextEditor(blockId: string, editor: Editor): void {
    editorsRef.current.set(blockId, editor)

    if (activeBlock?.id === blockId) {
      setActiveTextEditor(editor)
    }
  }

  function unregisterTextEditor(blockId: string, editor: Editor): void {
    if (editorsRef.current.get(blockId) === editor) {
      editorsRef.current.delete(blockId)
    }

    setActiveTextEditor((currentEditor) => (currentEditor === editor ? null : currentEditor))
  }

  function addBlock(type: StudyBlockType): void {
    const block = createStudyBlock(type)

    onChange({
      ...document,
      blocks: [...document.blocks, block]
    })

    setActiveBlockId(block.id)
    setActiveTextEditor(null)
  }

  function deleteBlock(blockId: string): void {
    editorsRef.current.delete(blockId)

    const currentIndex = document.blocks.findIndex((block) => block.id === blockId)
    const nextDocument = removeStudyBlock(document, blockId)
    const nextActiveBlock =
      nextDocument.blocks[Math.min(currentIndex, nextDocument.blocks.length - 1)] ?? null

    onChange(nextDocument)
    setActiveBlockId(nextActiveBlock?.id ?? null)
    setActiveTextEditor(
      nextActiveBlock ? (editorsRef.current.get(nextActiveBlock.id) ?? null) : null
    )
  }

  return (
    <div className="mx-auto grid max-w-[1240px] grid-cols-[minmax(0,1fr)_290px] items-start gap-4 max-[1050px]:grid-cols-1">
      <div className="min-w-0">
        <div className="space-y-3">
          {document.blocks.map((block, index) => (
            <StudyBlockCard
              key={block.id}
              block={block}
              isActive={activeBlock?.id === block.id}
              isFirst={index === 0}
              isLast={index === document.blocks.length - 1}
              onActivate={() => {
                activateBlock(block.id)
              }}
              onTextEditorReady={(editor) => {
                registerTextEditor(block.id, editor)
              }}
              onTextEditorActivate={(editor) => {
                editorsRef.current.set(block.id, editor)
                setActiveBlockId(block.id)
                setActiveTextEditor(editor)
              }}
              onTextEditorDispose={(editor) => {
                unregisterTextEditor(block.id, editor)
              }}
              onChange={updateBlock}
              onMove={(direction) => {
                onChange(moveStudyBlock(document, block.id, direction))
              }}
              onDelete={() => {
                deleteBlock(block.id)
              }}
            />
          ))}
        </div>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--app-border-strong)] py-3 text-sm font-medium text-[var(--app-muted)] transition-colors hover:border-violet-500/40 hover:bg-violet-500/[0.05] hover:text-violet-200"
            >
              <Plus aria-hidden="true" className="size-4" />
              Добавить блок
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              sideOffset={8}
              align="center"
              className="z-50 grid min-w-60 gap-1 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-1.5"
            >
              {blockTypes.map((option) => (
                <DropdownMenu.Item
                  key={option.type}
                  className="flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--app-text)] outline-none hover:bg-white/[0.06] focus:bg-white/[0.06]"
                  onSelect={() => {
                    addBlock(option.type)
                  }}
                >
                  <StudyBlockTypeIcon
                    type={option.type}
                    className="size-4 text-[var(--app-muted)]"
                  />

                  {option.label}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <div className="sticky top-0 max-h-[calc(100vh-150px)] overflow-y-auto pr-1 max-[1050px]:static max-[1050px]:max-h-none">
        <BlockSettingsErrorBoundary
          key={activeBlock?.id ?? 'empty'}
        >
          <BlockSettingsPanel
            block={activeBlock}
            textEditor={
              activeBlock?.type === 'text' &&
              activeTextEditor &&
              !activeTextEditor.isDestroyed
                ? activeTextEditor
                : null
            }
            onChange={updateBlock}
          />
        </BlockSettingsErrorBoundary>
      </div>
    </div>
  )
}

interface StudyBlockCardProps {
  block: StudyBlock
  isActive: boolean
  isFirst: boolean
  isLast: boolean
  onActivate: () => void
  onTextEditorReady: (editor: Editor) => void
  onTextEditorActivate: (editor: Editor) => void
  onTextEditorDispose: (editor: Editor) => void
  onChange: (block: StudyBlock) => void
  onMove: (direction: -1 | 1) => void
  onDelete: () => void
}

function StudyBlockCard({
  block,
  isActive,
  isFirst,
  isLast,
  onActivate,
  onTextEditorReady,
  onTextEditorActivate,
  onTextEditorDispose,
  onChange,
  onMove,
  onDelete
}: StudyBlockCardProps): React.JSX.Element {
  return (
    <section
      className={cn(
        'group rounded-xl border bg-[var(--app-surface)] p-3 transition-colors',
        isActive
          ? 'border-violet-500/40'
          : 'border-[var(--app-border)] hover:border-[var(--app-border-strong)]'
      )}
      onMouseDown={onActivate}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="mr-auto text-[11px] font-semibold tracking-[0.08em] text-[var(--app-muted)] uppercase">
          {getBlockLabel(block.type)}
        </span>

        <button
          type="button"
          aria-label="Переместить блок вверх"
          disabled={isFirst}
          className="flex size-7 items-center justify-center rounded-md text-[var(--app-muted)] hover:bg-white/[0.06] hover:text-[var(--app-text)] disabled:opacity-25"
          onClick={() => onMove(-1)}
        >
          <ArrowUp className="size-4" />
        </button>

        <button
          type="button"
          aria-label="Переместить блок вниз"
          disabled={isLast}
          className="flex size-7 items-center justify-center rounded-md text-[var(--app-muted)] hover:bg-white/[0.06] hover:text-[var(--app-text)] disabled:opacity-25"
          onClick={() => onMove(1)}
        >
          <ArrowDown className="size-4" />
        </button>

        <button
          type="button"
          aria-label="Удалить блок"
          className="flex size-7 items-center justify-center rounded-md text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300"
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {block.type === 'text' ? (
        <RichTextBlockEditor
          html={getStudyTextBlockHtml(block)}
          onReady={onTextEditorReady}
          onActivate={onTextEditorActivate}
          onDispose={onTextEditorDispose}
          onChange={(html, plainText) => {
            onChange({
              ...block,
              html,
              text: plainText
            })
          }}
        />
      ) : (
        <EditableBlock block={block} onChange={onChange} />
      )}
    </section>
  )
}

function EditableBlock({
  block,
  onChange
}: {
  block: Exclude<StudyBlock, { type: 'text' }>
  onChange: (block: StudyBlock) => void
}): React.JSX.Element {
  if (block.type === 'heading') {
    const className = block.level === 1 ? 'text-3xl' : block.level === 2 ? 'text-2xl' : 'text-xl'

    return (
      <input
        value={block.text}
        placeholder="Заголовок"
        className={cn(
          'w-full bg-transparent font-semibold tracking-tight text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60',
          className
        )}
        onChange={(event) => {
          onChange({
            ...block,
            text: event.target.value
          })
        }}
      />
    )
  }

  if (block.type === 'code') {
    return (
      <textarea
        value={block.source}
        rows={10}
        spellCheck={false}
        placeholder="Код…"
        className="w-full resize-y rounded-lg bg-[#090a0c] p-4 font-mono text-sm leading-6 text-zinc-200 outline-none placeholder:text-zinc-600"
        onChange={(event) => {
          onChange({
            ...block,
            source: event.target.value
          })
        }}
      />
    )
  }

  if (block.type === 'link') {
    const href = normalizeExternalHref(block.url)

    if (!href) {
      return (
        <div className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.05] px-4 py-3 text-sm text-red-300">
          <Link2 className="size-4" />

          {block.url.trim() ? 'Некорректная или небезопасная ссылка' : 'Пустая ссылка'}
        </div>
      )
    }

    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-sm font-medium text-violet-300 hover:border-violet-500/35 hover:bg-violet-500/[0.05]"
      >
        <Link2 className="size-4" />

        {block.title || block.url}
      </a>
    )
  }

  return (
    <div className="py-4">
      <div
        className="w-full rounded-full"
        style={{
          height: `${block.thickness ?? DEFAULT_DIVIDER_THICKNESS}px`,
          backgroundColor: block.color ?? DEFAULT_DIVIDER_COLOR
        }}
      />
    </div>
  )
}

function StudyBlockReader({ block }: { block: StudyBlock }): React.JSX.Element {
  if (block.type === 'text') {
    return <RichTextViewer html={getStudyTextBlockHtml(block)} plainText={block.text} />
  }

  if (block.type === 'heading') {
    if (block.level === 1) {
      return (
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--app-text)]">
          {block.text || 'Без заголовка'}
        </h1>
      )
    }

    if (block.level === 2) {
      return (
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--app-text)]">
          {block.text || 'Без заголовка'}
        </h2>
      )
    }

    return (
      <h3 className="text-xl font-semibold tracking-tight text-[var(--app-text)]">
        {block.text || 'Без заголовка'}
      </h3>
    )
  }

  if (block.type === 'code') {
    return (
      <section>
        <p className="mb-2 text-xs font-medium text-[var(--app-muted)]">
          {block.language || 'text'}
        </p>

        <pre className="overflow-x-auto rounded-xl border border-[var(--app-border)] bg-[#090a0c] p-4 font-mono text-sm leading-6 text-zinc-200">
          <code>{block.source}</code>
        </pre>
      </section>
    )
  }

  if (block.type === 'link') {
    const href = normalizeExternalHref(block.url)

    if (!href) {
      return (
        <div className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.05] px-4 py-3 text-sm text-red-300">
          <ExternalLink aria-hidden="true" className="size-4" />

          {block.url.trim() ? 'Некорректная или небезопасная ссылка' : 'Пустая ссылка'}
        </div>
      )
    }

    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-sm font-medium text-violet-300 transition-colors hover:border-violet-500/35 hover:bg-violet-500/[0.05]"
      >
        <ExternalLink aria-hidden="true" className="size-4" />

        {block.title || block.url}
      </a>
    )
  }

  return (
    <div className="py-4">
      <Separator.Root
        decorative
        orientation="horizontal"
        className="w-full rounded-full"
        style={{
          height: `${block.thickness ?? DEFAULT_DIVIDER_THICKNESS}px`,
          backgroundColor: block.color ?? DEFAULT_DIVIDER_COLOR
        }}
      />
    </div>
  )
}
function normalizeExternalHref(value: string): string | null {
  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const url = new URL(candidate)

    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

function StudyBlockTypeIcon({
  type,
  className
}: {
  type: StudyBlockType
  className?: string
}): React.JSX.Element {
  if (type === 'heading') {
    return <Heading aria-hidden="true" className={className} />
  }

  if (type === 'code') {
    return <Code2 aria-hidden="true" className={className} />
  }

  if (type === 'link') {
    return <Link2 aria-hidden="true" className={className} />
  }

  if (type === 'divider') {
    return <Minus aria-hidden="true" className={className} />
  }

  return <Type aria-hidden="true" className={className} />
}
function getBlockLabel(type: StudyBlockType): string {
  return blockTypes.find((option) => option.type === type)?.label ?? type
}
