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
    throw new Error(`Pattern not found in ${path}: ${before.slice(0, 180)}`)
  }

  if (content.indexOf(before, index + before.length) >= 0) {
    throw new Error(`Pattern is not unique in ${path}: ${before.slice(0, 180)}`)
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

  write(path, content.slice(0, start) + replacement + content.slice(endStart))
}

function replaceRegex(path, pattern, replacement) {
  const content = read(path)
  const matches = content.match(pattern)

  if (!matches) {
    throw new Error(`Regex not found in ${path}: ${pattern}`)
  }

  write(path, content.replace(pattern, replacement))
}

const primitivesPath = 'src/renderer/src/shared/ui/WorkspacePrimitives.tsx'

write(
  primitivesPath,
  `import { cva, type VariantProps } from 'class-variance-authority'
import { ArrowRight } from 'lucide-react'
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode
} from 'react'

import { cn } from '../lib/cn'

const workspaceActionButtonVariants = cva(
  [
    'inline-flex h-10 w-full min-w-0 items-center justify-center gap-2',
    'rounded-xl border px-4',
    'text-sm font-medium whitespace-nowrap',
    'outline-none',
    'transition-[background-color,border-color,color,box-shadow]',
    'focus-visible:ring-2 focus-visible:ring-violet-500/35',
    'disabled:cursor-not-allowed disabled:opacity-40',
    '[&>svg]:size-4 [&>svg]:shrink-0'
  ],
  {
    variants: {
      variant: {
        secondary: [
          'border-[var(--app-border-strong)]',
          'bg-black/[0.08]',
          'text-[var(--app-text)]',
          'hover:border-violet-500/35',
          'hover:bg-white/[0.045]'
        ],
        primary: [
          'border-violet-400/20',
          'bg-violet-500',
          'text-white',
          'shadow-lg shadow-violet-950/20',
          'hover:border-violet-300/30',
          'hover:bg-violet-400'
        ]
      }
    },
    defaultVariants: {
      variant: 'secondary'
    }
  }
)

export interface WorkspaceActionButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof workspaceActionButtonVariants> {}

export const WorkspaceActionButton = forwardRef<
  HTMLButtonElement,
  WorkspaceActionButtonProps
>(function WorkspaceActionButton({ variant, className, ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(workspaceActionButtonVariants({ variant }), className)}
      {...props}
    />
  )
})

export function WorkspaceStatCard({
  icon,
  value,
  label,
  description
}: {
  icon: ReactNode
  value: number | string
  label: string
  description: string
}): React.JSX.Element {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-black/[0.08] p-3.5 shadow-sm shadow-black/5">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/15 bg-violet-500/10 text-violet-300">
        {icon}
      </div>

      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="text-xl font-semibold text-[var(--app-text)] tabular-nums">{value}</p>
          <p className="truncate text-xs font-medium text-[var(--app-text)]">{label}</p>
        </div>

        <p className="mt-0.5 truncate text-[11px] text-[var(--app-muted)]">{description}</p>
      </div>
    </div>
  )
}

export function WorkspacePanel({
  icon,
  title,
  count,
  children
}: {
  icon: ReactNode
  title: string
  count: number
  children: ReactNode
}): React.JSX.Element {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[0_12px_40px_rgb(0_0_0/0.1)]">
      <header className="flex min-h-20 items-center gap-3 border-b border-[var(--app-border)] px-5 py-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/15 bg-violet-500/10 text-violet-300">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-[var(--app-text)]">{title}</h2>
        </div>

        <span className="flex min-w-7 shrink-0 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-workspace)] px-2 py-1 text-[11px] font-medium text-[var(--app-muted)] tabular-nums">
          {count}
        </span>
      </header>

      <div className="p-4">{children}</div>
    </section>
  )
}

export function WorkspaceNodeCard({
  ariaLabel,
  icon,
  title,
  metadata,
  aside,
  compact = false,
  onOpen
}: {
  ariaLabel: string
  icon: ReactNode
  title: string
  metadata: ReactNode
  aside?: ReactNode
  compact?: boolean
  onOpen: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={cn(
        'group flex w-full min-w-0 items-center gap-3 rounded-xl border text-left outline-none',
        'border-[var(--app-border)] bg-[var(--app-workspace)]',
        'transition-[border-color,background-color,transform,box-shadow]',
        'hover:-translate-y-px hover:border-violet-500/30 hover:bg-[var(--app-surface-raised)]',
        'hover:shadow-lg hover:shadow-black/10',
        'focus-visible:ring-2 focus-visible:ring-violet-500/35',
        compact ? 'p-3' : 'p-3.5'
      )}
      onClick={onOpen}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex shrink-0 items-center justify-center rounded-xl border',
          'border-white/[0.035] bg-white/[0.025] text-[var(--app-muted)]',
          'transition-colors',
          'group-hover:border-violet-500/15 group-hover:bg-violet-500/10',
          'group-hover:text-violet-300',
          compact ? 'size-9' : 'size-10'
        )}
      >
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-[var(--app-text)]">{title}</span>
        <span className="mt-1 block truncate text-[11px] text-[var(--app-muted)]">
          {metadata}
        </span>
      </span>

      {aside}

      <ArrowRight
        aria-hidden="true"
        className="size-4 shrink-0 -translate-x-1 text-[var(--app-muted)] opacity-0 transition-[opacity,transform,color] group-hover:translate-x-0 group-hover:text-violet-300 group-hover:opacity-100"
      />
    </button>
  )
}

export function WorkspaceSectionEmpty({
  children,
  className
}: {
  children: ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex min-h-32 items-center justify-center rounded-xl border border-dashed',
        'border-[var(--app-border)] bg-black/[0.04] px-5 py-8',
        'text-center text-sm leading-6 text-[var(--app-muted)]',
        className
      )}
    >
      {children}
    </div>
  )
}
`
)

