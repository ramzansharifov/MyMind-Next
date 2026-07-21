import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { Tooltip } from './tooltip'

interface ModuleSidebarProps {
  navigationLabel: string
  moduleLabel: string
  homeLabel: string
  icon: LucideIcon
  collapsed: boolean
  homeSelected: boolean
  expandLabel: string
  collapseLabel: string
  children: ReactNode
  contentClassName?: string
  onHomeSelect: () => void
  onCollapsedChange: (collapsed: boolean) => void
}

export function ModuleSidebar({
  navigationLabel,
  moduleLabel,
  homeLabel,
  icon: Icon,
  collapsed,
  homeSelected,
  expandLabel,
  collapseLabel,
  children,
  contentClassName,
  onHomeSelect,
  onCollapsedChange
}: ModuleSidebarProps): React.JSX.Element {
  const toggleLabel = collapsed ? expandLabel : collapseLabel

  return (
    <aside
      aria-label={navigationLabel}
      data-module-sidebar
      data-collapsed={collapsed}
      className="group/module-sidebar relative flex min-h-0 flex-col border-r border-[var(--app-border)] bg-[var(--app-sidebar)] shadow-[var(--app-shadow-sidebar)]"
    >
      <header
        className={cn(
          'flex h-[var(--app-header-height)] shrink-0 items-center border-b border-[var(--app-border)]',
          collapsed ? 'px-2' : 'px-3'
        )}
      >
        <Tooltip content={homeLabel} side="right" disabled={!collapsed}>
          <button
            type="button"
            aria-label={homeLabel}
            aria-current={homeSelected ? 'page' : undefined}
            className={cn(
              'flex h-11 w-full items-center rounded-xl text-left transition-colors outline-none',
              'focus-visible:ring-2 focus-visible:ring-violet-500/35',
              collapsed ? 'justify-center px-0' : 'gap-3 px-3 pr-8',
              homeSelected
                ? 'bg-[var(--app-sidebar-active)] text-violet-300 ring-1 ring-violet-500/15 ring-inset'
                : 'text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
            )}
            onClick={onHomeSelect}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-violet-500/15 bg-violet-500/10 text-violet-300">
              <Icon aria-hidden="true" className="size-4" />
            </span>

            {!collapsed && (
              <span className="min-w-0 truncate text-sm font-semibold">{moduleLabel}</span>
            )}
          </button>
        </Tooltip>
      </header>

      <Tooltip content={toggleLabel} side="right">
        <button
          type="button"
          aria-label={toggleLabel}
          className={cn(
            'absolute top-8 right-0 z-30',
            'flex size-7 translate-x-1/2 -translate-y-1/2',
            'items-center justify-center rounded-full border',
            'border-violet-500/25 bg-[var(--app-surface)]',
            'text-violet-300 opacity-0 outline-none',
            'shadow-[var(--app-shadow-card)]',
            'transition-[opacity,background-color,color,transform]',
            'group-hover/module-sidebar:opacity-100',
            'group-focus-within/module-sidebar:opacity-100',
            'hover:scale-105 hover:bg-violet-500/10',
            'focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-violet-500/60'
          )}
          onClick={() => onCollapsedChange(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight aria-hidden="true" className="size-4" />
          ) : (
            <ChevronLeft aria-hidden="true" className="size-4" />
          )}
        </button>
      </Tooltip>

      <div
        data-module-sidebar-content
        className={cn(
          'min-h-0 flex-1 overflow-y-auto',
          collapsed ? 'px-2 py-3' : 'p-3',
          contentClassName
        )}
      >
        {children}
      </div>
    </aside>
  )
}
