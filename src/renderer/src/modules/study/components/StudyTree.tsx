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
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Trash2
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import type { MoveStudyNodeInput, StudyNode } from '../../../../../shared/contracts/study'
import { cn } from '../../../shared/lib/cn'
import {
  createStudyMoveInput,
  getStudyDropPlacement,
  type StudyDropPlacement
} from '../lib/study-dnd'
import { getVisibleStudyNodes } from '../lib/study-tree'

const ROOT_DROP_ID = 'study-tree-root-drop'

interface StudyTreeProps {
  nodes: StudyNode[]
  search: string
  selectedNodeId: string | null
  onSelect: (nodeId: string) => void
  onToggleFolder: (node: StudyNode) => void
  onRename: (node: StudyNode) => void
  onDelete: (node: StudyNode) => void
  onMove: (input: MoveStudyNodeInput) => void
}

interface StudyDropPreview {
  overId: string | null
  placement: StudyDropPlacement
  input: MoveStudyNodeInput
}

export function StudyTree({
  nodes,
  search,
  selectedNodeId,
  onSelect,
  onToggleFolder,
  onRename,
  onDelete,
  onMove
}: StudyTreeProps): React.JSX.Element {
  const visibleNodes = useMemo(() => getVisibleStudyNodes(nodes, search), [nodes, search])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6
      }
    })
  )

  const [activeNode, setActiveNode] = useState<StudyNode | null>(null)

  const [dropPreview, setDropPreview] = useState<StudyDropPreview | null>(null)

  const dragDisabled = Boolean(search.trim())

  function handleDragStart(event: DragStartEvent): void {
    const node = nodes.find((item) => item.id === String(event.active.id))

    setActiveNode(node ?? null)
    setDropPreview(null)
  }

  function handleDragOver(event: DragOverEvent): void {
    setDropPreview(resolveDropPreview(nodes, event))
  }

  function handleDragEnd(event: DragEndEvent): void {
    const preview = resolveDropPreview(nodes, event) ?? dropPreview

    setActiveNode(null)
    setDropPreview(null)

    if (preview) {
      onMove(preview.input)
    }
  }

  if (visibleNodes.length === 0) {
    return (
      <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] px-4 text-center text-sm text-[var(--app-muted)]">
        {search ? 'Ничего не найдено' : 'Создай первую папку или материал'}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveNode(null)
        setDropPreview(null)
      }}
    >
      <div className="space-y-1">
        {visibleNodes.map(({ node, depth }) => (
          <StudyTreeItem
            key={node.id}
            node={node}
            depth={depth}
            isSelected={selectedNodeId === node.id}
            dragDisabled={dragDisabled}
            dropPlacement={dropPreview?.overId === node.id ? dropPreview.placement : null}
            onSelect={onSelect}
            onToggleFolder={onToggleFolder}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}

        <StudyRootDropZone
          active={activeNode !== null}
          highlighted={dropPreview?.placement === 'root'}
        />
      </div>

      <DragOverlay dropAnimation={null}>
        {activeNode ? <StudyDragOverlay node={activeNode} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function resolveDropPreview(
  nodes: StudyNode[],
  event: DragOverEvent | DragEndEvent
): StudyDropPreview | null {
  const over = event.over

  if (!over) {
    return null
  }

  const activeId = String(event.active.id)

  const overId = String(over.id)

  if (overId === ROOT_DROP_ID) {
    const input = createStudyMoveInput(nodes, activeId, null, 'root')

    return input
      ? {
          overId: null,
          placement: 'root',
          input
        }
      : null
  }

  const target = nodes.find((node) => node.id === overId)

  if (!target) {
    return null
  }

  const translated = event.active.rect.current.translated

  const activeCenterY = translated
    ? translated.top + translated.height / 2
    : over.rect.top + over.rect.height / 2

  const placement = getStudyDropPlacement(
    activeCenterY,
    over.rect.top,
    over.rect.height,
    target.type === 'folder'
  )

  const input = createStudyMoveInput(nodes, activeId, overId, placement)

  return input
    ? {
        overId,
        placement,
        input
      }
    : null
}

interface StudyTreeItemProps {
  node: StudyNode
  depth: number
  isSelected: boolean
  dragDisabled: boolean
  dropPlacement: StudyDropPlacement | null
  onSelect: (nodeId: string) => void
  onToggleFolder: (node: StudyNode) => void
  onRename: (node: StudyNode) => void
  onDelete: (node: StudyNode) => void
}

function StudyTreeItem({
  node,
  depth,
  isSelected,
  dragDisabled,
  dropPlacement,
  onSelect,
  onToggleFolder,
  onRename,
  onDelete
}: StudyTreeItemProps): React.JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false)

  const isFolder = node.type === 'folder'

  const NodeIcon = isFolder ? (node.isExpanded ? FolderOpen : Folder) : FileText

  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    isDragging
  } = useDraggable({
    id: node.id,
    disabled: dragDisabled
  })

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: node.id,
    disabled: dragDisabled
  })

  const setItemRef = useCallback(
    (element: HTMLDivElement | null) => {
      setDraggableRef(element)
      setDroppableRef(element)
    },
    [setDraggableRef, setDroppableRef]
  )

  return (
    <div
      ref={setItemRef}
      className={cn(
        'group relative flex h-9 items-center rounded-lg',
        isSelected
          ? 'bg-violet-500/12 text-violet-200'
          : 'text-[var(--app-muted)] hover:bg-white/[0.04] hover:text-[var(--app-text)]',
        dropPlacement === 'inside' && 'bg-violet-500/15 ring-1 ring-violet-500/45',
        isDragging && 'opacity-35'
      )}
      style={{
        paddingLeft: `${4 + depth * 16}px`
      }}
    >
      {dropPlacement === 'before' && (
        <span className="pointer-events-none absolute top-0 right-1 left-1 h-0.5 -translate-y-1/2 rounded-full bg-violet-400" />
      )}

      {dropPlacement === 'after' && (
        <span className="pointer-events-none absolute right-1 bottom-0 left-1 h-0.5 translate-y-1/2 rounded-full bg-violet-400" />
      )}



      {isFolder ? (
        <button
          type="button"
          aria-label={node.isExpanded ? 'Свернуть папку' : 'Развернуть папку'}
          className="flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-white/[0.05]"
          onClick={() => onToggleFolder(node)}
        >
          {node.isExpanded ? (
            <ChevronDown aria-hidden="true" className="size-3.5" />
          ) : (
            <ChevronRight aria-hidden="true" className="size-3.5" />
          )}
        </button>
      ) : (
        <span className="size-7 shrink-0" />
      )}

      <button
        type="button"
        aria-label={`Открыть: ${node.title}`}
        className={cn(
          'flex min-w-0 flex-1 touch-none items-center gap-2 py-2 text-left text-sm',
          'outline-none select-none',
          'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500/35',
          dragDisabled
            ? 'cursor-pointer'
            : 'cursor-grab active:cursor-grabbing'
        )}
        {...attributes}
        {...listeners}
        onClick={() => {
          onSelect(node.id)
        }}
      >
        <NodeIcon
          aria-hidden="true"
          className="size-4 shrink-0"
        />

        <span className="truncate">
          {node.title}
        </span>
      </button>

      <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label={`Действия: ${node.title}`}
            className={cn(
              'mr-1 flex size-7 shrink-0 items-center justify-center rounded-md',
              'text-[var(--app-muted)] hover:bg-white/[0.07] hover:text-[var(--app-text)]',
              menuOpen
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
            )}
          >
            <MoreHorizontal aria-hidden="true" className="size-4" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            sideOffset={6}
            align="start"
            className="z-50 min-w-44 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-1.5 text-sm text-[var(--app-text)]"
          >
            <DropdownMenu.Item
              className="flex cursor-default items-center gap-2 rounded-lg px-2.5 py-2 outline-none hover:bg-white/[0.06] focus:bg-white/[0.06]"
              onSelect={() => onRename(node)}
            >
              <Pencil aria-hidden="true" className="size-4" />
              Переименовать
            </DropdownMenu.Item>

            <DropdownMenu.Item
              className="flex cursor-default items-center gap-2 rounded-lg px-2.5 py-2 text-red-300 outline-none hover:bg-red-500/10 focus:bg-red-500/10"
              onSelect={() => onDelete(node)}
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Удалить
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  )
}

function StudyRootDropZone({
  active,
  highlighted
}: {
  active: boolean
  highlighted: boolean
}): React.JSX.Element | null {
  const { setNodeRef } = useDroppable({
    id: ROOT_DROP_ID,
    disabled: !active
  })

  if (!active) {
    return null
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'mt-2 flex h-10 items-center justify-center rounded-lg border border-dashed',
        'text-xs transition-colors',
        highlighted
          ? 'border-violet-400 bg-violet-500/10 text-violet-200'
          : 'border-[var(--app-border)] text-[var(--app-muted)]'
      )}
    >
      Переместить в корень
    </div>
  )
}

function StudyDragOverlay({ node }: { node: StudyNode }): React.JSX.Element {
  const NodeIcon = node.type === 'folder' ? Folder : FileText

  return (
    <div className="flex h-9 max-w-60 items-center gap-2 rounded-lg border border-violet-500/40 bg-[var(--app-surface-raised)] px-3 text-sm text-[var(--app-text)] shadow-lg shadow-black/25">
      <NodeIcon aria-hidden="true" className="size-4 shrink-0 text-violet-300" />

      <span className="truncate">{node.title}</span>
    </div>
  )
}
