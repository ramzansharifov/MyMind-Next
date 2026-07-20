import { readFileSync, writeFileSync } from 'node:fs'

function replaceOnce(path, from, to) {
  const source = readFileSync(path, 'utf8')
  const first = source.indexOf(from)
  const last = source.lastIndexOf(from)

  if (first < 0 || first !== last) {
    throw new Error(`Expected exactly one match in ${path}`)
  }

  writeFileSync(path, `${source.slice(0, first)}${to}${source.slice(first + from.length)}`)
}

function replaceBetween(path, startMarker, endMarker, replacement) {
  const source = readFileSync(path, 'utf8')
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker, start)

  if (start < 0 || end < 0) {
    throw new Error(`Unable to find replacement range in ${path}`)
  }

  writeFileSync(path, `${source.slice(0, start)}${replacement}${source.slice(end)}`)
}

const moduleSidebarPath = 'src/renderer/src/shared/ui/ModuleSidebar.tsx'
replaceOnce(
  moduleSidebarPath,
  `  children: ReactNode\n  onHomeSelect: () => void`,
  `  children: ReactNode\n  contentClassName?: string\n  onHomeSelect: () => void`
)
replaceOnce(
  moduleSidebarPath,
  `  children,\n  onHomeSelect,`,
  `  children,\n  contentClassName,\n  onHomeSelect,`
)
replaceOnce(
  moduleSidebarPath,
  `        className={cn('min-h-0 flex-1 overflow-y-auto', collapsed ? 'px-2 py-3' : 'p-3')}`,
  `        className={cn(\n          'min-h-0 flex-1 overflow-y-auto',\n          collapsed ? 'px-2 py-3' : 'p-3',\n          contentClassName\n        )}`
)

const studyPagePath = 'src/renderer/src/modules/study/StudyPage.tsx'
replaceOnce(
  studyPagePath,
  `        collapsed={isSidebarCollapsed}\n        homeSelected={selectedNode === null}`,
  `        collapsed={isSidebarCollapsed}\n        contentClassName={isSidebarCollapsed ? undefined : 'px-0 py-3'}\n        homeSelected={selectedNode === null}`
)

const studyTreePath = 'src/renderer/src/modules/study/components/StudyTree.tsx'
replaceOnce(
  studyTreePath,
  `import * as DropdownMenu from '@radix-ui/react-dropdown-menu'`,
  `import * as ContextMenu from '@radix-ui/react-context-menu'\nimport * as DropdownMenu from '@radix-ui/react-dropdown-menu'`
)
replaceOnce(
  studyTreePath,
  `          <div className={cn('shrink-0', collapsed ? 'space-y-1.5' : 'space-y-1')}>`,
  `          <div className={cn('shrink-0', collapsed ? 'space-y-1.5' : 'space-y-0')}>`
)

