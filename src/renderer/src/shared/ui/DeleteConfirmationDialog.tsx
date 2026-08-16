import { LoaderCircle, RotateCcw, Trash2, TriangleAlert } from 'lucide-react'

import { isDialogConfirmShortcut } from '../lib/dialog-keyboard'
import { AppDialog, type AppDialogTone } from './AppDialog'

interface DeleteConfirmationDialogProps {
  open: boolean
  title: string
  description: string
  subject?: string
  confirmLabel?: string
  submittingLabel?: string
  tone?: Extract<AppDialogTone, 'danger' | 'warning'>
  notice?: string | null
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
  submittingLabel = 'Удаляем…',
  tone = 'danger',
  notice,
  isSubmitting = false,
  error = null,
  disabledReason = null,
  onOpenChange,
  onConfirm
}: DeleteConfirmationDialogProps): React.JSX.Element {
  const canConfirm = !isSubmitting && !disabledReason
  const isWarning = tone === 'warning'
  const noticeText = notice === undefined ? 'Это действие нельзя отменить' : notice

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
          {subject && (
            <span
              className={`mb-1 block font-medium break-words ${
                isWarning ? 'text-amber-200' : 'text-red-200'
              }`}
            >
              {subject}
            </span>
          )}
          {description}
        </>
      }
      icon={
        isWarning ? <TriangleAlert aria-hidden="true" /> : <Trash2 aria-hidden="true" />
      }
      tone={tone}
      role="alertdialog"
      size="sm"
      busy={isSubmitting}
      dismissible={false}
      showClose={false}
      bodyClassName="p-0"
      onKeyDown={(event) => {
        if (!canConfirm || !isDialogConfirmShortcut(event)) return
        event.preventDefault()
        event.stopPropagation()
        confirm()
      }}
    >
      {noticeText && (
        <div
          className={`flex items-center gap-2 border-b border-[var(--app-border)] px-5 py-3 text-xs ${
            isWarning
              ? 'bg-amber-500/[0.035] text-amber-200/85'
              : 'bg-red-500/[0.035] text-red-200/80'
          }`}
        >
          <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
          {noticeText}
        </div>
      )}

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
          className="rounded-lg border border-[var(--app-border)] px-4 py-2 text-sm font-medium text-[var(--app-muted)] transition-colors outline-none hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-violet-500/35 disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => onOpenChange(false)}
        >
          Отмена
        </button>
        <button
          type="button"
          aria-keyshortcuts="Shift+Enter"
          disabled={!canConfirm}
          className={
            isWarning
              ? 'inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition-colors outline-none hover:bg-amber-400 focus-visible:ring-2 focus-visible:ring-amber-400/50 disabled:cursor-not-allowed disabled:opacity-45'
              : 'inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors outline-none hover:bg-red-400 focus-visible:ring-2 focus-visible:ring-red-400/50 disabled:cursor-not-allowed disabled:opacity-45'
          }
          onClick={confirm}
        >
          {isSubmitting ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : isWarning ? (
            <RotateCcw aria-hidden="true" className="size-4" />
          ) : (
            <Trash2 aria-hidden="true" className="size-4" />
          )}
          {isSubmitting ? submittingLabel : confirmLabel}
        </button>
      </div>
    </AppDialog>
  )
}
