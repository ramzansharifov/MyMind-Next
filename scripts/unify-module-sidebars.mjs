import { readFileSync, writeFileSync } from 'node:fs'

function read(path) {
  return readFileSync(path, 'utf8')
}

function write(path, content) {
  writeFileSync(path, content, 'utf8')
}

function replaceOnce(path, before, after) {
  const content = read(path)

  if (content.includes(after)) {
    return
  }

  const index = content.indexOf(before)
  if (index < 0) {
    throw new Error(`Pattern not found in ${path}: ${before.slice(0, 160)}`)
  }

  if (content.indexOf(before, index + before.length) >= 0) {
    throw new Error(`Pattern is not unique in ${path}: ${before.slice(0, 160)}`)
  }

  write(path, content.slice(0, index) + after + content.slice(index + before.length))
}

function replaceRange(path, startMarker, endMarker, replacement) {
  const content = read(path)
  const start = content.indexOf(startMarker)

  if (start < 0) {
    throw new Error(`Start marker not found in ${path}: ${startMarker}`)
  }

  const endStart = content.indexOf(endMarker, start + startMarker.length)
  if (endStart < 0) {
    throw new Error(`End marker not found in ${path}: ${endMarker}`)
  }

  const end = endStart + endMarker.length
  write(path, content.slice(0, start) + replacement + content.slice(end))
}

function removeUntil(path, startMarker, nextMarker) {
  const content = read(path)
  const start = content.indexOf(startMarker)

  if (start < 0) {
    return
  }

  const end = content.indexOf(nextMarker, start + startMarker.length)
  if (end < 0) {
    throw new Error(`Next marker not found in ${path}: ${nextMarker}`)
  }

  write(path, content.slice(0, start) + content.slice(end))
}

const moduleSidebarPath = 'src/renderer/src/shared/ui/ModuleSidebar.tsx'

