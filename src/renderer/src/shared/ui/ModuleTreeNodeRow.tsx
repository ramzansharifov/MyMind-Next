import * as ContextMenu from '@radix-ui/react-context-menu'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react'
import {
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
  type RefCallback
} from 'react'

import { cn } from '../lib/cn'
import {
  MODULE_TREE_NODE_INSIDE_DROP_CLASS_NAME,
  ModuleTreeNodeDropIndicator,
  type ModuleTreeNodeDropPlacement
} from './ModuleTreeDndFeedback'
import { Tooltip } from './tooltip'

export type ModuleTreeKind = 'study' | 'board'

export type ModuleTreeActionEntry =
  | {
      kind: 'item'
      key: string
      label: string
      icon: ReactNode
      danger?: boolean
      onSelect: () => void
    }
  | {
      kind: 'separator'
      key: string
    }

type ModuleTreeDataAttributes = Record<
  `data-${string}`,
  string | number | boolean | undefined
>

interface ModuleTreeNodeRowProps {
  moduleKind: ModuleTreeKind
  nodeId: string
  title: string
  nodeTypeLabel: string
  depth: number
  collapsed: boolean
  isLastSibling: boolean
  isFolder: boolean
  isExpanded: boolean
  hasVisibleChildren: boolean
  isSelected: boolean
  isContextActive?: boolean
  isDragging?: boolean
  isDragDisabled?: boolean
  dropPlacement: ModuleTreeNodeDropPlacement
  rowRef?: RefCallback<HTMLDivElement>
  dragHandleProps?: ButtonHTMLAttributes<HTMLButtonElement>
  extraRowDataAttributes?: ModuleTreeDataAttributes
  icon: ReactNode
  trailing?: ReactNode
  actions: ModuleTreeActionEntry[]
  dropZones?: ReactNode
  openAriaLabel?: string
  onOpen: () => void
  onToggle?: () => void | Promise<void>
}

const GUIDE_ORIGIN = 12
const GUIDE_STEP = 16

