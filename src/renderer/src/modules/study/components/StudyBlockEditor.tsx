import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent
} from '@dnd-kit/core'
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
  FileAudio,
  FileCode2,
  FileImage,
  Files,
  FileVideo,
  Heading,
  GripVertical,
  Sigma,
  Workflow,
  Minus,
  Plus,
  Trash2,
  Type
} from 'lucide-react'
import { Fragment, useEffect, useRef, useState } from 'react'

import type {
  StudyBlock,
  StudyBlockType,
  StudyDocument
} from '../../../../../shared/contracts/study'
import { cn } from '../../../shared/lib/cn'
import { AutoGrowTextarea } from '../../../shared/ui/AutoGrowTextarea'
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
import { moveStudyBlockByDrop, type StudyBlockDropPlacement } from '../lib/study-block-dnd'
import {
  getStudyHeadingElementId,
  STUDY_REVEAL_HEADING_EVENT,
  type StudyRevealHeadingDetail
} from '../lib/study-read-navigation'
import { BlockSettingsErrorBoundary } from './BlockSettingsErrorBoundary'
import { BlockSettingsPanel } from './BlockSettingsPanel'
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog'
import { StudyCodeBlock } from './code/StudyCodeBlock'
import { StudyFileBlockView } from './file/StudyFileBlockView'
import { StudyMarkdownBlock } from './markdown/StudyMarkdownBlock'
import { StudyLatexBlock } from './latex/StudyLatexBlock'
import { StudyMermaidBlock } from './mermaid/StudyMermaidBlock'
import { RichTextBlockEditor, RichTextViewer } from './rich-text/RichTextBlockEditor'

interface StudyBlockEditorProps {
  materialId: string
  document: StudyDocument
  mode: 'edit' | 'read'
  onChange: (document: StudyDocument) => void
}
interface StudyBlockDropPreview {
  blockId: string
  placement: StudyBlockDropPlacement
}

interface StudyBlockDropData {
  kind: 'study-block-drop'
  blockId: string
  placement: StudyBlockDropPlacement
}

const STUDY_BLOCK_DROP_PREFIX = 'study-block-drop'

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
    type: 'markdown',
    label: 'Markdown'
  },
  {
    type: 'latex',
    label: 'LaTeX'
  },
  {
    type: 'mermaid',
    label: 'Mermaid'
  },
  {
    type: 'image',
    label: 'Фото'
  },
  {
    type: 'video',
    label: 'Видео'
  },
  {
    type: 'audio',
    label: 'Аудио'
  },
  {
    type: 'file',
    label: 'Файл'
  },

  {
    type: 'divider',
    label: 'Разделитель'
  }
]

