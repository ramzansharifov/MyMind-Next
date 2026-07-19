import {
  ArrowRight,
  BookOpen,
  Clock3,
  FilePlus2,
  FileText,
  Folder,
  FolderPlus,
  Layers3,
  Search,
  X
} from 'lucide-react'
import { useMemo, useState } from 'react'

import type { StudyNode } from '../../../../../shared/contracts/study'
import {
  WorkspaceNodeCard,
  WorkspacePanel,
  WorkspaceSectionEmpty,
  WorkspaceStatCard
} from '../../../shared/ui/WorkspacePrimitives'
import { StudyActionButton } from './StudyActionButton'
import { StudyFolderIcon } from './StudyFolderIcon'

interface StudyHomeProps {
  nodes: StudyNode[]
  isLoading: boolean
  onOpen: (nodeId: string) => void
  onCreateFolder: () => void
  onCreateMaterial: () => void
}

type StudyNodeCardVariant = 'regular' | 'compact' | 'search'

const studyDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short'
})

export function StudyHome({
  nodes,
  isLoading,
  onOpen,
  onCreateFolder,
  onCreateMaterial
}: StudyHomeProps): React.JSX.Element {
  const [search, setSearch] = useState('')

  const nodesById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])

  const folders = useMemo(() => nodes.filter((node) => node.type === 'folder'), [nodes])

  const materials = useMemo(() => nodes.filter((node) => node.type === 'material'), [nodes])

  const rootNodes = useMemo(
    () =>
      nodes
        .filter((node) => node.parentId === null)
        .sort((first, second) => first.position - second.position),
    [nodes]
  )

  const recentMaterials = useMemo(
    () => [...materials].sort((first, second) => second.updatedAt - first.updatedAt).slice(0, 6),
    [materials]
  )

  const normalizedSearch = search.trim().toLocaleLowerCase('ru-RU')

  const searchResults = useMemo(() => {
    if (!normalizedSearch) {
      return []
    }

    return nodes
      .filter((node) => {
        const location = getStudyNodeLocation(node, nodesById)

        const searchableText = `${node.title} ${location}`.toLocaleLowerCase('ru-RU')

        return searchableText.includes(normalizedSearch)
      })
      .sort((first, second) => {
        const titleComparison = first.title.localeCompare(second.title, 'ru-RU')

        if (titleComparison !== 0) {
          return titleComparison
        }

        return second.updatedAt - first.updatedAt
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
                  <BookOpen aria-hidden="true" className="size-6" />
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] font-semibold tracking-[0.12em] text-violet-300 uppercase">
                    Библиотека знаний
                  </p>

                  <h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em] text-[var(--app-text)]">
                    Обучение
                  </h1>
                </div>
              </div>

              <div className="grid w-[22rem] max-w-full shrink-0 grid-cols-2 gap-2 max-[820px]:w-full max-[520px]:grid-cols-1">
                <StudyActionButton type="button" disabled={isLoading} onClick={onCreateFolder}>
                  <FolderPlus aria-hidden="true" />
                  Новая папка
                </StudyActionButton>

                <StudyActionButton
                  type="button"
                  variant="primary"
                  disabled={isLoading}
                  onClick={onCreateMaterial}
                >
                  <FilePlus2 aria-hidden="true" />
                  Новый материал
                </StudyActionButton>
              </div>
            </header>

            <label className="mt-6 flex h-12 w-full min-w-0 items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 shadow-inner shadow-black/10 transition-colors focus-within:border-violet-500/45 focus-within:ring-2 focus-within:ring-violet-500/10">
              <Search aria-hidden="true" className="size-4 shrink-0 text-[var(--app-muted)]" />

              <input
                value={search}
                aria-label="Поиск по библиотеке"
                placeholder="Найти материал, папку или путь в библиотеке"
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/65"
                onChange={(event) => {
                  setSearch(event.target.value)
                }}
              />

              {search && (
                <button
                  type="button"
                  aria-label="Очистить поиск"
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[var(--app-muted)] transition-colors outline-none hover:bg-white/[0.06] hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-violet-500/35"
                  onClick={() => {
                    setSearch('')
                  }}
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              )}
            </label>

            <div className="mt-4 grid grid-cols-3 gap-3 max-[760px]:grid-cols-1">
              <WorkspaceStatCard
                icon={<FileText aria-hidden="true" className="size-5" />}
                value={isLoading ? '—' : materials.length}
                label="Материалов"
                description="Во всей библиотеке"
              />

              <WorkspaceStatCard
                icon={<Folder aria-hidden="true" className="size-5" />}
                value={isLoading ? '—' : folders.length}
                label="Папок"
                description="Для организации знаний"
              />

              <WorkspaceStatCard
                icon={<Layers3 aria-hidden="true" className="size-5" />}
                value={isLoading ? '—' : rootNodes.length}
                label="В корне"
                description="Элементов верхнего уровня"
              />
            </div>
          </div>
        </section>

        {isLoading ? (
          <StudyLoadingPanel />
        ) : normalizedSearch ? (
          <StudySearchResults nodes={searchResults} nodesById={nodesById} onOpen={onOpen} />
        ) : nodes.length === 0 ? (
          <StudyHomeEmptyState
            onCreateFolder={onCreateFolder}
            onCreateMaterial={onCreateMaterial}
          />
        ) : (
          <div className="grid grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)] items-start gap-5 max-[1080px]:grid-cols-1">
            <WorkspacePanel
              icon={<Clock3 aria-hidden="true" className="size-5" />}
              title="Недавние материалы"
              count={recentMaterials.length}
            >
              {recentMaterials.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1">
                  {recentMaterials.map((material) => (
                    <StudyNodeCard
                      key={material.id}
                      node={material}
                      location={getStudyNodeLocation(material, nodesById)}
                      variant="regular"
                      onOpen={onOpen}
                    />
                  ))}
                </div>
              ) : (
                <WorkspaceSectionEmpty>
                  Здесь появятся недавно изменённые материалы.
                </WorkspaceSectionEmpty>
              )}
            </WorkspacePanel>

            <WorkspacePanel
              icon={<Layers3 aria-hidden="true" className="size-5" />}
              title="Структура"
              count={rootNodes.length}
            >
              {rootNodes.length > 0 ? (
                <>
                  <div className="grid gap-2">
                    {rootNodes.slice(0, 8).map((node) => (
                      <StudyNodeCard
                        key={node.id}
                        node={node}
                        location="Корень"
                        variant="compact"
                        onOpen={onOpen}
                      />
                    ))}
                  </div>

                  {rootNodes.length > 8 && (
                    <div className="mt-3 rounded-xl border border-dashed border-[var(--app-border)] px-3 py-2.5 text-xs leading-5 text-[var(--app-muted)]">
                      Ещё {rootNodes.length - 8} элементов доступны в дереве библиотеки.
                    </div>
                  )}
                </>
              ) : (
                <WorkspaceSectionEmpty>Все элементы находятся внутри папок.</WorkspaceSectionEmpty>
              )}
            </WorkspacePanel>
          </div>
        )}
      </div>
    </section>
  )
}