export function ModuleTreeNodeRow({
  moduleKind,
  nodeId,
  title,
  nodeTypeLabel,
  depth,
  collapsed,
  isLastSibling,
  isFolder,
  isExpanded,
  hasVisibleChildren,
  isSelected,
  isContextActive = false,
  isDragging = false,
  isDragDisabled = false,
  dropPlacement,
  rowRef,
  dragHandleProps,
  extraRowDataAttributes,
  icon,
  trailing,
  actions,
  dropZones,
  openAriaLabel = title,
  onOpen,
  onToggle
}: ModuleTreeNodeRowProps): React.JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false)
  const [contextMenuOpen, setContextMenuOpen] = useState(false)
  const anyMenuOpen = menuOpen || contextMenuOpen
  const moduleRowAttributes = getModuleRowAttributes(moduleKind, nodeId)

  return (
    <ContextMenu.Root open={contextMenuOpen} onOpenChange={setContextMenuOpen}>
      <ContextMenu.Trigger asChild>
        <div
          ref={rowRef}
          data-module-tree-node={moduleKind}
          data-selected={isSelected}
          data-context-active={isContextActive}
          {...moduleRowAttributes}
          {...extraRowDataAttributes}
          className={cn(
            'group relative flex h-8 items-center text-[var(--app-muted)]',
            collapsed ? 'justify-center rounded-lg' : 'w-full rounded-none',
            dropPlacement === 'inside' && MODULE_TREE_NODE_INSIDE_DROP_CLASS_NAME,
            isDragging && 'opacity-35'
          )}
          style={collapsed ? undefined : { paddingLeft: `${2 + depth * GUIDE_STEP}px` }}
        >
          {dropZones}

          <ModuleTreeGuides
            moduleKind={moduleKind}
            depth={depth}
            collapsed={collapsed}
            isLastSibling={isLastSibling}
            isFolder={isFolder}
            hasVisibleChildren={hasVisibleChildren}
          />

          <ModuleTreeNodeDropIndicator placement={dropPlacement} />

          {!collapsed &&
            (isFolder ? (
              <Tooltip content={isExpanded ? 'Свернуть папку' : 'Развернуть папку'} side="right">
                <button
                  type="button"
                  aria-label={isExpanded ? 'Свернуть папку' : 'Развернуть папку'}
                  className="z-20 flex size-5 shrink-0 items-center justify-center rounded-sm p-0 outline-none hover:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-violet-500/35"
                  onClick={() => void onToggle?.()}
                >
                  {isExpanded ? (
                    <ChevronDown aria-hidden="true" className="size-3.5" />
                  ) : (
                    <ChevronRight aria-hidden="true" className="size-3.5" />
                  )}
                </button>
              </Tooltip>
            ) : (
              <span className="size-5 shrink-0" />
            ))}

          <Tooltip content={`${title} · ${nodeTypeLabel}`} side="right">
            <button
              {...dragHandleProps}
              type="button"
              aria-label={openAriaLabel}
              className={cn(
                'relative z-10 flex min-w-0 touch-none items-center text-left text-sm outline-none select-none',
                'focus-visible:ring-2 focus-visible:ring-violet-500/35 focus-visible:ring-inset',
                collapsed
                  ? 'size-8 shrink-0 justify-center rounded-lg bg-[var(--app-sidebar)] p-0'
                  : 'flex-1 gap-1.5 py-1.5 pr-1',
                isDragDisabled ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
              )}
              onClick={onOpen}
            >
              {icon}
              {!collapsed && <span className="truncate">{title}</span>}
              {!collapsed && trailing}
            </button>
          </Tooltip>

          {!collapsed && actions.length > 0 && (
            <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
              <Tooltip content={`Действия: ${title}`} side="right">
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    aria-label={`Действия: ${title}`}
                    className={cn(
                      'z-20 flex size-6 shrink-0 items-center justify-center rounded-sm p-0',
                      'text-[var(--app-muted)] hover:bg-white/[0.07] hover:text-[var(--app-text)]',
                      anyMenuOpen
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
                    )}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <MoreHorizontal aria-hidden="true" className="size-4" />
                  </button>
                </DropdownMenu.Trigger>
              </Tooltip>

              <ModuleTreeDropdownMenuContent moduleKind={moduleKind} entries={actions} />
            </DropdownMenu.Root>
          )}
        </div>
      </ContextMenu.Trigger>

      {!collapsed && actions.length > 0 && (
        <ModuleTreeContextMenuContent moduleKind={moduleKind} entries={actions} />
      )}
    </ContextMenu.Root>
  )
}

function ModuleTreeGuides({
  moduleKind,
  depth,
  collapsed,
  isLastSibling,
  isFolder,
  hasVisibleChildren
}: {
  moduleKind: ModuleTreeKind
  depth: number
  collapsed: boolean
  isLastSibling: boolean
  isFolder: boolean
  hasVisibleChildren: boolean
}): React.JSX.Element {
  const guideClassName = moduleKind === 'study' ? 'study-tree-guide' : 'board-tree-guide'

  return (
    <>
      {!collapsed &&
        Array.from({ length: depth }, (_, guideDepth) => (
          <span
            key={guideDepth}
            aria-hidden="true"
            data-module-tree-guide="ancestor"
            {...getModuleGuideAttributes(moduleKind, 'ancestor')}
            data-guide-depth={guideDepth}
            className={`${guideClassName} inset-y-0`}
            style={{ left: `${GUIDE_ORIGIN + guideDepth * GUIDE_STEP}px` }}
          />
        ))}

      {!collapsed && isFolder && hasVisibleChildren && (
        <span
          aria-hidden="true"
          data-module-tree-guide="folder"
          {...getModuleGuideAttributes(moduleKind, 'folder')}
          data-guide-depth={depth}
          className={`${guideClassName} top-1/2 bottom-0`}
          style={{ left: `${GUIDE_ORIGIN + depth * GUIDE_STEP}px` }}
        />
      )}

      {collapsed && depth > 0 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-1/2 h-1/2 w-px -translate-x-1/2 bg-[var(--app-border-strong)]"
        />
      )}

      {collapsed && (hasVisibleChildren || !isLastSibling) && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-1/2 h-1/2 w-px -translate-x-1/2 bg-[var(--app-border-strong)]"
        />
      )}
    </>
  )
}

