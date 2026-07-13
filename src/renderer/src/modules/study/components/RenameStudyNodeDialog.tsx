import * as AlertDialog from '@radix-ui/react-alert-dialog'

import type { StudyNode } from '../../../../../shared/contracts/study'
import { isDialogConfirmShortcut } from '../../../shared/lib/dialog-keyboard'

interface RenameStudyNodeDialogProps {
  target: StudyNode | null
  value: string
  onValueChange: (value: string) => void
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function RenameStudyNodeDialog({
  target,
  value,
  onValueChange,
  onOpenChange,
  onConfirm
}: RenameStudyNodeDialogProps): React.JSX.Element {
  const canConfirm = target !== null && Boolean(value.trim())

  return (
    <AlertDialog.Root open={target !== null} onOpenChange={onOpenChange}>
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
            className="mt-4 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:border-violet-500/50"
            onChange={(event) => {
              onValueChange(event.target.value)
            }}
          />

          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <button
                type="button"
                className="rounded-lg px-3 py-2 text-sm text-[var(--app-muted)] hover:bg-white/[0.06]"
              >
                Отмена
              </button>
            </AlertDialog.Cancel>

            <AlertDialog.Action asChild>
              <button
                type="button"
                disabled={!canConfirm}
                aria-keyshortcuts="Shift+Enter"
                className="rounded-lg bg-violet-500 px-3 py-2 text-sm font-medium text-white hover:bg-violet-400 disabled:opacity-40"
                onClick={onConfirm}
              >
                Сохранить
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
