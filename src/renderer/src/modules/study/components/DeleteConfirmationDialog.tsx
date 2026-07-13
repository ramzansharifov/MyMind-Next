import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { Trash2, TriangleAlert } from 'lucide-react'

import { isDialogConfirmShortcut } from '../../../shared/lib/dialog-keyboard'

interface DeleteConfirmationDialogProps {
  open: boolean
  title: string
  description: string
  subject?: string
  confirmLabel?: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function DeleteConfirmationDialog({
  open,
  title,
  description,
  subject,
  confirmLabel = 'Удалить',
  onOpenChange,
  onConfirm
}: DeleteConfirmationDialogProps): React.JSX.Element {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]" />

        <AlertDialog.Content
          className="fixed top-1/2 left-1/2 z-50 w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-red-500/15 bg-[var(--app-surface-raised)] outline-none"
          onKeyDown={(event) => {
            if (!isDialogConfirmShortcut(event)) {
              return
            }

            event.preventDefault()
            event.stopPropagation()
            onConfirm()
            onOpenChange(false)
          }}
        >
          <div className="flex items-start gap-4 border-b border-[var(--app-border)] p-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-300 ring-1 ring-red-500/15 ring-inset">
              <Trash2 aria-hidden="true" className="size-5" />
            </div>

            <div className="min-w-0 flex-1">
              <AlertDialog.Title className="text-lg font-semibold text-[var(--app-text)]">
                {title}
              </AlertDialog.Title>

              {subject && (
                <p className="mt-1 text-sm font-medium break-words text-red-200">{subject}</p>
              )}

              <AlertDialog.Description className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
                {description}
              </AlertDialog.Description>
            </div>
          </div>

          <div className="flex items-center gap-2 border-b border-[var(--app-border)] bg-red-500/[0.035] px-5 py-3 text-xs text-red-200/80">
            <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
            Это действие нельзя отменить
          </div>

          <div className="flex justify-end gap-2 p-4">
            <AlertDialog.Cancel asChild>
              <button
                type="button"
                className="rounded-lg border border-[var(--app-border)] px-4 py-2 text-sm font-medium text-[var(--app-muted)] transition-colors outline-none hover:bg-white/[0.05] hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-violet-500/35"
              >
                Отмена
              </button>
            </AlertDialog.Cancel>

            <AlertDialog.Action asChild>
              <button
                type="button"
                aria-keyshortcuts="Shift+Enter"
                className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors outline-none hover:bg-red-400 focus-visible:ring-2 focus-visible:ring-red-400/50"
                onClick={onConfirm}
              >
                <Trash2 aria-hidden="true" className="size-4" />

                {confirmLabel}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
