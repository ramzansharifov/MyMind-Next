import type { ReactNode } from 'react'

export function NutritionFormField({
  label,
  hint,
  children
}: {
  label: string
  hint?: string
  children: ReactNode
}): React.JSX.Element {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center justify-between gap-3 text-xs font-medium text-[var(--app-muted)]">
        <span>{label}</span>
        {hint && <span className="font-normal opacity-70">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

export function NutritionCheckField({
  label,
  checked,
  onChange
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}): React.JSX.Element {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-[var(--app-muted)]">
      <input
        type="checkbox"
        checked={checked}
        className="accent-violet-500"
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  )
}

export function NutritionSecondaryButton({
  children,
  disabled = false,
  onClick
}: {
  children: ReactNode
  disabled?: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      disabled={disabled}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-xs font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-45"
      onClick={onClick}
    >
      {children}
    </button>
  )
}