export function StudyBlockEditor({
  materialId,
  document,
  mode,
  onChange
}: StudyBlockEditorProps): React.JSX.Element {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(document.blocks[0]?.id ?? null)

  const [activeTextEditor, setActiveTextEditor] = useState<Editor | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<StudyBlock | null>(null)

  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null)

  const [blockDropPreview, setBlockDropPreview] = useState<StudyBlockDropPreview | null>(null)

  const blockDragSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  )

  const editorsRef = useRef(new Map<string, Editor>())

  const activeBlock =
    document.blocks.find((block) => block.id === activeBlockId) ?? document.blocks[0] ?? null
  const draggedBlock = document.blocks.find((block) => block.id === draggedBlockId) ?? null

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

  function handleBlockDragStart(event: DragStartEvent): void {
    const blockId = String(event.active.id)

    if (!document.blocks.some((block) => block.id === blockId)) {
      return
    }

    setDraggedBlockId(blockId)
    setBlockDropPreview(null)
    activateBlock(blockId)
  }

  function handleBlockDragOver(event: DragOverEvent): void {
    setBlockDropPreview(resolveStudyBlockDropPreview(event))
  }

  function handleBlockDragEnd(event: DragEndEvent): void {
    const activeId = String(event.active.id)

    const preview = resolveStudyBlockDropPreview(event) ?? blockDropPreview

    setDraggedBlockId(null)
    setBlockDropPreview(null)

    if (!preview) {
      return
    }

    const nextDocument = moveStudyBlockByDrop(
      document,
      activeId,
      preview.blockId,
      preview.placement
    )

    if (nextDocument !== document) {
      onChange(nextDocument)
    }
  }

  function cancelBlockDrag(): void {
    setDraggedBlockId(null)
    setBlockDropPreview(null)
  }
  return (
    <DndContext
      sensors={blockDragSensors}
      collisionDetection={pointerWithin}
      onDragStart={handleBlockDragStart}
      onDragOver={handleBlockDragOver}
      onDragEnd={handleBlockDragEnd}
      onDragCancel={cancelBlockDrag}
    >
      <div className="mx-auto grid w-full max-w-[1320px] grid-cols-[minmax(0,1fr)_320px] items-start gap-5 max-[1180px]:grid-cols-1">
        <div className="min-w-0">
          <div className="relative">
            <BlockInsertMenu
              overlay={document.blocks.length > 0}
              persistent={document.blocks.length === 0}
              onInsert={(type) => {
                insertBlock(type, 0)
              }}
            />

            {document.blocks.map((block, index) => (
              <Fragment key={block.id}>
                <StudyBlockDragItem
                  block={block}
                  dragDisabled={document.blocks.length < 2}
                  isDragging={draggedBlockId === block.id}
                  dropPlacement={
                    blockDropPreview?.blockId === block.id ? blockDropPreview.placement : null
                  }
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
                    setDeleteTarget(block)
                  }}
                />

                <BlockInsertMenu
                  persistent={index === document.blocks.length - 1}
                  onInsert={(type) => {
                    insertBlock(type, index + 1)
                  }}
                />
              </Fragment>
            ))}
          </div>
        </div>

        <div className="sticky top-0 min-w-0 max-[1180px]:static max-[1180px]:mx-auto max-[1180px]:mt-2 max-[1180px]:w-full max-[1180px]:max-w-xl">
          <BlockSettingsErrorBoundary key={activeBlock?.id ?? 'empty'}>
            <BlockSettingsPanel
              block={activeBlock}
              materialId={materialId}
              textEditor={
                activeBlock?.type === 'text' && activeTextEditor && !activeTextEditor.isDestroyed
                  ? activeTextEditor
                  : null
              }
              onChange={updateBlock}
            />
          </BlockSettingsErrorBoundary>
        </div>
        <DeleteConfirmationDialog
          open={deleteTarget !== null}
          title="Удалить блок?"
          subject={deleteTarget ? getBlockLabel(deleteTarget.type) : undefined}
          description="Блок и всё его содержимое будут удалены из материала."
          onOpenChange={(open) => {
            if (!open) {
              setDeleteTarget(null)
            }
          }}
          onConfirm={() => {
            if (deleteTarget) {
              deleteBlock(deleteTarget.id)
            }

            setDeleteTarget(null)
          }}
        />
      </div>

      <DragOverlay dropAnimation={null}>
        {draggedBlock ? <StudyBlockDragOverlay block={draggedBlock} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function resolveStudyBlockDropPreview(
  event: DragOverEvent | DragEndEvent
): StudyBlockDropPreview | null {
  const data = event.over?.data.current

  if (!isStudyBlockDropData(data)) {
    return null
  }

  return {
    blockId: data.blockId,
    placement: data.placement
  }
}

function isStudyBlockDropData(value: unknown): value is StudyBlockDropData {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<StudyBlockDropData>

  return (
    candidate.kind === 'study-block-drop' &&
    typeof candidate.blockId === 'string' &&
    (candidate.placement === 'before' || candidate.placement === 'after')
  )
}
function BlockInsertMenu({
  onInsert,
  persistent = false,
  overlay = false
}: {
  onInsert: (type: StudyBlockType) => void
  persistent?: boolean
  overlay?: boolean
}): React.JSX.Element {
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          'group/insert flex items-center',
          overlay && 'absolute inset-x-0 top-0 z-10 -translate-y-1/2',
          'transition-[height] duration-150 ease-out',
          open || persistent ? 'h-8' : 'h-3 focus-within:h-8 hover:h-8'
        )}
      >
        <span
          className={cn(
            'h-px flex-1 transition-colors duration-150',
            open
              ? 'bg-[var(--app-border)]'
              : 'bg-transparent group-focus-within/insert:bg-[var(--app-border)] group-hover/insert:bg-[var(--app-border)]'
          )}
        />

        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label="Добавить блок здесь"
            className={cn(
              'mx-2 flex size-6 shrink-0 items-center justify-center rounded-full',
              'text-[var(--app-muted)] outline-none',
              'transition-[opacity,transform,background-color,color] duration-150',
              'hover:bg-violet-500/15 hover:text-violet-200',
              'focus-visible:ring-2 focus-visible:ring-violet-500/35',
              open || persistent
                ? 'scale-100 opacity-100'
                : 'scale-75 opacity-0 group-focus-within/insert:scale-100 group-focus-within/insert:opacity-100 group-hover/insert:scale-100 group-hover/insert:opacity-100'
            )}
          >
            <Plus aria-hidden="true" className="size-3.5" />
          </button>
        </DropdownMenu.Trigger>

        <span
          className={cn(
            'h-px flex-1 transition-colors duration-150',
            open
              ? 'bg-[var(--app-border)]'
              : 'bg-transparent group-focus-within/insert:bg-[var(--app-border)] group-hover/insert:bg-[var(--app-border)]'
          )}
        />
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

