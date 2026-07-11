import * as AlertDialog from '@radix-ui/react-alert-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  BookOpen,
  FilePlus2,
  FileText,
  FolderPlus,
  Palette,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react'
import { useMemo, useState } from 'react'

import type { StudyFolderIconName, StudyNode } from '../../../../shared/contracts/study'
import { cn } from '../../shared/lib/cn'
import { Tooltip } from '../../shared/ui/tooltip'
import { StudyMaterialEditor } from './components/StudyMaterialEditor'
import { DeleteConfirmationDialog } from './components/DeleteConfirmationDialog'
import { StudyHome } from './components/StudyHome'
import { StudyFolderIcon } from './components/StudyFolderIcon'
import { STUDY_FOLDER_ICON_OPTIONS } from './components/study-folder-icon-options'
import { StudyTree } from './components/StudyTree'
import { useStudy } from './hooks/use-study'
import { getStudyAncestorFolders } from './lib/study-tree'

export function StudyPage(): React.JSX.Element {
  const study = useStudy()

  const [renameTarget, setRenameTarget] = useState<StudyNode | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<StudyNode | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

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
  function selectStudyNode(nodeId: string): void {
    const ancestorFolders = getStudyAncestorFolders(study.nodes, nodeId)

    ancestorFolders.forEach((folder) => {
      if (!folder.isExpanded) {
        void study.toggleFolder(folder)
      }
    })

    study.selectNode(nodeId)
  }

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
          <StudyMaterialEditor key={selectedNode.id} node={selectedNode} />
        ) : selectedNode?.type === 'folder' ? (
          <FolderWorkspace
            node={selectedNode}
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

function FolderWorkspace({
  node,
  items,
  onSelect,
  onCreateFolder,
  onCreateMaterial,
  onIconChange
}: {
  node: StudyNode
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

  return (
    <section className="h-full overflow-y-auto p-8 max-[720px]:p-4">
      <div className="mx-auto grid w-full max-w-6xl gap-5">
        <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)]">
          <header className="flex items-start gap-4 p-5 max-[760px]:flex-wrap">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/15 ring-inset">
              <StudyFolderIcon name={activeIcon} expanded className="size-6" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold tracking-[0.08em] text-violet-300 uppercase">
                Папка
              </p>

              <h1 className="mt-1 truncate text-2xl font-semibold tracking-[-0.02em] text-[var(--app-text)]">
                {node.title}
              </h1>

              <p className="mt-1 text-sm text-[var(--app-muted)]">
                Материалы и вложенные папки этой области библиотеки
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 max-[560px]:w-full max-[560px]:flex-col">
              <FolderIconPicker value={activeIcon} onChange={onIconChange} />
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--app-border)] px-3.5 text-sm font-medium text-[var(--app-text)] transition-colors outline-none hover:border-violet-500/30 hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-violet-500/35 max-[560px]:w-full"
                onClick={onCreateFolder}
              >
                <FolderPlus aria-hidden="true" className="size-4" />
                Новая папка
              </button>

              <button
                type="button"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-violet-500 px-3.5 text-sm font-medium text-white transition-colors outline-none hover:bg-violet-400 focus-visible:ring-2 focus-visible:ring-violet-300/50 max-[560px]:w-full"
                onClick={onCreateMaterial}
              >
                <FilePlus2 aria-hidden="true" className="size-4" />
                Новый материал
              </button>
            </div>
          </header>

          <div className="grid grid-cols-3 border-t border-[var(--app-border)] max-[560px]:grid-cols-1 max-[560px]:divide-y max-[560px]:divide-[var(--app-border)]">
            <FolderStatistic value={items.length} label="Всего элементов" />

            <FolderStatistic value={folders.length} label="Вложенных папок" bordered />

            <FolderStatistic value={materials.length} label="Материалов" bordered />
          </div>
        </section>

        <FolderItemsSection
          title="Папки"
          description="Дополнительные разделы внутри текущей папки"
          items={folders}
          emptyText="Вложенных папок пока нет"
          onSelect={onSelect}
        />

        <FolderItemsSection
          title="Материалы"
          description="Конспекты и учебные материалы этой папки"
          items={materials}
          emptyText="В этой папке пока нет материалов"
          onSelect={onSelect}
        />
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
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--app-border)] px-3.5 text-sm font-medium text-[var(--app-text)] transition-colors outline-none hover:border-violet-500/30 hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-violet-500/35 max-[560px]:w-full"
        >
          <Palette aria-hidden="true" className="size-4 text-violet-300" />
          Иконка
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={8}
          align="end"
          className="z-50 w-72 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-2 shadow-xl shadow-black/25"
        >
          <DropdownMenu.Label className="px-2 py-1.5 text-xs font-medium text-[var(--app-muted)]">
            Выбери иконку папки
          </DropdownMenu.Label>

          <div className="grid grid-cols-4 gap-1">
            {STUDY_FOLDER_ICON_OPTIONS.map((option) => (
              <DropdownMenu.Item
                key={option.value}
                aria-label={option.label}
                title={option.label}
                className={cn(
                  'flex aspect-square cursor-default items-center justify-center rounded-lg outline-none',
                  'text-[var(--app-muted)] transition-colors',
                  'hover:bg-white/[0.06] hover:text-[var(--app-text)]',
                  'focus:bg-white/[0.06] focus:text-[var(--app-text)]',
                  option.value === value && 'bg-violet-500/15 text-violet-200'
                )}
                onSelect={() => {
                  onChange(option.value)
                }}
              >
                <StudyFolderIcon name={option.value} className="size-5" />
              </DropdownMenu.Item>
            ))}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
