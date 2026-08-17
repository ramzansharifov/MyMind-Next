import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn'

interface ModuleHeaderProps {
  icon?: LucideIcon
  leading?: ReactNode
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  className?: string
  topClassName?: string
  childrenClassName?: string
}

export function ModuleHeader({
  icon: Icon,
  leading,
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
  topClassName,
  childrenClassName
}: ModuleHeaderProps): React.JSX.Element {
  return (
    <header
      data-module-header
      className={cn(
        'relative isolate overflow-hidden rounded-[28px] border border-[var(--app-border)]',
        'bg-[var(--app-surface)] p-6 shadow-[var(--app-shadow-card)] max-[700px]:p-5',
        className
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 right-8 -z-10 size-80 rounded-full bg-violet-500/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-44 -left-24 -z-10 size-80 rounded-full bg-violet-900/10 blur-3xl"
      />

      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-5 max-[760px]:items-start',
          topClassName
        )}
      >
        <div className="flex min-w-0 items-center gap-4">
          {leading ??
            (Icon ? (
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-violet-300 shadow-inner shadow-violet-500/5">
                <Icon aria-hidden="true" className="size-6" />
              </span>
            ) : null)}

          <div className="min-w-0">
            {eyebrow && (
              <div className="mb-1 text-[11px] font-semibold tracking-[0.12em] text-violet-300 uppercase">
                {eyebrow}
              </div>
            )}
            <h1 className="text-3xl font-semibold tracking-[-0.035em] text-[var(--app-text)]">
              {title}
            </h1>
            {description && (
              <div className="mt-1 max-w-3xl text-sm leading-6 text-[var(--app-muted)]">
                {description}
              </div>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex max-w-full flex-wrap items-center justify-end gap-2 max-[760px]:w-full max-[760px]:justify-start">
            {actions}
          </div>
        )}
      </div>

      {children && <div className={cn('mt-6', childrenClassName)}>{children}</div>}
    </header>
  )
}
