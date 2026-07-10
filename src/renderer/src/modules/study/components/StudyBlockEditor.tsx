import type { Editor } from '@tiptap/core'
import * as Collapsible from '@radix-ui/react-collapsible'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Separator from '@radix-ui/react-separator'
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Code2,
  CopyPlus,
  ExternalLink,
  Heading,
  Link2,
  Minus,
  Plus,
  Trash2,
  Type
} from 'lucide-react'
import { Fragment, useRef, useState } from 'react'

import type {
  StudyBlock,
  StudyBlockType,
  StudyDocument
} from '../../../../../shared/contracts/study'
import { cn } from '../../../shared/lib/cn'
import {
  cloneStudyBlock,
  createStudyBlock,
  DEFAULT_DIVIDER_COLOR,
  DEFAULT_DIVIDER_THICKNESS,
  DEFAULT_HEADING_COLOR,
  getStudyTextBlockHtml,
  insertStudyBlock,
  moveStudyBlock,
  removeStudyBlock,
  replaceStudyBlock
} from '../lib/study-document'
import { BlockSettingsErrorBoundary } from './BlockSettingsErrorBoundary'
import { BlockSettingsPanel } from './BlockSettingsPanel'
import { StudyCodeBlock } from './code/StudyCodeBlock'
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
    return <ReadOnlyStudyDocument document={document} />
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

  function insertBlock(type: StudyBlockType, index: number): void {
    const block = createStudyBlock(type)

    onChange(insertStudyBlock(document, index, block))

    setActiveBlockId(block.id)
    setActiveTextEditor(null)
  }

  function duplicateBlock(blockId: string): void {
    const sourceIndex = document.blocks.findIndex((block) => block.id === blockId)

    if (sourceIndex < 0) {
      return
    }

    const duplicate = cloneStudyBlock(document.blocks[sourceIndex])

    onChange(insertStudyBlock(document, sourceIndex + 1, duplicate))

    setActiveBlockId(duplicate.id)
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
        <div>
          <BlockInsertMenu
            onInsert={(type) => {
              insertBlock(type, 0)
            }}
          />

          {document.blocks.map((block, index) => (
            <Fragment key={block.id}>
              <StudyBlockCard
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
                onDuplicate={() => {
                  duplicateBlock(block.id)
                }}
                onDelete={() => {
                  deleteBlock(block.id)
                }}
              />

              <BlockInsertMenu
                onInsert={(type) => {
                  insertBlock(type, index + 1)
                }}
              />
            </Fragment>
          ))}
        </div>
      </div>

      <div className="sticky top-0 max-h-[calc(100vh-150px)] overflow-y-auto pr-1 max-[1050px]:static max-[1050px]:max-h-none">
        <BlockSettingsErrorBoundary key={activeBlock?.id ?? 'empty'}>
          <BlockSettingsPanel
            block={activeBlock}
            textEditor={
              activeBlock?.type === 'text' && activeTextEditor && !activeTextEditor.isDestroyed
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

function BlockInsertMenu({
  onInsert
}: {
  onInsert: (type: StudyBlockType) => void
}): React.JSX.Element {
  return (
    <DropdownMenu.Root>
      <div className="group/insert flex h-8 items-center">
        <span className="h-px flex-1 bg-transparent transition-colors group-hover/insert:bg-[var(--app-border)]" />

        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label="Добавить блок здесь"
            className="mx-2 flex size-6 shrink-0 items-center justify-center rounded-full text-[var(--app-muted)] opacity-45 transition-all hover:bg-violet-500/15 hover:text-violet-200 hover:opacity-100 focus-visible:opacity-100"
          >
            <Plus aria-hidden="true" className="size-3.5" />
          </button>
        </DropdownMenu.Trigger>

        <span className="h-px flex-1 bg-transparent transition-colors group-hover/insert:bg-[var(--app-border)]" />
      </div>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={6}
          align="center"
          className="z-50 grid min-w-60 gap-1 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-1.5"
        >
          {blockTypes.map((option) => (
            <DropdownMenu.Item
              key={option.type}
              className="flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--app-text)] outline-none hover:bg-white/[0.06] focus:bg-white/[0.06]"
              onSelect={() => {
                onInsert(option.type)
              }}
            >
              <StudyBlockTypeIcon type={option.type} className="size-4 text-[var(--app-muted)]" />

              {option.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
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
  onDuplicate: () => void
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
  onDuplicate,
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
          <ArrowUp aria-hidden="true" className="size-4" />
        </button>

        <button
          type="button"
          aria-label="Переместить блок вниз"
          disabled={isLast}
          className="flex size-7 items-center justify-center rounded-md text-[var(--app-muted)] hover:bg-white/[0.06] hover:text-[var(--app-text)] disabled:opacity-25"
          onClick={() => onMove(1)}
        >
          <ArrowDown aria-hidden="true" className="size-4" />
        </button>

        <button
          type="button"
          aria-label="Дублировать блок"
          className="flex size-7 items-center justify-center rounded-md text-[var(--app-muted)] hover:bg-white/[0.06] hover:text-[var(--app-text)]"
          onClick={onDuplicate}
        >
          <CopyPlus aria-hidden="true" className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Удалить блок"
          className="flex size-7 items-center justify-center rounded-md text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300"
          onClick={onDelete}
        >
          <Trash2 aria-hidden="true" className="size-4" />
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

function getHeadingTypography(level: 1 | 2 | 3): {
  fontSize: string
  lineHeight: string
  letterSpacing: string
} {
  if (level === 1) {
    return {
      fontSize: '3rem',
      lineHeight: '1.05',
      letterSpacing: '-0.035em'
    }
  }

  if (level === 2) {
    return {
      fontSize: '2.25rem',
      lineHeight: '1.15',
      letterSpacing: '-0.025em'
    }
  }

  return {
    fontSize: '1.875rem',
    lineHeight: '1.2',
    letterSpacing: '-0.02em'
  }
}

function EditableBlock({
  block,
  onChange
}: {
  block: Exclude<StudyBlock, { type: 'text' }>
  onChange: (block: StudyBlock) => void
}): React.JSX.Element {
  if (block.type === 'heading') {
    const typography = getHeadingTypography(block.level)

    return (
      <input
        value={block.text}
        placeholder="Заголовок"
        className={cn(
          'w-full rounded-lg px-2 py-2',
          'font-semibold outline-none',
          'placeholder:text-[var(--app-muted)]/60',
          'transition-[color,background-color,font-size]'
        )}
        style={{
          ...typography,
          color: block.color ?? DEFAULT_HEADING_COLOR,
          backgroundColor: block.backgroundColor ?? 'transparent'
        }}
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
      <StudyCodeBlock
        mode="edit"
        source={block.source}
        language={block.language}
        onChange={(source) => {
          onChange({
            ...block,
            source
          })
        }}
      />
    )
  }

  if (block.type === 'link') {
    const href = normalizeExternalHref(block.url)

    return (
      <div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed border-[var(--app-border)] p-4">
        <div className="min-w-0 text-center">
          <ExternalLink aria-hidden="true" className="mx-auto size-5 text-violet-300" />

          <p className="mt-2 truncate text-sm font-medium text-[var(--app-text)]">
            {block.title || 'Ссылка без названия'}
          </p>

          <p
            className={cn(
              'mt-1 max-w-md truncate text-xs',
              href ? 'text-[var(--app-muted)]' : 'text-red-300'
            )}
          >
            {block.url || 'Укажи адрес в настройках'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8">
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

type StudyHeadingBlock = Extract<StudyBlock, { type: 'heading' }>

interface StudyReadBlockNode {
  kind: 'block'
  block: StudyBlock
}

interface StudyReadSectionNode {
  kind: 'section'
  heading: StudyHeadingBlock
  children: StudyReadNode[]
}

type StudyReadNode = StudyReadBlockNode | StudyReadSectionNode

function ReadOnlyStudyDocument({ document }: { document: StudyDocument }): React.JSX.Element {
  const outline = buildStudyReadOutline(document.blocks)

  return (
    <article className="mx-auto max-w-4xl space-y-6">
      {outline.map((node) => (
        <StudyReadNodeView key={getStudyReadNodeKey(node)} node={node} />
      ))}
    </article>
  )
}

function moveTrailingDividerOutsideSection(
  sectionStack: StudyReadSectionNode[],
  root: StudyReadNode[],
  nextHeadingLevel: 1 | 2 | 3
): void {
  const closingSection = sectionStack[sectionStack.length - 1]

  if (!closingSection || closingSection.heading.level !== nextHeadingLevel) {
    return
  }

  const trailingNode = closingSection.children[closingSection.children.length - 1]

  if (!trailingNode || trailingNode.kind !== 'block' || trailingNode.block.type !== 'divider') {
    return
  }

  closingSection.children.pop()

  const parentSection = sectionStack[sectionStack.length - 2]

  if (parentSection) {
    parentSection.children.push(trailingNode)
    return
  }

  root.push(trailingNode)
}
function buildStudyReadOutline(blocks: StudyBlock[]): StudyReadNode[] {
  const root: StudyReadNode[] = []
  const sectionStack: StudyReadSectionNode[] = []

  blocks.forEach((block) => {
    if (block.type === 'heading') {
      const section: StudyReadSectionNode = {
        kind: 'section',
        heading: block,
        children: []
      }

      moveTrailingDividerOutsideSection(sectionStack, root, block.level)

      while (
        sectionStack.length > 0 &&
        sectionStack[sectionStack.length - 1].heading.level >= block.level
      ) {
        sectionStack.pop()
      }

      const parentSection = sectionStack[sectionStack.length - 1]

      if (parentSection) {
        parentSection.children.push(section)
      } else {
        root.push(section)
      }

      sectionStack.push(section)

      return
    }

    const blockNode: StudyReadBlockNode = {
      kind: 'block',
      block
    }

    const parentSection = sectionStack[sectionStack.length - 1]

    if (parentSection) {
      parentSection.children.push(blockNode)
    } else {
      root.push(blockNode)
    }
  })

  return root
}

function StudyReadNodeView({ node }: { node: StudyReadNode }): React.JSX.Element {
  if (node.kind === 'section') {
    return <StudyReadSection section={node} />
  }

  return <StudyBlockReader block={node.block} />
}

function StudyReadSection({ section }: { section: StudyReadSectionNode }): React.JSX.Element {
  const [open, setOpen] = useState(true)

  const hasContent = section.children.length > 0

  const headingTitle = section.heading.text || 'Без заголовка'

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} className="group/read-section">
      <Collapsible.Trigger asChild>
        <button
          type="button"
          disabled={!hasContent}
          aria-label={
            open ? `Свернуть раздел «${headingTitle}»` : `Развернуть раздел «${headingTitle}»`
          }
          className={cn(
            'flex w-full items-center gap-1 rounded-xl py-0.5 pr-2 pl-1',
            'text-left outline-none',
            'transition-colors duration-150',
            hasContent && 'hover:bg-white/[0.025]',
            'focus-visible:ring-2 focus-visible:ring-violet-500/35',
            !hasContent && 'cursor-default'
          )}
        >
          <ChevronRight
            aria-hidden="true"
            className={cn(
              'ml-0.5 size-4 shrink-0 text-[var(--app-muted)]',
              'transition-transform duration-200 ease-out',
              open && 'rotate-90',
              !hasContent && 'opacity-0'
            )}
          />

          <div className="min-w-0 flex-1">
            <StudyReadHeading heading={section.heading} />
          </div>
        </button>
      </Collapsible.Trigger>

      <Collapsible.Content className="study-read-collapsible-content overflow-hidden">
        <div className="mt-3 ml-[14px] space-y-6 border-l border-[var(--app-border)] pl-3">
          {section.children.map((child) => (
            <StudyReadNodeView key={getStudyReadNodeKey(child)} node={child} />
          ))}
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}

function getStudyReadNodeKey(node: StudyReadNode): string {
  return node.kind === 'section' ? node.heading.id : node.block.id
}

function StudyReadHeading({ heading }: { heading: StudyHeadingBlock }): React.JSX.Element {
  const typography = getHeadingTypography(heading.level)

  const style = {
    ...typography,
    color: heading.color ?? DEFAULT_HEADING_COLOR,
    backgroundColor: heading.backgroundColor ?? 'transparent'
  }

  const className = 'rounded-lg px-1 py-1.5 font-semibold'

  if (heading.level === 1) {
    return (
      <h1 className={className} style={style}>
        {heading.text || 'Без заголовка'}
      </h1>
    )
  }

  if (heading.level === 2) {
    return (
      <h2 className={className} style={style}>
        {heading.text || 'Без заголовка'}
      </h2>
    )
  }

  return (
    <h3 className={className} style={style}>
      {heading.text || 'Без заголовка'}
    </h3>
  )
}

function StudyBlockReader({ block }: { block: StudyBlock }): React.JSX.Element {
  if (block.type === 'text') {
    return <RichTextViewer html={getStudyTextBlockHtml(block)} plainText={block.text} />
  }

  if (block.type === 'heading') {
    return <StudyReadHeading heading={block} />
  }

  if (block.type === 'code') {
    return <StudyCodeBlock mode="read" source={block.source} language={block.language} />
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

function getBlockLabel(type: StudyBlock['type']): string {
  return blockTypes.find((option) => option.type === type)?.label ?? type
}