function FolderStatistic({
  value,
  label,
  bordered = false
}: {
  value: number
  label: string
  bordered?: boolean
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'px-5 py-4',
        bordered && 'border-l border-[var(--app-border)] max-[560px]:border-l-0'
      )}
    >
      <p className="text-xl font-semibold text-[var(--app-text)] tabular-nums">{value}</p>

      <p className="mt-1 text-xs text-[var(--app-muted)]">{label}</p>
    </div>
  )
}

function FolderItemsSection({
  title,
  description,
  items,
  emptyText,
  onSelect
}: {
  title: string
  description: string
  items: StudyNode[]
  emptyText: string
  onSelect: (nodeId: string) => void
}): React.JSX.Element {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)]">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--app-border)] px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[var(--app-text)]">{title}</h2>

          <p className="mt-1 truncate text-xs text-[var(--app-muted)]">{description}</p>
        </div>

        <span className="shrink-0 rounded-full bg-white/[0.04] px-2.5 py-1 text-xs text-[var(--app-muted)] tabular-nums">
          {items.length}
        </span>
      </header>

      {items.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 p-4">
          {items.map((child) => (
            <button
              key={child.id}
              type="button"
              title={child.title}
              className="group flex min-w-0 items-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-3.5 text-left transition-colors outline-none hover:border-violet-500/30 hover:bg-[var(--app-surface-raised)] focus-visible:ring-2 focus-visible:ring-violet-500/35"
              onClick={() => {
                onSelect(child.id)
              }}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.035] text-[var(--app-muted)] transition-colors group-hover:bg-violet-500/10 group-hover:text-violet-300">
                {child.type === 'folder' ? (
                  <StudyFolderIcon
                    name={child.icon}
                    expanded={child.isExpanded}
                    className="size-5"
                  />
                ) : (
                  <FileText aria-hidden="true" className="size-5" />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-[var(--app-text)]">
                  {child.title}
                </span>

                <span className="mt-1 block truncate text-xs text-[var(--app-muted)]">
                  {child.type === 'folder' ? 'Папка' : 'Материал'}
                  {' · '}
                  {new Date(child.updatedAt).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'short'
                  })}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="m-4 flex min-h-28 items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] px-4 text-center text-sm text-[var(--app-muted)]">
          {emptyText}
        </div>
      )}
    </section>
  )
}
