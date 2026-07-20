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
  CopyPlus,
  FilePlus2,
  FileText,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Trash2
} from 'lucide-react'
import { useMemo, useState } from 'react'

import type { MoveStudyNodeInput, StudyNode } from '../../../../../shared/contracts/study'
import { cn } from '../../../shared/lib/cn'
import {
  MODULE_TREE_NODE_INSIDE_DROP_CLASS_NAME,
  ModuleTreeDragOverlay,
  ModuleTreeNodeDropIndicator,
  ModuleTreeRootDropZone
} from '../../../shared/ui/ModuleTreeDndFeedback'
import { Tooltip } from '../../../shared/ui/tooltip'
import { createStudyMoveInput, type StudyDropPlacement } from '../lib/study-dnd'
import { getVisibleStudyNodes } from '../lib/study-tree'
import { STUDY_FOLDER_ICON_SIDEBAR_CLASS_NAME, StudyFolderIcon } from './StudyFolderIcon'

const ROOT_DROP_ID = 'study-tree-root-drop'
const NODE_DROP_ID_PREFIX = 'study-tree-node-drop'

interface StudyTreeProps {
  nodes: StudyNode[]
  search: string
  selectedNodeId: string | null
  activeParentId: string | null
  collapsed: boolean
  onSelect: (nodeId: string) => void
  onSelectRoot: () => void
  onToggleFolder: (node: StudyNode) => void
  onRename: (node: StudyNode) => void
  onDuplicate: (node: StudyNode) => void
  onDelete: (node: StudyNode) => void
  onCreateFolder: (parentId: string) => void
  onCreateMaterial: (parentId: string) => void
  onMove: (input: MoveStudyNodeInput) => void
}

interface StudyDropPreview {
  overId: string | null
  placement: StudyDropPlacement
  input: MoveStudyNodeInput
}
interface StudyNodeDropData {
  kind: 'study-node'
  nodeId: string
  placement: Exclude<StudyDropPlacement, 'root'>
}

export function StudyTree({
  nodes,
  search,
  selectedNodeId,
  activeParentId,
  collapsed,
  onSelect,
  onSelectRoot,
  onToggleFolder,
  onRename,
  onDuplicate,
  onDelete,
  onCreateFolder,
  onCreateMaterial,
  onMove
}: StudyTreeProps): React.JSX.Element {
  const visibleNodes = useMemo(() => getVisibleStudyNodes(nodes, search), [nodes, search])

  const treeMeta = useMemo(() => {
    const childrenByParent = new Map<string | null, StudyNode[]>()

    nodes.forEach((node) => {
      const children = childrenByParent.get(node.parentId) ?? []

      children.push(node)

      childrenByParent.set(node.parentId, children)
    })

    const lastSiblingIds = new Set<string>()

    childrenByParent.forEach((children) => {
      children.sort((first, second) => first.position - second.position)

      const lastChild = children[children.length - 1]

      if (lastChild) {
        lastSiblingIds.add(lastChild.id)
      }
    })

    const foldersWithVisibleChildren = new Set<string>()

    nodes.forEach((node) => {
      if (
        node.type === 'folder' &&
        node.isExpanded &&
        (childrenByParent.get(node.id) ?? []).length > 0
      ) {
        foldersWithVisibleChildren.add(node.id)
      }
    })

    return {
      lastSiblingIds,
      foldersWithVisibleChildren
    }
  }, [nodes])

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
      <div className="flex min-h-full flex-col">
        {visibleNodes.length === 0 ? (
          <div className="flex min-h-32 shrink-0 items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] px-4 text-center text-sm text-[var(--app-muted)]">
            {search ? 'Ничего не найдено' : 'Создай первую папку или материал'}
          </div>
        ) : (
          <div className={cn('shrink-0', collapsed ? 'space-y-1.5' : 'space-y-1')}>
            {visibleNodes.map(({ node, depth }) => (
              <StudyTreeItem
                key={node.id}
                node={node}
                depth={depth}
                collapsed={collapsed}
                isLastSibling={treeMeta.lastSiblingIds.has(node.id)}
                hasVisibleChildren={treeMeta.foldersWithVisibleChildren.has(node.id)}
                isSelected={selectedNodeId === node.id}
                isCreationContext={activeParentId === node.id}
                dragDisabled={dragDisabled}
                dropPlacement={dropPreview?.overId === node.id ? dropPreview.placement : null}
                onSelect={onSelect}
                onToggleFolder={onToggleFolder}
                onRename={onRename}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                onCreateFolder={onCreateFolder}
                onCreateMaterial={onCreateMaterial}
              />
            ))}
          </div>
        )}

        <StudyRootDropZone
          dragDisabled={dragDisabled}
          active={activeNode !== null}
          highlighted={dropPreview?.placement === 'root'}
          isContextActive={activeParentId === null}
          collapsed={collapsed}
          onSelect={onSelectRoot}
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

  const dropData = over.data.current

  if (!isStudyNodeDropData(dropData)) {
    return null
  }

  const input = createStudyMoveInput(nodes, activeId, dropData.nodeId, dropData.placement)

  return input
    ? {
        overId: dropData.nodeId,
        placement: dropData.placement,
        input
      }
    : null
}

