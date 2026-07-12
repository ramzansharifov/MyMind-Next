import { cva } from 'class-variance-authority'
import { BrainCircuit, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import {
  useEffect,
  useState,
  type ReactNode
} from 'react'

import { cn } from '../shared/lib/cn'
import { Tooltip, TooltipProvider } from '../shared/ui/tooltip'
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

const navigationButtonVariants = cva(
  [
    'group relative flex h-11 w-full items-center rounded-xl',
    'text-sm font-medium outline-none transition-colors',
    'focus-visible:ring-2 focus-visible:ring-violet-500/70',
    'focus-visible:ring-offset-2',
    'focus-visible:ring-offset-[var(--app-sidebar)]'
  ],
  {
    variants: {
      collapsed: {
        true: 'justify-center px-0',
        false: 'gap-3 px-3'
      },
      active: {
        true: 'bg-[var(--app-sidebar-active)] text-violet-300',
        false: ['text-[var(--app-muted)]', 'hover:bg-white/[0.045]', 'hover:text-[var(--app-text)]']
      }
    },
    defaultVariants: {
      collapsed: false,
      active: false
    }
  }
)

function NavigationButton({
  item,
  activeView,
  isCollapsed,
  onSelect
}: NavigationButtonProps): React.JSX.Element {
  const Icon = item.icon
  const isActive = item.id === activeView

  const button = (
    <button
      type="button"
      aria-current={isActive ? 'page' : undefined}
      aria-label={isCollapsed ? item.label : undefined}
      className={navigationButtonVariants({
        collapsed: isCollapsed,
        active: isActive
      })}
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
            : ['text-[var(--app-muted)]', 'group-hover:text-[var(--app-text)]']
        )}
      />

      {!isCollapsed && <span className="min-w-0 truncate">{item.label}</span>}
    </button>
  )

  return (
    <Tooltip content={item.label} side="right" disabled={!isCollapsed}>
      {button}
    </Tooltip>
  )
}

export function AppShell({
  activeView,
  onViewChange,
  children
}: AppShellProps): React.JSX.Element {
  const [
    isCollapsed,
    setIsCollapsed
  ] = useState(
    () => activeView === 'study'
  )

  useEffect(() => {
    if (activeView === 'study') {
      setIsCollapsed(true)
    }
  }, [activeView])

  const toggleLabel = isCollapsed
    ? 'Развернуть боковую панель'
    : 'Свернуть боковую панель'

  return (
    <TooltipProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-[var(--app-workspace)] text-[var(--app-text)]">
        <aside
          aria-label="Боковая панель"
          data-collapsed={isCollapsed}
          className={cn(
            'group/sidebar relative z-10 flex h-full shrink-0 flex-col',
            'border-r border-[var(--app-border)] bg-[var(--app-sidebar)]',
            'transition-[width] duration-200 ease-out',
            'motion-reduce:transition-none',
            isCollapsed ? 'w-[72px]' : 'w-64'
          )}
        >
          <header
            className={cn(
              'flex h-[var(--app-header-height)] shrink-0 items-center border-b',
              'border-[var(--app-border)]',
              isCollapsed ? 'justify-center px-0' : 'px-3'
            )}
          >
            <div
              className={cn(
                'flex min-w-0 items-center',
                isCollapsed ? 'justify-center' : 'w-full gap-3'
              )}
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
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
          </header>

          <Tooltip content={toggleLabel} side="right">
            <button
              type="button"
              aria-label={toggleLabel}
              className={cn(
                'absolute top-8 right-0 z-20',
                'flex size-7 translate-x-1/2 -translate-y-1/2',
                'items-center justify-center rounded-full border',
                'border-[var(--app-border-strong)]',
                'bg-[var(--app-surface-raised)]',
                'text-[var(--app-muted)]',
                'opacity-0 outline-none',
                'transition-[opacity,background-color,color,transform]',
                'duration-150',
                'group-hover/sidebar:opacity-100',
                'group-focus-within/sidebar:opacity-100',
                'hover:scale-105',
                'hover:bg-[var(--app-sidebar-active)]',
                'hover:text-violet-300',
                'focus-visible:opacity-100',
                'focus-visible:ring-2',
                'focus-visible:ring-violet-500/70',
                'motion-reduce:transition-none'
              )}
              onClick={() => {
                setIsCollapsed((current) => !current)
              }}
            >
              {isCollapsed ? (
                <PanelLeftOpen aria-hidden="true" className="size-4" />
              ) : (
                <PanelLeftClose aria-hidden="true" className="size-4" />
              )}
            </button>
          </Tooltip>

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
    </TooltipProvider>
  )
}
