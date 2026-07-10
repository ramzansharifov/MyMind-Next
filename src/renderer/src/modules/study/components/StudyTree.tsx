import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Trash2
} from 'lucide-react'
import { useMemo, useState } from 'react'

import type { StudyNode } from '../../../../../shared/contracts/study'
import { cn } from '../../../shared/lib/cn'
import { getVisibleStudyNodes } from '../lib/study-tree'

interface StudyTreeProps {
  nodes: StudyNode[]
  search: string
  selectedNodeId: string | null
  onSelect: (nodeId: string) => void
  onToggleFolder: (node: StudyNode) => void
  onRename: (node: StudyNode) => void
  onDelete: (node: StudyNode) => void
}

export function StudyTree({
  nodes,
  search,
  selectedNodeId,
  onSelect,
  onToggleFolder,
  onRename,
  onDelete
}: StudyTreeProps): React.JSX.Element {
  const visibleNodes = useMemo(() => getVisibleStudyNodes(nodes, search), [nodes, search])

  if (visibleNodes.length === 0) {
    return (
      <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] px-4 text-center text-sm text-[var(--app-muted)]">
        {search ? 'Ничего не найдено' : 'Создай первую папку или материал'}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {visibleNodes.map(({ node, depth }) => (
        <StudyTreeItem
          key={node.id}
          node={node}
          depth={depth}
          isSelected={selectedNodeId === node.id}
          onSelect={onSelect}
          onToggleFolder={onToggleFolder}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

interface StudyTreeItemProps {
  node: StudyNode
  depth: number
  isSelected: boolean
  onSelect: (nodeId: string) => void
  onToggleFolder: (node: StudyNode) => void
  onRename: (node: StudyNode) => void
  onDelete: (node: StudyNode) => void
}

function StudyTreeItem({
  node,
  depth,
  isSelected,
  onSelect,
  onToggleFolder,
  onRename,
  onDelete
}: StudyTreeItemProps): React.JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false)
  const isFolder = node.type === 'folder'

  const NodeIcon = isFolder ? (node.isExpanded ? FolderOpen : Folder) : FileText

  return (
    <div
      className={cn(
        'group flex h-9 items-center rounded-lg',
        isSelected
          ? 'bg-violet-500/12 text-violet-200'
          : 'text-[var(--app-muted)] hover:bg-white/[0.04] hover:text-[var(--app-text)]'
      )}
      style={{
        paddingLeft: `${8 + depth * 16}px`
      }}
    >
      {isFolder ? (
        <button
          type="button"
          aria-label={node.isExpanded ? 'Свернуть папку' : 'Развернуть папку'}
          className="flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-white/[0.05]"
          onClick={() => onToggleFolder(node)}
        >
          {node.isExpanded ? (
            <ChevronDown aria-hidden="true" className="size-3.5" />
          ) : (
            <ChevronRight aria-hidden="true" className="size-3.5" />
          )}
        </button>
      ) : (
        <span className="size-7 shrink-0" />
      )}

      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left text-sm"
        onClick={() => onSelect(node.id)}
      >
        <NodeIcon aria-hidden="true" className="size-4 shrink-0" />

        <span className="truncate">{node.title}</span>
      </button>

      <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label={`Действия: ${node.title}`}
            className={cn(
              'mr-1 flex size-7 shrink-0 items-center justify-center rounded-md',
              'text-[var(--app-muted)] hover:bg-white/[0.07] hover:text-[var(--app-text)]',
              menuOpen
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
            )}
          >
            <MoreHorizontal aria-hidden="true" className="size-4" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            sideOffset={6}
            align="start"
            className="z-50 min-w-44 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-1.5 text-sm text-[var(--app-text)]"
          >
            <DropdownMenu.Item
              className="flex cursor-default items-center gap-2 rounded-lg px-2.5 py-2 outline-none hover:bg-white/[0.06] focus:bg-white/[0.06]"
              onSelect={() => onRename(node)}
            >
              <Pencil aria-hidden="true" className="size-4" />
              Переименовать
            </DropdownMenu.Item>

            <DropdownMenu.Item
              className="flex cursor-default items-center gap-2 rounded-lg px-2.5 py-2 text-red-300 outline-none hover:bg-red-500/10 focus:bg-red-500/10"
              onSelect={() => onDelete(node)}
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Удалить
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  )
}
