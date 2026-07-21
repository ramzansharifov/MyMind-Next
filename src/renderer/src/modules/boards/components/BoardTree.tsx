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
import * as ContextMenu from '@radix-ui/react-context-menu'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  LockKeyhole,
  MoreHorizontal,
  Pencil,
  Presentation,
  Trash2,
  type LucideIcon
} from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  BOARD_SYSTEM_ROOT_ID,
  type BoardNode,
  type BoardNodeType,
  type MoveBoardNodeInput
} from '../../../../../shared/contracts/boards'
import { cn } from '../../../shared/lib/cn'
import {
  MODULE_TREE_NODE_INSIDE_DROP_CLASS_NAME,
  ModuleTreeDragOverlay,
  ModuleTreeNodeDropIndicator,
  ModuleTreeRootDropZone
} from '../../../shared/ui/ModuleTreeDndFeedback'
import { FolderIcon, FOLDER_ICON_SIDEBAR_CLASS_NAME } from '../../../shared/ui/FolderIcon'
import { Tooltip } from '../../../shared/ui/tooltip'
import {
  createBoardMoveInput,
  getStudyManagedBoardNodeIds,
  type BoardDropPlacement
} from '../lib/board-dnd'

const ROOT_DROP_ID = 'board-tree-root-drop'
const NODE_DROP_ID_PREFIX = 'board-tree-node-drop'

interface BoardTreeProps {
  nodes: BoardNode[]
  selectedNodeId: string | null
  collapsed: boolean
  onOpen: (nodeId: string) => void
  onToggle: (node: BoardNode) => void | Promise<void>
  onRename: (node: BoardNode) => void
  onDelete: (node: BoardNode) => void
  onCreate: (type: BoardNodeType, parentId: string | null) => void
  onSelectRoot: () => void
  onMove: (input: MoveBoardNodeInput) => void
}

interface BoardDropPreview {
  overId: string | null
  placement: BoardDropPlacement
  input: MoveBoardNodeInput
}

interface BoardNodeDropData {
  kind: 'board-node'
  nodeId: string
  placement: Exclude<BoardDropPlacement, 'root'>
}

