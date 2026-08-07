import { useEffect, useState } from 'react'

import { DeleteConfirmationDialog } from '../../../../shared/ui/DeleteConfirmationDialog'
import { getFinanceErrorMessage } from '../../lib/finance-ui'

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

  useEffect(() => {
    if (open) setError(null)
  }, [open])

  function requestOpenChange(nextOpen: boolean): void {
    if (isSubmitting && !nextOpen) return
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
    <DeleteConfirmationDialog
      open={open}
      title={title}
      description={description}
      subject={subject}
      confirmLabel={confirmLabel}
      disabledReason={disabledReason}
      isSubmitting={isSubmitting}
      error={error}
      onOpenChange={requestOpenChange}
      onConfirm={confirm}
    />
  )
}
