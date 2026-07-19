import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  AlertTriangle,
  BookOpen,
  FilePlus2,
  FileText,
  Folder,
  FolderPlus,
  Palette,
  Pencil
} from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { StudyFolderIconName, StudyNode } from '../../../../shared/contracts/study'
import { cn } from '../../shared/lib/cn'
import { ModuleSidebar } from '../../shared/ui/ModuleSidebar'
import { getModuleSidebarLayoutClassName } from '../../shared/ui/module-sidebar-layout'
import {
  WorkspaceNodeCard,
  WorkspacePanel,
  WorkspaceSectionEmpty,
  WorkspaceStatCard
} from '../../shared/ui/WorkspacePrimitives'
import { Tooltip } from '../../shared/ui/tooltip'
import { StudyActionButton } from './components/StudyActionButton'
import { DeleteConfirmationDialog } from './components/DeleteConfirmationDialog'
import { StudyHome } from './components/StudyHome'
import { STUDY_FOLDER_ICON_SIDEBAR_CLASS_NAME, StudyFolderIcon } from './components/StudyFolderIcon'
import { RenameStudyNodeDialog } from './components/RenameStudyNodeDialog'
import { STUDY_FOLDER_ICON_OPTIONS } from './components/study-folder-icon-options'
import { StudyTree } from './components/StudyTree'
import { useStudy } from './hooks/use-study'
import { getActiveStudyDraftHandle } from './lib/study-draft-lifecycle'
import {
  appendStudyInternalLinkHistory,
  clearStudyInternalLinkHistory,
  normalizeStudyInternalLinkHistory,
  STUDY_INTERNAL_LINK_NAVIGATE_EVENT,
  type StudyInternalLinkHistoryEntry,
  type StudyInternalLinkNavigateDetail,
  type StudyInternalLinkNavigationRequest
} from './lib/study-internal-link'
import { StudyMaterialTransitionCoordinator } from './lib/study-material-transition'
import { getStudyAncestorFolders } from './lib/study-tree'

const StudyMaterialEditor = lazy(() =>
  import('./components/StudyMaterialEditor').then((module) => ({
    default: module.StudyMaterialEditor
  }))
)

interface BlockedStudyTransition {
  run: () => void | Promise<void>
  targetMaterialId: string | null
  message: string
}

