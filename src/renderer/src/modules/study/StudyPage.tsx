import * as AlertDialog from '@radix-ui/react-alert-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  ArrowRight,
  BookOpen,
  FilePlus2,
  FileText,
  Folder,
  FolderPlus,
  Palette,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { StudyFolderIconName, StudyNode } from '../../../../shared/contracts/study'
import { cn } from '../../shared/lib/cn'
import { Tooltip } from '../../shared/ui/tooltip'
import { StudyMaterialEditor } from './components/StudyMaterialEditor'
import { StudyActionButton } from './components/StudyActionButton'
import { DeleteConfirmationDialog } from './components/DeleteConfirmationDialog'
import { StudyHome } from './components/StudyHome'
import { StudyFolderIcon } from './components/StudyFolderIcon'
import { STUDY_FOLDER_ICON_OPTIONS } from './components/study-folder-icon-options'
import { StudyTree } from './components/StudyTree'
import { useStudy } from './hooks/use-study'
import { getStudyAncestorFolders } from './lib/study-tree'
import {
  STUDY_INTERNAL_LINK_NAVIGATE_EVENT,
  type StudyInternalLinkNavigateDetail,
  type StudyInternalLinkNavigationRequest
} from './lib/study-internal-link'

export function StudyPage(): React.JSX.Element {
  const study = useStudy()

  const studyNodes = study.nodes
  const selectNode = study.selectNode
  const toggleFolder = study.toggleFolder

  const [renameTarget, setRenameTarget] = useState<StudyNode | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<StudyNode | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const [internalNavigation, setInternalNavigation] =
    useState<StudyInternalLinkNavigationRequest | null>(null)

  const internalNavigationSequenceRef = useRef(0)

  const selectedNode = useMemo(
    () => study.nodes.find((node) => node.id === study.selectedNodeId) ?? null,
    [study.nodes, study.selectedNodeId]
  )

  const selectedParentId =
    selectedNode?.type === 'folder' ? selectedNode.id : (selectedNode?.parentId ?? null)

  function openRename(node: StudyNode): void {
    setRenameTarget(node)
    setRenameValue(node.title)
  }
  const selectStudyNode = useCallback(
    (nodeId: string): void => {
      const ancestorFolders = getStudyAncestorFolders(studyNodes, nodeId)

      ancestorFolders.forEach((folder) => {
        if (!folder.isExpanded) {
          void toggleFolder(folder)
        }
      })

      selectNode(nodeId)
    },
    [selectNode, studyNodes, toggleFolder]
  )

  useEffect(() => {
    function handleInternalNavigation(event: Event): void {
      const detail = (event as CustomEvent<StudyInternalLinkNavigateDetail>).detail

      if (!detail?.materialId || (detail.kind !== 'material' && detail.kind !== 'heading')) {
        return
      }

      internalNavigationSequenceRef.current += 1

      setInternalNavigation({
        kind: detail.kind,
        materialId: detail.materialId,
        headingId: detail.headingId ?? null,
        requestId: internalNavigationSequenceRef.current
      })

      selectStudyNode(detail.materialId)
    }

    window.addEventListener(STUDY_INTERNAL_LINK_NAVIGATE_EVENT, handleInternalNavigation)

    return () => {
      window.removeEventListener(STUDY_INTERNAL_LINK_NAVIGATE_EVENT, handleInternalNavigation)
    }
  }, [selectStudyNode])

  return (
    <section
      className={cn(
        'grid h-full min-h-0 overflow-hidden',
        'transition-[grid-template-columns] duration-200 ease-out',
        'motion-reduce:transition-none',
        isSidebarCollapsed ? 'grid-cols-[64px_minmax(0,1fr)]' : 'grid-cols-[280px_minmax(0,1fr)]'
      )}
    >
      <aside
        data-collapsed={isSidebarCollapsed}
        className="group/study-sidebar relative flex min-h-0 flex-col border-r border-[var(--app-border)] bg-[var(--app-sidebar)]"
      >
        <header
          className={cn(
            'flex h-[var(--app-header-height)] shrink-0 items-center border-b border-[var(--app-border)]',
            isSidebarCollapsed ? 'px-2' : 'px-3'
          )}
        >
          <Tooltip content="Главная обучения" side="right" disabled={!isSidebarCollapsed}>
            <button
              type="button"
              aria-label={isSidebarCollapsed ? 'Главная обучения' : undefined}
              aria-current={selectedNode === null ? 'page' : undefined}
              className={cn(
                'flex h-11 w-full items-center rounded-xl text-left transition-colors outline-none',
                'focus-visible:ring-2 focus-visible:ring-violet-500/35',
                isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3 pr-8',
                selectedNode === null
                  ? 'bg-violet-500/10 text-violet-200 ring-1 ring-violet-500/15 ring-inset'
                  : 'text-[var(--app-muted)] hover:bg-white/[0.04] hover:text-[var(--app-text)]'
              )}
              onClick={() => {
                study.selectNode(null)
              }}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
                <BookOpen aria-hidden="true" className="size-4" />
              </span>

              {!isSidebarCollapsed && (
                <span className="min-w-0 truncate text-sm font-semibold">Обучение</span>
              )}
            </button>
          </Tooltip>
        </header>

        <Tooltip
          content={isSidebarCollapsed ? 'Показать библиотеку' : 'Скрыть библиотеку'}
          side="right"
        >
          <button
            type="button"
            aria-label={isSidebarCollapsed ? 'Показать библиотеку' : 'Скрыть библиотеку'}
            className={cn(
              'absolute top-8 right-0 z-30',
              'flex size-7 translate-x-1/2 -translate-y-1/2',
              'items-center justify-center rounded-full border',
              'border-[var(--app-border-strong)] bg-[var(--app-surface-raised)]',
              'text-[var(--app-muted)] opacity-0 outline-none',
              'transition-[opacity,background-color,color,transform]',
              'group-hover/study-sidebar:opacity-100',
              'group-focus-within/study-sidebar:opacity-100',
              'hover:scale-105 hover:bg-[var(--app-sidebar-active)] hover:text-violet-300',
              'focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-violet-500/60'
            )}
            onClick={() => {
              setIsSidebarCollapsed((current) => !current)
            }}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen aria-hidden="true" className="size-4" />
            ) : (
              <PanelLeftClose aria-hidden="true" className="size-4" />
            )}
          </button>
        </Tooltip>

        <div
          className={cn('min-h-0 flex-1 overflow-y-auto', isSidebarCollapsed ? 'px-2 py-3' : 'p-3')}
        >
          {study.isLoading ? (
            <p className="px-2 py-4 text-sm text-[var(--app-muted)]">Загрузка…</p>
          ) : (
            <StudyTree
              nodes={study.nodes}
              search=""
              selectedNodeId={study.selectedNodeId}
              activeParentId={selectedParentId}
              collapsed={isSidebarCollapsed}
              onSelect={selectStudyNode}
              onSelectRoot={() => {
                study.selectNode(null)
              }}
              onToggleFolder={(node) => {
                void study.toggleFolder(node)
              }}
              onRename={openRename}
              onDelete={setDeleteTarget}
              onCreateFolder={(parentId) => {
                const parentFolder = study.nodes.find((node) => node.id === parentId)

                if (parentFolder?.type === 'folder' && !parentFolder.isExpanded) {
                  void study.toggleFolder(parentFolder)
                }

                void study.createNode({
                  type: 'folder',
                  parentId
                })
              }}
              onCreateMaterial={(parentId) => {
                const parentFolder = study.nodes.find((node) => node.id === parentId)

                if (parentFolder?.type === 'folder' && !parentFolder.isExpanded) {
                  void study.toggleFolder(parentFolder)
                }

                void study.createNode({
                  type: 'material',
                  parentId
                })
              }}
              onMove={(input) => {
                void study.moveNode(input)
              }}
            />
          )}

          {study.error && (
            <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/[0.06] p-3 text-xs text-red-300">
              {study.error}
            </p>
          )}
        </div>
      </aside>

      <main className="min-h-0 min-w-0 bg-[var(--app-workspace)]">
        {selectedNode?.type === 'material' ? (
          <StudyMaterialEditor
            key={selectedNode.id}
            node={selectedNode}
            navigation={
              internalNavigation?.materialId === selectedNode.id ? internalNavigation : null
            }
            onNavigationHandled={(requestId) => {
              setInternalNavigation((current) =>
                current?.requestId === requestId ? null : current
              )
            }}
          />
        ) : selectedNode?.type === 'folder' ? (
          <FolderWorkspace
            node={selectedNode}
            allNodes={study.nodes}
            items={study.nodes.filter((node) => node.parentId === selectedNode.id)}
            onSelect={selectStudyNode}
            onCreateFolder={() => {
              void study.createNode({
                type: 'folder',
                parentId: selectedNode.id
              })
            }}
            onCreateMaterial={() => {
              void study.createNode({
                type: 'material',
                parentId: selectedNode.id
              })
            }}
            onIconChange={(icon) => {
              void study.updateFolderIcon(selectedNode.id, icon)
            }}
          />
        ) : (
          <StudyHome
            nodes={study.nodes}
            isLoading={study.isLoading}
            onOpen={(nodeId) => {
              selectStudyNode(nodeId)
            }}
            onCreateFolder={() => {
              void study.createNode({
                type: 'folder',
                parentId: null
              })
            }}
            onCreateMaterial={() => {
              void study.createNode({
                type: 'material',
                parentId: null
              })
            }}
          />
        )}
      </main>

      <AlertDialog.Root
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRenameTarget(null)
          }
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/60" />

          <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-5">
            <AlertDialog.Title className="text-lg font-semibold text-[var(--app-text)]">
              Переименовать
            </AlertDialog.Title>

            <input
              autoFocus
              value={renameValue}
              className="mt-4 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:border-violet-500/50"
              onChange={(event) => {
                setRenameValue(event.target.value)
              }}
            />

            <div className="mt-5 flex justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <button
                  type="button"
                  className="rounded-lg px-3 py-2 text-sm text-[var(--app-muted)] hover:bg-white/[0.06]"
                >
                  Отмена
                </button>
              </AlertDialog.Cancel>

              <AlertDialog.Action asChild>
                <button
                  type="button"
                  disabled={!renameValue.trim()}
                  className="rounded-lg bg-violet-500 px-3 py-2 text-sm font-medium text-white hover:bg-violet-400 disabled:opacity-40"
                  onClick={() => {
                    if (renameTarget) {
                      void study.renameNode(renameTarget.id, renameValue)
                    }

                    setRenameTarget(null)
                  }}
                >
                  Сохранить
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      <DeleteConfirmationDialog
        open={deleteTarget !== null}
        title={deleteTarget?.type === 'folder' ? 'Удалить папку?' : 'Удалить материал?'}
        subject={deleteTarget?.title}
        description={
          deleteTarget?.type === 'folder'
            ? 'Папка будет удалена вместе со всеми вложенными папками и материалами.'
            : 'Материал и всё его содержимое будут удалены без возможности восстановления.'
        }
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
          }
        }}
        onConfirm={() => {
          if (deleteTarget) {
            void study.deleteNode(deleteTarget.id)
          }

          setDeleteTarget(null)
        }}
      />
    </section>
  )
}

const folderWorkspaceDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short'
})
function FolderWorkspace({
  node,
  allNodes,
  items,
  onSelect,
  onCreateFolder,
  onCreateMaterial,
  onIconChange
}: {
  node: StudyNode
  allNodes: StudyNode[]
  items: StudyNode[]
  onSelect: (nodeId: string) => void
  onCreateFolder: () => void
  onCreateMaterial: () => void
  onIconChange: (icon: StudyFolderIconName) => void
}): React.JSX.Element {
  const folders = items
    .filter((item) => item.type === 'folder')
    .sort((first, second) => first.position - second.position)

  const materials = items
    .filter((item) => item.type === 'material')
    .sort((first, second) => first.position - second.position)

  const activeIcon = node.icon ?? 'folder'

  const folderPath = getFolderWorkspacePath(node, allNodes)

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
                  <StudyFolderIcon name={activeIcon} expanded className="size-6" />
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] font-semibold tracking-[0.12em] text-violet-300 uppercase">
                    Папка библиотеки
                  </p>

                  <h1 className="mt-1 truncate text-3xl font-semibold tracking-[-0.035em] text-[var(--app-text)]">
                    {node.title}
                  </h1>

                  <p
                    title={folderPath.join(' / ')}
                    className="mt-2 max-w-2xl truncate text-sm text-[var(--app-muted)]"
                  >
                    {folderPath.join(' / ')}
                  </p>
                </div>
              </div>

              <div className="grid w-[33rem] max-w-full shrink-0 grid-cols-3 gap-2 max-[920px]:w-full max-[620px]:grid-cols-1">
                <FolderIconPicker
                  value={activeIcon}
                  onChange={onIconChange}
                />

                <StudyActionButton
                  type="button"
                  onClick={onCreateFolder}
                >
                  <FolderPlus aria-hidden="true" />

                  Новая папка
                </StudyActionButton>

                <StudyActionButton
                  type="button"
                  variant="primary"
                  onClick={onCreateMaterial}
                >
                  <FilePlus2 aria-hidden="true" />

                  Новый материал
                </StudyActionButton>
              </div>
            </header>

            <div className="mt-6 grid grid-cols-3 gap-3 max-[760px]:grid-cols-1">
              <FolderStatistic
                icon={<BookOpen aria-hidden="true" className="size-5" />}
                value={items.length}
                label="Всего"
                description="Элементов в этой папке"
              />

              <FolderStatistic
                icon={<FileText aria-hidden="true" className="size-5" />}
                value={materials.length}
                label="Материалов"
                description="Конспекты и записи"
              />

              <FolderStatistic
                icon={<Folder aria-hidden="true" className="size-5" />}
                value={folders.length}
                label="Папок"
                description="Вложенных разделов"
              />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(300px,0.75fr)] items-start gap-5 max-[1040px]:grid-cols-1">
          <FolderItemsSection
            kind="material"
            title="Материалы"
            description="Конспекты и учебные материалы этой папки"
            items={materials}
            emptyText="В этой папке пока нет материалов"
            onSelect={onSelect}
          />

          <FolderItemsSection
            kind="folder"
            title="Вложенные папки"
            description="Дополнительные разделы текущей папки"
            items={folders}
            emptyText="Вложенных папок пока нет"
            onSelect={onSelect}
          />
        </div>
      </div>
    </section>
  )
}