write(
  moduleSidebarPath,
  `import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react'\nimport type { ReactNode } from 'react'\n\nimport { cn } from '../lib/cn'\nimport { Tooltip } from './tooltip'\n\ninterface ModuleSidebarProps {\n  navigationLabel: string\n  moduleLabel: string\n  homeLabel: string\n  icon: LucideIcon\n  collapsed: boolean\n  homeSelected: boolean\n  expandLabel: string\n  collapseLabel: string\n  children: ReactNode\n  onHomeSelect: () => void\n  onCollapsedChange: (collapsed: boolean) => void\n}\n\nexport function getModuleSidebarLayoutClassName(collapsed: boolean): string {\n  return cn(\n    'grid h-full min-h-0 overflow-hidden',\n    'transition-[grid-template-columns] duration-200 ease-out',\n    'motion-reduce:transition-none',\n    collapsed ? 'grid-cols-[64px_minmax(0,1fr)]' : 'grid-cols-[280px_minmax(0,1fr)]'\n  )\n}\n\nexport function ModuleSidebar({\n  navigationLabel,\n  moduleLabel,\n  homeLabel,\n  icon: Icon,\n  collapsed,\n  homeSelected,\n  expandLabel,\n  collapseLabel,\n  children,\n  onHomeSelect,\n  onCollapsedChange\n}: ModuleSidebarProps): React.JSX.Element {\n  const toggleLabel = collapsed ? expandLabel : collapseLabel\n\n  return (\n    <aside\n      aria-label={navigationLabel}\n      data-module-sidebar\n      data-collapsed={collapsed}\n      className=\"group/module-sidebar relative flex min-h-0 flex-col border-r border-[var(--app-border)] bg-[var(--app-sidebar)]\"\n    >\n      <header\n        className={cn(\n          'flex h-[var(--app-header-height)] shrink-0 items-center border-b border-[var(--app-border)]',\n          collapsed ? 'px-2' : 'px-3'\n        )}\n      >\n        <Tooltip content={homeLabel} side=\"right\" disabled={!collapsed}>\n          <button\n            type=\"button\"\n            aria-label={homeLabel}\n            aria-current={homeSelected ? 'page' : undefined}\n            className={cn(\n              'flex h-11 w-full items-center rounded-xl text-left transition-colors outline-none',\n              'focus-visible:ring-2 focus-visible:ring-violet-500/35',\n              collapsed ? 'justify-center px-0' : 'gap-3 px-3 pr-8',\n              homeSelected\n                ? 'bg-violet-500/10 text-violet-200 ring-1 ring-violet-500/15 ring-inset'\n                : 'text-[var(--app-muted)] hover:bg-white/[0.04] hover:text-[var(--app-text)]'\n            )}\n            onClick={onHomeSelect}\n          >\n            <span className=\"flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300\">\n              <Icon aria-hidden=\"true\" className=\"size-4\" />\n            </span>\n\n            {!collapsed && (\n              <span className=\"min-w-0 truncate text-sm font-semibold\">{moduleLabel}</span>\n            )}\n          </button>\n        </Tooltip>\n      </header>\n\n      <Tooltip content={toggleLabel} side=\"right\">\n        <button\n          type=\"button\"\n          aria-label={toggleLabel}\n          className={cn(\n            'absolute top-8 right-0 z-30',\n            'flex size-7 translate-x-1/2 -translate-y-1/2',\n            'items-center justify-center rounded-full border',\n            'border-violet-500/25 bg-violet-500/12',\n            'text-violet-300 opacity-0 outline-none',\n            'transition-[opacity,background-color,color,transform]',\n            'group-hover/module-sidebar:opacity-100',\n            'group-focus-within/module-sidebar:opacity-100',\n            'hover:scale-105 hover:bg-violet-500/20',\n            'focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-violet-500/60'\n          )}\n          onClick={() => onCollapsedChange(!collapsed)}\n        >\n          {collapsed ? (\n            <ChevronRight aria-hidden=\"true\" className=\"size-4\" />\n          ) : (\n            <ChevronLeft aria-hidden=\"true\" className=\"size-4\" />\n          )}\n        </button>\n      </Tooltip>\n\n      <div\n        data-module-sidebar-content\n        className={cn('min-h-0 flex-1 overflow-y-auto', collapsed ? 'px-2 py-3' : 'p-3')}\n      >\n        {children}\n      </div>\n    </aside>\n  )\n}\n`
)

const studyPagePath = 'src/renderer/src/modules/study/StudyPage.tsx'

replaceOnce(
  studyPagePath,
  `  BookOpen,\n  ChevronLeft,\n  ChevronRight,\n  FilePlus2,`,
  `  BookOpen,\n  FilePlus2,`
)

replaceOnce(
  studyPagePath,
  `import { cn } from '../../shared/lib/cn'\nimport { Tooltip } from '../../shared/ui/tooltip'`,
  `import { cn } from '../../shared/lib/cn'\nimport {\n  getModuleSidebarLayoutClassName,\n  ModuleSidebar\n} from '../../shared/ui/ModuleSidebar'\nimport { Tooltip } from '../../shared/ui/tooltip'`
)

replaceOnce(
  studyPagePath,
  `    <section\n      className={cn(\n        'grid h-full min-h-0 overflow-hidden',\n        'transition-[grid-template-columns] duration-200 ease-out',\n        'motion-reduce:transition-none',\n        isSidebarCollapsed ? 'grid-cols-[64px_minmax(0,1fr)]' : 'grid-cols-[280px_minmax(0,1fr)]'\n      )}\n    >`,
  `    <section className={getModuleSidebarLayoutClassName(isSidebarCollapsed)}>`
)

