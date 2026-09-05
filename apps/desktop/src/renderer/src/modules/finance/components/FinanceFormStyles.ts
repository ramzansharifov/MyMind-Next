import { cn } from '../../../shared/lib/cn'

export const financeInputClassName = cn(
  'h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3',
  'text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60',
  'focus:border-accent-500/45 focus:ring-2 focus:ring-accent-500/10',
  'disabled:cursor-not-allowed disabled:opacity-50'
)

export const financeTextareaClassName = cn(financeInputClassName, 'min-h-24 resize-y py-3')
