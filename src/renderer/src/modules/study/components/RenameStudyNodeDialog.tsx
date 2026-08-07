import { LoaderCircle } from 'lucide-react'

import type { StudyNode } from '../../../../../shared/contracts/study'
import { isDialogConfirmShortcut } from '../../../shared/lib/dialog-keyboard'
import { AppDialog } from '../../../shared/ui/AppDialog'

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
    <AppDialog
      open={target !== null}
      onOpenChange={onOpenChange}
      title={target?.type === 'folder' ? 'Переименовать папку' : 'Переименовать материал'}
      description="Введите новое название элемента."
      size="sm"
      busy={isSubmitting}
      showClose={false}
      onKeyDown={(event) => {
        if (!canConfirm || !isDialogConfirmShortcut(event)) return
        event.preventDefault()
        event.stopPropagation()
        onConfirm()
      }}
    >
      <input
        autoFocus
        value={value}
        disabled={isSubmitting}
        aria-describedby={error ? 'study-rename-error' : undefined}
        className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 py-2.5 text-sm text-[var(--app-text)] outline-none transition-colors focus:border-[var(--app-accent-500)]/50 focus:ring-2 focus:ring-[var(--app-accent-500)]/10"
        onChange={(event) => onValueChange(event.target.value)}
      />

      {error && (
        <p id="study-rename-error" role="alert" className="mt-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2 border-t border-[var(--app-border)] pt-4">
        <button
          type="button"
          disabled={isSubmitting}
          className="rounded-lg px-3 py-2 text-sm text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:opacity-40"
          onClick={() => onOpenChange(false)}
        >
          Отмена
        </button>
        <button
          type="button"
          disabled={!canConfirm}
          aria-keyshortcuts="Shift+Enter"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--app-accent-500)] px-3 py-2 text-sm font-medium text-white transition-colors hover:brightness-110 disabled:opacity-40"
          onClick={onConfirm}
        >
          {isSubmitting && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
          {isSubmitting ? 'Сохранение…' : 'Сохранить'}
        </button>
      </div>
    </AppDialog>
  )
}