replaceRange(
  studyPagePath,
  `      <aside\n        data-collapsed={isSidebarCollapsed}`,
  `      </aside>`,
  `      <ModuleSidebar\n        navigationLabel=\"Библиотека обучения\"\n        moduleLabel=\"Обучение\"\n        homeLabel=\"Главная обучения\"\n        icon={BookOpen}\n        collapsed={isSidebarCollapsed}\n        homeSelected={selectedNode === null}\n        expandLabel=\"Показать библиотеку\"\n        collapseLabel=\"Скрыть библиотеку\"\n        onHomeSelect={() => {\n          selectStudyNode(null)\n        }}\n        onCollapsedChange={setIsSidebarCollapsed}\n      >\n        {study.isLoading ? (\n          <p className=\"px-2 py-4 text-sm text-[var(--app-muted)]\">Загрузка…</p>\n        ) : (\n          <StudyTree\n            nodes={study.nodes}\n            search=\"\"\n            selectedNodeId={study.selectedNodeId}\n            activeParentId={selectedParentId}\n            collapsed={isSidebarCollapsed}\n            onSelect={selectStudyNode}\n            onSelectRoot={() => {\n              selectStudyNode(null)\n            }}\n            onToggleFolder={(node) => {\n              if (!deletePendingRef.current) {\n                void study.toggleFolder(node)\n              }\n            }}\n            onRename={openRename}\n            onDuplicate={(node) => {\n              void runAfterDraftFlush(async () => {\n                clearInternalLinkNavigation()\n\n                await study.duplicateNode(node.id)\n              })\n            }}\n            onDelete={openDelete}\n            onCreateFolder={(parentId) => {\n              void runAfterDraftFlush(async () => {\n                clearInternalLinkNavigation()\n\n                const parentFolder = study.nodes.find((node) => node.id === parentId)\n\n                if (parentFolder?.type === 'folder' && !parentFolder.isExpanded) {\n                  await study.toggleFolder(parentFolder)\n                }\n\n                await study.createNode({\n                  type: 'folder',\n                  parentId\n                })\n              })\n            }}\n            onCreateMaterial={(parentId) => {\n              void runAfterDraftFlush(async () => {\n                clearInternalLinkNavigation()\n\n                const parentFolder = study.nodes.find((node) => node.id === parentId)\n\n                if (parentFolder?.type === 'folder' && !parentFolder.isExpanded) {\n                  await study.toggleFolder(parentFolder)\n                }\n\n                await study.createNode({\n                  type: 'material',\n                  parentId\n                })\n              })\n            }}\n            onMove={(input) => {\n              if (!deletePendingRef.current) {\n                void study.moveNode(input)\n              }\n            }}\n          />\n        )}\n\n        {study.error && (\n          <p className=\"mt-3 rounded-lg border border-red-500/20 bg-red-500/[0.06] p-3 text-xs text-red-300\">\n            {study.error}\n          </p>\n        )}\n      </ModuleSidebar>`
)

const boardsPagePath = 'src/renderer/src/modules/boards/BoardsPage.tsx'

replaceOnce(
  boardsPagePath,
  `import {\n  Check,\n  ChevronRight,\n  Folder,\n  FolderPlus,\n  Home,\n  LayoutDashboard,\n  LoaderCircle,\n  LockKeyhole,\n  MoreHorizontal,\n  PanelLeftClose,\n  PanelLeftOpen,\n  Pencil,\n  Plus,\n  Presentation,\n  Trash2,\n  TriangleAlert\n} from 'lucide-react'`,
  `import {\n  Check,\n  ChevronDown,\n  ChevronRight,\n  Folder,\n  FolderPlus,\n  LayoutDashboard,\n  LoaderCircle,\n  LockKeyhole,\n  MoreHorizontal,\n  Pencil,\n  Plus,\n  Presentation,\n  Trash2,\n  TriangleAlert\n} from 'lucide-react'`
)

replaceOnce(
  boardsPagePath,
  `import { cn } from '../../shared/lib/cn'\nimport { boardsClient } from './api/boards-client'`,
  `import { cn } from '../../shared/lib/cn'\nimport {\n  getModuleSidebarLayoutClassName,\n  ModuleSidebar\n} from '../../shared/ui/ModuleSidebar'\nimport { Tooltip } from '../../shared/ui/tooltip'\nimport { boardsClient } from './api/boards-client'`
)

