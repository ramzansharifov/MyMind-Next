import { readFileSync, writeFileSync } from 'node:fs'

function read(path) {
  return readFileSync(path, 'utf8')
}

function write(path, content) {
  writeFileSync(path, content, 'utf8')
}

function replaceOnce(path, before, after) {
  const content = read(path)

  if (content.includes(after)) return

  const index = content.indexOf(before)
  if (index < 0) {
    throw new Error(`Pattern not found in ${path}: ${before.slice(0, 240)}`)
  }

  if (content.indexOf(before, index + before.length) >= 0) {
    throw new Error(`Pattern is not unique in ${path}: ${before.slice(0, 240)}`)
  }

  write(path, content.slice(0, index) + after + content.slice(index + before.length))
}

function replaceRange(path, startMarker, endMarker, replacement) {
  const content = read(path)
  const startIndex = content.indexOf(startMarker)

  if (startIndex < 0) {
    throw new Error(`Start marker not found in ${path}: ${startMarker}`)
  }

  const endIndex = content.indexOf(endMarker, startIndex)
  if (endIndex < 0) {
    throw new Error(`End marker not found in ${path}: ${endMarker}`)
  }

  write(path, content.slice(0, startIndex) + replacement + content.slice(endIndex))
}

const sharedImport = `import {
  getModuleTreeNodeDropContainerClassName,
  ModuleTreeDragOverlay,
  ModuleTreeNodeDropIndicator,
  ModuleTreeRootDropZone
} from '../../../shared/ui/ModuleTreeDndFeedback'`

const studyTreePath = 'src/renderer/src/modules/study/components/StudyTree.tsx'

replaceOnce(
  studyTreePath,
  `import { cn } from '../../../shared/lib/cn'
import { Tooltip } from '../../../shared/ui/tooltip'`,
  `import { cn } from '../../../shared/lib/cn'
${sharedImport}
import { Tooltip } from '../../../shared/ui/tooltip'`
)

replaceOnce(
  studyTreePath,
  `        dropPlacement === 'inside' && 'bg-violet-500/15 ring-1 ring-violet-500/45',`,
  `        getModuleTreeNodeDropContainerClassName(dropPlacement),`
)

replaceOnce(
  studyTreePath,
  `      {dropPlacement === 'before' && (
        <span className="pointer-events-none absolute top-0 right-1 left-1 h-0.5 -translate-y-1/2 rounded-full bg-violet-400" />
      )}

      {dropPlacement === 'after' && (
        <span className="pointer-events-none absolute right-1 bottom-0 left-1 h-0.5 translate-y-1/2 rounded-full bg-violet-400" />
      )}`,
  `      <ModuleTreeNodeDropIndicator placement={dropPlacement} />`
)

replaceRange(
  studyTreePath,
  `function StudyRootDropZone({`,
  `function StudyDragOverlay`,
  `function StudyRootDropZone({
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

`
)

replaceOnce(
  studyTreePath,
  `function StudyDragOverlay({ node }: { node: StudyNode }): React.JSX.Element {
  return (
    <div className="flex h-9 max-w-60 items-center gap-2 rounded-lg border border-violet-500/40 bg-[var(--app-surface-raised)] px-3 text-sm text-[var(--app-text)] shadow-lg shadow-black/25">
      {node.type === 'folder' ? (
        <StudyFolderIcon name={node.icon} className="size-4 shrink-0 text-violet-300" />
      ) : (
        <FileText aria-hidden="true" className="size-4 shrink-0 text-violet-300" />
      )}

      <span className="truncate">{node.title}</span>
    </div>
  )
}`,
  `function StudyDragOverlay({ node }: { node: StudyNode }): React.JSX.Element {
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
}`
)

const boardTreePath = 'src/renderer/src/modules/boards/components/BoardTree.tsx'

replaceOnce(
  boardTreePath,
  `import { cn } from '../../../shared/lib/cn'
import { Tooltip } from '../../../shared/ui/tooltip'`,
  `import { cn } from '../../../shared/lib/cn'
${sharedImport}
import { Tooltip } from '../../../shared/ui/tooltip'`
)

replaceOnce(
  boardTreePath,
  `  onCreate: (type: BoardNodeType, parentId: string | null) => void
  onMove: (input: MoveBoardNodeInput) => void`,
  `  onCreate: (type: BoardNodeType, parentId: string | null) => void
  onSelectRoot: () => void
  onMove: (input: MoveBoardNodeInput) => void`
)

