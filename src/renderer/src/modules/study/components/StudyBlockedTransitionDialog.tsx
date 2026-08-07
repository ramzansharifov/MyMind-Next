import { AlertTriangle } from 'lucide-react'

import { AppDialog } from '../../../shared/ui/AppDialog'

interface StudyBlockedTransitionDialogProps {
  open: boolean
  message: string
  forceLeaveArmed: boolean
  onStay: () => void
  onRetry: () => void
  onForceLeave: () => void
}

export function StudyBlockedTransitionDialog({
  open,
  message,
  forceLeaveArmed,
  onStay,
  onRetry,
  onForceLeave
}: StudyBlockedTransitionDialogProps): React.JSX.Element {
  return (
    <AppDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onStay()
      }}
      title="Изменения не сохранены"
      description={`${message} Текущий материал и черновик остаются открытыми.`}
      icon={<AlertTriangle aria-hidden="true" />}
      tone="danger"
      role="alertdialog"
      size="sm"
      dismissible={false}
      showClose={false}
    >
      {forceLeaveArmed && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/[0.06] p-3 text-xs leading-5 text-red-200">
          Несохранённые изменения будут безвозвратно потеряны. Нажмите ещё раз, чтобы подтвердить
          переход.
        </p>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-[var(--app-border)] pt-4">
        <button
          type="button"
          className="rounded-lg px-3 py-2 text-sm text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
          onClick={onStay}
        >
          Остаться
        </button>
        <button
          type="button"
          className="rounded-lg border border-[var(--app-border)] px-3 py-2 text-sm text-[var(--app-text)] transition-colors hover:bg-[var(--app-control-hover)]"
          onClick={onRetry}
        >
          Повторить сохранение
        </button>
        <button
          type="button"
          className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200 transition-colors hover:bg-red-500/25"
          onClick={onForceLeave}
        >
          {forceLeaveArmed ? 'Подтвердить потерю изменений' : 'Покинуть без сохранения'}
        </button>
      </div>
    </AppDialog>
  )
}