function FolderIconPicker({
  value,
  onChange
}: {
  value: StudyFolderIconName
  onChange: (icon: StudyFolderIconName) => void
}): React.JSX.Element {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <StudyActionButton
          type="button"
        >
          <Palette
            aria-hidden="true"
            className="text-violet-300"
          />

          Иконка
        </StudyActionButton>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={8}
          align="end"
          collisionPadding={12}
          className="z-50 w-72 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-2 shadow-2xl shadow-black/35"
        >
          <DropdownMenu.Label className="px-2 py-2 text-xs font-medium text-[var(--app-muted)]">
            Иконка папки
          </DropdownMenu.Label>

          <div className="grid grid-cols-4 gap-1">
            {STUDY_FOLDER_ICON_OPTIONS.map((option) => (
              <Tooltip key={option.value} content={option.label} side="top">
                <DropdownMenu.Item
                  aria-label={option.label}
                  className={cn(
                    'flex aspect-square cursor-default items-center justify-center rounded-xl border outline-none',
                    'border-transparent text-[var(--app-muted)] transition-colors',
                    'hover:bg-white/[0.06] hover:text-[var(--app-text)]',
                    'focus:bg-white/[0.06] focus:text-[var(--app-text)]',
                    option.value === value &&
                      'border-violet-500/25 bg-violet-500/15 text-violet-200'
                  )}
                  onSelect={() => {
                    onChange(option.value)
                  }}
                >
                  <StudyFolderIcon name={option.value} className="size-5" />
                </DropdownMenu.Item>
              </Tooltip>
            ))}
          </div>

          <DropdownMenu.Arrow className="fill-[var(--app-surface-raised)]" />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
function FolderStatistic({
  icon,
  value,
  label,
  description
}: {
  icon: React.ReactNode
  value: number
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

function FolderItemsSection({
  kind,
  title,
  description,
  items,
  emptyText,
  onSelect
}: {
  kind: 'folder' | 'material'
  title: string
  description: string
  items: StudyNode[]
  emptyText: string
  onSelect: (nodeId: string) => void
}): React.JSX.Element {
  const compact = kind === 'folder'

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[0_12px_40px_rgb(0_0_0/0.1)]">
      <header className="flex min-h-20 items-center gap-3 border-b border-[var(--app-border)] px-5 py-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/15 bg-violet-500/10 text-violet-300">
          {kind === 'folder' ? (
            <Folder aria-hidden="true" className="size-5" />
          ) : (
            <FileText aria-hidden="true" className="size-5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-[var(--app-text)]">{title}</h2>

          <p className="mt-0.5 truncate text-xs text-[var(--app-muted)]">{description}</p>
        </div>

        <span className="flex min-w-7 shrink-0 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-workspace)] px-2 py-1 text-[11px] font-medium text-[var(--app-muted)] tabular-nums">
          {items.length}
        </span>
      </header>

      {items.length > 0 ? (
        <div
          className={cn(
            'p-4',
            compact ? 'grid gap-2' : 'grid grid-cols-2 gap-3 max-[720px]:grid-cols-1'
          )}
        >
          {items.map((child) => (
            <button
              key={child.id}
              type="button"
              aria-label={`Открыть ${child.type === 'folder' ? 'папку' : 'материал'} «${child.title}»`}
              className={cn(
                'group flex w-full min-w-0 items-center gap-3 rounded-xl border text-left outline-none',
                'border-[var(--app-border)] bg-[var(--app-workspace)]',
                'transition-[border-color,background-color,transform,box-shadow]',
                'hover:-translate-y-px hover:border-violet-500/30',
                'hover:bg-[var(--app-surface-raised)] hover:shadow-lg hover:shadow-black/10',
                'focus-visible:ring-2 focus-visible:ring-violet-500/35',
                compact ? 'p-3' : 'p-3.5'
              )}
              onClick={() => {
                onSelect(child.id)
              }}
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
                {child.type === 'folder' ? (
                  <StudyFolderIcon
                    name={child.icon}
                    expanded={child.isExpanded}
                    className="size-5"
                  />
                ) : (
                  <FileText className="size-5" />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-[var(--app-text)]">
                  {child.title}
                </span>

                <span className="mt-1 block truncate text-[11px] text-[var(--app-muted)]">
                  {child.type === 'folder' ? 'Папка' : 'Материал'}
                  {' · '}
                  {folderWorkspaceDateFormatter.format(new Date(child.updatedAt))}
                </span>
              </span>

              <ArrowRight
                aria-hidden="true"
                className="size-4 shrink-0 -translate-x-1 text-[var(--app-muted)] opacity-0 transition-[opacity,transform,color] group-hover:translate-x-0 group-hover:text-violet-300 group-hover:opacity-100"
              />
            </button>
          ))}
        </div>
      ) : (
        <div className="m-4 flex min-h-32 items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] bg-black/[0.04] px-5 py-8 text-center text-sm leading-6 text-[var(--app-muted)]">
          {emptyText}
        </div>
      )}
    </section>
  )
}

function getFolderWorkspacePath(node: StudyNode, allNodes: StudyNode[]): string[] {
  const nodesById = new Map(allNodes.map((item) => [item.id, item]))

  const path = [node.title]
  const visited = new Set([node.id])

  let parentId = node.parentId

  while (parentId && !visited.has(parentId)) {
    visited.add(parentId)

    const parent = nodesById.get(parentId)

    if (!parent) {
      break
    }

    path.unshift(parent.title)
    parentId = parent.parentId
  }

  return ['Обучение', ...path]
}
