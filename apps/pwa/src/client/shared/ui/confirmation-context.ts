import { createContext, useContext } from 'react'
import type { AppDialogTone } from './AppDialog'

export type ConfirmationOptions = {
  title: string
  description: string
  subject?: string
  confirmLabel?: string
  submittingLabel?: string
  tone?: Extract<AppDialogTone, 'danger' | 'warning'>
  notice?: string | null
  onConfirm(): void | Promise<void>
}

export const ConfirmationContext = createContext<
  ((options: ConfirmationOptions) => Promise<boolean>) | null
>(null)

export function useConfirmation(): (options: ConfirmationOptions) => Promise<boolean> {
  const value = useContext(ConfirmationContext)
  if (!value) throw new Error('useConfirmation must be used inside ConfirmationProvider')
  return value
}
