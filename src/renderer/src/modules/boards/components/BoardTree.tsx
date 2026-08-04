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
import { FolderPlus, LockKeyhole, Pencil, Presentation, Trash2 } from 'lucide-react'
import { useMemo, useState, type ButtonHTMLAttributes } from 'react'

import {
  BOARD_SYSTEM_ROOT_ID,
  type BoardNode,
  type BoardNodeType,
  type MoveBoardNodeInput
} from '../../../../../shared/contracts/boards'
import { cn } from '../../../shared/lib/cn'
import {
  ModuleTreeDragOverlay,
  ModuleTreeRootDropZone
} from '../../../shared/ui/ModuleTreeDndFeedback'
import {
  ModuleTreeNodeDropZones,
  ModuleTreeNodeRow,
  type ModuleTreeActionEntry
} from '../../../shared/ui/ModuleTreeNodeRow'
import { FolderIcon, FOLDER_ICON_SIDEBAR_CLASS_NAME } from '../../../shared/ui/FolderIcon'
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
  const actions = createBoardMenuEntries({
    node,
    isStudyManaged,
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
      <ModuleTreeNodeRow
        moduleKind="board"
        nodeId={node.id}
        title={node.title}
        nodeTypeLabel={isFolder ? 'Папка' : 'Доска'}
        depth={depth}
        collapsed={collapsed}
        isLastSibling={isLastSibling}
        isFolder={isFolder}
        isExpanded={node.isExpanded}
        hasVisibleChildren={hasVisibleChildren}
        isSelected={selectedNodeId === node.id}
        isDragging={isDragging}
        isDragDisabled={isStudyManaged}
        dropPlacement={dropPlacement}
        rowRef={setDraggableRef}
        dragHandleProps={{ ...attributes, ...listeners } as ButtonHTMLAttributes<HTMLButtonElement>}
        extraRowDataAttributes={{ 'data-study-managed': isStudyManaged }}
        icon={
          isFolder ? (
            <FolderIcon
              name={node.icon}
              expanded={node.isExpanded}
              className={FOLDER_ICON_SIDEBAR_CLASS_NAME}
            />
          ) : (
            <Presentation aria-hidden="true" className="size-4 shrink-0" />
          )
        }
        trailing={
          node.isSystem ? (
            <LockKeyhole aria-hidden="true" className="ml-auto size-3.5 shrink-0 opacity-60" />
          ) : undefined
        }
        actions={actions}
        dropZones={<BoardTreeDropZones node={node} disabled={isStudyManaged} />}
        onOpen={() => onOpen(node.id)}
        onToggle={() => onToggle(node)}
      />

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
    <ModuleTreeNodeDropZones
      isFolder={isFolder}
      beforeRef={setBeforeDropRef}
      insideRef={setInsideDropRef}
      afterRef={setAfterDropRef}
    />
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

function createBoardMenuEntries({
  node,
  isStudyManaged,
  onRename,
  onDelete,
  onCreate
}: {
  node: BoardNode
  isStudyManaged: boolean
  onRename: (node: BoardNode) => void
  onDelete: (node: BoardNode) => void
  onCreate: (type: BoardNodeType, parentId: string | null) => void
}): ModuleTreeActionEntry[] {
  if (isStudyManaged && node.type === 'folder') {
    return []
  }

  const entries: ModuleTreeActionEntry[] = []

  if (node.type === 'folder') {
    entries.push(
      {
        kind: 'item',
        key: 'create-folder',
        label: 'Новая папка',
        icon: <FolderPlus aria-hidden="true" className="size-4 text-violet-300" />,
        onSelect: () => onCreate('folder', node.id)
      },
      {
        kind: 'item',
        key: 'create-board',
        label: 'Новая доска',
        icon: <Presentation aria-hidden="true" className="size-4 text-violet-300" />,
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
      icon: <Pencil aria-hidden="true" className="size-4 text-violet-300" />,
      onSelect: () => onRename(node)
    })

    if (!(node.type === 'folder' && node.sourceStudyNodeId)) {
      entries.push(
        { kind: 'separator', key: 'delete-separator' },
        {
          kind: 'item',
          key: 'delete',
          label: 'Удалить',
          icon: <Trash2 aria-hidden="true" className="size-4" />,
          danger: true,
          onSelect: () => onDelete(node)
        }
      )
    }
  }

  return entries
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