function isStudyNodeDropData(value: unknown): value is StudyNodeDropData {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<StudyNodeDropData>

  return (
    candidate.kind === 'study-node' &&
    typeof candidate.nodeId === 'string' &&
    (candidate.placement === 'before' ||
      candidate.placement === 'inside' ||
      candidate.placement === 'after')
  )
}
interface StudyTreeItemProps {
  node: StudyNode
  depth: number
  collapsed: boolean
  isLastSibling: boolean
  hasVisibleChildren: boolean
  isSelected: boolean
  isCreationContext: boolean
  dragDisabled: boolean
  dropPlacement: StudyDropPlacement | null
  onSelect: (nodeId: string) => void
  onToggleFolder: (node: StudyNode) => void
  onRename: (node: StudyNode) => void
  onDuplicate: (node: StudyNode) => void
  onDelete: (node: StudyNode) => void
  onCreateFolder: (parentId: string) => void
  onCreateMaterial: (parentId: string) => void
}

function StudyTreeItem({
  node,
  depth,
  collapsed,
  isLastSibling,
  hasVisibleChildren,
  isSelected,
  isCreationContext,
  dragDisabled,
  dropPlacement,
  onSelect,
  onToggleFolder,
  onRename,
  onDuplicate,
  onDelete,
  onCreateFolder,
  onCreateMaterial
}: StudyTreeItemProps): React.JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false)

  const isFolder = node.type === 'folder'

  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    isDragging
  } = useDraggable({
    id: node.id,
    disabled: dragDisabled
  })

  return (
    <div
      ref={setDraggableRef}
      className={cn(
        'group relative flex h-9 items-center rounded-lg',
        collapsed && 'justify-center',
        isSelected
          ? 'bg-violet-500/12 text-violet-200'
          : 'text-[var(--app-muted)] hover:bg-white/[0.04] hover:text-[var(--app-text)]',
        isCreationContext &&
          !isSelected &&
          'bg-violet-500/[0.045] text-[var(--app-text)] ring-1 ring-violet-500/15 ring-inset',
        dropPlacement === 'inside' && MODULE_TREE_NODE_INSIDE_DROP_CLASS_NAME,
        isDragging && 'opacity-35'
      )}
      style={
        collapsed
          ? undefined
          : {
              paddingLeft: `${4 + depth * 16}px`
            }
      }
    >
      <StudyTreeDropZones node={node} dragDisabled={dragDisabled} />

      {collapsed && depth > 0 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-1/2 h-1/2 w-px -translate-x-1/2 bg-[var(--app-border-strong)]"
        />
      )}

      {collapsed && (hasVisibleChildren || !isLastSibling) && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-1/2 h-1/2 w-px -translate-x-1/2 bg-[var(--app-border-strong)]"
        />
      )}

      <ModuleTreeNodeDropIndicator placement={dropPlacement} />

      {!collapsed &&
        (isFolder ? (
          <button
            type="button"
            aria-label={node.isExpanded ? 'Свернуть папку' : 'Развернуть папку'}
            className="z-20 flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-white/[0.05]"
            onClick={() => {
              onToggleFolder(node)
            }}
          >
            {node.isExpanded ? (
              <ChevronDown aria-hidden="true" className="size-3.5" />
            ) : (
              <ChevronRight aria-hidden="true" className="size-3.5" />
            )}
          </button>
        ) : (
          <span className="size-7 shrink-0" />
        ))}

      <Tooltip content={`${node.title} · ${isFolder ? 'Папка' : 'Материал'}`} side="right">
        <button
          type="button"
          aria-label={`Открыть: ${node.title}`}
          className={cn(
            'relative z-10 flex min-w-0 touch-none items-center text-left text-sm',
            'outline-none select-none',
            'focus-visible:ring-2 focus-visible:ring-violet-500/35 focus-visible:ring-inset',
            collapsed
              ? 'size-8 shrink-0 justify-center rounded-lg bg-[var(--app-sidebar)] p-0'
              : 'flex-1 gap-2 py-2',
            dragDisabled ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
          )}
          {...attributes}
          {...listeners}
          onClick={() => {
            onSelect(node.id)
          }}
        >
          {isFolder ? (
            <StudyFolderIcon
              name={node.icon}
              expanded={node.isExpanded}
              className={STUDY_FOLDER_ICON_SIDEBAR_CLASS_NAME}
            />
          ) : (
            <FileText aria-hidden="true" className="size-4 shrink-0" />
          )}

          {!collapsed && <span className="truncate">{node.title}</span>}
        </button>
      </Tooltip>

      {!collapsed && (
        <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label={`Действия: ${node.title}`}
              className={cn(
                'z-20 mr-1 flex size-7 shrink-0 items-center justify-center rounded-md',
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
              className="z-50 min-w-48 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-1.5 text-sm text-[var(--app-text)] shadow-xl shadow-black/25"
            >
              {isFolder && (
                <>
                  <DropdownMenu.Item
                    className="flex cursor-default items-center gap-2 rounded-lg px-2.5 py-2 outline-none hover:bg-white/[0.06] focus:bg-white/[0.06]"
                    onSelect={() => {
                      onCreateFolder(node.id)
                    }}
                  >
                    <FolderPlus aria-hidden="true" className="size-4 text-violet-300" />
                    Новая папка
                  </DropdownMenu.Item>

                  <DropdownMenu.Item
                    className="flex cursor-default items-center gap-2 rounded-lg px-2.5 py-2 outline-none hover:bg-white/[0.06] focus:bg-white/[0.06]"
                    onSelect={() => {
                      onCreateMaterial(node.id)
                    }}
                  >
                    <FilePlus2 aria-hidden="true" className="size-4 text-violet-300" />
                    Новый материал
                  </DropdownMenu.Item>

                  <DropdownMenu.Separator className="my-1 h-px bg-[var(--app-border)]" />
                </>
              )}

              <DropdownMenu.Item
                className="flex cursor-default items-center gap-2 rounded-lg px-2.5 py-2 outline-none hover:bg-white/[0.06] focus:bg-white/[0.06]"
                onSelect={() => {
                  onRename(node)
                }}
              >
                <Pencil aria-hidden="true" className="size-4" />
                Переименовать
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="flex cursor-default items-center gap-2 rounded-lg px-2.5 py-2 outline-none hover:bg-white/[0.06] focus:bg-white/[0.06]"
                onSelect={() => {
                  onDuplicate(node)
                }}
              >
                <CopyPlus aria-hidden="true" className="size-4 text-violet-300" />

                {isFolder ? 'Дублировать папку' : 'Дублировать материал'}
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="my-1 h-px bg-[var(--app-border)]" />

              <DropdownMenu.Item
                className="flex cursor-default items-center gap-2 rounded-lg px-2.5 py-2 text-red-300 outline-none hover:bg-red-500/10 focus:bg-red-500/10"
                onSelect={() => {
                  onDelete(node)
                }}
              >
                <Trash2 aria-hidden="true" className="size-4" />
                Удалить
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}
    </div>
  )
}

function StudyTreeDropZones({
  node,
  dragDisabled
}: {
  node: StudyNode
  dragDisabled: boolean
}): React.JSX.Element {
  const isFolder = node.type === 'folder'

  const { setNodeRef: setBeforeDropRef } = useDroppable({
    id: `${NODE_DROP_ID_PREFIX}:${node.id}:before`,
    disabled: dragDisabled,
    data: {
      kind: 'study-node',
      nodeId: node.id,
      placement: 'before'
    } satisfies StudyNodeDropData
  })

  const { setNodeRef: setInsideDropRef } = useDroppable({
    id: `${NODE_DROP_ID_PREFIX}:${node.id}:inside`,
    disabled: dragDisabled || !isFolder,
    data: {
      kind: 'study-node',
      nodeId: node.id,
      placement: 'inside'
    } satisfies StudyNodeDropData
  })

  const { setNodeRef: setAfterDropRef } = useDroppable({
    id: `${NODE_DROP_ID_PREFIX}:${node.id}:after`,
    disabled: dragDisabled,
    data: {
      kind: 'study-node',
      nodeId: node.id,
      placement: 'after'
    } satisfies StudyNodeDropData
  })

  return (
    <>
      <span
        ref={setBeforeDropRef}
        aria-hidden="true"
        className={cn('pointer-events-none absolute inset-x-0 top-0', isFolder ? 'h-1/4' : 'h-1/2')}
      />

      {isFolder && (
        <span
          ref={setInsideDropRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/4 h-1/2"
        />
      )}

      <span
        ref={setAfterDropRef}
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0',
          isFolder ? 'h-1/4' : 'h-1/2'
        )}
      />
    </>
  )
}
function StudyRootDropZone({
  dragDisabled,
  active,
  highlighted,
  isContextActive,
  collapsed,
  onSelect
}: {
  dragDisabled: boolean
  active: boolean
  highlighted: boolean
  isContextActive: boolean
  collapsed: boolean
  onSelect: () => void
}): React.JSX.Element {
  const { setNodeRef } = useDroppable({
    id: ROOT_DROP_ID,
    disabled: dragDisabled
  })

  return (
    <ModuleTreeRootDropZone
      dropRef={setNodeRef}
      active={active}
      highlighted={highlighted}
      isContextActive={isContextActive}
      collapsed={collapsed}
      ariaLabel="Выбрать корень библиотеки"
      idleLabel="Корень библиотеки"
      activeLabel="Переместить в корень"
      onSelect={onSelect}
    />
  )
}

function StudyDragOverlay({ node }: { node: StudyNode }): React.JSX.Element {
  return (
    <ModuleTreeDragOverlay
      icon={
        node.type === 'folder' ? (
          <StudyFolderIcon name={node.icon} className="size-4 shrink-0 text-violet-300" />
        ) : (
          <FileText aria-hidden="true" className="size-4 shrink-0 text-violet-300" />
        )
      }
      title={node.title}
    />
  )
}