interface StudyBlockDragItemProps extends Omit<
  StudyBlockCardProps,
  'dragDisabled' | 'dragHandleAttributes' | 'dragHandleListeners' | 'isDragging'
> {
  dragDisabled: boolean
  isDragging: boolean
  dropPlacement: StudyBlockDropPlacement | null
}

function StudyBlockDragItem({
  block,
  dragDisabled,
  isDragging,
  dropPlacement,
  ...cardProps
}: StudyBlockDragItemProps): React.JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef
  } = useDraggable({
    id: block.id,
    disabled: dragDisabled
  })

  const { setNodeRef: setBeforeDropRef } = useDroppable({
    id: `${STUDY_BLOCK_DROP_PREFIX}:${block.id}:before`,
    disabled: dragDisabled,
    data: {
      kind: 'study-block-drop',
      blockId: block.id,
      placement: 'before'
    } satisfies StudyBlockDropData
  })

  const { setNodeRef: setAfterDropRef } = useDroppable({
    id: `${STUDY_BLOCK_DROP_PREFIX}:${block.id}:after`,
    disabled: dragDisabled,
    data: {
      kind: 'study-block-drop',
      blockId: block.id,
      placement: 'after'
    } satisfies StudyBlockDropData
  })

  return (
    <div ref={setDraggableRef} className={cn('relative', isDragging && 'opacity-35')}>
      <span
        ref={setBeforeDropRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-1/2"
      />

      <span
        ref={setAfterDropRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-1/2"
      />

      {dropPlacement === 'before' && <StudyBlockDropIndicator position="before" />}

      <StudyBlockCard
        {...cardProps}
        block={block}
        dragDisabled={dragDisabled}
        dragHandleAttributes={attributes}
        dragHandleListeners={listeners}
        isDragging={isDragging}
      />

      {dropPlacement === 'after' && <StudyBlockDropIndicator position="after" />}
    </div>
  )
}

function StudyBlockDropIndicator({
  position
}: {
  position: StudyBlockDropPlacement
}): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-x-1 z-30 flex items-center',
        position === 'before' ? '-top-1' : '-bottom-1'
      )}
    >
      <span className="size-2 shrink-0 rounded-full bg-violet-400 shadow-[0_0_0_3px_rgb(139_92_246/0.16)]" />

      <span className="h-0.5 flex-1 rounded-full bg-violet-400 shadow-[0_0_12px_rgb(139_92_246/0.45)]" />
    </span>
  )
}