function StudyNodeCard({
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
      ariaLabel={`Открыть ${node.type === 'folder' ? 'папку' : 'материал'} «${node.title}»`}
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

function StudySearchResults({
  nodes,
  nodesById,
  onOpen
}: {
  nodes: StudyNode[]
  nodesById: Map<string, StudyNode>
  onOpen: (nodeId: string) => void
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
            <StudyNodeCard
              key={node.id}
              node={node}
              location={getStudyNodeLocation(node, nodesById)}
              variant="search"
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

function StudyLoadingPanel(): React.JSX.Element {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)]">
      <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
        <div className="flex size-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
          <BookOpen aria-hidden="true" className="size-5 animate-pulse" />
        </div>

        <p className="mt-4 text-sm font-medium text-[var(--app-text)]">Загрузка библиотеки</p>

        <p className="mt-1 text-xs text-[var(--app-muted)]">
          Подготавливаем материалы и структуру папок.
        </p>
      </div>
    </section>
  )
}

function StudyHomeEmptyState({
  onCreateFolder,
  onCreateMaterial
}: {
  onCreateFolder: () => void
  onCreateMaterial: () => void
}): React.JSX.Element {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)]">
      <div className="flex min-h-72 flex-col items-center justify-center px-6 py-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-violet-500/15 bg-violet-500/10 text-violet-300">
          <BookOpen aria-hidden="true" className="size-7" />
        </div>

        <h2 className="mt-5 text-lg font-semibold text-[var(--app-text)]">Библиотека пока пуста</h2>

        <p className="mt-2 max-w-md text-sm leading-6 text-[var(--app-muted)]">
          Создай первый материал или подготовь структуру из папок, чтобы организовать будущие
          знания.
        </p>

        <div className="mt-6 grid w-[22rem] max-w-full grid-cols-2 gap-2 max-[460px]:w-full max-[460px]:grid-cols-1">
          <StudyActionButton type="button" onClick={onCreateFolder}>
            <FolderPlus aria-hidden="true" />
            Создать папку
          </StudyActionButton>

          <StudyActionButton type="button" variant="primary" onClick={onCreateMaterial}>
            <FilePlus2 aria-hidden="true" />
            Создать материал
          </StudyActionButton>
        </div>
      </div>
    </section>
  )
}

function getStudyNodeLocation(node: StudyNode, nodesById: Map<string, StudyNode>): string {
  const parts: string[] = []
  const visited = new Set<string>()

  let parentId = node.parentId

  while (parentId && !visited.has(parentId)) {
    visited.add(parentId)

    const parent = nodesById.get(parentId)

    if (!parent) {
      break
    }

    parts.unshift(parent.title)
    parentId = parent.parentId
  }

  return parts.length > 0 ? parts.join(' / ') : 'Корень'
}