const studyActionPath = 'src/renderer/src/modules/study/components/StudyActionButton.tsx'
write(
  studyActionPath,
  `export {
  WorkspaceActionButton as StudyActionButton,
  type WorkspaceActionButtonProps as StudyActionButtonProps
} from '../../../shared/ui/WorkspacePrimitives'
`
)

const studyHomePath = 'src/renderer/src/modules/study/components/StudyHome.tsx'

replaceOnce(
  studyHomePath,
  "import { useMemo, useState, type ReactNode } from 'react'",
  "import { useMemo, useState } from 'react'"
)

replaceOnce(
  studyHomePath,
  "import type { StudyNode } from '../../../../../shared/contracts/study'\nimport { StudyActionButton } from './StudyActionButton'",
  `import type { StudyNode } from '../../../../../shared/contracts/study'
import {
  WorkspaceNodeCard,
  WorkspacePanel,
  WorkspaceSectionEmpty,
  WorkspaceStatCard
} from '../../../shared/ui/WorkspacePrimitives'
import { StudyActionButton } from './StudyActionButton'`
)

for (const [before, after] of [
  ['<StudyStatCard', '<WorkspaceStatCard'],
  ['<StudyHomePanel', '<WorkspacePanel'],
  ['</StudyHomePanel>', '</WorkspacePanel>'],
  ['<StudySectionEmpty>', '<WorkspaceSectionEmpty>'],
  ['</StudySectionEmpty>', '</WorkspaceSectionEmpty>']
]) {
  let content = read(studyHomePath)
  content = content.split(before).join(after)
  write(studyHomePath, content)
}

