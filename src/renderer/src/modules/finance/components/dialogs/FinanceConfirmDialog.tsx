import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { LoaderCircle, Trash2, TriangleAlert } from 'lucide-react'
import { useState } from 'react'

import { getFinanceErrorMessage } from '../../lib/finance-ui'
import { FinanceButton } from '../FinancePrimitives'

interface FinanceConfirmDialogProps {
  open: boolean
  title: string
  description: string
  subject?: string
  confirmLabel?: string
  disabledReason?: string | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
}

export function FinanceConfirmDialog({
  open,
  title,
  description,
  subject,
  confirmLabel = 'Удалить',
  disabledReason,
  onOpenChange,
  onConfirm
}: FinanceConfirmDialogProps): React.JSX.Element {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function requestOpenChange(nextOpen: boolean): void {
    if (isSubmitting && !nextOpen) return
    if (nextOpen) setError(null)
    onOpenChange(nextOpen)
  }

  async function confirm(): Promise<void> {
    if (isSubmitting || disabledReason) return
    setIsSubmitting(true)
    setError(null)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (reason) {
      setError(getFinanceErrorMessage(reason))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={requestOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-[2px]" />
        <AlertDialog.Content
          aria-busy={isSubmitting}
          className="fixed top-1/2 left-1/2 z-[91] w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-red-500/15 bg-[var(--app-surface-raised)] outline-none"
          onEscapeKeyDown={(event) => {
            if (isSubmitting) event.preventDefault()
          }}
        >
          <div className="flex items-start gap-4 border-b border-[var(--app-border)] p-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-300 ring-1 ring-red-500/15 ring-inset">
              <Trash2 aria-hidden="true" className="size-5" />
            </div>
            <div>
              <AlertDialog.Title className="text-lg font-semibold text-[var(--app-text)]">
                {title}
              </AlertDialog.Title>
              {subject && <p className="mt-1 text-sm font-medium text-red-200">{subject}</p>}
              <AlertDialog.Description className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
                {description}
              </AlertDialog.Description>
            </div>
          </div>

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
            <AlertDialog.Cancel asChild disabled={isSubmitting}>
              <FinanceButton disabled={isSubmitting}>Отмена</FinanceButton>
            </AlertDialog.Cancel>
            <FinanceButton
              tone="danger"
              disabled={isSubmitting || Boolean(disabledReason)}
              onClick={() => void confirm()}
            >
              {isSubmitting ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <Trash2 aria-hidden="true" className="size-4" />
              )}
              {isSubmitting ? 'Выполняем…' : confirmLabel}
            </FinanceButton>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