replaceOnce(
  boardsPagePath,
  `    <section className=\"flex h-full min-h-0 bg-[var(--app-workspace)]\">`,
  `    <section className={getModuleSidebarLayoutClassName(sidebarCollapsed)}>`
)

replaceRange(
  boardsPagePath,
  `      <aside\n        aria-label=\"Дерево досок\"`,
  `      </aside>`,
  `      <ModuleSidebar\n        navigationLabel=\"Дерево досок\"\n        moduleLabel=\"Доски\"\n        homeLabel=\"Главная досок\"\n        icon={Presentation}\n        collapsed={sidebarCollapsed}\n        homeSelected={selectedId === null}\n        expandLabel=\"Показать дерево досок\"\n        collapseLabel=\"Скрыть дерево досок\"\n        onHomeSelect={() => {\n          void openNode(null)\n        }}\n        onCollapsedChange={setSidebarCollapsed}\n      >\n        {(nodesByParent.get(null) ?? []).length === 0 ? (\n          <div className=\"flex min-h-32 items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] px-4 text-center text-sm text-[var(--app-muted)]\">\n            Создайте первую папку или доску\n          </div>\n        ) : (\n          <div className={cn('shrink-0', sidebarCollapsed ? 'space-y-1.5' : 'space-y-1')}>\n            {(nodesByParent.get(null) ?? []).map((node, index, rootNodes) => (\n              <BoardTreeNode\n                key={node.id}\n                node={node}\n                depth={0}\n                isLastSibling={index === rootNodes.length - 1}\n                selectedId={selectedId}\n                collapsed={sidebarCollapsed}\n                nodesByParent={nodesByParent}\n                onOpen={(id) => void openNode(id)}\n                onToggle={async (folder) => {\n                  await boardsClient.updateExpansion(folder.id, !folder.isExpanded)\n                  await refreshNodes()\n                }}\n                onRename={startRename}\n                onDelete={setDeleteTarget}\n                onCreate={startCreate}\n              />\n            ))}\n          </div>\n        )}\n      </ModuleSidebar>`
)

