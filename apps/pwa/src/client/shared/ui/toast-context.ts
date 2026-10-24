import { createContext, useContext } from 'react'

export type ToastKind = 'success' | 'error' | 'info'
export type ToastPlacement = 'top' | 'bottom'

export type ToastInput = {
  kind: ToastKind
  message: string
  key?: string
  durationMs?: number
  placement?: ToastPlacement
}

export type ToastApi = {
  show(input: ToastInput): void
  success(message: string, key?: string): void
  error(message: string, key?: string): void
  info(message: string, key?: string, durationMs?: number): void
}

export const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast must be used inside ToastProvider')
  return value
}