export function BoardTree({
  nodes,
  selectedNodeId,
  collapsed,
  onOpen,
  onToggle,
  onRename,
  onDelete,
  onCreate,
  onSelectRoot,
  onMove
}: BoardTreeProps): React.JSX.Element {
  const nodesByParent = useMemo(() => groupBoardNodesByParent(nodes), [nodes])
  const studyManagedIds = useMemo(() => getStudyManagedBoardNodeIds(nodes), [nodes])
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6
      }
    })
  )
  const [activeNode, setActiveNode] = useState<BoardNode | null>(null)
  const [dropPreview, setDropPreview] = useState<BoardDropPreview | null>(null)
  const rootNodes = nodesByParent.get(null) ?? []

  function handleDragStart(event: DragStartEvent): void {
    const node = nodes.find((item) => item.id === String(event.active.id))

    setActiveNode(node && !studyManagedIds.has(node.id) ? node : null)
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
        {rootNodes.length === 0 ? (
          <div className="flex min-h-32 shrink-0 items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] px-4 text-center text-sm text-[var(--app-muted)]">
            Создайте первую папку или доску
          </div>
        ) : (
          <div className={cn('shrink-0', collapsed ? 'space-y-1.5' : 'space-y-0')}>
            {rootNodes.map((node, index) => (
              <BoardTreeNode
                key={node.id}
                node={node}
                depth={0}
                isLastSibling={index === rootNodes.length - 1}
                selectedNodeId={selectedNodeId}
                collapsed={collapsed}
                nodesByParent={nodesByParent}
                studyManagedIds={studyManagedIds}
                dropPreview={dropPreview}
                onOpen={onOpen}
                onToggle={onToggle}
                onRename={onRename}
                onDelete={onDelete}
                onCreate={onCreate}
              />
            ))}
          </div>
        )}

        <BoardRootDropZone
          active={activeNode !== null}
          isContextActive={selectedNodeId === null}
          collapsed={collapsed}
          onSelect={onSelectRoot}
        />
      </div>

      <DragOverlay dropAnimation={null}>
        {activeNode ? <BoardDragOverlay node={activeNode} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function resolveDropPreview(
  nodes: BoardNode[],
  event: DragOverEvent | DragEndEvent
): BoardDropPreview | null {
  const over = event.over

  if (!over) {
    return null
  }

  const activeId = String(event.active.id)
  const overId = String(over.id)

  if (overId === ROOT_DROP_ID) {
    const input = createBoardMoveInput(nodes, activeId, null, 'root')

    return input
      ? {
          overId: null,
          placement: 'root',
          input
        }
      : null
  }

  const dropData = over.data.current

  if (!isBoardNodeDropData(dropData)) {
    return null
  }

  const input = createBoardMoveInput(nodes, activeId, dropData.nodeId, dropData.placement)

  return input
    ? {
        overId: dropData.nodeId,
        placement: dropData.placement,
        input
      }
    : null
}

function isBoardNodeDropData(value: unknown): value is BoardNodeDropData {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<BoardNodeDropData>

  return (
    candidate.kind === 'board-node' &&
    typeof candidate.nodeId === 'string' &&
    (candidate.placement === 'before' ||
      candidate.placement === 'inside' ||
      candidate.placement === 'after')
  )
}

interface BoardTreeNodeProps {
  node: BoardNode
  depth: number
  isLastSibling: boolean
  selectedNodeId: string | null
  collapsed: boolean
  nodesByParent: Map<string | null, BoardNode[]>
  studyManagedIds: Set<string>
  dropPreview: BoardDropPreview | null
  onOpen: (id: string) => void
  onToggle: (node: BoardNode) => void | Promise<void>
  onRename: (node: BoardNode) => void
  onDelete: (node: BoardNode) => void
  onCreate: (type: BoardNodeType, parentId: string | null) => void
}

function BoardTreeNode({
  node,
  depth,
  isLastSibling,
  selectedNodeId,
  collapsed,
  nodesByParent,
  studyManagedIds,
  dropPreview,
  onOpen,
  onToggle,
  onRename,
  onDelete,
  onCreate
}: BoardTreeNodeProps): React.JSX.Element {
  const children = nodesByParent.get(node.id) ?? []
  const isFolder = node.type === 'folder'
  const hasVisibleChildren = isFolder && node.isExpanded && children.length > 0
  const isStudyManaged = studyManagedIds.has(node.id)
  const dropPlacement = dropPreview?.overId === node.id ? dropPreview.placement : null
  const [contextMenuOpen, setContextMenuOpen] = useState(false)
  const guideOrigin = 12
  const guideStep = 16
  const menuEntries = createBoardMenuEntries({
    node,
    onRename,
    onDelete,
    onCreate
  })
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    isDragging
  } = useDraggable({
    id: node.id,
    disabled: isStudyManaged
  })

  return (
    <div className={cn(collapsed ? 'space-y-1.5' : 'space-y-0')}>
      <ContextMenu.Root open={contextMenuOpen} onOpenChange={setContextMenuOpen}>
        <ContextMenu.Trigger asChild>
          <div
            ref={setDraggableRef}
            data-board-tree-node={node.id}
            data-study-managed={isStudyManaged}
            className={cn(
              'group relative flex h-8 items-center',
              collapsed ? 'justify-center rounded-lg' : 'w-full rounded-none',
              selectedNodeId === node.id
                ? 'bg-violet-500/12 text-violet-200'
                : 'text-[var(--app-muted)] hover:bg-white/[0.04] hover:text-[var(--app-text)]',
              dropPlacement === 'inside' && MODULE_TREE_NODE_INSIDE_DROP_CLASS_NAME,
              isDragging && 'opacity-35'
            )}
            style={
              collapsed
                ? undefined
                : {
                    paddingLeft: `${2 + depth * guideStep}px`
                  }
            }
          >
            <BoardTreeDropZones node={node} disabled={isStudyManaged} />

            {!collapsed &&
              Array.from({ length: depth }, (_, guideDepth) => (
                <span
                  key={guideDepth}
                  aria-hidden="true"
                  data-board-tree-guide="ancestor"
                  data-guide-depth={guideDepth}
                  className="board-tree-guide inset-y-0"
                  style={{ left: `${guideOrigin + guideDepth * guideStep}px` }}
                />
              ))}

            {!collapsed && isFolder && hasVisibleChildren && (
              <span
                aria-hidden="true"
                data-board-tree-guide="folder"
                data-guide-depth={depth}
                className="board-tree-guide top-1/2 bottom-0"
                style={{ left: `${guideOrigin + depth * guideStep}px` }}
              />
            )}

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
                  className="z-20 flex size-5 shrink-0 items-center justify-center rounded-sm p-0 outline-none hover:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-violet-500/35"
                  onClick={() => void onToggle(node)}
                >
                  {node.isExpanded ? (
                    <ChevronDown aria-hidden="true" className="size-3.5" />
                  ) : (
                    <ChevronRight aria-hidden="true" className="size-3.5" />
                  )}
                </button>
              ) : (
                <span className="size-5 shrink-0" />
              ))}

            <Tooltip content={`${node.title} · ${isFolder ? 'Папка' : 'Доска'}`} side="right">
              <button
                type="button"
                aria-label={node.title}
                className={cn(
                  'relative z-10 flex min-w-0 touch-none items-center text-left text-sm outline-none select-none',
                  'focus-visible:ring-2 focus-visible:ring-violet-500/35 focus-visible:ring-inset',
                  collapsed
                    ? 'size-8 shrink-0 justify-center rounded-lg bg-[var(--app-sidebar)] p-0'
                    : 'flex-1 gap-1.5 py-1.5 pr-1',
                  isStudyManaged ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
                )}
                {...attributes}
                {...listeners}
                onClick={() => onOpen(node.id)}
              >
                {isFolder ? (
                  <FolderIcon
                    name={node.icon}
                    expanded={node.isExpanded}
                    className={FOLDER_ICON_SIDEBAR_CLASS_NAME}
                  />
                ) : (
                  <Presentation aria-hidden="true" className="size-4 shrink-0" />
                )}
                {!collapsed && <span className="truncate">{node.title}</span>}
                {!collapsed && node.isSystem && (
                  <LockKeyhole
                    aria-hidden="true"
                    className="ml-auto size-3.5 shrink-0 opacity-60"
                  />
                )}
              </button>
            </Tooltip>

            {!collapsed && menuEntries.length > 0 && (
              <BoardNodeMenu
                nodeTitle={node.title}
                entries={menuEntries}
                contextMenuOpen={contextMenuOpen}
              />
            )}
          </div>
        </ContextMenu.Trigger>

        {!collapsed && menuEntries.length > 0 && (
          <BoardNodeContextMenuContent entries={menuEntries} />
        )}
      </ContextMenu.Root>

      {hasVisibleChildren && (
        <div className={cn(collapsed ? 'space-y-1.5' : 'space-y-0')}>
          {children.map((child, index) => (
            <BoardTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              isLastSibling={index === children.length - 1}
              selectedNodeId={selectedNodeId}
              collapsed={collapsed}
              nodesByParent={nodesByParent}
              studyManagedIds={studyManagedIds}
              dropPreview={dropPreview}
              onOpen={onOpen}
              onToggle={onToggle}
              onRename={onRename}
              onDelete={onDelete}
              onCreate={onCreate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function BoardTreeDropZones({
  node,
  disabled
}: {
  node: BoardNode
  disabled: boolean
}): React.JSX.Element {
  const isFolder = node.type === 'folder'
  const { setNodeRef: setBeforeDropRef } = useDroppable({
    id: `${NODE_DROP_ID_PREFIX}:${node.id}:before`,
    disabled,
    data: {
      kind: 'board-node',
      nodeId: node.id,
      placement: 'before'
    } satisfies BoardNodeDropData
  })
  const { setNodeRef: setInsideDropRef } = useDroppable({
    id: `${NODE_DROP_ID_PREFIX}:${node.id}:inside`,
    disabled: disabled || !isFolder,
    data: {
      kind: 'board-node',
      nodeId: node.id,
      placement: 'inside'
    } satisfies BoardNodeDropData
  })
  const { setNodeRef: setAfterDropRef } = useDroppable({
    id: `${NODE_DROP_ID_PREFIX}:${node.id}:after`,
    disabled,
    data: {
      kind: 'board-node',
      nodeId: node.id,
      placement: 'after'
    } satisfies BoardNodeDropData
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

function BoardRootDropZone({
  active,
  isContextActive,
  collapsed,
  onSelect
}: {
  active: boolean
  isContextActive: boolean
  collapsed: boolean
  onSelect: () => void
}): React.JSX.Element {
  const { isOver, setNodeRef } = useDroppable({
    id: ROOT_DROP_ID,
    disabled: !active
  })

  return (
    <ModuleTreeRootDropZone
      dropRef={setNodeRef}
      active={active}
      highlighted={active && isOver}
      isContextActive={isContextActive}
      collapsed={collapsed}
      ariaLabel="Выбрать корень досок"
      idleLabel="Корень досок"
      activeLabel="Переместить в корень"
      onSelect={onSelect}
    />
  )
}

function BoardDragOverlay({ node }: { node: BoardNode }): React.JSX.Element {
  return (
    <ModuleTreeDragOverlay
      icon={
        node.type === 'folder' ? (
          <FolderIcon
            name={node.icon}
            expanded={node.isExpanded}
            className="size-4 shrink-0 text-violet-300"
          />
        ) : (
          <Presentation aria-hidden="true" className="size-4 shrink-0 text-violet-300" />
        )
      }
      title={node.title}
    />
  )
}

type BoardMenuEntry =
  | {
      kind: 'item'
      key: string
      label: string
      icon: LucideIcon
      accent?: boolean
      danger?: boolean
      onSelect: () => void
    }
  | {
      kind: 'separator'
      key: string
    }

function createBoardMenuEntries({
  node,
  onRename,
  onDelete,
  onCreate
}: {
  node: BoardNode
  onRename: (node: BoardNode) => void
  onDelete: (node: BoardNode) => void
  onCreate: (type: BoardNodeType, parentId: string | null) => void
}): BoardMenuEntry[] {
  const entries: BoardMenuEntry[] = []

  if (node.type === 'folder') {
    entries.push(
      {
        kind: 'item',
        key: 'create-folder',
        label: 'Новая папка',
        icon: FolderPlus,
        accent: true,
        onSelect: () => onCreate('folder', node.id)
      },
      {
        kind: 'item',
        key: 'create-board',
        label: 'Новая доска',
        icon: Presentation,
        accent: true,
        onSelect: () => onCreate('board', node.id)
      }
    )

    if (!node.isSystem) {
      entries.push({ kind: 'separator', key: 'create-separator' })
    }
  }

  if (!node.isSystem) {
    entries.push({
      kind: 'item',
      key: 'rename',
      label: 'Переименовать',
      icon: Pencil,
      accent: true,
      onSelect: () => onRename(node)
    })

    if (!(node.type === 'folder' && node.sourceStudyNodeId)) {
      entries.push(
        { kind: 'separator', key: 'delete-separator' },
        {
          kind: 'item',
          key: 'delete',
          label: 'Удалить',
          icon: Trash2,
          danger: true,
          onSelect: () => onDelete(node)
        }
      )
    }
  }

  return entries
}

function BoardNodeMenu({
  nodeTitle,
  entries,
  contextMenuOpen
}: {
  nodeTitle: string
  entries: BoardMenuEntry[]
  contextMenuOpen: boolean
}): React.JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false)
  const anyMenuOpen = menuOpen || contextMenuOpen

  return (
    <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Действия: ${nodeTitle}`}
          className={cn(
            'z-20 flex size-6 shrink-0 items-center justify-center rounded-sm p-0',
            'text-[var(--app-muted)] hover:bg-white/[0.07] hover:text-[var(--app-text)]',
            anyMenuOpen
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
          )}
          onPointerDown={(event) => {
            event.stopPropagation()
          }}
          onClick={(event) => {
            event.stopPropagation()
          }}
        >
          <MoreHorizontal aria-hidden="true" className="size-4" />
        </button>
      </DropdownMenu.Trigger>

      <BoardNodeDropdownMenuContent entries={entries} />
    </DropdownMenu.Root>
  )
}

function BoardNodeDropdownMenuContent({
  entries
}: {
  entries: BoardMenuEntry[]
}): React.JSX.Element {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        sideOffset={6}
        align="start"
        className="z-50 min-w-48 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-1.5 text-sm text-[var(--app-text)] shadow-xl shadow-black/25"
      >
        {entries.map((entry) =>
          entry.kind === 'separator' ? (
            <DropdownMenu.Separator key={entry.key} className="my-1 h-px bg-[var(--app-border)]" />
          ) : (
            <DropdownMenu.Item
              key={entry.key}
              data-board-tree-action={entry.key}
              className={cn(
                'flex cursor-default items-center gap-2 rounded-lg px-2.5 py-2 outline-none',
                entry.danger
                  ? 'text-red-300 hover:bg-red-500/10 focus:bg-red-500/10'
                  : 'hover:bg-white/[0.06] focus:bg-white/[0.06]'
              )}
              onSelect={entry.onSelect}
            >
              <entry.icon
                aria-hidden="true"
                className={cn('size-4', entry.accent && !entry.danger && 'text-violet-300')}
              />
              {entry.label}
            </DropdownMenu.Item>
          )
        )}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  )
}

function BoardNodeContextMenuContent({
  entries
}: {
  entries: BoardMenuEntry[]
}): React.JSX.Element {
  return (
    <ContextMenu.Portal>
      <ContextMenu.Content
        collisionPadding={8}
        className="z-50 min-w-48 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-1.5 text-sm text-[var(--app-text)] shadow-xl shadow-black/25"
      >
        {entries.map((entry) =>
          entry.kind === 'separator' ? (
            <ContextMenu.Separator key={entry.key} className="my-1 h-px bg-[var(--app-border)]" />
          ) : (
            <ContextMenu.Item
              key={entry.key}
              data-board-tree-action={entry.key}
              className={cn(
                'flex cursor-default items-center gap-2 rounded-lg px-2.5 py-2 outline-none',
                entry.danger
                  ? 'text-red-300 hover:bg-red-500/10 focus:bg-red-500/10'
                  : 'hover:bg-white/[0.06] focus:bg-white/[0.06]'
              )}
              onSelect={entry.onSelect}
            >
              <entry.icon
                aria-hidden="true"
                className={cn('size-4', entry.accent && !entry.danger && 'text-violet-300')}
              />
              {entry.label}
            </ContextMenu.Item>
          )
        )}
      </ContextMenu.Content>
    </ContextMenu.Portal>
  )
}

function groupBoardNodesByParent(nodes: BoardNode[]): Map<string | null, BoardNode[]> {
  const grouped = new Map<string | null, BoardNode[]>()

  nodes.forEach((node) => {
    const siblings = grouped.get(node.parentId) ?? []

    siblings.push(node)
    grouped.set(node.parentId, siblings)
  })

  grouped.forEach((siblings) => {
    siblings.sort(
      (first, second) =>
        first.position - second.position || first.title.localeCompare(second.title, 'ru')
    )
  })

  const root = grouped.get(null)

  if (root) {
    root.sort((first, second) => {
      if (first.id === BOARD_SYSTEM_ROOT_ID) return -1
      if (second.id === BOARD_SYSTEM_ROOT_ID) return 1

      return first.position - second.position || first.title.localeCompare(second.title, 'ru')
    })
  }

  return grouped
}