const studyTreeItemReplacement = String.raw`function StudyTreeItem({
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
  const [contextMenuOpen, setContextMenuOpen] = useState(false)

  const isFolder = node.type === 'folder'
  const anyMenuOpen = menuOpen || contextMenuOpen
  const guideOrigin = 12
  const guideStep = 16

  const menuEntries = createStudyTreeMenuEntries({
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
    <ContextMenu.Root open={contextMenuOpen} onOpenChange={setContextMenuOpen}>
      <ContextMenu.Trigger asChild>
        <div
          ref={setDraggableRef}
          data-study-tree-node-id={node.id}
          className={cn(
            'group relative flex h-8 items-center',
            collapsed ? 'justify-center rounded-lg' : 'w-full rounded-none',
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
                  paddingLeft: `${2 + depth * guideStep}px`
                }
          }
        >
          <StudyTreeDropZones node={node} dragDisabled={dragDisabled} />

          {!collapsed &&
            Array.from({ length: depth }, (_, guideDepth) => (
              <span
                key={guideDepth}
                aria-hidden="true"
                data-study-tree-guide="ancestor"
                data-guide-depth={guideDepth}
                className="study-tree-guide inset-y-0"
                style={{ left: `${guideOrigin + guideDepth * guideStep}px` }}
              />
            ))}

          {!collapsed && isFolder && hasVisibleChildren && (
            <span
              aria-hidden="true"
              data-study-tree-guide="folder"
              data-guide-depth={depth}
              className="study-tree-guide top-1/2 bottom-0"
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
                className="z-20 flex size-5 shrink-0 items-center justify-center rounded-sm p-0 hover:bg-white/[0.05]"
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
              <span className="size-5 shrink-0" />
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
                  : 'flex-1 gap-1.5 py-1.5 pr-1',
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

              <StudyTreeDropdownMenuContent entries={menuEntries} />
            </DropdownMenu.Root>
          )}
        </div>
      </ContextMenu.Trigger>

      {!collapsed && <StudyTreeContextMenuContent entries={menuEntries} />}
    </ContextMenu.Root>
  )
}

type StudyTreeMenuEntry =
  | {
      kind: 'item'
      key: string
      label: string
      icon: React.JSX.Element
      danger?: boolean
      onSelect: () => void
    }
  | {
      kind: 'separator'
      key: string
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
}): StudyTreeMenuEntry[] {
  const entries: StudyTreeMenuEntry[] = []

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

function StudyTreeDropdownMenuContent({
  entries
}: {
  entries: StudyTreeMenuEntry[]
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
            <DropdownMenu.Separator
              key={entry.key}
              className="my-1 h-px bg-[var(--app-border)]"
            />
          ) : (
            <DropdownMenu.Item
              key={entry.key}
              data-study-tree-action={entry.key}
              className={cn(
                'flex cursor-default items-center gap-2 rounded-lg px-2.5 py-2 outline-none',
                entry.danger
                  ? 'text-red-300 hover:bg-red-500/10 focus:bg-red-500/10'
                  : 'hover:bg-white/[0.06] focus:bg-white/[0.06]'
              )}
              onSelect={entry.onSelect}
            >
              {entry.icon}
              {entry.label}
            </DropdownMenu.Item>
          )
        )}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  )
}

function StudyTreeContextMenuContent({
  entries
}: {
  entries: StudyTreeMenuEntry[]
}): React.JSX.Element {
  return (
    <ContextMenu.Portal>
      <ContextMenu.Content
        collisionPadding={8}
        className="z-50 min-w-48 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-1.5 text-sm text-[var(--app-text)] shadow-xl shadow-black/25"
      >
        {entries.map((entry) =>
          entry.kind === 'separator' ? (
            <ContextMenu.Separator
              key={entry.key}
              className="my-1 h-px bg-[var(--app-border)]"
            />
          ) : (
            <ContextMenu.Item
              key={entry.key}
              data-study-tree-action={entry.key}
              className={cn(
                'flex cursor-default items-center gap-2 rounded-lg px-2.5 py-2 outline-none',
                entry.danger
                  ? 'text-red-300 hover:bg-red-500/10 focus:bg-red-500/10'
                  : 'hover:bg-white/[0.06] focus:bg-white/[0.06]'
              )}
              onSelect={entry.onSelect}
            >
              {entry.icon}
              {entry.label}
            </ContextMenu.Item>
          )
        )}
      </ContextMenu.Content>
    </ContextMenu.Portal>
  )
}

`

replaceBetween(
  studyTreePath,
  'function StudyTreeItem({',
  '\nfunction StudyTreeDropZones(',
  studyTreeItemReplacement
)

const mainCssPath = 'src/renderer/src/assets/main.css'
replaceOnce(
  mainCssPath,
  `.module-tree-root-drop-zone[data-highlighted='true'] {\n  border-color: var(--app-accent-500);\n}\n\n.mymind-board-canvas .tl-container {`,
  `.module-tree-root-drop-zone[data-highlighted='true'] {\n  border-color: var(--app-accent-500);\n}\n\n.study-tree-guide {\n  position: absolute;\n  z-index: 0;\n  width: 1px;\n  pointer-events: none;\n  background: color-mix(in srgb, var(--app-border-strong) 82%, transparent);\n  opacity: 0;\n  transition: opacity 140ms ease;\n}\n\n[data-module-sidebar]:hover .study-tree-guide {\n  opacity: 0.82;\n}\n\n.mymind-board-canvas .tl-container {`
)