export function ModuleTreeNodeDropZones({
  isFolder,
  beforeRef,
  insideRef,
  afterRef
}: {
  isFolder: boolean
  beforeRef: RefCallback<HTMLSpanElement>
  insideRef: RefCallback<HTMLSpanElement>
  afterRef: RefCallback<HTMLSpanElement>
}): React.JSX.Element {
  return (
    <>
      <span
        ref={beforeRef}
        aria-hidden="true"
        className={cn('pointer-events-none absolute inset-x-0 top-0', isFolder ? 'h-1/4' : 'h-1/2')}
      />

      {isFolder && (
        <span
          ref={insideRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/4 h-1/2"
        />
      )}

      <span
        ref={afterRef}
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0',
          isFolder ? 'h-1/4' : 'h-1/2'
        )}
      />
    </>
  )
}

function ModuleTreeDropdownMenuContent({
  moduleKind,
  entries
}: {
  moduleKind: ModuleTreeKind
  entries: ModuleTreeActionEntry[]
}): React.JSX.Element {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        sideOffset={6}
        align="start"
        className="z-50 min-w-48 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-1.5 text-sm text-[var(--app-text)] shadow-xl shadow-black/25"
      >
        {entries.map((entry) =>
          entry.kind === 'separator' ? (
            <DropdownMenu.Separator key={entry.key} className="my-1 h-px bg-[var(--app-border)]" />
          ) : (
            <DropdownMenu.Item
              key={entry.key}
              data-module-tree-action={entry.key}
              {...getModuleActionAttributes(moduleKind, entry.key)}
              className={getActionClassName(entry.danger)}
              onSelect={entry.onSelect}
            >
              {entry.icon}
              {entry.label}
            </DropdownMenu.Item>
          )
        )}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  )
}

function ModuleTreeContextMenuContent({
  moduleKind,
  entries
}: {
  moduleKind: ModuleTreeKind
  entries: ModuleTreeActionEntry[]
}): React.JSX.Element {
  return (
    <ContextMenu.Portal>
      <ContextMenu.Content
        collisionPadding={8}
        className="z-50 min-w-48 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-1.5 text-sm text-[var(--app-text)] shadow-xl shadow-black/25"
      >
        {entries.map((entry) =>
          entry.kind === 'separator' ? (
            <ContextMenu.Separator key={entry.key} className="my-1 h-px bg-[var(--app-border)]" />
          ) : (
            <ContextMenu.Item
              key={entry.key}
              data-module-tree-action={entry.key}
              {...getModuleActionAttributes(moduleKind, entry.key)}
              className={getActionClassName(entry.danger)}
              onSelect={entry.onSelect}
            >
              {entry.icon}
              {entry.label}
            </ContextMenu.Item>
          )
        )}
      </ContextMenu.Content>
    </ContextMenu.Portal>
  )
}

function getActionClassName(danger = false): string {
  return cn(
    'flex cursor-default items-center gap-2 rounded-lg px-2.5 py-2 outline-none',
    danger
      ? 'text-red-300 hover:bg-red-500/10 focus:bg-red-500/10'
      : 'hover:bg-white/[0.06] focus:bg-white/[0.06]'
  )
}

function getModuleRowAttributes(
  moduleKind: ModuleTreeKind,
  nodeId: string
): ModuleTreeDataAttributes {
  return moduleKind === 'study'
    ? { 'data-study-tree-node-id': nodeId }
    : { 'data-board-tree-node': nodeId }
}

function getModuleGuideAttributes(
  moduleKind: ModuleTreeKind,
  value: 'ancestor' | 'folder'
): ModuleTreeDataAttributes {
  return moduleKind === 'study'
    ? { 'data-study-tree-guide': value }
    : { 'data-board-tree-guide': value }
}

function getModuleActionAttributes(
  moduleKind: ModuleTreeKind,
  actionKey: string
): ModuleTreeDataAttributes {
  return moduleKind === 'study'
    ? { 'data-study-tree-action': actionKey }
    : { 'data-board-tree-action': actionKey }
}
