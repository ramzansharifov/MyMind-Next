import * as AlertDialog from '@radix-ui/react-alert-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  Check,
  ChevronRight,
  Folder,
  FolderPlus,
  Home,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Presentation,
  Trash2,
  TriangleAlert
} from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'

import {
  BOARD_SYSTEM_ROOT_ID,
  type BoardNode,
  type BoardNodeType
} from '../../../../shared/contracts/boards'
import { cn } from '../../shared/lib/cn'
import { boardsClient } from './api/boards-client'
import { BoardCanvasErrorBoundary } from './components/BoardCanvasErrorBoundary'
import { loadBoardCanvas } from './components/load-board-canvas'
import { flushActiveBoardDraft } from './lib/board-draft-lifecycle'
import type { BoardSaveState } from './lib/board-save-queue'

const BoardCanvas = lazy(loadBoardCanvas)

export interface BoardsPageProps {
  resourceId?: string | null
  onResourceHandled?: () => void
}

interface BoardCreateRequest {
  type: BoardNodeType
  parentId: string | null
}

export function BoardsPage({ resourceId, onResourceHandled }: BoardsPageProps): React.JSX.Element {
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
    <section className="flex h-full min-h-0 bg-[var(--app-workspace)]">
      <aside
        aria-label="Дерево досок"
        className={cn(
          'flex min-h-0 shrink-0 flex-col border-r border-[var(--app-border)] bg-[var(--app-sidebar)] transition-[width] duration-200',
          sidebarCollapsed ? 'w-16' : 'w-80'
        )}
      >
        <div className="flex h-20 shrink-0 items-center gap-3 border-b border-[var(--app-border)] px-3">
          <button
            type="button"
            aria-label={sidebarCollapsed ? 'Развернуть дерево досок' : 'Свернуть дерево досок'}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[var(--app-muted)] outline-none hover:bg-white/[0.05] hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-[var(--app-accent-500)]/45"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
          >
            {sidebarCollapsed ? <PanelLeftOpen aria-hidden /> : <PanelLeftClose aria-hidden />}
          </button>

          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.1em] text-[var(--app-accent-400)] uppercase">
                Модуль
              </p>
              <p className="truncate font-semibold text-[var(--app-text)]">Доски</p>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <button
            type="button"
            aria-current={selectedId === null ? 'page' : undefined}
            aria-label="Главная страница досок"
            className={cn(
              'flex h-10 w-full items-center rounded-lg text-sm outline-none',
              sidebarCollapsed ? 'justify-center px-0' : 'gap-2 px-3',
              selectedId === null
                ? 'bg-[var(--app-sidebar-active)] text-[var(--app-accent-300)]'
                : 'text-[var(--app-muted)] hover:bg-white/[0.04] hover:text-[var(--app-text)]'
            )}
            onClick={() => void openNode(null)}
          >
            <Home aria-hidden="true" className="size-4 shrink-0" />
            {!sidebarCollapsed && <span>Главная</span>}
          </button>

          <div className="mt-2 grid gap-0.5">
            {(nodesByParent.get(null) ?? []).map((node) => (
              <BoardTreeNode
                key={node.id}
                node={node}
                depth={0}
                selectedId={selectedId}
                collapsed={sidebarCollapsed}
                nodesByParent={nodesByParent}
                onOpen={(id) => void openNode(id)}
                onToggle={async (folder) => {
                  await boardsClient.updateExpansion(folder.id, !folder.isExpanded)
                  await refreshNodes()
                }}
                onRename={startRename}
                onDelete={setDeleteTarget}
                onCreate={startCreate}
              />
            ))}
          </div>
        </div>

        {!sidebarCollapsed && (
          <div className="grid grid-cols-2 gap-2 border-t border-[var(--app-border)] p-3">
            <SidebarCreateButton
              label="Папка"
              icon={FolderPlus}
              onClick={() => startCreate('folder', null)}
            />
            <SidebarCreateButton
              label="Доска"
              icon={Plus}
              onClick={() => startCreate('board', null)}
            />
          </div>
        )}
      </aside>

      <main className="min-w-0 flex-1 overflow-hidden">
        {selectedNode?.type === 'board' ? (
          <BoardWorkspace
            node={selectedNode}
            saveState={saveState}
            onSaveStateChange={setSaveState}
            onRename={() => startRename(selectedNode)}
          />
        ) : selectedNode?.type === 'folder' ? (
          <BoardFolderPage
            folder={selectedNode}
            items={nodesByParent.get(selectedNode.id) ?? []}
            onOpen={(id) => void openNode(id)}
            onCreate={startCreate}
            onRename={() => startRename(selectedNode)}
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
        <button
          type="button"
          aria-label="Закрыть сообщение об ошибке"
          className="fixed right-5 bottom-5 z-50 flex max-w-md items-start gap-3 rounded-xl border border-red-500/25 bg-[var(--app-surface-raised)] p-4 text-left shadow-2xl"
          onClick={() => setError(null)}
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-red-300" />
          <span className="text-sm text-red-200">{error}</span>
        </button>
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

function BoardTreeNode({
  node,
  depth,
  selectedId,
  collapsed,
  nodesByParent,
  onOpen,
  onToggle,
  onRename,
  onDelete,
  onCreate
}: {
  node: BoardNode
  depth: number
  selectedId: string | null
  collapsed: boolean
  nodesByParent: Map<string | null, BoardNode[]>
  onOpen: (id: string) => void
  onToggle: (node: BoardNode) => void | Promise<void>
  onRename: (node: BoardNode) => void
  onDelete: (node: BoardNode) => void
  onCreate: (type: BoardNodeType, parentId: string | null) => void
}): React.JSX.Element {
  const children = nodesByParent.get(node.id) ?? []
  const Icon = node.type === 'folder' ? Folder : Presentation

  return (
    <div>
      <div
        className={cn(
          'group flex h-9 items-center rounded-lg text-sm',
          selectedId === node.id
            ? 'bg-[var(--app-sidebar-active)] text-[var(--app-accent-300)]'
            : 'text-[var(--app-muted)] hover:bg-white/[0.04] hover:text-[var(--app-text)]'
        )}
        style={collapsed ? undefined : { paddingLeft: `${8 + depth * 14}px` }}
      >
        {node.type === 'folder' && !collapsed ? (
          <button
            type="button"
            aria-label={
              node.isExpanded
                ? `Свернуть папку «${node.title}»`
                : `Развернуть папку «${node.title}»`
            }
            className="flex size-7 shrink-0 items-center justify-center rounded-md outline-none hover:bg-white/[0.06]"
            onClick={() => void onToggle(node)}
          >
            <ChevronRight
              aria-hidden="true"
              className={cn('size-3.5 transition-transform', node.isExpanded && 'rotate-90')}
            />
          </button>
        ) : null}

        <button
          type="button"
          title={node.title}
          aria-label={node.title}
          className={cn(
            'flex min-w-0 flex-1 items-center outline-none',
            collapsed ? 'justify-center' : 'gap-2 px-1'
          )}
          onClick={() => onOpen(node.id)}
        >
          <Icon aria-hidden="true" className="size-4 shrink-0" />
          {!collapsed && <span className="truncate">{node.title}</span>}
          {!collapsed && node.isSystem && (
            <LockKeyhole aria-hidden="true" className="ml-auto size-3.5 shrink-0 opacity-60" />
          )}
        </button>

        {!collapsed && (
          <BoardNodeMenu node={node} onRename={onRename} onDelete={onDelete} onCreate={onCreate} />
        )}
      </div>

      {!collapsed &&
        node.type === 'folder' &&
        node.isExpanded &&
        children.map((child) => (
          <BoardTreeNode
            key={child.id}
            node={child}
            depth={depth + 1}
            selectedId={selectedId}
            collapsed={collapsed}
            nodesByParent={nodesByParent}
            onOpen={onOpen}
            onToggle={onToggle}
            onRename={onRename}
            onDelete={onDelete}
            onCreate={onCreate}
          />
        ))}
    </div>
  )
}

function BoardNodeMenu({
  node,
  onRename,
  onDelete,
  onCreate
}: {
  node: BoardNode
  onRename: (node: BoardNode) => void
  onDelete: (node: BoardNode) => void
  onCreate: (type: BoardNodeType, parentId: string | null) => void
}): React.JSX.Element {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Действия с элементом «${node.title}»`}
          className="mr-1 flex size-7 shrink-0 items-center justify-center rounded-md opacity-0 outline-none group-hover:opacity-100 hover:bg-white/[0.07] focus-visible:opacity-100"
        >
          <MoreHorizontal aria-hidden="true" className="size-4" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-48 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-1.5 shadow-2xl"
          sideOffset={6}
        >
          {node.type === 'folder' && (
            <>
              <BoardMenuItem
                icon={FolderPlus}
                label="Новая папка"
                onSelect={() => onCreate('folder', node.id)}
              />
              <BoardMenuItem
                icon={Presentation}
                label="Новая доска"
                onSelect={() => onCreate('board', node.id)}
              />
              <DropdownMenu.Separator className="my-1 h-px bg-[var(--app-border)]" />
            </>
          )}
          {!node.isSystem && (
            <>
              <BoardMenuItem icon={Pencil} label="Переименовать" onSelect={() => onRename(node)} />
              <BoardMenuItem icon={Trash2} label="Удалить" danger onSelect={() => onDelete(node)} />
            </>
          )}
          {node.isSystem && (
            <p className="px-3 py-2 text-xs text-[var(--app-muted)]">Системная папка защищена</p>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function BoardMenuItem({
  icon: Icon,
  label,
  danger = false,
  onSelect
}: {
  icon: typeof Folder
  label: string
  danger?: boolean
  onSelect: () => void
}): React.JSX.Element {
  return (
    <DropdownMenu.Item
      className={cn(
        'flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none focus:bg-white/[0.06]',
        danger ? 'text-red-300' : 'text-[var(--app-text)]'
      )}
      onSelect={onSelect}
    >
      <Icon aria-hidden="true" className="size-4" />
      {label}
    </DropdownMenu.Item>
  )
}

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
  const boardCount = nodes.filter((node) => node.type === 'board').length
  const folderCount = nodes.filter((node) => node.type === 'folder').length

  return (
    <div className="h-full overflow-y-auto px-8 py-7 max-[720px]:px-4">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <header className="relative overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-[0_20px_70px_rgb(0_0_0/0.15)]">
          <div className="absolute -top-28 right-4 size-72 rounded-full bg-[var(--app-accent-500)]/10 blur-3xl" />
          <div className="relative flex items-start justify-between gap-5 max-[700px]:flex-col">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--app-accent-300)] uppercase">
                Рабочее пространство
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--app-text)]">
                Доски
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--app-muted)]">
                Создавайте самостоятельные бесконечные холсты и открывайте доски, связанные с
                материалами обучения.
              </p>
            </div>
            <div className="flex gap-2">
              <PrimaryAction
                icon={FolderPlus}
                label="Новая папка"
                onClick={() => onCreate('folder', null)}
              />
              <PrimaryAction
                icon={Presentation}
                label="Новая доска"
                onClick={() => onCreate('board', null)}
              />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-3 gap-4 max-[760px]:grid-cols-1">
          <MetricCard label="Досок" value={boardCount} icon={Presentation} />
          <MetricCard label="Папок" value={folderCount} icon={Folder} />
          <MetricCard
            label="Связано с обучением"
            value={nodes.filter((node) => Boolean(node.sourceMaterialId)).length}
            icon={LayoutDashboard}
          />
        </div>

        <BoardItemsSection title="Структура" items={rootNodes} onOpen={onOpen} />
      </div>
    </div>
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
  return (
    <div className="h-full overflow-y-auto px-8 py-7 max-[720px]:px-4">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <header className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-[0_20px_70px_rgb(0_0_0/0.14)]">
          <div className="flex items-start justify-between gap-5 max-[700px]:flex-col">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--app-accent-500)]/20 bg-[var(--app-accent-500)]/10 text-[var(--app-accent-300)]">
                {folder.isSystem ? <LockKeyhole aria-hidden /> : <Folder aria-hidden />}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--app-accent-300)] uppercase">
                  Папка досок
                </p>
                <h1 className="mt-1 truncate text-3xl font-semibold text-[var(--app-text)]">
                  {folder.title}
                </h1>
                <p className="mt-2 text-sm text-[var(--app-muted)]">
                  {folder.isSystem
                    ? 'Защищённая точка входа для досок из материалов обучения.'
                    : 'Организуйте связанные папки и доски.'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!folder.isSystem && (
                <PrimaryAction icon={Pencil} label="Переименовать" onClick={onRename} />
              )}
              <PrimaryAction
                icon={FolderPlus}
                label="Новая папка"
                onClick={() => onCreate('folder', folder.id)}
              />
              <PrimaryAction
                icon={Presentation}
                label="Новая доска"
                onClick={() => onCreate('board', folder.id)}
              />
            </div>
          </div>
        </header>
        <BoardItemsSection title="Содержимое" items={items} onOpen={onOpen} />
      </div>
    </div>
  )
}

function BoardItemsSection({
  title,
  items,
  onOpen
}: {
  title: string
  items: BoardNode[]
  onOpen: (id: string) => void
}): React.JSX.Element {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)]">
      <header className="border-b border-[var(--app-border)] px-5 py-4">
        <h2 className="font-semibold text-[var(--app-text)]">{title}</h2>
        <p className="mt-1 text-xs text-[var(--app-muted)]">{items.length} элементов</p>
      </header>
      {items.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-[var(--app-muted)]">
          Пока здесь ничего нет
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 p-4 max-[980px]:grid-cols-2 max-[640px]:grid-cols-1">
          {items.map((item) => {
            const Icon = item.type === 'folder' ? Folder : Presentation
            return (
              <button
                key={item.id}
                type="button"
                className="group flex min-h-28 items-start gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4 text-left transition-[border-color,transform] outline-none hover:-translate-y-px hover:border-[var(--app-accent-500)]/35 focus-visible:ring-2 focus-visible:ring-[var(--app-accent-500)]/45"
                onClick={() => onOpen(item.id)}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--app-accent-500)]/10 text-[var(--app-accent-300)]">
                  <Icon aria-hidden className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--app-text)]">{item.title}</p>
                  <p className="mt-1 text-xs text-[var(--app-muted)]">
                    {item.type === 'folder'
                      ? 'Папка'
                      : item.sourceMaterialId
                        ? 'Доска из обучения'
                        : 'Доска'}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}

function BoardWorkspace({
  node,
  saveState,
  onSaveStateChange,
  onRename
}: {
  node: BoardNode
  saveState: BoardSaveState
  onSaveStateChange: (state: BoardSaveState) => void
  onRename: () => void
}): React.JSX.Element {
  return (
    <section className="flex h-full min-h-0 flex-col">
      <header className="flex h-20 shrink-0 items-center gap-4 border-b border-[var(--app-border)] bg-[var(--app-workspace)] px-5">
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
        <button
          type="button"
          className="flex h-9 items-center gap-2 rounded-lg px-3 text-sm text-[var(--app-muted)] hover:bg-white/[0.05] hover:text-[var(--app-text)]"
          onClick={onRename}
        >
          <Pencil aria-hidden className="size-4" />
          <span className="max-[720px]:hidden">Переименовать</span>
        </button>
        <BoardSaveStatus state={saveState} />
      </header>
      <div className="min-h-0 flex-1">
        <BoardCanvasErrorBoundary resetKey={node.id}>
          <Suspense fallback={<BoardCanvasLoadingFallback />}>
            <BoardCanvas boardId={node.id} onSaveStateChange={onSaveStateChange} />
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

function PrimaryAction({
  icon: Icon,
  label,
  onClick
}: {
  icon: typeof Folder
  label: string
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      className="flex h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm font-medium text-[var(--app-text)] outline-none hover:border-[var(--app-accent-500)]/35 focus-visible:ring-2 focus-visible:ring-[var(--app-accent-500)]/45"
      onClick={onClick}
    >
      <Icon aria-hidden className="size-4 text-[var(--app-accent-300)]" />
      {label}
    </button>
  )
}

function SidebarCreateButton({
  icon: Icon,
  label,
  onClick
}: {
  icon: typeof Folder
  label: string
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      className="flex h-9 items-center justify-center gap-2 rounded-lg border border-[var(--app-border)] text-xs text-[var(--app-muted)] hover:border-[var(--app-accent-500)]/30 hover:text-[var(--app-text)]"
      onClick={onClick}
    >
      <Icon aria-hidden className="size-3.5" />
      {label}
    </button>
  )
}

function MetricCard({
  label,
  value,
  icon: Icon
}: {
  label: string
  value: number
  icon: typeof Folder
}): React.JSX.Element {
  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--app-muted)]">{label}</p>
        <Icon aria-hidden className="size-4 text-[var(--app-accent-300)]" />
      </div>
      <p className="mt-3 text-3xl font-semibold text-[var(--app-text)]">{value}</p>
    </div>
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
            «{target?.title}» будет удалена без возможности восстановления. Вложенное содержимое
            папки также будет удалено.
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
