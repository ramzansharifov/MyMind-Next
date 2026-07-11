import * as AlertDialog from '@radix-ui/react-alert-dialog'
import {
  BookOpen,
  FolderOpen
} from 'lucide-react'
import { useMemo, useState } from 'react'

import type { StudyNode } from '../../../../shared/contracts/study'
import { StudyMaterialEditor } from './components/StudyMaterialEditor'
import { DeleteConfirmationDialog } from './components/DeleteConfirmationDialog'
import { StudyHome } from './components/StudyHome'
import { StudyTree } from './components/StudyTree'
import { useStudy } from './hooks/use-study'

export function StudyPage(): React.JSX.Element {
  const study = useStudy()

  const [renameTarget, setRenameTarget] = useState<StudyNode | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<StudyNode | null>(null)

  const selectedNode = useMemo(
    () => study.nodes.find((node) => node.id === study.selectedNodeId) ?? null,
    [study.nodes, study.selectedNodeId]
  )

  const selectedParentId =
    selectedNode?.type === 'folder'
      ? selectedNode.id
      : (selectedNode?.parentId ??
        null)

  function openRename(
    node: StudyNode
  ): void {
    setRenameTarget(node)
    setRenameValue(node.title)
  }

  return (
    <section className="grid h-full min-h-0 grid-cols-[280px_minmax(0,1fr)] overflow-hidden">
      <aside className="flex min-h-0 flex-col border-r border-[var(--app-border)] bg-[var(--app-sidebar)]">
        <header className="shrink-0 border-b border-[var(--app-border)] p-3">
          <button
            type="button"
            aria-current={
              selectedNode === null
                ? 'page'
                : undefined
            }
            className={
              selectedNode === null
                ? 'flex h-11 w-full items-center gap-3 rounded-xl bg-violet-500/10 px-3 text-left text-violet-200 outline-none ring-1 ring-inset ring-violet-500/15'
                : 'flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[var(--app-muted)] outline-none transition-colors hover:bg-white/[0.04] hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-violet-500/35'
            }
            onClick={() => {
              study.selectNode(null)
            }}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
              <BookOpen
                aria-hidden="true"
                className="size-4"
              />
            </span>

            <span className="text-sm font-semibold">
              Обучение
            </span>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {study.isLoading ? (
            <p className="px-2 py-4 text-sm text-[var(--app-muted)]">Загрузка…</p>
          ) : (
            <StudyTree
              nodes={study.nodes}
              search=""
              selectedNodeId={study.selectedNodeId}
              activeParentId={selectedParentId}
              onSelect={study.selectNode}
              onSelectRoot={() => {
                study.selectNode(null)
              }}
              onToggleFolder={(node) => {
                void study.toggleFolder(node)
              }}
              onRename={openRename}
              onDelete={setDeleteTarget}
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
            onSelect={study.selectNode}
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
          />
        ) : (
          <StudyHome
            nodes={study.nodes}
            isLoading={study.isLoading}
            onOpen={(nodeId) => {
              study.selectNode(nodeId)
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
  onCreateMaterial
}: {
  node: StudyNode
  items: StudyNode[]
  onSelect: (nodeId: string) => void
  onCreateFolder: () => void
  onCreateMaterial: () => void
}): React.JSX.Element {
  return (
    <section className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-start gap-4">
          <div className="flex size-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
            <FolderOpen aria-hidden="true" className="size-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-[0.08em] text-violet-300 uppercase">
              Папка
            </p>

            <h1 className="mt-1 truncate text-2xl font-semibold text-[var(--app-text)]">
              {node.title}
            </h1>

            <p className="mt-1 text-sm text-[var(--app-muted)]">{items.length} элементов</p>
          </div>

          <button
            type="button"
            className="rounded-lg border border-[var(--app-border)] px-3 py-2 text-sm text-[var(--app-text)] hover:bg-white/[0.05]"
            onClick={onCreateFolder}
          >
            Новая папка
          </button>

          <button
            type="button"
            className="rounded-lg bg-violet-500 px-3 py-2 text-sm font-medium text-white hover:bg-violet-400"
            onClick={onCreateMaterial}
          >
            Новый материал
          </button>
        </div>

        <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3">
          {items.map((child) => (
            <button
              key={child.id}
              type="button"
              className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 text-left transition-colors hover:border-violet-500/35 hover:bg-[var(--app-surface-raised)]"
              onClick={() => onSelect(child.id)}
            >
              <p className="text-sm font-medium text-[var(--app-text)]">{child.title}</p>

              <p className="mt-1 text-xs text-[var(--app-muted)]">
                {child.type === 'folder' ? 'Папка' : 'Материал'}
              </p>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}