export function StudyPage(): React.JSX.Element {
  const study = useStudy()

  const studyNodes = study.nodes
  const selectNode = study.selectNode
  const toggleFolder = study.toggleFolder

  const [renameTarget, setRenameTarget] = useState<StudyNode | null>(null)

  const [renameValue, setRenameValue] = useState('')

  const [renameError, setRenameError] = useState<string | null>(null)

  const [isRenaming, setIsRenaming] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<StudyNode | null>(null)

  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [isDeleting, setIsDeleting] = useState(false)

  const deletePendingRef = useRef(false)

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const [isTransitionSaving, setIsTransitionSaving] = useState(false)

  const [blockedTransition, setBlockedTransition] = useState<BlockedStudyTransition | null>(null)

  const [forceLeaveArmed, setForceLeaveArmed] = useState(false)

  const transitionCoordinatorRef = useRef(
    new StudyMaterialTransitionCoordinator(getActiveStudyDraftHandle)
  )

  const [internalNavigation, setInternalNavigation] =
    useState<StudyInternalLinkNavigationRequest | null>(null)

  const [internalLinkHistory, setInternalLinkHistory] = useState<StudyInternalLinkHistoryEntry[]>(
    []
  )

  const internalNavigationSequenceRef = useRef(0)

  const selectedNode = useMemo(
    () => study.nodes.find((node) => node.id === study.selectedNodeId) ?? null,
    [study.nodes, study.selectedNodeId]
  )

  const selectedParentId =
    selectedNode?.type === 'folder' ? selectedNode.id : (selectedNode?.parentId ?? null)

  const materialIds = useMemo(
    () => new Set(study.nodes.filter((node) => node.type === 'material').map((node) => node.id)),
    [study.nodes]
  )

  const normalizedInternalLinkHistory = useMemo(
    () => normalizeStudyInternalLinkHistory(internalLinkHistory, materialIds),
    [internalLinkHistory, materialIds]
  )

  const internalLinkBackTarget = normalizedInternalLinkHistory.at(-1)

  const removedInvalidTrailingEntries =
    normalizedInternalLinkHistory.length < internalLinkHistory.length

  const canNavigateBack =
    selectedNode?.type === 'material' &&
    internalLinkBackTarget !== undefined &&
    (internalLinkBackTarget.destinationMaterialId === selectedNode.id ||
      removedInvalidTrailingEntries) &&
    materialIds.has(internalLinkBackTarget.sourceMaterialId)

  function openRename(node: StudyNode): void {
    if (deletePendingRef.current) {
      return
    }

    setRenameTarget(node)
    setRenameValue(node.title)
    setRenameError(null)
  }

  async function confirmRename(): Promise<void> {
    const title = renameValue.trim()

    if (!renameTarget || !title || isRenaming || deletePendingRef.current) {
      return
    }

    setIsRenaming(true)
    setRenameError(null)

    try {
      await study.renameNode(renameTarget.id, title)

      setRenameTarget(null)
    } catch (reason: unknown) {
      setRenameError(reason instanceof Error ? reason.message : 'Не удалось переименовать элемент')
    } finally {
      setIsRenaming(false)
    }
  }

  function openDelete(node: StudyNode): void {
    if (deletePendingRef.current) {
      return
    }

    setDeleteTarget(node)
    setDeleteError(null)
  }

  async function confirmDelete(): Promise<void> {
    const target = deleteTarget

    if (!target || deletePendingRef.current) {
      return
    }

    /*
     * The ref closes the same-render double-click window before React commits
     * the isDeleting state update.
     */
    deletePendingRef.current = true
    setIsDeleting(true)
    setDeleteError(null)

    try {
      const deleted = await study.deleteNode(target.id)

      if (!deleted) {
        setDeleteError(
          target.type === 'folder'
            ? 'Не удалось удалить папку. Вложенные материалы и черновики оставлены без изменений.'
            : 'Не удалось удалить материал. Черновик оставлен открытым и восстановлен для сохранения.'
        )

        return
      }

      setDeleteTarget((current) => (current?.id === target.id ? null : current))
    } catch (reason: unknown) {
      setDeleteError(reason instanceof Error ? reason.message : 'Не удалось удалить элемент.')
    } finally {
      deletePendingRef.current = false
      setIsDeleting(false)
    }
  }

  const openStudyNode = useCallback(
    (nodeId: string): void => {
      if (deletePendingRef.current) {
        return
      }

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

  const clearInternalLinkNavigation = useCallback((): void => {
    setInternalLinkHistory(clearStudyInternalLinkHistory())

    setInternalNavigation(null)
  }, [])

  const runAfterDraftFlush = useCallback(
    async (
      run: (() => void) | (() => Promise<void>),
      targetMaterialId: string | null = null
    ): Promise<boolean> => {
      if (deletePendingRef.current) {
        return false
      }

      setBlockedTransition(null)
      setForceLeaveArmed(false)

      const result = await transitionCoordinatorRef.current.run({
        targetMaterialId,
        transition: run,
        onSavingChange: setIsTransitionSaving
      })

      if (result.status === 'failed') {
        setBlockedTransition({
          run,
          targetMaterialId,
          message:
            result.reason instanceof Error
              ? result.reason.message
              : 'Не удалось сохранить последние изменения материала.'
        })

        return false
      }

      return result.status === 'completed'
    },
    []
  )

  const selectStudyNode = useCallback(
    (nodeId: string | null): void => {
      if (deletePendingRef.current) {
        return
      }

      void runAfterDraftFlush(
        () => {
          setInternalLinkHistory(clearStudyInternalLinkHistory())

          setInternalNavigation(null)

          if (nodeId === null) {
            selectNode(null)
          } else {
            openStudyNode(nodeId)
          }
        },
        materialIds.has(nodeId ?? '') ? nodeId : null
      )
    },
    [materialIds, openStudyNode, runAfterDraftFlush, selectNode]
  )

  useEffect(() => {
    function handleInternalNavigation(event: Event): void {
      if (deletePendingRef.current) {
        return
      }

      const detail = (event as CustomEvent<StudyInternalLinkNavigateDetail>).detail

      if (!detail?.materialId || (detail.kind !== 'material' && detail.kind !== 'heading')) {
        return
      }

      void runAfterDraftFlush(() => {
        if (selectedNode?.type === 'material') {
          setInternalLinkHistory((current) =>
            appendStudyInternalLinkHistory(current, {
              sourceMaterialId: selectedNode.id,
              destinationMaterialId: detail.materialId,
              sourcePosition: detail.sourcePosition,
              sourceBlockId: detail.sourceBlockId
            })
          )
        }

        internalNavigationSequenceRef.current += 1

        setInternalNavigation({
          kind: detail.kind,
          materialId: detail.materialId,
          headingId: detail.headingId ?? null,
          requestId: internalNavigationSequenceRef.current
        })

        openStudyNode(detail.materialId)
      }, detail.materialId)
    }

    window.addEventListener(STUDY_INTERNAL_LINK_NAVIGATE_EVENT, handleInternalNavigation)

    return () => {
      window.removeEventListener(STUDY_INTERNAL_LINK_NAVIGATE_EVENT, handleInternalNavigation)
    }
  }, [openStudyNode, runAfterDraftFlush, selectedNode])

  return (
    <section className={getModuleSidebarLayoutClassName(isSidebarCollapsed)}>
      <ModuleSidebar
        navigationLabel="Библиотека обучения"
        moduleLabel="Обучение"
        homeLabel="Главная обучения"
        icon={BookOpen}
        collapsed={isSidebarCollapsed}
        homeSelected={selectedNode === null}
        expandLabel="Показать библиотеку"
        collapseLabel="Скрыть библиотеку"
        onHomeSelect={() => {
          selectStudyNode(null)
        }}
        onCollapsedChange={setIsSidebarCollapsed}
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
              selectStudyNode(null)
            }}
            onToggleFolder={(node) => {
              if (!deletePendingRef.current) {
                void study.toggleFolder(node)
              }
            }}
            onRename={openRename}
            onDuplicate={(node) => {
              void runAfterDraftFlush(async () => {
                clearInternalLinkNavigation()

                await study.duplicateNode(node.id)
              })
            }}
            onDelete={openDelete}
            onCreateFolder={(parentId) => {
              void runAfterDraftFlush(async () => {
                clearInternalLinkNavigation()

                const parentFolder = study.nodes.find((node) => node.id === parentId)

                if (parentFolder?.type === 'folder' && !parentFolder.isExpanded) {
                  await study.toggleFolder(parentFolder)
                }

                await study.createNode({
                  type: 'folder',
                  parentId
                })
              })
            }}
            onCreateMaterial={(parentId) => {
              void runAfterDraftFlush(async () => {
                clearInternalLinkNavigation()

                const parentFolder = study.nodes.find((node) => node.id === parentId)

                if (parentFolder?.type === 'folder' && !parentFolder.isExpanded) {
                  await study.toggleFolder(parentFolder)
                }

                await study.createNode({
                  type: 'material',
                  parentId
                })
              })
            }}
            onMove={(input) => {
              if (!deletePendingRef.current) {
                void study.moveNode(input)
              }
            }}
          />
        )}

        {study.error && (
          <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/[0.06] p-3 text-xs text-red-300">
            {study.error}
          </p>
        )}
      </ModuleSidebar>

      <main className="min-h-0 min-w-0 bg-[var(--app-workspace)]">
        {selectedNode?.type === 'material' ? (
          <Suspense fallback={<StudyMaterialLoadingFallback />}>
            <StudyMaterialEditor
              key={selectedNode.id}
              node={selectedNode}
              onRename={() => {
                openRename(selectedNode)
              }}
              onBack={
                canNavigateBack
                  ? () => {
                      const backTarget = internalLinkBackTarget

                      if (!backTarget) {
                        return
                      }

                      void runAfterDraftFlush(() => {
                        internalNavigationSequenceRef.current += 1

                        setInternalNavigation({
                          kind: 'material',
                          materialId: backTarget.sourceMaterialId,
                          headingId: null,
                          revealSourcePosition: backTarget.sourcePosition,
                          revealSourceBlockId: backTarget.sourceBlockId,
                          requestId: internalNavigationSequenceRef.current
                        })

                        openStudyNode(backTarget.sourceMaterialId)

                        setInternalLinkHistory(normalizedInternalLinkHistory.slice(0, -1))
                      }, backTarget.sourceMaterialId)
                    }
                  : undefined
              }
              navigation={
                internalNavigation?.materialId === selectedNode.id ? internalNavigation : null
              }
              onNavigationHandled={(requestId) => {
                setInternalNavigation((current) =>
                  current?.requestId === requestId ? null : current
                )
              }}
            />
          </Suspense>
        ) : selectedNode?.type === 'folder' ? (
          <FolderWorkspace
            node={selectedNode}
            items={study.nodes.filter((node) => node.parentId === selectedNode.id)}
            onSelect={selectStudyNode}
            onRename={() => {
              openRename(selectedNode)
            }}
            onCreateFolder={() => {
              void runAfterDraftFlush(async () => {
                clearInternalLinkNavigation()

                await study.createNode({
                  type: 'folder',
                  parentId: selectedNode.id
                })
              })
            }}
            onCreateMaterial={() => {
              void runAfterDraftFlush(async () => {
                clearInternalLinkNavigation()

                await study.createNode({
                  type: 'material',
                  parentId: selectedNode.id
                })
              })
            }}
            onIconChange={(icon) => {
              if (!deletePendingRef.current) {
                void study.updateFolderIcon(selectedNode.id, icon)
              }
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
              void runAfterDraftFlush(async () => {
                clearInternalLinkNavigation()

                await study.createNode({
                  type: 'folder',
                  parentId: null
                })
              })
            }}
            onCreateMaterial={() => {
              void runAfterDraftFlush(async () => {
                clearInternalLinkNavigation()

                await study.createNode({
                  type: 'material',
                  parentId: null
                })
              })
            }}
          />
        )}
      </main>

      {isTransitionSaving && (
        <div
          role="status"
          className="fixed right-5 bottom-5 z-50 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] px-4 py-3 text-sm text-[var(--app-text)] shadow-2xl"
        >
          Сохраняем изменения перед переходом…
        </div>
      )}

      {blockedTransition && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="study-transition-error-title"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-300">
                <AlertTriangle aria-hidden="true" className="size-5" />
              </span>

              <div>
                <h2
                  id="study-transition-error-title"
                  className="font-semibold text-[var(--app-text)]"
                >
                  Изменения не сохранены
                </h2>

                <p className="mt-1 text-sm leading-5 text-[var(--app-muted)]">
                  {blockedTransition.message} Текущий материал и черновик остаются открытыми.
                </p>

                {forceLeaveArmed && (
                  <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/[0.06] p-3 text-xs leading-5 text-red-200">
                    Несохранённые изменения будут безвозвратно потеряны. Нажмите ещё раз, чтобы
                    подтвердить переход.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-3 py-2 text-sm text-[var(--app-muted)] hover:text-[var(--app-text)]"
                onClick={() => {
                  setBlockedTransition(null)

                  setForceLeaveArmed(false)
                }}
              >
                Остаться
              </button>

              <button
                type="button"
                className="rounded-lg border border-[var(--app-border)] px-3 py-2 text-sm text-[var(--app-text)] hover:bg-white/[0.05]"
                onClick={() => {
                  void runAfterDraftFlush(blockedTransition.run, blockedTransition.targetMaterialId)
                }}
              >
                Повторить сохранение
              </button>

              <button
                type="button"
                className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200 hover:bg-red-500/25"
                onClick={() => {
                  if (!forceLeaveArmed) {
                    setForceLeaveArmed(true)

                    return
                  }

                  const transition = blockedTransition.run

                  setBlockedTransition(null)

                  setForceLeaveArmed(false)

                  void transition()
                }}
              >
                {forceLeaveArmed ? 'Подтвердить потерю изменений' : 'Покинуть без сохранения'}
              </button>
            </div>
          </div>
        </div>
      )}

      <RenameStudyNodeDialog
        target={renameTarget}
        value={renameValue}
        onOpenChange={(open) => {
          if (!open && !deletePendingRef.current) {
            setRenameTarget(null)
          }
        }}
        onValueChange={setRenameValue}
        onConfirm={confirmRename}
        isSubmitting={isRenaming}
        error={renameError}
      />

      <DeleteConfirmationDialog
        open={deleteTarget !== null}
        title={deleteTarget?.type === 'folder' ? 'Удалить папку?' : 'Удалить материал?'}
        subject={deleteTarget?.title}
        description={
          deleteTarget?.type === 'folder'
            ? 'Папка будет удалена вместе со всеми вложенными папками и материалами.'
            : 'Материал и всё его содержимое будут удалены без возможности восстановления.'
        }
        isSubmitting={isDeleting}
        error={deleteError}
        onOpenChange={(open) => {
          if (!open && !deletePendingRef.current) {
            setDeleteTarget(null)
            setDeleteError(null)
          }
        }}
        onConfirm={confirmDelete}
      />
    </section>
  )
}

