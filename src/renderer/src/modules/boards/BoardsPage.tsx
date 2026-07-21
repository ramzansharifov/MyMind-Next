import * as AlertDialog from '@radix-ui/react-alert-dialog'
import {
  ArrowLeft,
  Check,
  Clock3,
  Folder,
  FolderPlus,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  Minimize2,
  Palette,
  Pencil,
  Presentation,
  Search,
  TriangleAlert,
  X
} from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import type { StudyFolderIconName } from '../../../../shared/contracts/study'
import {
  BOARD_SYSTEM_ROOT_ID,
  type BoardNode,
  type BoardNodeType,
  type MoveBoardNodeInput
} from '../../../../shared/contracts/boards'
import { requestAppModuleNavigation } from '../../app/module-navigation'
import type { AppModuleProps } from '../../app/module-registry'
import { cn } from '../../shared/lib/cn'
import { FolderIcon } from '../../shared/ui/FolderIcon'
import { FolderIconPicker } from '../../shared/ui/FolderIconPicker'
import { ModuleSidebar } from '../../shared/ui/ModuleSidebar'
import { getModuleSidebarLayoutClassName } from '../../shared/ui/module-sidebar-layout'
import { Tooltip } from '../../shared/ui/tooltip'
import {
  WorkspaceActionButton,
  WorkspaceNodeCard,
  WorkspacePanel,
  WorkspaceSectionEmpty,
  WorkspaceStatCard
} from '../../shared/ui/WorkspacePrimitives'
import { boardsClient } from './api/boards-client'
import { BoardCanvasErrorBoundary } from './components/BoardCanvasErrorBoundary'
import { BoardTree } from './components/BoardTree'
import { loadBoardCanvas } from './components/load-board-canvas'
import { flushActiveBoardDraft } from './lib/board-draft-lifecycle'
import type { BoardSaveState } from './lib/board-save-queue'

const BoardCanvas = lazy(loadBoardCanvas)

export type BoardsPageProps = AppModuleProps

interface BoardCreateRequest {
  type: BoardNodeType
  parentId: string | null
}