replaceRegex(
  studyHomePath,
  /function StudyStatCard\([\s\S]*?function StudyNodeCard\(/,
  'function StudyNodeCard('
)

replaceRegex(
  studyHomePath,
  /function StudyNodeCard\([\s\S]*?\n}\n\nfunction StudySearchResults\(/,
  `function StudyNodeCard({
  node,
  location,
  variant,
  onOpen
}: {
  node: StudyNode
  location: string
  variant: StudyNodeCardVariant
  onOpen: (nodeId: string) => void
}): React.JSX.Element {
  const compact = variant === 'compact'

  return (
    <WorkspaceNodeCard
      ariaLabel={\`Открыть \${node.type === 'folder' ? 'папку' : 'материал'} «\${node.title}»\`}
      icon={
        node.type === 'folder' ? (
          <StudyFolderIcon name={node.icon} expanded={node.isExpanded} className="size-5" />
        ) : (
          <FileText aria-hidden="true" className="size-5" />
        )
      }
      title={node.title}
      metadata={
        <>
          {node.type === 'folder' ? 'Папка' : 'Материал'} · {location}
        </>
      }
      aside={
        !compact ? (
          <time
            dateTime={new Date(node.updatedAt).toISOString()}
            className="shrink-0 rounded-lg bg-white/[0.025] px-2 py-1 text-[10px] text-[var(--app-muted)] max-[520px]:hidden"
          >
            {studyDateFormatter.format(new Date(node.updatedAt))}
          </time>
        ) : undefined
      }
      compact={compact}
      onOpen={() => {
        onOpen(node.id)
      }}
    />
  )
}

function StudySearchResults(`
)

replaceRegex(
  studyHomePath,
  /\nfunction StudySectionEmpty\([\s\S]*?\n}\n\nfunction getStudyNodeLocation/,
  '\nfunction getStudyNodeLocation'
)

const studyPagePath = 'src/renderer/src/modules/study/StudyPage.tsx'

replaceOnce(
  studyPagePath,
  "import { getModuleSidebarLayoutClassName, ModuleSidebar } from '../../shared/ui/ModuleSidebar'\nimport { Tooltip } from '../../shared/ui/tooltip'",
  `import { getModuleSidebarLayoutClassName, ModuleSidebar } from '../../shared/ui/ModuleSidebar'
import {
  WorkspaceNodeCard,
  WorkspacePanel,
  WorkspaceSectionEmpty,
  WorkspaceStatCard
} from '../../shared/ui/WorkspacePrimitives'
import { Tooltip } from '../../shared/ui/tooltip'`
)

{
  let content = read(studyPagePath)
  content = content.split('<FolderStatistic').join('<WorkspaceStatCard')
  write(studyPagePath, content)
}

replaceRegex(
  studyPagePath,
  /\nfunction FolderStatistic\([\s\S]*?\n}\n\nfunction FolderItemsSection/,
  '\nfunction FolderItemsSection'
)

replaceRegex(
  studyPagePath,
  /function FolderItemsSection\([\s\S]*$/,
  `function FolderItemsSection({
  kind,
  title,
  items,
  emptyText,
  onSelect
}: {
  kind: 'folder' | 'material'
  title: string
  items: StudyNode[]
  emptyText: string
  onSelect: (nodeId: string) => void
}): React.JSX.Element {
  const compact = kind === 'folder'

  return (
    <WorkspacePanel
      icon={
        kind === 'folder' ? (
          <Folder aria-hidden="true" className="size-5" />
        ) : (
          <FileText aria-hidden="true" className="size-5" />
        )
      }
      title={title}
      count={items.length}
    >
      {items.length > 0 ? (
        <div className={cn(compact ? 'grid gap-2' : 'grid grid-cols-2 gap-3 max-[720px]:grid-cols-1')}>
          {items.map((child) => (
            <WorkspaceNodeCard
              key={child.id}
              ariaLabel={\`Открыть \${child.type === 'folder' ? 'папку' : 'материал'} «\${child.title}»\`}
              icon={
                child.type === 'folder' ? (
                  <StudyFolderIcon
                    name={child.icon}
                    expanded={child.isExpanded}
                    className="size-5"
                  />
                ) : (
                  <FileText aria-hidden="true" className="size-5" />
                )
              }
              title={child.title}
              metadata={
                <>
                  {child.type === 'folder' ? 'Папка' : 'Материал'} ·{' '}
                  {folderWorkspaceDateFormatter.format(new Date(child.updatedAt))}
                </>
              }
              compact={compact}
              onOpen={() => {
                onSelect(child.id)
              }}
            />
          ))}
        </div>
      ) : (
        <WorkspaceSectionEmpty>{emptyText}</WorkspaceSectionEmpty>
      )}
    </WorkspacePanel>
  )
}
`
)

const boardsPagePath = 'src/renderer/src/modules/boards/BoardsPage.tsx'

replaceOnce(
  boardsPagePath,
  `  Check,
  ChevronDown,
  ChevronRight,
  Folder,`,
  `  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Folder,`
)

replaceOnce(
  boardsPagePath,
  `  Presentation,
  Trash2,
  TriangleAlert`,
  `  Presentation,
  Search,
  Trash2,
  TriangleAlert,
  X`
)

replaceOnce(
  boardsPagePath,
  "import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'",
  `import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'`
)

replaceOnce(
  boardsPagePath,
  "import { getModuleSidebarLayoutClassName, ModuleSidebar } from '../../shared/ui/ModuleSidebar'\nimport { Tooltip } from '../../shared/ui/tooltip'",
  `import { getModuleSidebarLayoutClassName, ModuleSidebar } from '../../shared/ui/ModuleSidebar'
import {
  WorkspaceActionButton,
  WorkspaceNodeCard,
  WorkspacePanel,
  WorkspaceSectionEmpty,
  WorkspaceStatCard
} from '../../shared/ui/WorkspacePrimitives'
import { Tooltip } from '../../shared/ui/tooltip'`
)

replaceRange(
  boardsPagePath,
  'function BoardsHome({',
  'function BoardWorkspace({',
  `const boardDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short'
})

function BoardsHome({
  nodes,
  rootNodes,
  onOpen,
  onCreate
}: {
  nodes: BoardNode[]
  rootNodes: BoardNode[]
  onOpen: (id: string) => void
  onCreate: (type: BoardNodeType, parentId: string | null) => void
}): React.JSX.Element {
  const [search, setSearch] = useState('')
  const nodesById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])
  const folders = useMemo(() => nodes.filter((node) => node.type === 'folder'), [nodes])
  const boards = useMemo(() => nodes.filter((node) => node.type === 'board'), [nodes])
  const recentBoards = useMemo(
    () => [...boards].sort((first, second) => second.updatedAt - first.updatedAt).slice(0, 6),
    [boards]
  )
  const normalizedSearch = search.trim().toLocaleLowerCase('ru-RU')
  const searchResults = useMemo(() => {
    if (!normalizedSearch) return []

    return nodes
      .filter((node) => {
        const location = getBoardNodeLocation(node, nodesById)
        return \`\${node.title} \${location} \${getBoardNodeTypeLabel(node)}\`
          .toLocaleLowerCase('ru-RU')
          .includes(normalizedSearch)
      })
      .sort((first, second) => {
        const titleComparison = first.title.localeCompare(second.title, 'ru-RU')
        return titleComparison || second.updatedAt - first.updatedAt
      })
  }, [nodes, nodesById, normalizedSearch])

  return (
    <section className="h-full overflow-y-auto bg-[var(--app-workspace)] px-8 py-7 max-[720px]:px-4 max-[720px]:py-5">
      <div className="mx-auto w-full max-w-[1240px] space-y-5">
        <section className="relative isolate overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[0_20px_70px_rgb(0_0_0/0.16)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 right-8 -z-10 size-80 rounded-full bg-violet-500/10 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-44 -left-24 -z-10 size-80 rounded-full bg-violet-900/10 blur-3xl"
          />

          <div className="p-6 max-[720px]:p-4">
            <header className="flex items-start justify-between gap-6 max-[820px]:flex-col">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/12 text-violet-300 shadow-inner shadow-violet-500/5">
                  <Presentation aria-hidden="true" className="size-6" />
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] font-semibold tracking-[0.12em] text-violet-300 uppercase">
                    Пространство идей
                  </p>
                  <h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em] text-[var(--app-text)]">
                    Доски
                  </h1>
                </div>
              </div>

              <div className="grid w-[22rem] max-w-full shrink-0 grid-cols-2 gap-2 max-[820px]:w-full max-[520px]:grid-cols-1">
                <WorkspaceActionButton type="button" onClick={() => onCreate('folder', null)}>
                  <FolderPlus aria-hidden="true" />
                  Новая папка
                </WorkspaceActionButton>
                <WorkspaceActionButton
                  type="button"
                  variant="primary"
                  onClick={() => onCreate('board', null)}
                >
                  <Presentation aria-hidden="true" />
                  Новая доска
                </WorkspaceActionButton>
              </div>
            </header>

            <label className="mt-6 flex h-12 w-full min-w-0 items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 shadow-inner shadow-black/10 transition-colors focus-within:border-violet-500/45 focus-within:ring-2 focus-within:ring-violet-500/10">
              <Search aria-hidden="true" className="size-4 shrink-0 text-[var(--app-muted)]" />
              <input
                value={search}
                aria-label="Поиск по доскам"
                placeholder="Найти доску, папку или путь в пространстве"
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/65"
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && (
                <button
                  type="button"
                  aria-label="Очистить поиск досок"
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[var(--app-muted)] transition-colors outline-none hover:bg-white/[0.06] hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-violet-500/35"
                  onClick={() => setSearch('')}
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              )}
            </label>

            <div className="mt-4 grid grid-cols-3 gap-3 max-[760px]:grid-cols-1">
              <WorkspaceStatCard
                icon={<Presentation aria-hidden="true" className="size-5" />}
                value={boards.length}
                label="Досок"
                description="Во всём пространстве"
              />
              <WorkspaceStatCard
                icon={<Folder aria-hidden="true" className="size-5" />}
                value={folders.length}
                label="Папок"
                description="Для организации холстов"
              />
              <WorkspaceStatCard
                icon={<LayoutDashboard aria-hidden="true" className="size-5" />}
                value={nodes.filter((node) => Boolean(node.sourceMaterialId)).length}
                label="Из обучения"
                description="Связанных с материалами"
              />
            </div>
          </div>
        </section>

        {normalizedSearch ? (
          <BoardSearchResults
            nodes={searchResults}
            nodesById={nodesById}
            onOpen={onOpen}
          />
        ) : (
          <div className="grid grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)] items-start gap-5 max-[1080px]:grid-cols-1">
            <WorkspacePanel
              icon={<Clock3 aria-hidden="true" className="size-5" />}
              title="Недавние доски"
              count={recentBoards.length}
            >
              {recentBoards.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1">
                  {recentBoards.map((board) => (
                    <BoardNodeCard
                      key={board.id}
                      node={board}
                      metadata={
                        <>
                          {getBoardNodeTypeLabel(board)} · {getBoardNodeLocation(board, nodesById)}
                        </>
                      }
                      showDate
                      onOpen={onOpen}
                    />
                  ))}
                </div>
              ) : (
                <WorkspaceSectionEmpty>
                  Здесь появятся недавно изменённые доски.
                </WorkspaceSectionEmpty>
              )}
            </WorkspacePanel>

            <WorkspacePanel
              icon={<LayoutDashboard aria-hidden="true" className="size-5" />}
              title="Структура"
              count={rootNodes.length}
            >
              {rootNodes.length > 0 ? (
                <>
                  <div className="grid gap-2">
                    {rootNodes.slice(0, 8).map((node) => (
                      <BoardNodeCard
                        key={node.id}
                        node={node}
                        metadata={
                          <>
                            {getBoardNodeTypeLabel(node)} · Корень
                          </>
                        }
                        compact
                        onOpen={onOpen}
                      />
                    ))}
                  </div>
                  {rootNodes.length > 8 && (
                    <div className="mt-3 rounded-xl border border-dashed border-[var(--app-border)] px-3 py-2.5 text-xs leading-5 text-[var(--app-muted)]">
                      Ещё {rootNodes.length - 8} элементов доступны в дереве досок.
                    </div>
                  )}
                </>
              ) : (
                <WorkspaceSectionEmpty>Пространство досок пока пусто.</WorkspaceSectionEmpty>
              )}
            </WorkspacePanel>
          </div>
        )}
      </div>
    </section>
  )
}

function BoardSearchResults({
  nodes,
  nodesById,
  onOpen
}: {
  nodes: BoardNode[]
  nodesById: Map<string, BoardNode>
  onOpen: (id: string) => void
}): React.JSX.Element {
  return (
    <WorkspacePanel
      icon={<Search aria-hidden="true" className="size-5" />}
      title="Результаты поиска"
      count={nodes.length}
    >
      {nodes.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1">
          {nodes.map((node) => (
            <BoardNodeCard
              key={node.id}
              node={node}
              metadata={
                <>
                  {getBoardNodeTypeLabel(node)} · {getBoardNodeLocation(node, nodesById)}
                </>
              }
              showDate
              onOpen={onOpen}
            />
          ))}
        </div>
      ) : (
        <WorkspaceSectionEmpty>По этому запросу ничего не найдено.</WorkspaceSectionEmpty>
      )}
    </WorkspacePanel>
  )
}

function BoardFolderPage({
  folder,
  items,
  onOpen,
  onCreate,
  onRename
}: {
  folder: BoardNode
  items: BoardNode[]
  onOpen: (id: string) => void
  onCreate: (type: BoardNodeType, parentId: string | null) => void
  onRename: () => void
}): React.JSX.Element {
  const folders = items
    .filter((item) => item.type === 'folder')
    .sort((first, second) => first.position - second.position)
  const boards = items
    .filter((item) => item.type === 'board')
    .sort((first, second) => first.position - second.position)

  return (
    <section className="h-full overflow-y-auto bg-[var(--app-workspace)] px-8 py-7 max-[720px]:px-4 max-[720px]:py-5">
      <div className="mx-auto w-full max-w-[1240px] space-y-5">
        <section className="relative isolate overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[0_20px_70px_rgb(0_0_0/0.16)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 right-8 -z-10 size-80 rounded-full bg-violet-500/10 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-44 -left-24 -z-10 size-80 rounded-full bg-violet-900/10 blur-3xl"
          />

          <div className="p-6 max-[720px]:p-4">
            <header className="flex items-start justify-between gap-6 max-[920px]:flex-col">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/12 text-violet-300 shadow-inner shadow-violet-500/5">
                  {folder.isSystem ? (
                    <LockKeyhole aria-hidden="true" className="size-6" />
                  ) : (
                    <Folder aria-hidden="true" className="size-6" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold tracking-[0.12em] text-violet-300 uppercase">
                    {folder.isSystem ? 'Системная папка досок' : 'Папка досок'}
                  </p>
                  <h1 className="mt-1 truncate text-3xl font-semibold tracking-[-0.035em] text-[var(--app-text)]">
                    {folder.title}
                  </h1>
                </div>
              </div>

              <div
                className={cn(
                  'grid max-w-full shrink-0 gap-2 max-[920px]:w-full max-[620px]:grid-cols-1',
                  folder.isSystem
                    ? 'w-[22rem] grid-cols-2'
                    : 'w-[33rem] grid-cols-3 max-[760px]:grid-cols-2'
                )}
              >
                {!folder.isSystem && (
                  <WorkspaceActionButton type="button" onClick={onRename}>
                    <Pencil aria-hidden="true" />
                    Переименовать
                  </WorkspaceActionButton>
                )}
                <WorkspaceActionButton
                  type="button"
                  onClick={() => onCreate('folder', folder.id)}
                >
                  <FolderPlus aria-hidden="true" />
                  Новая папка
                </WorkspaceActionButton>
                <WorkspaceActionButton
                  type="button"
                  variant="primary"
                  onClick={() => onCreate('board', folder.id)}
                >
                  <Presentation aria-hidden="true" />
                  Новая доска
                </WorkspaceActionButton>
              </div>
            </header>

            <div className="mt-6 grid grid-cols-3 gap-3 max-[760px]:grid-cols-1">
              <WorkspaceStatCard
                icon={<LayoutDashboard aria-hidden="true" className="size-5" />}
                value={items.length}
                label="Всего"
                description="Элементов в этой папке"
              />
              <WorkspaceStatCard
                icon={<Presentation aria-hidden="true" className="size-5" />}
                value={boards.length}
                label="Досок"
                description="Холстов и схем"
              />
              <WorkspaceStatCard
                icon={<Folder aria-hidden="true" className="size-5" />}
                value={folders.length}
                label="Папок"
                description="Вложенных разделов"
              />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(300px,0.75fr)] items-start gap-5 max-[1040px]:grid-cols-1">
          <BoardItemsPanel
            kind="board"
            title="Доски"
            items={boards}
            emptyText="В этой папке пока нет досок"
            onOpen={onOpen}
          />
          <BoardItemsPanel
            kind="folder"
            title="Вложенные папки"
            items={folders}
            emptyText="Вложенных папок пока нет"
            onOpen={onOpen}
          />
        </div>
      </div>
    </section>
  )
}

function BoardItemsPanel({
  kind,
  title,
  items,
  emptyText,
  onOpen
}: {
  kind: 'folder' | 'board'
  title: string
  items: BoardNode[]
  emptyText: string
  onOpen: (id: string) => void
}): React.JSX.Element {
  const compact = kind === 'folder'

  return (
    <WorkspacePanel
      icon={
        kind === 'folder' ? (
          <Folder aria-hidden="true" className="size-5" />
        ) : (
          <Presentation aria-hidden="true" className="size-5" />
        )
      }
      title={title}
      count={items.length}
    >
      {items.length > 0 ? (
        <div className={cn(compact ? 'grid gap-2' : 'grid grid-cols-2 gap-3 max-[720px]:grid-cols-1')}>
          {items.map((item) => (
            <BoardNodeCard
              key={item.id}
              node={item}
              metadata={
                <>
                  {getBoardNodeTypeLabel(item)} ·{' '}
                  {boardDateFormatter.format(new Date(item.updatedAt))}
                </>
              }
              compact={compact}
              onOpen={onOpen}
            />
          ))}
        </div>
      ) : (
        <WorkspaceSectionEmpty>{emptyText}</WorkspaceSectionEmpty>
      )}
    </WorkspacePanel>
  )
}

function BoardNodeCard({
  node,
  metadata,
  compact = false,
  showDate = false,
  onOpen
}: {
  node: BoardNode
  metadata: ReactNode
  compact?: boolean
  showDate?: boolean
  onOpen: (id: string) => void
}): React.JSX.Element {
  return (
    <WorkspaceNodeCard
      ariaLabel={\`Открыть \${node.type === 'folder' ? 'папку' : 'доску'} «\${node.title}»\`}
      icon={
        node.type === 'folder' ? (
          node.isSystem ? (
            <LockKeyhole aria-hidden="true" className="size-5" />
          ) : (
            <Folder aria-hidden="true" className="size-5" />
          )
        ) : (
          <Presentation aria-hidden="true" className="size-5" />
        )
      }
      title={node.title}
      metadata={metadata}
      aside={
        showDate && !compact ? (
          <time
            dateTime={new Date(node.updatedAt).toISOString()}
            className="shrink-0 rounded-lg bg-white/[0.025] px-2 py-1 text-[10px] text-[var(--app-muted)] max-[520px]:hidden"
          >
            {boardDateFormatter.format(new Date(node.updatedAt))}
          </time>
        ) : undefined
      }
      compact={compact}
      onOpen={() => onOpen(node.id)}
    />
  )
}

function getBoardNodeTypeLabel(node: BoardNode): string {
  if (node.type === 'folder') return node.isSystem ? 'Системная папка' : 'Папка'
  return node.sourceMaterialId ? 'Доска из обучения' : 'Доска'
}

function getBoardNodeLocation(node: BoardNode, nodesById: Map<string, BoardNode>): string {
  const parts: string[] = []
  const visited = new Set<string>()
  let parentId = node.parentId

  while (parentId && !visited.has(parentId)) {
    visited.add(parentId)
    const parent = nodesById.get(parentId)
    if (!parent) break
    parts.unshift(parent.title)
    parentId = parent.parentId
  }

  return parts.length > 0 ? parts.join(' / ') : 'Корень'
}

function BoardWorkspace({`
)

replaceOnce(
  boardsPagePath,
  `        <button
          type="button"
          className="flex h-9 items-center gap-2 rounded-lg px-3 text-sm text-[var(--app-muted)] hover:bg-white/[0.05] hover:text-[var(--app-text)]"
          onClick={onRename}
        >
          <Pencil aria-hidden className="size-4" />
          <span className="max-[720px]:hidden">Переименовать</span>
        </button>`,
  `        <WorkspaceActionButton
          type="button"
          className="w-auto px-3 max-[720px]:size-10 max-[720px]:px-0"
          onClick={onRename}
        >
          <Pencil aria-hidden="true" />
          <span className="max-[720px]:hidden">Переименовать</span>
        </WorkspaceActionButton>`
)

replaceRange(
  boardsPagePath,
  'function PrimaryAction({',
  'function BoardTextDialog({',
  'function BoardTextDialog({' 
)

const boardsTestPath = 'src/renderer/src/modules/boards/BoardsPage.test.tsx'

replaceOnce(
  boardsTestPath,
  `  it('loads BoardCanvas only for a board and isolates a lazy import failure in the workspace', async () => {`,
  `  it('matches the study workspace layout, data cards, and search behavior', async () => {
    testHarness.listNodes.mockResolvedValueOnce([systemFolder, boardNode])

    render(<BoardsPage />)

    await screen.findByRole('heading', { name: 'Доски', level: 1 })

    expect(screen.getByRole('button', { name: 'Новая папка' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Новая доска' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Недавние доски' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Структура' })).toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: 'Поиск по доскам' }), {
      target: { value: 'Тестовая' }
    })

    expect(screen.getByRole('heading', { name: 'Результаты поиска' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Открыть доску «Тестовая доска»' })
    ).toBeInTheDocument()
  })

  it('uses the same folder workspace sections and actions as study', async () => {
    const linkedBoard = {
      ...boardNode,
      parentId: systemFolder.id,
      sourceMaterialId: 'material-1'
    }
    testHarness.listNodes.mockResolvedValueOnce([systemFolder, linkedBoard])

    render(<BoardsPage />)

    await screen.findByRole('heading', { name: 'Доски', level: 1 })
    fireEvent.click(screen.getByRole('button', { name: 'Обучение' }))

    expect(await screen.findByRole('heading', { name: 'Обучение', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Доски', level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Вложенные папки' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Новая папка' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Новая доска' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Открыть доску «Тестовая доска»' })
    ).toBeInTheDocument()
  })

  it('loads BoardCanvas only for a board and isolates a lazy import failure in the workspace', async () => {`
)

console.log('Boards workspaces unified with study')