replaceRange(
  boardsPagePath,
  `function BoardTreeNode({`,
  `function BoardNodeMenu({`,
  `function BoardTreeNode({\n  node,\n  depth,\n  isLastSibling,\n  selectedId,\n  collapsed,\n  nodesByParent,\n  onOpen,\n  onToggle,\n  onRename,\n  onDelete,\n  onCreate\n}: {\n  node: BoardNode\n  depth: number\n  isLastSibling: boolean\n  selectedId: string | null\n  collapsed: boolean\n  nodesByParent: Map<string | null, BoardNode[]>\n  onOpen: (id: string) => void\n  onToggle: (node: BoardNode) => void | Promise<void>\n  onRename: (node: BoardNode) => void\n  onDelete: (node: BoardNode) => void\n  onCreate: (type: BoardNodeType, parentId: string | null) => void\n}): React.JSX.Element {\n  const children = nodesByParent.get(node.id) ?? []\n  const isFolder = node.type === 'folder'\n  const hasVisibleChildren = isFolder && node.isExpanded && children.length > 0\n  const Icon = isFolder ? Folder : Presentation\n\n  return (\n    <div className={cn(collapsed ? 'space-y-1.5' : 'space-y-1')}>\n      <div\n        className={cn(\n          'group relative flex h-9 items-center rounded-lg',\n          collapsed && 'justify-center',\n          selectedId === node.id\n            ? 'bg-violet-500/12 text-violet-200'\n            : 'text-[var(--app-muted)] hover:bg-white/[0.04] hover:text-[var(--app-text)]'\n        )}\n        style={collapsed ? undefined : { paddingLeft: \`${4 + depth * 16}px\` }}\n      >\n        {collapsed && depth > 0 && (\n          <span\n            aria-hidden=\"true\"\n            className=\"pointer-events-none absolute top-0 left-1/2 h-1/2 w-px -translate-x-1/2 bg-[var(--app-border-strong)]\"\n          />\n        )}\n\n        {collapsed && (hasVisibleChildren || !isLastSibling) && (\n          <span\n            aria-hidden=\"true\"\n            className=\"pointer-events-none absolute bottom-0 left-1/2 h-1/2 w-px -translate-x-1/2 bg-[var(--app-border-strong)]\"\n          />\n        )}\n\n        {!collapsed &&\n          (isFolder ? (\n            <button\n              type=\"button\"\n              aria-label={node.isExpanded ? 'Свернуть папку' : 'Развернуть папку'}\n              className=\"z-20 flex size-7 shrink-0 items-center justify-center rounded-md outline-none hover:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-violet-500/35\"\n              onClick={() => void onToggle(node)}\n            >\n              {node.isExpanded ? (\n                <ChevronDown aria-hidden=\"true\" className=\"size-3.5\" />\n              ) : (\n                <ChevronRight aria-hidden=\"true\" className=\"size-3.5\" />\n              )}\n            </button>\n          ) : (\n            <span className=\"size-7 shrink-0\" />\n          ))}\n\n        <Tooltip content={\`${node.title} · \${isFolder ? 'Папка' : 'Доска'}\`} side=\"right\">\n          <button\n            type=\"button\"\n            aria-label={node.title}\n            className={cn(\n              'relative z-10 flex min-w-0 items-center text-left text-sm outline-none',\n              'focus-visible:ring-2 focus-visible:ring-violet-500/35 focus-visible:ring-inset',\n              collapsed\n                ? 'size-8 shrink-0 justify-center rounded-lg bg-[var(--app-sidebar)] p-0'\n                : 'flex-1 gap-2 py-2'\n            )}\n            onClick={() => onOpen(node.id)}\n          >\n            <Icon aria-hidden=\"true\" className=\"size-4 shrink-0\" />\n            {!collapsed && <span className=\"truncate\">{node.title}</span>}\n            {!collapsed && node.isSystem && (\n              <LockKeyhole aria-hidden=\"true\" className=\"ml-auto size-3.5 shrink-0 opacity-60\" />\n            )}\n          </button>\n        </Tooltip>\n\n        {!collapsed && (\n          <BoardNodeMenu node={node} onRename={onRename} onDelete={onDelete} onCreate={onCreate} />\n        )}\n      </div>\n\n      {hasVisibleChildren && (\n        <div className={cn(collapsed ? 'space-y-1.5' : 'space-y-1')}>\n          {children.map((child, index) => (\n            <BoardTreeNode\n              key={child.id}\n              node={child}\n              depth={depth + 1}\n              isLastSibling={index === children.length - 1}\n              selectedId={selectedId}\n              collapsed={collapsed}\n              nodesByParent={nodesByParent}\n              onOpen={onOpen}\n              onToggle={onToggle}\n              onRename={onRename}\n              onDelete={onDelete}\n              onCreate={onCreate}\n            />\n          ))}\n        </div>\n      )}\n    </div>\n  )\n}\n\nfunction BoardNodeMenu({`
)