function StudyBlockDragOverlay({ block }: { block: StudyBlock }): React.JSX.Element {
  return (
    <div className="flex h-11 max-w-72 items-center gap-3 rounded-xl border border-violet-500/45 bg-[var(--app-surface-raised)] px-3 text-sm text-[var(--app-text)] shadow-2xl shadow-black/35">
      <GripVertical aria-hidden="true" className="size-4 shrink-0 text-violet-300" />

      <StudyBlockTypeIcon type={block.type} className="size-4 shrink-0 text-[var(--app-muted)]" />

      <span className="truncate font-medium">{getBlockLabel(block.type)}</span>
    </div>
  )
}
interface StudyBlockCardProps {
  block: StudyBlock
  isActive: boolean
  isFirst: boolean
  isLast: boolean
  dragDisabled: boolean
  dragHandleAttributes: ReturnType<typeof useDraggable>['attributes']
  dragHandleListeners: ReturnType<typeof useDraggable>['listeners']
  isDragging: boolean
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
  dragDisabled,
  dragHandleAttributes,
  dragHandleListeners,
  isDragging,
  onActivate,
  onTextEditorReady,
  onTextEditorActivate,
  onTextEditorDispose,
  onChange,
  onMove,
  onDuplicate,
  onDelete
}: StudyBlockCardProps): React.JSX.Element {
  const [open, setOpen] = useState(true)
  const blockLabel = getBlockLabel(block.type)

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} asChild>
      <section
        className={cn(
          'group rounded-xl border bg-[var(--app-surface)] p-3 transition-[border-color,box-shadow]',
          isDragging && 'shadow-none',
          isActive
            ? 'border-violet-500/40'
            : 'border-[var(--app-border)] hover:border-[var(--app-border-strong)]'
        )}
        onMouseDown={onActivate}
      >
        <div className={cn('flex items-center gap-2', open && 'mb-2')}>
          <button
            type="button"
            aria-label={`Перетащить блок «${blockLabel}»`}
            title="Перетащить блок"
            disabled={dragDisabled}
            className={cn(
              'flex size-7 shrink-0 touch-none items-center justify-center rounded-md',
              'text-[var(--app-muted)] outline-none',
              'cursor-grab transition-colors',
              'hover:bg-white/[0.06] hover:text-violet-300',
              'active:cursor-grabbing',
              'focus-visible:ring-2 focus-visible:ring-violet-500/35',
              'disabled:cursor-default disabled:opacity-25'
            )}
            {...dragHandleAttributes}
            {...dragHandleListeners}
          >
            <GripVertical aria-hidden="true" className="size-4" />
          </button>
          <Collapsible.Trigger asChild>
            <button
              type="button"
              aria-label={
                open ? `Свернуть блок «${blockLabel}»` : `Развернуть блок «${blockLabel}»`
              }
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-md',
                'text-[var(--app-muted)] outline-none',
                'transition-colors',
                'hover:bg-white/[0.06] hover:text-[var(--app-text)]',
                'focus-visible:ring-2 focus-visible:ring-violet-500/35'
              )}
            >
              <ChevronRight
                aria-hidden="true"
                className={cn(
                  'size-4 transition-transform duration-200 ease-out',
                  open && 'rotate-90'
                )}
              />
            </button>
          </Collapsible.Trigger>

          <span className="mr-auto text-[11px] font-semibold tracking-[0.08em] text-[var(--app-muted)] uppercase">
            {blockLabel}
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

        <Collapsible.Content forceMount className="data-[state=closed]:hidden">
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
        </Collapsible.Content>
      </section>
    </Collapsible.Root>
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
      <AutoGrowTextarea
        value={block.text}
        resizeKey={block.level}
        placeholder="Заголовок"
        aria-label="Текст заголовка"
        className={cn(
          'max-h-[24rem] w-full rounded-lg px-2 py-2',
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
  if (block.type === 'markdown') {
    return (
      <StudyMarkdownBlock
        mode="edit"
        source={block.source}
        viewMode={block.viewMode ?? 'split'}
        onChange={(source) => {
          onChange({
            ...block,
            source
          })
        }}
        onViewModeChange={(viewMode) => {
          onChange({
            ...block,
            viewMode
          })
        }}
      />
    )
  }
  if (block.type === 'latex') {
    return (
      <StudyLatexBlock
        mode="edit"
        source={block.source}
        viewMode={block.viewMode ?? 'split'}
        displayMode={block.displayMode ?? 'display'}
        alignment={block.alignment ?? 'center'}
        scale={block.scale ?? 100}
        onChange={(source) => {
          onChange({
            ...block,
            source
          })
        }}
        onViewModeChange={(viewMode) => {
          onChange({
            ...block,
            viewMode
          })
        }}
      />
    )
  }
  if (block.type === 'mermaid') {
    return (
      <StudyMermaidBlock
        mode="edit"
        source={block.source}
        viewMode={block.viewMode ?? 'split'}
        theme={block.theme ?? 'dark'}
        scale={block.scale ?? 100}
        onChange={(source) => {
          onChange({
            ...block,
            source
          })
        }}
        onViewModeChange={(viewMode) => {
          onChange({
            ...block,
            viewMode
          })
        }}
      />
    )
  }
  if (
    block.type === 'image' ||
    block.type === 'video' ||
    block.type === 'audio' ||
    block.type === 'file'
  ) {
    return <StudyFileBlockView block={block} />
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
    <div className="mx-auto min-h-[85vh] w-full max-w-5xl rounded-2xl border border-[var(--app-border)]">
      <article
        aria-label="Содержимое материала"
        className="min-h-64 w-full space-y-7 px-10 py-10 max-[900px]:px-7 max-[640px]:space-y-6 max-[640px]:px-4 max-[640px]:py-6"
      >
        {outline.map((node) => (
          <StudyReadNodeView key={getStudyReadNodeKey(node)} node={node} />
        ))}
      </article>
    </div>
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

  useEffect(() => {
    function handleRevealHeading(event: Event): void {
      const detail = (event as CustomEvent<StudyRevealHeadingDetail>).detail

      if (!detail?.headingId || !sectionContainsHeading(section, detail.headingId)) {
        return
      }

      setOpen(true)
    }

    window.addEventListener(STUDY_REVEAL_HEADING_EVENT, handleRevealHeading)

    return () => {
      window.removeEventListener(STUDY_REVEAL_HEADING_EVENT, handleRevealHeading)
    }
  }, [section])

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

function sectionContainsHeading(section: StudyReadSectionNode, headingId: string): boolean {
  if (section.heading.id === headingId) {
    return true
  }

  return section.children.some(
    (child) => child.kind === 'section' && sectionContainsHeading(child, headingId)
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

  const className = 'scroll-mt-6 rounded-lg px-1 py-1.5 font-semibold'

  if (heading.level === 1) {
    return (
      <h1
        id={getStudyHeadingElementId(heading.id)}
        data-study-heading-id={heading.id}
        className={className}
        style={style}
      >
        {heading.text || 'Без заголовка'}
      </h1>
    )
  }

  if (heading.level === 2) {
    return (
      <h2
        id={getStudyHeadingElementId(heading.id)}
        data-study-heading-id={heading.id}
        className={className}
        style={style}
      >
        {heading.text || 'Без заголовка'}
      </h2>
    )
  }

  return (
    <h3
      id={getStudyHeadingElementId(heading.id)}
      data-study-heading-id={heading.id}
      className={className}
      style={style}
    >
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
  if (block.type === 'markdown') {
    return <StudyMarkdownBlock mode="read" source={block.source} />
  }
  if (block.type === 'latex') {
    return (
      <StudyLatexBlock
        mode="read"
        source={block.source}
        displayMode={block.displayMode ?? 'display'}
        alignment={block.alignment ?? 'center'}
        scale={block.scale ?? 100}
      />
    )
  }
  if (block.type === 'mermaid') {
    return (
      <StudyMermaidBlock
        mode="read"
        source={block.source}
        theme={block.theme ?? 'dark'}
        scale={block.scale ?? 100}
      />
    )
  }
  if (
    block.type === 'image' ||
    block.type === 'video' ||
    block.type === 'audio' ||
    block.type === 'file'
  ) {
    return <StudyFileBlockView block={block} />
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
  if (type === 'markdown') {
    return <FileCode2 aria-hidden="true" className={className} />
  }
  if (type === 'latex') {
    return <Sigma aria-hidden="true" className={className} />
  }
  if (type === 'mermaid') {
    return <Workflow aria-hidden="true" className={className} />
  }

  if (type === 'image') {
    return <FileImage aria-hidden="true" className={className} />
  }

  if (type === 'video') {
    return <FileVideo aria-hidden="true" className={className} />
  }

  if (type === 'audio') {
    return <FileAudio aria-hidden="true" className={className} />
  }

  if (type === 'file') {
    return <Files aria-hidden="true" className={className} />
  }

  if (type === 'divider') {
    return <Minus aria-hidden="true" className={className} />
  }

  return <Type aria-hidden="true" className={className} />
}

function getBlockLabel(type: StudyBlock['type']): string {
  return blockTypes.find((option) => option.type === type)?.label ?? type
}
