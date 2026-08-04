import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'

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
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {open && (
        <NoteNameDialogContent
          title={title}
          label={label}
          initialValue={initialValue}
          confirmLabel={confirmLabel}
          onOpenChange={onOpenChange}
          onConfirm={onConfirm}
        />
      )}
    </Dialog.Root>
  )
}

function NoteNameDialogContent({
  title,
  label,
  initialValue,
  confirmLabel,
  onOpenChange,
  onConfirm
}: Omit<NoteNameDialogProps, 'open'> & { initialValue: string }): React.JSX.Element {
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
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-[2px]" />
      <Dialog.Content className="fixed top-1/2 left-1/2 z-[81] w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-5 shadow-2xl outline-none">
        <Dialog.Title className="text-lg font-semibold text-[var(--app-text)]">
          {title}
        </Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-[var(--app-muted)]">
          {label}
        </Dialog.Description>

        <form
          className="mt-5"
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
            className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none transition-colors placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/10"
            onChange={(event) => setValue(event.target.value)}
          />

          {error && <p className="mt-2 text-xs text-red-300">{error}</p>}

          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button
                type="button"
                disabled={isSaving}
                className="rounded-lg px-3 py-2 text-sm text-[var(--app-muted)] hover:bg-white/[0.05] hover:text-[var(--app-text)]"
              >
                Отмена
              </button>
            </Dialog.Close>
            <button
              type="submit"
              disabled={isSaving || !value.trim()}
              className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? 'Сохранение…' : confirmLabel}
            </button>
          </div>
        </form>
      </Dialog.Content>
    </Dialog.Portal>
  )
}
