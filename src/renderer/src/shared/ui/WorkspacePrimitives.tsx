import { cva, type VariantProps } from 'class-variance-authority'
import { ArrowRight } from 'lucide-react'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

import { cn } from '../lib/cn'

const workspaceActionButtonVariants = cva(
  [
    'inline-flex h-10 w-full min-w-0 items-center justify-center gap-2',
    'rounded-xl border px-4',
    'text-sm font-medium whitespace-nowrap',
    'outline-none',
    'transition-[background-color,border-color,color,box-shadow]',
    'focus-visible:ring-2 focus-visible:ring-violet-500/35',
    'disabled:cursor-not-allowed disabled:opacity-40',
    '[&>svg]:size-4 [&>svg]:shrink-0'
  ],
  {
    variants: {
      variant: {
        secondary: [
          'border-[var(--app-border-strong)]',
          'bg-[var(--app-control)]',
          'text-[var(--app-text)]',
          'shadow-[var(--app-shadow-card)]',
          'hover:border-violet-500/35',
          'hover:bg-[var(--app-control-hover)]'
        ],
        primary: [
          'border-violet-400/20',
          'bg-violet-500',
          'text-white',
          'shadow-lg shadow-violet-950/20',
          'hover:border-violet-300/30',
          'hover:bg-violet-400'
        ]
      }
    },
    defaultVariants: {
      variant: 'secondary'
    }
  }
)

export interface WorkspaceActionButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof workspaceActionButtonVariants> {}

export const WorkspaceActionButton = forwardRef<HTMLButtonElement, WorkspaceActionButtonProps>(
  function WorkspaceActionButton({ variant, className, ...props }, ref) {
    return (
      <button
        ref={ref}
        className={cn(workspaceActionButtonVariants({ variant }), className)}
        {...props}
      />
    )
  }
)

export function WorkspaceStatCard({
  icon,
  value,
  label,
  description
}: {
  icon: ReactNode
  value: number | string
  label: string
  description: string
}): React.JSX.Element {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-3.5 shadow-[var(--app-shadow-card)]">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/15 bg-violet-500/10 text-violet-300">
        {icon}
      </div>

      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="text-xl font-semibold text-[var(--app-text)] tabular-nums">{value}</p>
          <p className="truncate text-xs font-medium text-[var(--app-text)]">{label}</p>
        </div>

        <p className="mt-0.5 truncate text-[11px] text-[var(--app-muted)]">{description}</p>
      </div>
    </div>
  )
}

export function WorkspacePanel({
  icon,
  title,
  count,
  children
}: {
  icon: ReactNode
  title: string
  count: number
  children: ReactNode
}): React.JSX.Element {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-panel)]">
      <header className="flex min-h-20 items-center gap-3 border-b border-[var(--app-border)] px-5 py-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/15 bg-violet-500/10 text-violet-300">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-[var(--app-text)]">{title}</h2>
        </div>

        <span className="flex min-w-7 shrink-0 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-card)] px-2 py-1 text-[11px] font-medium text-[var(--app-muted)] tabular-nums">
          {count}
        </span>
      </header>

      <div className="p-4">{children}</div>
    </section>
  )
}

export function WorkspaceNodeCard({
  ariaLabel,
  icon,
  title,
  metadata,
  aside,
  compact = false,
  onOpen
}: {
  ariaLabel: string
  icon: ReactNode
  title: string
  metadata: ReactNode
  aside?: ReactNode
  compact?: boolean
  onOpen: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={cn(
        'group flex w-full min-w-0 items-center gap-3 rounded-xl border text-left outline-none',
        'border-[var(--app-border)] bg-[var(--app-card)]',
        'transition-[border-color,background-color,transform,box-shadow]',
        'hover:-translate-y-px hover:border-violet-500/30 hover:bg-[var(--app-card-hover)]',
        'hover:shadow-[var(--app-shadow-hover)]',
        'focus-visible:ring-2 focus-visible:ring-violet-500/35',
        compact ? 'p-3' : 'p-3.5'
      )}
      onClick={onOpen}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex shrink-0 items-center justify-center rounded-xl border',
          'border-[var(--app-border)] bg-[var(--app-icon-surface)] text-[var(--app-muted)]',
          'transition-colors',
          'group-hover:border-violet-500/20 group-hover:bg-violet-500/10',
          'group-hover:text-violet-300',
          compact ? 'size-9' : 'size-10'
        )}
      >
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-[var(--app-text)]">{title}</span>
        <span className="mt-1 block truncate text-[11px] text-[var(--app-muted)]">{metadata}</span>
      </span>

      {aside}

      <ArrowRight
        aria-hidden="true"
        className="size-4 shrink-0 -translate-x-1 text-[var(--app-muted)] opacity-0 transition-[opacity,transform,color] group-hover:translate-x-0 group-hover:text-violet-300 group-hover:opacity-100"
      />
    </button>
  )
}

export function WorkspaceSectionEmpty({
  children,
  className
}: {
  children: ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex min-h-32 items-center justify-center rounded-xl border border-dashed',
        'border-[var(--app-border)] bg-[var(--app-empty-surface)] px-5 py-8',
        'text-center text-sm leading-6 text-[var(--app-muted)]',
        className
      )}
    >
      {children}
    </div>
  )
}
