import { BookOpen, FilePlus2, FileText, Folder, FolderPlus, Search, X } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'

import type { StudyNode } from '../../../../../shared/contracts/study'
import { StudyFolderIcon } from './StudyFolderIcon'

interface StudyHomeProps {
  nodes: StudyNode[]
  isLoading: boolean
  onOpen: (nodeId: string) => void
  onCreateFolder: () => void
  onCreateMaterial: () => void
}

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
    <section className="h-full overflow-y-auto p-8 max-[720px]:p-4">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex items-start justify-between gap-6 max-[760px]:flex-col">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-300 ring-1 ring-violet-500/15 ring-inset">
              <BookOpen aria-hidden="true" className="size-6" />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.08em] text-violet-300 uppercase">
                Библиотека
              </p>

              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-[var(--app-text)]">
                Обучение
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--app-muted)]">
                Материалы, конспекты, формулы, диаграммы и вложения в одном месте.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 max-[520px]:w-full max-[520px]:flex-col">
            <button
              type="button"
              disabled={isLoading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--app-border)] px-3.5 text-sm font-medium text-[var(--app-text)] transition-colors outline-none hover:border-violet-500/30 hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-violet-500/35 disabled:opacity-40 max-[520px]:w-full"
              onClick={onCreateFolder}
            >
              <FolderPlus aria-hidden="true" className="size-4" />
              Новая папка
            </button>

            <button
              type="button"
              disabled={isLoading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-violet-500 px-3.5 text-sm font-medium text-white transition-colors outline-none hover:bg-violet-400 focus-visible:ring-2 focus-visible:ring-violet-300/50 disabled:opacity-40 max-[520px]:w-full"
              onClick={onCreateMaterial}
            >
              <FilePlus2 aria-hidden="true" className="size-4" />
              Новый материал
            </button>
          </div>
        </header>

        <label className="mt-8 flex h-12 w-full min-w-0 items-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 transition-colors focus-within:border-violet-500/45 focus-within:ring-2 focus-within:ring-violet-500/10">
          <Search aria-hidden="true" className="size-4 shrink-0 text-[var(--app-muted)]" />

          <input
            value={search}
            aria-label="Поиск по библиотеке"
            placeholder="Найти папку или материал во всей библиотеке"
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/70"
            onChange={(event) => {
              setSearch(event.target.value)
            }}
          />

          {search && (
            <button
              type="button"
              aria-label="Очистить поиск"
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-[var(--app-muted)] outline-none hover:bg-white/[0.05] hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-violet-500/35"
              onClick={() => {
                setSearch('')
              }}
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          )}
        </label>

        <div className="mt-5 grid grid-cols-3 gap-3 max-[680px]:grid-cols-1">
          <StudyStatCard
            icon={<FileText aria-hidden="true" className="size-5" />}
            value={isLoading ? '—' : materials.length}
            label="Материалов"
          />

          <StudyStatCard
            icon={<Folder aria-hidden="true" className="size-5" />}
            value={isLoading ? '—' : folders.length}
            label="Папок"
          />

          <StudyStatCard
            icon={<BookOpen aria-hidden="true" className="size-5" />}
            value={isLoading ? '—' : rootNodes.length}
            label="Элементов в корне"
          />
        </div>

        {isLoading ? (
          <div className="mt-8 flex min-h-44 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] text-sm text-[var(--app-muted)]">
            Загрузка библиотеки…
          </div>
        ) : normalizedSearch ? (
          <StudySearchResults
            nodes={searchResults}
            nodesById={nodesById}
            search={search.trim()}
            onOpen={onOpen}
          />
        ) : nodes.length === 0 ? (
          <StudyHomeEmptyState
            onCreateFolder={onCreateFolder}
            onCreateMaterial={onCreateMaterial}
          />
        ) : (
          <>
            <StudyHomeSection
              title="Недавние материалы"
              description="Материалы, которые изменялись последними"
            >
              {recentMaterials.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1">
                  {recentMaterials.map((material) => (
                    <StudyNodeCard
                      key={material.id}
                      node={material}
                      location={getStudyNodeLocation(material, nodesById)}
                      onOpen={onOpen}
                    />
                  ))}
                </div>
              ) : (
                <StudySectionEmpty>Здесь появятся недавно изменённые материалы.</StudySectionEmpty>
              )}
            </StudyHomeSection>

            <StudyHomeSection
              title="В корне библиотеки"
              description={`${rootNodes.length} элементов верхнего уровня`}
            >
              {rootNodes.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1">
                    {rootNodes.slice(0, 8).map((node) => (
                      <StudyNodeCard key={node.id} node={node} location="Корень" onOpen={onOpen} />
                    ))}
                  </div>

                  {rootNodes.length > 8 && (
                    <p className="mt-3 text-xs text-[var(--app-muted)]">
                      Ещё {rootNodes.length - 8} элементов доступны в дереве слева.
                    </p>
                  )}
                </>
              ) : (
                <StudySectionEmpty>Все элементы находятся внутри папок.</StudySectionEmpty>
              )}
            </StudyHomeSection>
          </>
        )}
      </div>
    </section>
  )
}

