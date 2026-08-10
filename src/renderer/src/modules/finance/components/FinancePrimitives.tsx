/* eslint-disable react-refresh/only-export-components */
import { AlertCircle, LoaderCircle, RefreshCw } from 'lucide-react'
import { cloneElement, isValidElement, useId } from 'react'
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react'

import { cn } from '../../../shared/lib/cn'

export function FinanceSurface({
  children,
  className,
  as = 'section'
}: {
  children: ReactNode
  className?: string
  as?: 'section' | 'div' | 'article'
}): React.JSX.Element {
  const Component = as
  return (
    <Component
      className={cn(
        'rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)]',
        className
      )}
    >
      {children}
    </Component>
  )
}

interface FinanceButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: 'primary' | 'neutral' | 'positive' | 'danger' | 'warning'
  size?: 'sm' | 'md'
}

export function FinanceButton({
  tone = 'neutral',
  size = 'md',
  className,
  children,
  ...props
}: FinanceButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors outline-none',
        'focus-visible:ring-2 focus-visible:ring-violet-500/45 disabled:cursor-not-allowed disabled:opacity-45',
        size === 'sm' ? 'h-9 px-3' : 'h-11 px-4',
        tone === 'primary' && 'border-violet-500/30 bg-violet-500 text-white hover:bg-violet-400',
        tone === 'neutral' &&
          'border-[var(--app-border)] bg-[var(--app-surface-raised)] text-[var(--app-text)] hover:border-[var(--app-border-strong)] hover:bg-[var(--app-control-hover)]',
        tone === 'positive' &&
          'border-emerald-500/25 bg-emerald-500/12 text-emerald-200 hover:bg-emerald-500/20',
        tone === 'danger' && 'border-red-500/25 bg-red-500/10 text-red-200 hover:bg-red-500/18',
        tone === 'warning' &&
          'border-amber-500/25 bg-amber-500/10 text-amber-200 hover:bg-amber-500/18',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function FinanceLoadingState({
  label = 'Загрузка финансов…'
}: {
  label?: string
}): React.JSX.Element {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-[var(--app-border)] text-sm text-[var(--app-muted)]">
      <LoaderCircle aria-hidden="true" className="mr-2 size-5 animate-spin text-violet-300" />
      {label}
    </div>
  )
}

export function FinanceErrorState({
  message,
  onRetry
}: {
  message: string
  onRetry: () => void
}): React.JSX.Element {
  return (
    <div
      role="alert"
      className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-6 text-center"
    >
      <AlertCircle aria-hidden="true" className="size-8 text-red-300" />
      <p className="mt-3 max-w-lg text-sm leading-6 text-red-100">{message}</p>
      <FinanceButton className="mt-4" size="sm" onClick={onRetry}>
        <RefreshCw aria-hidden="true" className="size-4" />
        Повторить
      </FinanceButton>
    </div>
  )
}

export function FinanceEmptyState({
  icon,
  title,
  description,
  action
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}): React.JSX.Element {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--app-border-strong)] bg-[var(--app-overlay-faint)] px-6 py-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/15 ring-inset">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold text-[var(--app-text)]">{title}</h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-[var(--app-muted)]">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function FinanceSkeletonGrid({ count = 4 }: { count?: number }): React.JSX.Element {
  return (
    <div className="grid grid-cols-4 gap-3 max-[1050px]:grid-cols-2 max-[620px]:grid-cols-1">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="h-32 animate-pulse rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)]"
        />
      ))}
    </div>
  )
}

export const financeInputClassName = cn(
  'h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3',
  'text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60',
  'focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/10',
  'disabled:cursor-not-allowed disabled:opacity-50'
)

export const financeTextareaClassName = cn(financeInputClassName, 'min-h-24 resize-y py-3')

type FinanceFieldControlProps = {
  'aria-describedby'?: string
}

export function FinanceField({
  label,
  error,
  hint,
  children
}: {
  label: string
  error?: string
  hint?: string
  children: ReactNode
}): React.JSX.Element {
  const description = error ?? hint
  const descriptionId = useId()
  let control = children

  if (description && isValidElement(children) && typeof children.type === 'string') {
    const element = children as ReactElement<FinanceFieldControlProps>
    const describedBy = [element.props['aria-describedby'], descriptionId].filter(Boolean).join(' ')
    control = cloneElement(element, { 'aria-describedby': describedBy })
  }

  return (
    <div className="block text-sm text-[var(--app-text)]">
      <label className="block">
        <span className="mb-1.5 block font-medium">{label}</span>
        {control}
      </label>
      {error ? (
        <span id={descriptionId} className="mt-1.5 block text-xs text-red-300">
          {error}
        </span>
      ) : hint ? (
        <span id={descriptionId} className="mt-1.5 block text-xs leading-5 text-[var(--app-muted)]">
          {hint}
        </span>
      ) : null}
    </div>
  )
}
