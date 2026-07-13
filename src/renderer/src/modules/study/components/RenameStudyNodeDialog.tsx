import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { LoaderCircle } from 'lucide-react'

import type { StudyNode } from '../../../../../shared/contracts/study'
import { isDialogConfirmShortcut } from '../../../shared/lib/dialog-keyboard'

interface RenameStudyNodeDialogProps {
  target: StudyNode | null
  value: string
  onValueChange: (value: string) => void
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isSubmitting: boolean
  error: string | null
}

export function RenameStudyNodeDialog({
  target,
  value,
  onValueChange,
  onOpenChange,
  onConfirm,
  isSubmitting,
  error
}: RenameStudyNodeDialogProps): React.JSX.Element {
  const canConfirm = target !== null && Boolean(value.trim()) && !isSubmitting

  return (
    <AlertDialog.Root
      open={target !== null}
      onOpenChange={(open) => {
        if (!isSubmitting) onOpenChange(open)
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/60" />

        <AlertDialog.Content
          className="fixed top-1/2 left-1/2 z-50 w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-5"
          onKeyDown={(event) => {
            if (!canConfirm || !isDialogConfirmShortcut(event)) {
              return
            }

            event.preventDefault()
            event.stopPropagation()
            onConfirm()
          }}
        >
          <AlertDialog.Title className="text-lg font-semibold text-[var(--app-text)]">
            {target?.type === 'folder' ? 'Переименовать папку' : 'Переименовать материал'}
          </AlertDialog.Title>

          <input
            autoFocus
            value={value}
            disabled={isSubmitting}
            aria-describedby={error ? 'study-rename-error' : undefined}
            className="mt-4 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:border-violet-500/50"
            onChange={(event) => {
              onValueChange(event.target.value)
            }}
          />

          {error ? (
            <p id="study-rename-error" role="alert" className="mt-2 text-sm text-red-400">
              {error}
            </p>
          ) : null}

          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <button
                type="button"
                disabled={isSubmitting}
                className="rounded-lg px-3 py-2 text-sm text-[var(--app-muted)] hover:bg-white/[0.06]"
              >
                Отмена
              </button>
            </AlertDialog.Cancel>

            <button
              type="button"
              disabled={!canConfirm}
              aria-keyshortcuts="Shift+Enter"
              className="inline-flex items-center gap-2 rounded-lg bg-violet-500 px-3 py-2 text-sm font-medium text-white hover:bg-violet-400 disabled:opacity-40"
              onClick={onConfirm}
            >
              {isSubmitting ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : null}
              {isSubmitting ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