export function BoardsPage({
  resourceId,
  onResourceHandled,
  focusMode = false,
  onFocusModeChange
}: BoardsPageProps): React.JSX.Element {
  const [nodes, setNodes] = useState<BoardNode[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [createRequest, setCreateRequest] = useState<BoardCreateRequest | null>(null)
  const [renameTarget, setRenameTarget] = useState<BoardNode | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BoardNode | null>(null)
  const [dialogValue, setDialogValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saveState, setSaveState] = useState<BoardSaveState>('saved')

  const refreshNodes = useCallback(async (): Promise<BoardNode[]> => {
    const nextNodes = await boardsClient.listNodes()
    setNodes(nextNodes)
    return nextNodes
  }, [])

  useEffect(() => {
    let active = true

    void boardsClient
      .listNodes()
      .then((nextNodes) => {
        if (active) {
          setNodes(nextNodes)
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'Не удалось загрузить доски')
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const selectedNode = nodes.find((node) => node.id === selectedId) ?? null
  const nodesByParent = useMemo(() => groupBoardNodesByParent(nodes), [nodes])

  const openNode = useCallback(async (nodeId: string | null): Promise<void> => {
    try {
      await flushActiveBoardDraft()
      setSelectedId(nodeId)
      setSaveState('saved')
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить текущую доску')
    }
  }, [])

  useEffect(() => {
    if (!resourceId || nodes.length === 0) {
      return
    }

    if (!nodes.some((node) => node.id === resourceId)) {
      onResourceHandled?.()
      return
    }

    let active = true

    void flushActiveBoardDraft()
      .then(() => {
        if (!active) return
        setSelectedId(resourceId)
        setSaveState('saved')
      })
      .catch((reason: unknown) => {
        if (!active) return
        setError(reason instanceof Error ? reason.message : 'Не удалось сохранить текущую доску')
      })
      .finally(() => {
        if (active) {
          onResourceHandled?.()
        }
      })

    return () => {
      active = false
    }
  }, [nodes, onResourceHandled, resourceId])

  async function createNode(): Promise<void> {
    if (!createRequest || !dialogValue.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const created = await boardsClient.createNode({
        type: createRequest.type,
        parentId: createRequest.parentId,
        title: dialogValue.trim()
      })
      await refreshNodes()
      setCreateRequest(null)
      setDialogValue('')
      await openNode(created.id)
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Не удалось создать элемент')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function renameNode(): Promise<void> {
    if (!renameTarget || !dialogValue.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      await boardsClient.renameNode(renameTarget.id, dialogValue.trim())
      await refreshNodes()
      setRenameTarget(null)
      setDialogValue('')
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Не удалось переименовать элемент')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function updateFolderIcon(folder: BoardNode, icon: StudyFolderIconName): Promise<void> {
    setError(null)

    try {
      const updated = await boardsClient.updateFolderIcon(folder.id, icon)
      setNodes((current) => current.map((node) => (node.id === updated.id ? updated : node)))
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Не удалось изменить иконку папки')
    }
  }

  async function deleteNode(): Promise<void> {
    if (!deleteTarget) return

    setIsSubmitting(true)
    setError(null)

    try {
      if (selectedId === deleteTarget.id) {
        await flushActiveBoardDraft()
      }

      await boardsClient.deleteNode(deleteTarget.id)
      const nextNodes = await refreshNodes()
      setDeleteTarget(null)

      if (!nextNodes.some((node) => node.id === selectedId)) {
        setSelectedId(null)
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Не удалось удалить элемент')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function moveNode(input: MoveBoardNodeInput): Promise<void> {
    setError(null)

    try {
      const nextNodes = await boardsClient.moveNode(input)
      setNodes(nextNodes)
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Не удалось переместить элемент')
    }
  }

  function startCreate(type: BoardNodeType, parentId: string | null): void {
    setCreateRequest({ type, parentId })
    setDialogValue(type === 'folder' ? 'Новая папка' : 'Новая доска')
  }

  function startRename(node: BoardNode): void {
    setRenameTarget(node)
    setDialogValue(node.title)
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[var(--app-muted)]">
        <LoaderCircle aria-hidden="true" className="mr-2 size-4 animate-spin" />
        Загрузка модуля досок…
      </div>
    )
  }

  return (
    <section
      data-boards-focus-mode={focusMode}
      className={
        focusMode
          ? 'h-full min-h-0 w-full bg-[var(--app-workspace)]'
          : getModuleSidebarLayoutClassName(sidebarCollapsed)
      }
    >
      {!focusMode && (
        <ModuleSidebar
          navigationLabel="Дерево досок"
          moduleLabel="Доски"
          homeLabel="Главная досок"
          icon={Presentation}
          collapsed={sidebarCollapsed}
          contentClassName={sidebarCollapsed ? undefined : 'px-0 py-3'}
          homeSelected={selectedId === null}
          expandLabel="Показать дерево досок"
          collapseLabel="Скрыть дерево досок"
          onHomeSelect={() => {
            void openNode(null)
          }}
          onCollapsedChange={setSidebarCollapsed}
        >
          <BoardTree
            nodes={nodes}
            selectedNodeId={selectedId}
            collapsed={sidebarCollapsed}
            onOpen={(id) => void openNode(id)}
            onToggle={async (folder) => {
              await boardsClient.updateExpansion(folder.id, !folder.isExpanded)
              await refreshNodes()
            }}
            onRename={startRename}
            onDelete={setDeleteTarget}
            onCreate={startCreate}
            onSelectRoot={() => void openNode(null)}
            onMove={(input) => void moveNode(input)}
          />
        </ModuleSidebar>
      )}

      <main className="min-w-0 flex-1 overflow-hidden">
        {selectedNode?.type === 'board' ? (
          <BoardWorkspace
            node={selectedNode}
            saveState={saveState}
            onSaveStateChange={setSaveState}
            focusMode={focusMode}
            onFocusModeChange={onFocusModeChange}
            onRename={() => startRename(selectedNode)}
            onBackToMaterial={
              selectedNode.sourceMaterialId
                ? () => {
                    requestAppModuleNavigation({
                      view: 'study',
                      resourceId: selectedNode.sourceMaterialId,
                      ...(focusMode ? { focusMode: true } : {})
                    })
                  }
                : undefined
            }
          />
        ) : selectedNode?.type === 'folder' ? (
          <BoardFolderPage
            folder={selectedNode}
            items={nodesByParent.get(selectedNode.id) ?? []}
            onOpen={(id) => void openNode(id)}
            onCreate={startCreate}
            onRename={() => startRename(selectedNode)}
            onIconChange={(icon) => void updateFolderIcon(selectedNode, icon)}
          />
        ) : (
          <BoardsHome
            nodes={nodes}
            rootNodes={nodesByParent.get(null) ?? []}
            onOpen={(id) => void openNode(id)}
            onCreate={startCreate}
          />
        )}
      </main>

      {error && (
        <Tooltip content="Закрыть сообщение об ошибке" side="left">
          <button
            type="button"
            aria-label="Закрыть сообщение об ошибке"
            className="fixed right-5 bottom-5 z-50 flex max-w-md items-start gap-3 rounded-xl border border-red-500/25 bg-[var(--app-surface-raised)] p-4 text-left shadow-2xl"
            onClick={() => setError(null)}
          >
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-red-300" />
            <span className="text-sm text-red-200">{error}</span>
          </button>
        </Tooltip>
      )}

      <BoardTextDialog
        open={createRequest !== null}
        title={createRequest?.type === 'folder' ? 'Создать папку' : 'Создать доску'}
        value={dialogValue}
        confirmLabel="Создать"
        isSubmitting={isSubmitting}
        onValueChange={setDialogValue}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) setCreateRequest(null)
        }}
        onConfirm={() => void createNode()}
      />

      <BoardTextDialog
        open={renameTarget !== null}
        title={renameTarget?.type === 'folder' ? 'Переименовать папку' : 'Переименовать доску'}
        value={dialogValue}
        confirmLabel="Сохранить"
        isSubmitting={isSubmitting}
        onValueChange={setDialogValue}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) setRenameTarget(null)
        }}
        onConfirm={() => void renameNode()}
      />

      <BoardDeleteDialog
        target={deleteTarget}
        isSubmitting={isSubmitting}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) setDeleteTarget(null)
        }}
        onConfirm={() => void deleteNode()}
      />
    </section>
  )
}

