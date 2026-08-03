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
import { CopyPlus, FilePlus2, FileText, FolderPlus, Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState, type ButtonHTMLAttributes } from 'react'

import type { MoveStudyNodeInput, StudyNode } from '../../../../../shared/contracts/study'
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
  const treeMeta = useMemo(() => createStudyTreeMeta(nodes), [nodes])
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
          <div className={cn('shrink-0', collapsed ? 'space-y-1.5' : 'space-y-0')}>
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

function createStudyTreeMeta(nodes: StudyNode[]): {
  lastSiblingIds: Set<string>
  foldersWithVisibleChildren: Set<string>
} {
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
  const isFolder = node.type === 'folder'
  const actions = createStudyTreeMenuEntries({
    node,
    isFolder,
    onRename,
    onDuplicate,
    onDelete,
    onCreateFolder,
    onCreateMaterial
  })
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
    <ModuleTreeNodeRow
      moduleKind="study"
      nodeId={node.id}
      title={node.title}
      nodeTypeLabel={isFolder ? 'Папка' : 'Материал'}
      depth={depth}
      collapsed={collapsed}
      isLastSibling={isLastSibling}
      isFolder={isFolder}
      isExpanded={node.isExpanded}
      hasVisibleChildren={hasVisibleChildren}
      isSelected={isSelected}
      isContextActive={isCreationContext}
      isDragging={isDragging}
      isDragDisabled={dragDisabled}
      dropPlacement={dropPlacement}
      rowRef={setDraggableRef}
      dragHandleProps={{ ...attributes, ...listeners } as ButtonHTMLAttributes<HTMLButtonElement>}
      icon={
        isFolder ? (
          <StudyFolderIcon
            name={node.icon}
            expanded={node.isExpanded}
            className={STUDY_FOLDER_ICON_SIDEBAR_CLASS_NAME}
          />
        ) : (
          <FileText aria-hidden="true" className="size-4 shrink-0" />
        )
      }
      actions={actions}
      dropZones={<StudyTreeDropZones node={node} dragDisabled={dragDisabled} />}
      openAriaLabel={`Открыть: ${node.title}`}
      onOpen={() => onSelect(node.id)}
      onToggle={() => onToggleFolder(node)}
    />
  )
}

function createStudyTreeMenuEntries({
  node,
  isFolder,
  onRename,
  onDuplicate,
  onDelete,
  onCreateFolder,
  onCreateMaterial
}: {
  node: StudyNode
  isFolder: boolean
  onRename: (node: StudyNode) => void
  onDuplicate: (node: StudyNode) => void
  onDelete: (node: StudyNode) => void
  onCreateFolder: (parentId: string) => void
  onCreateMaterial: (parentId: string) => void
}): ModuleTreeActionEntry[] {
  const entries: ModuleTreeActionEntry[] = []

  if (isFolder) {
    entries.push(
      {
        kind: 'item',
        key: 'create-folder',
        label: 'Новая папка',
        icon: <FolderPlus aria-hidden="true" className="size-4 text-violet-300" />,
        onSelect: () => onCreateFolder(node.id)
      },
      {
        kind: 'item',
        key: 'create-material',
        label: 'Новый материал',
        icon: <FilePlus2 aria-hidden="true" className="size-4 text-violet-300" />,
        onSelect: () => onCreateMaterial(node.id)
      },
      {
        kind: 'separator',
        key: 'create-separator'
      }
    )
  }

  entries.push(
    {
      kind: 'item',
      key: 'rename',
      label: 'Переименовать',
      icon: <Pencil aria-hidden="true" className="size-4 text-violet-300" />,
      onSelect: () => onRename(node)
    },
    {
      kind: 'item',
      key: 'duplicate',
      label: isFolder ? 'Дублировать папку' : 'Дублировать материал',
      icon: <CopyPlus aria-hidden="true" className="size-4 text-violet-300" />,
      onSelect: () => onDuplicate(node)
    },
    {
      kind: 'separator',
      key: 'delete-separator'
    },
    {
      kind: 'item',
      key: 'delete',
      label: 'Удалить',
      icon: <Trash2 aria-hidden="true" className="size-4" />,
      danger: true,
      onSelect: () => onDelete(node)
    }
  )

  return entries
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
    <ModuleTreeNodeDropZones
      isFolder={isFolder}
      beforeRef={setBeforeDropRef}
      insideRef={setInsideDropRef}
      afterRef={setAfterDropRef}
    />
  )
}

function StudyRootDropZone({
  dragDisabled,
  active,
  isContextActive,
  collapsed,
  onSelect
}: {
  dragDisabled: boolean
  active: boolean
  isContextActive: boolean
  collapsed: boolean
  onSelect: () => void
}): React.JSX.Element {
  const { isOver, setNodeRef } = useDroppable({
    id: ROOT_DROP_ID,
    disabled: dragDisabled
  })

  return (
    <ModuleTreeRootDropZone
      dropRef={setNodeRef}
      active={active}
      highlighted={active && isOver}
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
