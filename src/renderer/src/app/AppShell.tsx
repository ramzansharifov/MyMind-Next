import { BrainCircuit, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { cn } from '../shared/lib/cn'
import {
  primaryNavigationItems,
  utilityNavigationItems,
  type AppNavigationItem,
  type AppViewId
} from './navigation'

interface AppShellProps {
  activeView: AppViewId
  onViewChange: (view: AppViewId) => void
  children: ReactNode
}

interface NavigationButtonProps {
  item: AppNavigationItem
  activeView: AppViewId
  isCollapsed: boolean
  onSelect: (view: AppViewId) => void
}

function NavigationButton({
  item,
  activeView,
  isCollapsed,
  onSelect
}: NavigationButtonProps): React.JSX.Element {
  const Icon = item.icon
  const isActive = item.id === activeView

  return (
    <button
      type="button"
      aria-current={isActive ? 'page' : undefined}
      aria-label={isCollapsed ? item.label : undefined}
      title={isCollapsed ? item.label : undefined}
      className={cn(
        'group relative flex h-11 w-full items-center rounded-xl text-sm font-medium transition-colors outline-none',
        'focus-visible:ring-2 focus-visible:ring-violet-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-sidebar)]',
        isCollapsed ? 'justify-center px-0' : 'gap-3 px-3',
        isActive
          ? 'bg-[var(--app-sidebar-active)] text-violet-300'
          : 'text-[var(--app-muted)] hover:bg-white/[0.045] hover:text-[var(--app-text)]'
      )}
      onClick={() => onSelect(item.id)}
    >
      {isActive && (
        <span
          aria-hidden="true"
          className="absolute left-0 h-5 w-0.5 rounded-r-full bg-violet-400"
        />
      )}

      <Icon
        aria-hidden="true"
        className={cn(
          'size-5 shrink-0 transition-colors',
          isActive
            ? 'text-violet-300'
            : 'text-[var(--app-muted)] group-hover:text-[var(--app-text)]'
        )}
      />

      {!isCollapsed && <span className="min-w-0 truncate">{item.label}</span>}
    </button>
  )
}

export function AppShell({ activeView, onViewChange, children }: AppShellProps): React.JSX.Element {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--app-workspace)] text-[var(--app-text)]">
      <aside
        aria-label="Боковая панель"
        className={cn(
          'flex h-full shrink-0 flex-col border-r border-[var(--app-border)] bg-[var(--app-sidebar)]',
          'transition-[width] duration-200 ease-out motion-reduce:transition-none',
          isCollapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        <header className="flex h-16 shrink-0 items-center border-b border-[var(--app-border)] px-2">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
              <BrainCircuit aria-hidden="true" className="size-[18px]" />
            </div>

            {!isCollapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight text-[var(--app-text)]">
                  MyMind
                </p>

                <p className="truncate text-[11px] text-[var(--app-muted)]">Личная система</p>
              </div>
            )}
          </div>

          <button
            type="button"
            aria-label={isCollapsed ? 'Развернуть боковую панель' : 'Свернуть боковую панель'}
            title={isCollapsed ? 'Развернуть боковую панель' : 'Свернуть боковую панель'}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[var(--app-muted)] transition-colors outline-none hover:bg-white/[0.055] hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-violet-500/70"
            onClick={() => setIsCollapsed((current) => !current)}
          >
            {isCollapsed ? (
              <PanelLeftOpen aria-hidden="true" className="size-[17px]" />
            ) : (
              <PanelLeftClose aria-hidden="true" className="size-[17px]" />
            )}
          </button>
        </header>

        <nav
          aria-label="Основная навигация"
          className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3"
        >
          {primaryNavigationItems.map((item) => (
            <NavigationButton
              key={item.id}
              item={item}
              activeView={activeView}
              isCollapsed={isCollapsed}
              onSelect={onViewChange}
            />
          ))}
        </nav>

        <footer className="shrink-0 border-t border-[var(--app-border)] p-3">
          {utilityNavigationItems.map((item) => (
            <NavigationButton
              key={item.id}
              item={item}
              activeView={activeView}
              isCollapsed={isCollapsed}
              onSelect={onViewChange}
            />
          ))}
        </footer>
      </aside>

      <main id="workspace" className="min-w-0 flex-1 overflow-hidden bg-[var(--app-workspace)]">
        {children}
      </main>
    </div>
  )
}
