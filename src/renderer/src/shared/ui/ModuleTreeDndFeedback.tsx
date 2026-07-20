import type { ReactNode } from 'react'

import { cn } from '../lib/cn'

export type ModuleTreeNodeDropPlacement = 'before' | 'inside' | 'after' | 'root' | null

export const MODULE_TREE_NODE_INSIDE_DROP_CLASS_NAME = 'bg-violet-500/15 ring-1 ring-violet-500/45'

export function isModuleTreeRootDropHighlighted(active: boolean, isOver: boolean): boolean {
  return active && isOver
}

export function ModuleTreeNodeDropIndicator({
  placement
}: {
  placement: ModuleTreeNodeDropPlacement
}): React.JSX.Element | null {
  if (placement === 'before') {
    return (
      <span
        aria-hidden="true"
        data-module-tree-drop-indicator="before"
        className="pointer-events-none absolute top-0 right-1 left-1 h-0.5 -translate-y-1/2 rounded-full bg-violet-400"
      />
    )
  }

  if (placement === 'after') {
    return (
      <span
        aria-hidden="true"
        data-module-tree-drop-indicator="after"
        className="pointer-events-none absolute right-1 bottom-0 left-1 h-0.5 translate-y-1/2 rounded-full bg-violet-400"
      />
    )
  }

  return null
}

interface ModuleTreeRootDropZoneProps {
  dropRef: (node: HTMLButtonElement | null) => void
  active: boolean
  highlighted: boolean
  isContextActive: boolean
  collapsed: boolean
  ariaLabel: string
  idleLabel: string
  activeLabel: string
  onSelect: () => void
}

export function ModuleTreeRootDropZone({
  dropRef,
  active,
  highlighted,
  isContextActive,
  collapsed,
  ariaLabel,
  idleLabel,
  activeLabel,
  onSelect
}: ModuleTreeRootDropZoneProps): React.JSX.Element {
  return (
    <button
      ref={dropRef}
      type="button"
      aria-label={ariaLabel}
      aria-pressed={isContextActive}
      data-module-tree-root-drop-zone="true"
      data-active={active}
      data-highlighted={highlighted}
      className={cn(
        'group/root mt-2 flex min-h-20 flex-1 items-start justify-center rounded-lg border-2 pt-3',
        collapsed && 'px-0',
        'text-xs transition-colors outline-none',
        'focus-visible:ring-2 focus-visible:ring-violet-500/35 focus-visible:ring-inset',
        highlighted
          ? 'border-dashed border-[var(--app-accent-500)] text-[var(--app-accent-500)]'
          : active
            ? 'border-dashed border-[var(--app-border)] text-[var(--app-muted)]'
            : 'border-transparent text-transparent hover:bg-white/[0.018] hover:text-[var(--app-muted)] focus-visible:bg-white/[0.018] focus-visible:text-[var(--app-muted)]'
      )}
      onClick={onSelect}
    >
      <span
        className={cn(
          'rounded-md px-2 py-1 transition-opacity',
          collapsed && 'sr-only',
          active
            ? 'opacity-100'
            : 'opacity-0 group-hover/root:opacity-100 group-focus-visible/root:opacity-100'
        )}
      >
        {active ? activeLabel : idleLabel}
      </span>
    </button>
  )
}

export function ModuleTreeDragOverlay({
  icon,
  title
}: {
  icon: ReactNode
  title: string
}): React.JSX.Element {
  return (
    <div
      data-module-tree-drag-overlay="true"
      className="flex h-9 max-w-60 items-center gap-2 rounded-lg border border-violet-500/40 bg-[var(--app-surface-raised)] px-3 text-sm text-[var(--app-text)] shadow-lg shadow-black/25"
    >
      {icon}
      <span className="truncate">{title}</span>
    </div>
  )
}