function StudyMaterialLoadingFallback(): React.JSX.Element {
  return (
    <div
      role="status"
      aria-label="Загрузка материала"
      className="h-full overflow-hidden bg-[var(--app-workspace)] px-7 py-6 max-[720px]:px-4"
    >
      <div className="mx-auto grid w-full max-w-5xl gap-4">
        <div className="h-8 w-1/3 animate-pulse rounded-lg bg-white/[0.07]" />
        <div className="h-28 animate-pulse rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)]" />
        <div className="h-52 animate-pulse rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)]" />
      </div>
    </div>
  )
}

const folderWorkspaceDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short'
})

function FolderWorkspace({
  node,
  items,
  onSelect,
  onCreateFolder,
  onRename,
  onCreateMaterial,
  onIconChange
}: {
  node: StudyNode
  items: StudyNode[]
  onSelect: (nodeId: string) => void
  onCreateFolder: () => void
  onRename: () => void
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
                </div>
              </div>

              <div className="grid w-[44rem] max-w-full shrink-0 grid-cols-4 gap-2 max-[920px]:w-full max-[760px]:grid-cols-2 max-[620px]:grid-cols-1">
                <StudyActionButton type="button" onClick={onRename}>
                  <Pencil aria-hidden="true" />
                  Переименовать
                </StudyActionButton>

                <FolderIconPicker value={activeIcon} onChange={onIconChange} />

                <StudyActionButton type="button" onClick={onCreateFolder}>
                  <FolderPlus aria-hidden="true" />
                  Новая папка
                </StudyActionButton>

                <StudyActionButton type="button" variant="primary" onClick={onCreateMaterial}>
                  <FilePlus2 aria-hidden="true" />
                  Новый материал
                </StudyActionButton>
              </div>
            </header>

            <div className="mt-6 grid grid-cols-3 gap-3 max-[760px]:grid-cols-1">
              <WorkspaceStatCard
                icon={<BookOpen aria-hidden="true" className="size-5" />}
                value={items.length}
                label="Всего"
                description="Элементов в этой папке"
              />

              <WorkspaceStatCard
                icon={<FileText aria-hidden="true" className="size-5" />}
                value={materials.length}
                label="Материалов"
                description="Конспекты и записи"
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
          <FolderItemsSection
            kind="material"
            title="Материалы"
            items={materials}
            emptyText="В этой папке пока нет материалов"
            onSelect={onSelect}
          />

          <FolderItemsSection
            kind="folder"
            title="Вложенные папки"
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
        <StudyActionButton type="button">
          <Palette aria-hidden="true" className="text-violet-300" />
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

          <div className="grid max-h-[28rem] grid-cols-5 gap-1 overflow-y-auto pr-1">
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
                  <StudyFolderIcon
                    name={option.value}
                    className={STUDY_FOLDER_ICON_SIDEBAR_CLASS_NAME}
                  />
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

function FolderItemsSection({
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
        <div
          className={cn(compact ? 'grid gap-2' : 'grid grid-cols-2 gap-3 max-[720px]:grid-cols-1')}
        >
          {items.map((child) => (
            <WorkspaceNodeCard
              key={child.id}
              ariaLabel={`Открыть ${child.type === 'folder' ? 'папку' : 'материал'} «${child.title}»`}
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