replaceOnce(
  boardTreePath,
  `  onDelete,
  onCreate,
  onMove
}: BoardTreeProps): React.JSX.Element {`,
  `  onDelete,
  onCreate,
  onSelectRoot,
  onMove
}: BoardTreeProps): React.JSX.Element {`
)

replaceOnce(
  boardTreePath,
  `        <BoardRootDropZone
          active={activeNode !== null}
          highlighted={dropPreview?.placement === 'root'}
          collapsed={collapsed}
        />`,
  `        <BoardRootDropZone
          active={activeNode !== null}
          highlighted={dropPreview?.placement === 'root'}
          isContextActive={selectedNodeId === null}
          collapsed={collapsed}
          onSelect={onSelectRoot}
        />`
)

replaceOnce(
  boardTreePath,
  `          dropPlacement === 'inside' && 'bg-violet-500/15 ring-1 ring-violet-500/45',`,
  `          getModuleTreeNodeDropContainerClassName(dropPlacement),`
)

replaceOnce(
  boardTreePath,
  `        {dropPlacement === 'before' && (
          <span className="pointer-events-none absolute top-0 right-1 left-1 h-0.5 -translate-y-1/2 rounded-full bg-violet-400" />
        )}

        {dropPlacement === 'after' && (
          <span className="pointer-events-none absolute right-1 bottom-0 left-1 h-0.5 translate-y-1/2 rounded-full bg-violet-400" />
        )}`,
  `        <ModuleTreeNodeDropIndicator placement={dropPlacement} />`
)

replaceRange(
  boardTreePath,
  `function BoardRootDropZone({`,
  `function BoardDragOverlay`,
  `function BoardRootDropZone({
  active,
  highlighted,
  isContextActive,
  collapsed,
  onSelect
}: {
  active: boolean
  highlighted: boolean
  isContextActive: boolean
  collapsed: boolean
  onSelect: () => void
}): React.JSX.Element {
  const { setNodeRef } = useDroppable({
    id: ROOT_DROP_ID,
    disabled: !active
  })

  return (
    <ModuleTreeRootDropZone
      dropRef={setNodeRef}
      active={active}
      highlighted={highlighted}
      isContextActive={isContextActive}
      collapsed={collapsed}
      ariaLabel="Выбрать корень досок"
      idleLabel="Корень досок"
      activeLabel="Переместить в корень"
      onSelect={onSelect}
    />
  )
}

`
)

replaceOnce(
  boardTreePath,
  `function BoardDragOverlay({ node }: { node: BoardNode }): React.JSX.Element {
  const Icon = node.type === 'folder' ? Folder : Presentation

  return (
    <div className="flex max-w-64 items-center gap-2 rounded-lg border border-violet-500/35 bg-[var(--app-surface-raised)] px-3 py-2 text-sm text-[var(--app-text)] shadow-2xl shadow-black/30">
      <Icon aria-hidden="true" className="size-4 shrink-0 text-violet-300" />
      <span className="truncate">{node.title}</span>
    </div>
  )
}`,
  `function BoardDragOverlay({ node }: { node: BoardNode }): React.JSX.Element {
  const Icon = node.type === 'folder' ? Folder : Presentation

  return (
    <ModuleTreeDragOverlay
      icon={<Icon aria-hidden="true" className="size-4 shrink-0 text-violet-300" />}
      title={node.title}
    />
  )
}`
)

const boardsPagePath = 'src/renderer/src/modules/boards/BoardsPage.tsx'

replaceOnce(
  boardsPagePath,
  `          onDelete={setDeleteTarget}
          onCreate={startCreate}
          onMove={(input) => void moveNode(input)}`,
  `          onDelete={setDeleteTarget}
          onCreate={startCreate}
          onSelectRoot={() => void openNode(null)}
          onMove={(input) => void moveNode(input)}`
)

const boardsPageTestPath = 'src/renderer/src/modules/boards/BoardsPage.test.tsx'

replaceOnce(
  boardsPageTestPath,
  `    expect(screen.getByRole('button', { name: 'Обучение' })).toHaveClass('text-sm')`,
  `    expect(screen.getByRole('button', { name: 'Обучение' })).toHaveClass('text-sm')
    expect(screen.getByRole('button', { name: 'Выбрать корень досок' })).toHaveTextContent(
      'Корень досок'
    )`
)