function StudyStatCard({
  icon,
  value,
  label
}: {
  icon: ReactNode
  value: number | string
  label: string
}): React.JSX.Element {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-2xl font-semibold text-[var(--app-text)] tabular-nums">{value}</p>

        <p className="mt-0.5 truncate text-xs text-[var(--app-muted)]">{label}</p>
      </div>
    </div>
  )
}

function StudyHomeSection({
  title,
  description,
  children
}: {
  title: string
  description: string
  children: ReactNode
}): React.JSX.Element {
  return (
    <section className="mt-8">
      <div>
        <h2 className="text-base font-semibold text-[var(--app-text)]">{title}</h2>

        <p className="mt-1 text-xs text-[var(--app-muted)]">{description}</p>
      </div>

      <div className="mt-3">{children}</div>
    </section>
  )
}

function StudyNodeCard({
  node,
  location,
  onOpen
}: {
  node: StudyNode
  location: string
  onOpen: (nodeId: string) => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      className="group flex min-w-0 items-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 text-left transition-colors outline-none hover:border-violet-500/30 hover:bg-[var(--app-surface-raised)] focus-visible:ring-2 focus-visible:ring-violet-500/35"
      onClick={() => {
        onOpen(node.id)
      }}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.035] text-[var(--app-muted)] transition-colors group-hover:bg-violet-500/10 group-hover:text-violet-300">
        {node.type === 'folder' ? (
          <StudyFolderIcon name={node.icon} expanded={node.isExpanded} className="size-5" />
        ) : (
          <FileText aria-hidden="true" className="size-5" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--app-text)]">{node.title}</p>

        <p className="mt-1 truncate text-xs text-[var(--app-muted)]">
          {node.type === 'folder' ? 'Папка' : 'Материал'}
          {' · '}
          {location}
        </p>
      </div>

      <time
        dateTime={new Date(node.updatedAt).toISOString()}
        className="shrink-0 text-[11px] text-[var(--app-muted)] max-[520px]:hidden"
      >
        {studyDateFormatter.format(new Date(node.updatedAt))}
      </time>
    </button>
  )
}

function StudySearchResults({
  nodes,
  nodesById,
  search,
  onOpen
}: {
  nodes: StudyNode[]
  nodesById: Map<string, StudyNode>
  search: string
  onOpen: (nodeId: string) => void
}): React.JSX.Element {
  return (
    <section className="mt-8">
      <div>
        <h2 className="text-base font-semibold text-[var(--app-text)]">Результаты поиска</h2>

        <p className="mt-1 text-xs text-[var(--app-muted)]">
          Найдено: {nodes.length} · Запрос: «{search}»
        </p>
      </div>

      {nodes.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {nodes.map((node) => (
            <StudyNodeCard
              key={node.id}
              node={node}
              location={getStudyNodeLocation(node, nodesById)}
              onOpen={onOpen}
            />
          ))}
        </div>
      ) : (
        <StudySectionEmpty>По этому запросу ничего не найдено.</StudySectionEmpty>
      )}
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
    <div className="mt-8 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] px-6 py-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
        <BookOpen aria-hidden="true" className="size-6" />
      </div>

      <h2 className="mt-4 text-lg font-semibold text-[var(--app-text)]">Библиотека пока пуста</h2>

      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--app-muted)]">
        Создай первый материал или подготовь структуру из папок.
      </p>

      <div className="mt-5 flex items-center gap-2 max-[460px]:w-full max-[460px]:flex-col">
        <button
          type="button"
          className="rounded-lg border border-[var(--app-border)] px-4 py-2 text-sm font-medium text-[var(--app-text)] hover:bg-white/[0.04] max-[460px]:w-full"
          onClick={onCreateFolder}
        >
          Создать папку
        </button>

        <button
          type="button"
          className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-400 max-[460px]:w-full"
          onClick={onCreateMaterial}
        >
          Создать материал
        </button>
      </div>
    </div>
  )
}

function StudySectionEmpty({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <div className="mt-3 rounded-xl border border-dashed border-[var(--app-border)] px-4 py-8 text-center text-sm text-[var(--app-muted)]">
      {children}
    </div>
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