replaceRange(
  boardsPagePath,
  `function BoardNodeMenu({`,
  `function BoardsHome({`,
  `function BoardNodeMenu({\n  node,\n  onRename,\n  onDelete,\n  onCreate\n}: {\n  node: BoardNode\n  onRename: (node: BoardNode) => void\n  onDelete: (node: BoardNode) => void\n  onCreate: (type: BoardNodeType, parentId: string | null) => void\n}): React.JSX.Element {\n  const [menuOpen, setMenuOpen] = useState(false)\n\n  return (\n    <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>\n      <DropdownMenu.Trigger asChild>\n        <button\n          type=\"button\"\n          aria-label={\`Действия: \${node.title}\`}\n          className={cn(\n            'z-20 mr-1 flex size-7 shrink-0 items-center justify-center rounded-md',\n            'text-[var(--app-muted)] hover:bg-white/[0.07] hover:text-[var(--app-text)]',\n            menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'\n          )}\n        >\n          <MoreHorizontal aria-hidden=\"true\" className=\"size-4\" />\n        </button>\n      </DropdownMenu.Trigger>\n\n      <DropdownMenu.Portal>\n        <DropdownMenu.Content\n          sideOffset={6}\n          align=\"start\"\n          className=\"z-50 min-w-48 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-1.5 text-sm text-[var(--app-text)] shadow-xl shadow-black/25\"\n        >\n          {node.type === 'folder' && (\n            <>\n              <BoardMenuItem\n                icon={FolderPlus}\n                label=\"Новая папка\"\n                accent\n                onSelect={() => onCreate('folder', node.id)}\n              />\n              <BoardMenuItem\n                icon={Presentation}\n                label=\"Новая доска\"\n                accent\n                onSelect={() => onCreate('board', node.id)}\n              />\n              <DropdownMenu.Separator className=\"my-1 h-px bg-[var(--app-border)]\" />\n            </>\n          )}\n\n          {!node.isSystem ? (\n            <>\n              <BoardMenuItem icon={Pencil} label=\"Переименовать\" onSelect={() => onRename(node)} />\n              <DropdownMenu.Separator className=\"my-1 h-px bg-[var(--app-border)]\" />\n              <BoardMenuItem\n                icon={Trash2}\n                label=\"Удалить\"\n                danger\n                onSelect={() => onDelete(node)}\n              />\n            </>\n          ) : (\n            <p className=\"px-2.5 py-2 text-xs text-[var(--app-muted)]\">\n              Системная папка защищена\n            </p>\n          )}\n        </DropdownMenu.Content>\n      </DropdownMenu.Portal>\n    </DropdownMenu.Root>\n  )\n}\n\nfunction BoardMenuItem({\n  icon: Icon,\n  label,\n  accent = false,\n  danger = false,\n  onSelect\n}: {\n  icon: typeof Folder\n  label: string\n  accent?: boolean\n  danger?: boolean\n  onSelect: () => void\n}): React.JSX.Element {\n  return (\n    <DropdownMenu.Item\n      className={cn(\n        'flex cursor-default items-center gap-2 rounded-lg px-2.5 py-2 outline-none',\n        danger\n          ? 'text-red-300 hover:bg-red-500/10 focus:bg-red-500/10'\n          : 'hover:bg-white/[0.06] focus:bg-white/[0.06]'\n      )}\n      onSelect={onSelect}\n    >\n      <Icon\n        aria-hidden=\"true\"\n        className={cn('size-4', accent && !danger && 'text-violet-300')}\n      />\n      {label}\n    </DropdownMenu.Item>\n  )\n}\n\nfunction BoardsHome({`
)

removeUntil(boardsPagePath, `function SidebarCreateButton({`, `function MetricCard({`)

const boardsTestPath = 'src/renderer/src/modules/boards/BoardsPage.test.tsx'

replaceOnce(
  boardsTestPath,
  `  it('loads BoardCanvas only for a board and isolates a lazy import failure in the workspace', async () => {`,
  `  it('uses the shared module sidebar dimensions and collapse behavior', async () => {\n    testHarness.listNodes.mockResolvedValueOnce([systemFolder])\n\n    render(<BoardsPage />)\n\n    await screen.findByRole('heading', { name: 'Доски', level: 1 })\n\n    const sidebar = screen.getByRole('complementary', { name: 'Дерево досок' })\n\n    expect(sidebar).toHaveAttribute('data-module-sidebar')\n    expect(sidebar).toHaveAttribute('data-collapsed', 'false')\n    expect(screen.getByRole('button', { name: 'Обучение' })).toHaveClass('text-sm')\n\n    fireEvent.click(screen.getByRole('button', { name: 'Скрыть дерево досок' }))\n\n    expect(sidebar).toHaveAttribute('data-collapsed', 'true')\n    expect(screen.getByRole('button', { name: 'Показать дерево досок' })).toBeInTheDocument()\n    expect(screen.getByRole('button', { name: 'Главная досок' })).toBeInTheDocument()\n  })\n\n  it('loads BoardCanvas only for a board and isolates a lazy import failure in the workspace', async () => {`
)

console.log('Module sidebars unified')