const boardDateFormatter = new Intl.DateTimeFormat('ru-RU', {
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
        return `${node.title} ${location} ${getBoardNodeTypeLabel(node)}`
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
          <BoardSearchResults nodes={searchResults} nodesById={nodesById} onOpen={onOpen} />
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
                        metadata={<>{getBoardNodeTypeLabel(node)} · Корень</>}
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
  onRename,
  onIconChange
}: {
  folder: BoardNode
  items: BoardNode[]
  onOpen: (id: string) => void
  onCreate: (type: BoardNodeType, parentId: string | null) => void
  onRename: () => void
  onIconChange: (icon: StudyFolderIconName) => void
}): React.JSX.Element {
  const folders = items
    .filter((item) => item.type === 'folder')
    .sort((first, second) => first.position - second.position)
  const boards = items
    .filter((item) => item.type === 'board')
    .sort((first, second) => first.position - second.position)
  const canChangeIcon = !folder.isSystem && !folder.sourceStudyNodeId
  const activeIcon = folder.icon ?? 'folder'

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
                    <FolderIcon name={activeIcon} expanded className="size-6" />
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
                    : canChangeIcon
                      ? 'w-[44rem] grid-cols-4 max-[760px]:grid-cols-2'
                      : 'w-[33rem] grid-cols-3 max-[760px]:grid-cols-2'
                )}
              >
                {!folder.isSystem && (
                  <WorkspaceActionButton type="button" onClick={onRename}>
                    <Pencil aria-hidden="true" />
                    Переименовать
                  </WorkspaceActionButton>
                )}
                {canChangeIcon && (
                  <FolderIconPicker
                    value={activeIcon}
                    onChange={onIconChange}
                    trigger={
                      <WorkspaceActionButton type="button">
                        <Palette aria-hidden="true" className="text-violet-300" />
                        Иконка
                      </WorkspaceActionButton>
                    }
                  />
                )}
                <WorkspaceActionButton type="button" onClick={() => onCreate('folder', folder.id)}>
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
        <div
          className={cn(compact ? 'grid gap-2' : 'grid grid-cols-2 gap-3 max-[720px]:grid-cols-1')}
        >
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
      ariaLabel={`Открыть ${node.type === 'folder' ? 'папку' : 'доску'} «${node.title}»`}
      icon={
        node.type === 'folder' ? (
          node.isSystem ? (
            <LockKeyhole aria-hidden="true" className="size-5" />
          ) : (
            <FolderIcon name={node.icon} expanded={node.isExpanded} className="size-5" />
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

function BoardWorkspace({
  node,
  saveState,
  onSaveStateChange,
  focusMode,
  onFocusModeChange,
  onRename,
  onBackToMaterial
}: {
  node: BoardNode
  saveState: BoardSaveState
  onSaveStateChange: (state: BoardSaveState) => void
  focusMode: boolean
  onFocusModeChange?: (active: boolean) => void
  onRename: () => void
  onBackToMaterial?: () => void
}): React.JSX.Element {
  return (
    <section
      data-board-workspace-focus={focusMode}
      className="flex h-full min-h-0 flex-col bg-[var(--app-workspace)]"
    >
      <header
        className={cn(
          'flex shrink-0 items-center gap-4 border-b border-[var(--app-border)]',
          focusMode ? 'h-14 bg-[var(--app-surface)] px-4' : 'h-20 bg-[var(--app-workspace)] px-5'
        )}
      >
        {onBackToMaterial && (
          <Tooltip content="Вернуться к материалу" side="bottom">
            <WorkspaceActionButton
              type="button"
              aria-label="Назад к материалу"
              className="w-auto px-3 max-[720px]:size-10 max-[720px]:px-0"
              onClick={onBackToMaterial}
            >
              <ArrowLeft aria-hidden="true" />
              <span className="max-[720px]:hidden">Назад к материалу</span>
            </WorkspaceActionButton>
          </Tooltip>
        )}
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--app-accent-500)]/10 text-[var(--app-accent-300)]">
          <Presentation aria-hidden className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold tracking-[0.12em] text-[var(--app-accent-300)] uppercase">
            Доска
          </p>
          <h1 className="mt-1 truncate text-lg font-semibold text-[var(--app-text)]">
            {node.title}
          </h1>
        </div>
        {!focusMode && (
          <Tooltip content="Переименовать доску" side="bottom">
            <WorkspaceActionButton
              type="button"
              aria-label="Переименовать доску"
              className="w-auto px-3 max-[720px]:size-10 max-[720px]:px-0"
              onClick={onRename}
            >
              <Pencil aria-hidden="true" />
              <span className="max-[720px]:hidden">Переименовать</span>
            </WorkspaceActionButton>
          </Tooltip>
        )}
        {!focusMode && <BoardSaveStatus state={saveState} />}
        {focusMode && (
          <Tooltip content="Выйти из режима фокуса" side="bottom">
            <WorkspaceActionButton
              type="button"
              aria-label="Выйти из режима фокуса"
              className="w-auto px-3 max-[720px]:size-10 max-[720px]:px-0"
              onClick={() => onFocusModeChange?.(false)}
            >
              <Minimize2 aria-hidden="true" />
              <span className="max-[720px]:hidden">Выйти из фокуса</span>
            </WorkspaceActionButton>
          </Tooltip>
        )}
      </header>
      <div className="min-h-0 flex-1">
        <BoardCanvasErrorBoundary resetKey={node.id}>
          <Suspense fallback={<BoardCanvasLoadingFallback />}>
            <BoardCanvas
              boardId={node.id}
              focusMode={focusMode}
              onFocusModeChange={onFocusModeChange}
              onSaveStateChange={onSaveStateChange}
            />
          </Suspense>
        </BoardCanvasErrorBoundary>
      </div>
    </section>
  )
}

function BoardCanvasLoadingFallback(): React.JSX.Element {
  return (
    <div
      role="status"
      className="flex h-full min-h-0 items-center justify-center bg-[var(--app-workspace)] text-sm text-[var(--app-muted)]"
    >
      <LoaderCircle aria-hidden="true" className="mr-2 size-4 animate-spin" />
      Загрузка редактора доски…
    </div>
  )
}

function BoardSaveStatus({ state }: { state: BoardSaveState }): React.JSX.Element {
  if (state === 'saving')
    return (
      <span className="flex items-center gap-1.5 text-xs text-[var(--app-accent-300)]">
        <LoaderCircle aria-hidden className="size-3.5 animate-spin" />
        Сохранение
      </span>
    )
  if (state === 'dirty') return <span className="text-xs text-amber-300">Есть изменения</span>
  if (state === 'error') return <span className="text-xs text-red-300">Ошибка сохранения</span>
  return (
    <span className="flex items-center gap-1.5 text-xs text-emerald-300">
      <Check aria-hidden className="size-3.5" />
      Сохранено
    </span>
  )
}

function BoardTextDialog({
  open,
  title,
  value,
  confirmLabel,
  isSubmitting,
  onValueChange,
  onOpenChange,
  onConfirm
}: {
  open: boolean
  title: string
  value: string
  confirmLabel: string
  isSubmitting: boolean
  onValueChange: (value: string) => void
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}): React.JSX.Element {
  const canConfirm = Boolean(value.trim()) && !isSubmitting
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-5">
          <AlertDialog.Title className="text-lg font-semibold text-[var(--app-text)]">
            {title}
          </AlertDialog.Title>
          <input
            autoFocus
            value={value}
            disabled={isSubmitting}
            className="mt-4 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent-500)]/50"
            onChange={(event) => onValueChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && canConfirm) onConfirm()
            }}
          />
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <button
                type="button"
                disabled={isSubmitting}
                className="rounded-lg px-3 py-2 text-sm text-[var(--app-muted)] hover:bg-white/[0.06]"
              >
                Отмена
              </button>
            </AlertDialog.Cancel>
            <button
              type="button"
              disabled={!canConfirm}
              className="flex items-center gap-2 rounded-lg bg-[var(--app-accent-500)] px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
              onClick={onConfirm}
            >
              {isSubmitting && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

function BoardDeleteDialog({
  target,
  isSubmitting,
  onOpenChange,
  onConfirm
}: {
  target: BoardNode | null
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}): React.JSX.Element {
  return (
    <AlertDialog.Root open={target !== null} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-5">
          <AlertDialog.Title className="text-lg font-semibold text-[var(--app-text)]">
            Удалить {target?.type === 'folder' ? 'папку' : 'доску'}?
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
            {target?.type === 'board' && target.sourceMaterialId ? (
              <>
                «{target.title}» и связанный блок в материале обучения будут удалены без возможности
                восстановления. Пустые учебные папки очистятся автоматически.
              </>
            ) : (
              <>
                «{target?.title}» будет удалена без возможности восстановления. Вложенное содержимое
                папки также будет удалено.
              </>
            )}
          </AlertDialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <button
                type="button"
                disabled={isSubmitting}
                className="rounded-lg px-3 py-2 text-sm text-[var(--app-muted)]"
              >
                Отмена
              </button>
            </AlertDialog.Cancel>
            <button
              type="button"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
              onClick={onConfirm}
            >
              {isSubmitting && <LoaderCircle aria-hidden className="size-4 animate-spin" />}Удалить
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

function groupBoardNodesByParent(nodes: BoardNode[]): Map<string | null, BoardNode[]> {
  const grouped = new Map<string | null, BoardNode[]>()
  nodes.forEach((node) => {
    const siblings = grouped.get(node.parentId) ?? []
    siblings.push(node)
    grouped.set(node.parentId, siblings)
  })
  grouped.forEach((siblings) =>
    siblings.sort(
      (first, second) =>
        first.position - second.position || first.title.localeCompare(second.title, 'ru')
    )
  )
  const root = grouped.get(null)
  if (root)
    root.sort((first, second) =>
      first.id === BOARD_SYSTEM_ROOT_ID
        ? -1
        : second.id === BOARD_SYSTEM_ROOT_ID
          ? 1
          : first.position - second.position
    )
  return grouped
}
