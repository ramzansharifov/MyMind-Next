import { LoaderCircle, Trash2, TriangleAlert } from 'lucide-react'

import { isDialogConfirmShortcut } from '../lib/dialog-keyboard'
import { AppDialog } from './AppDialog'

interface DeleteConfirmationDialogProps {
  open: boolean
  title: string
  description: string
  subject?: string
  confirmLabel?: string
  isSubmitting?: boolean
  error?: string | null
  disabledReason?: string | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
}

export function DeleteConfirmationDialog({
  open,
  title,
  description,
  subject,
  confirmLabel = 'Удалить',
  isSubmitting = false,
  error = null,
  disabledReason = null,
  onOpenChange,
  onConfirm
}: DeleteConfirmationDialogProps): React.JSX.Element {
  const canConfirm = !isSubmitting && !disabledReason

  function confirm(): void {
    if (!canConfirm) return
    void onConfirm()
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={
        <>
          {subject && <span className="mb-1 block font-medium break-words text-red-200">{subject}</span>}
          {description}
        </>
      }
      icon={<Trash2 aria-hidden="true" />}
      tone="danger"
      role="alertdialog"
      size="sm"
      busy={isSubmitting}
      showClose={false}
      bodyClassName="p-0"
      onKeyDown={(event) => {
        if (!canConfirm || !isDialogConfirmShortcut(event)) return
        event.preventDefault()
        event.stopPropagation()
        confirm()
      }}
    >
      <div className="flex items-center gap-2 border-b border-[var(--app-border)] bg-red-500/[0.035] px-5 py-3 text-xs text-red-200/80">
        <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
        Это действие нельзя отменить
      </div>

      {(disabledReason || error) && (
        <div
          role="alert"
          className="mx-4 mt-4 rounded-xl border border-red-500/20 bg-red-500/[0.07] px-4 py-3 text-sm leading-5 text-red-200"
        >
          {disabledReason ?? error}
        </div>
      )}

      <div className="flex justify-end gap-2 p-4">
        <button
          type="button"
          disabled={isSubmitting}
          className="rounded-lg border border-[var(--app-border)] px-4 py-2 text-sm font-medium text-[var(--app-muted)] transition-colors outline-none hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-[var(--app-accent-500)]/35 disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => onOpenChange(false)}
        >
          Отмена
        </button>
        <button
          type="button"
          aria-keyshortcuts="Shift+Enter"
          disabled={!canConfirm}
          className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors outline-none hover:bg-red-400 focus-visible:ring-2 focus-visible:ring-red-400/50 disabled:cursor-not-allowed disabled:opacity-45"
          onClick={confirm}
        >
          {isSubmitting ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Trash2 aria-hidden="true" className="size-4" />
          )}
          {isSubmitting ? 'Выполняем…' : confirmLabel}
        </button>
      </div>
    </AppDialog>
  )
}