const studyTreeTest = String.raw`import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { StudyNode } from '../../../../../shared/contracts/study'

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: ReactNode }) => children,
  DragOverlay: ({ children }: { children: ReactNode }) => children,
  PointerSensor: class PointerSensor {},
  pointerWithin: vi.fn(),
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    isDragging: false
  }),
  useDroppable: () => ({
    setNodeRef: vi.fn(),
    isOver: false
  }),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => [])
}))

vi.mock('../../../shared/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => children
}))

import { StudyTree } from './StudyTree'

const folder: StudyNode = {
  id: 'folder-1',
  type: 'folder',
  parentId: null,
  title: 'Папка',
  position: 0,
  isExpanded: true,
  createdAt: 1,
  updatedAt: 1
}

const material: StudyNode = {
  id: 'material-1',
  type: 'material',
  parentId: folder.id,
  title: 'Материал',
  position: 0,
  createdAt: 1,
  updatedAt: 1
}

function renderTree(onRename = vi.fn()): void {
  render(
    <StudyTree
      nodes={[folder, material]}
      search=""
      selectedNodeId={material.id}
      activeParentId={folder.id}
      collapsed={false}
      onSelect={vi.fn()}
      onSelectRoot={vi.fn()}
      onToggleFolder={vi.fn()}
      onRename={onRename}
      onDuplicate={vi.fn()}
      onDelete={vi.fn()}
      onCreateFolder={vi.fn()}
      onCreateMaterial={vi.fn()}
      onMove={vi.fn()}
    />
  )
}

describe('StudyTree sidebar interactions', () => {
  it('uses full-width compact rows and hover-only nesting guides', () => {
    renderTree()

    const folderRow = document.querySelector('[data-study-tree-node-id="folder-1"]')
    const materialRow = document.querySelector('[data-study-tree-node-id="material-1"]')

    expect(folderRow).toHaveClass('h-8', 'w-full', 'rounded-none')
    expect(folderRow).toHaveStyle({ paddingLeft: '2px' })
    expect(materialRow).toHaveStyle({ paddingLeft: '18px' })
    expect(screen.getByRole('button', { name: 'Свернуть папку' })).toHaveClass('size-5', 'p-0')
    expect(folderRow?.querySelector('[data-study-tree-guide="folder"]')).toBeInTheDocument()
    expect(materialRow?.querySelector('[data-study-tree-guide="ancestor"]')).toBeInTheDocument()
  })

  it('opens the same actions by right click and colors the rename icon with the accent palette', async () => {
    const user = userEvent.setup()
    const onRename = vi.fn()
    renderTree(onRename)

    fireEvent.contextMenu(screen.getByRole('button', { name: 'Открыть: Папка' }))

    const renameItem = await screen.findByRole('menuitem', { name: 'Переименовать' })
    const renameIcon = renameItem.querySelector('svg')

    expect(renameItem).toHaveAttribute('data-study-tree-action', 'rename')
    expect(renameIcon).toHaveClass('text-violet-300')

    await user.click(renameItem)
    expect(onRename).toHaveBeenCalledWith(folder)
  })
})
`
writeFileSync('src/renderer/src/modules/study/components/StudyTree.test.tsx', studyTreeTest)

const moduleSidebarTest = String.raw`import { render } from '@testing-library/react'
import { BookOpen } from 'lucide-react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => children
}))

import { ModuleSidebar } from './ModuleSidebar'

describe('ModuleSidebar content spacing', () => {
  it('allows a module tree to occupy the full sidebar width', () => {
    const { container } = render(
      <ModuleSidebar
        navigationLabel="Навигация"
        moduleLabel="Обучение"
        homeLabel="Главная"
        icon={BookOpen}
        collapsed={false}
        homeSelected={false}
        expandLabel="Показать"
        collapseLabel="Скрыть"
        contentClassName="px-0 py-3"
        onHomeSelect={vi.fn()}
        onCollapsedChange={vi.fn()}
      >
        <div>Дерево</div>
      </ModuleSidebar>
    )

    expect(container.querySelector('[data-module-sidebar-content]')).toHaveClass('px-0', 'py-3')
  })
})
`
writeFileSync('src/renderer/src/shared/ui/ModuleSidebar.test.tsx', moduleSidebarTest)
