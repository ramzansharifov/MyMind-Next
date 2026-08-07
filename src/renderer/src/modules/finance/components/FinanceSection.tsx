import type { ReactNode } from 'react'

import { cn } from '../../../shared/lib/cn'

export function FinanceSection({
  title,
  icon,
  actions,
  children,
  className,
  bodyClassName
}: {
  title: string
  icon: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}): React.JSX.Element {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)]',
        className
      )}
    >
      <header className="flex min-h-12 items-center gap-3 border-b border-[var(--app-border)] px-5 py-3 max-[620px]:flex-wrap">
        <span className="shrink-0 text-violet-300">{icon}</span>
        <h2 className="text-base font-semibold text-[var(--app-text)]">{title}</h2>
        {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <div className={cn('p-3', bodyClassName)}>{children}</div>
    </section>
  )
}
