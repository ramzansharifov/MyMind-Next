import { useState } from 'react'

import { AppDialog } from '../../../shared/ui/AppDialog'

interface NoteNameDialogProps {
  open: boolean
  title: string
  label: string
  initialValue?: string
  confirmLabel: string
  onOpenChange: (open: boolean) => void
  onConfirm: (value: string) => void | Promise<void>
}

export function NoteNameDialog({
  open,
  title,
  label,
  initialValue = '',
  confirmLabel,
  onOpenChange,
  onConfirm
}: NoteNameDialogProps): React.JSX.Element {
  return open ? (
    <NoteNameDialogContent
      open={open}
      title={title}
      label={label}
      initialValue={initialValue}
      confirmLabel={confirmLabel}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
    />
  ) : (
    <></>
  )
}

function NoteNameDialogContent({
  open,
  title,
  label,
  initialValue,
  confirmLabel,
  onOpenChange,
  onConfirm
}: NoteNameDialogProps & { initialValue: string }): React.JSX.Element {
  const [value, setValue] = useState(initialValue)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(): Promise<void> {
    const normalized = value.trim()

    if (!normalized) {
      setError('Введите название')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await onConfirm(normalized)
      onOpenChange(false)
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить название')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={label}
      size="sm"
      busy={isSaving}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <input
          autoFocus
          value={value}
          maxLength={240}
          aria-label={label}
          className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] transition-colors outline-none placeholder:text-[var(--app-muted)]/60 focus:border-[var(--app-accent-500)]/45 focus:ring-2 focus:ring-[var(--app-accent-500)]/10"
          onChange={(event) => setValue(event.target.value)}
        />

        {error && <p className="mt-2 text-xs text-red-300">{error}</p>}

        <div className="mt-5 flex justify-end gap-2 border-t border-[var(--app-border)] pt-4">
          <button
            type="button"
            disabled={isSaving}
            className="rounded-lg px-3 py-2 text-sm text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:opacity-40"
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={isSaving || !value.trim()}
            className="rounded-lg bg-[var(--app-accent-500)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? 'Сохранение…' : confirmLabel}
          </button>
        </div>
      </form>
    </AppDialog>
  )
}
