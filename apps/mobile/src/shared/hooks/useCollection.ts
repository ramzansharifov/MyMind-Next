import { useCallback, useEffect, useRef, useState } from 'react'
import { messageFor } from '../ui/form-model'
import { notifyDataChanged } from '../../app/changes'
import { useConfirmation } from '../ui/ConfirmationProvider'
import { useToast } from '../ui/ToastProvider'

interface CollectionState<T> {
  data: T | null
  error: string
  loading: boolean
  pending: boolean
  refresh(): void
  mutate(operation: () => void, successMessage?: string): void
  confirmDelete(title: string, operation: () => void, explanation?: string): void
}

export function useCollection<T>(read: () => T): CollectionState<T> {
  const confirm = useConfirmation()
  const toast = useToast()
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const guard = useRef(false)

  const refresh = useCallback(() => {
    setError('')
    setLoading(true)
    try {
      setData(read())
    } catch (reason) {
      setData(null)
      setError(messageFor(reason))
    } finally {
      setLoading(false)
    }
  }, [read])

  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (active) refresh()
    })
    return () => {
      active = false
    }
  }, [refresh])

  const mutate = (operation: () => void, successMessage?: string): void => {
    if (guard.current) return
    guard.current = true
    setPending(true)
    setError('')
    try {
      operation()
      notifyDataChanged()
      refresh()
      if (successMessage) toast.success(successMessage)
    } catch (reason) {
      const message = messageFor(reason)
      setError(message)
      toast.error(message)
    } finally {
      guard.current = false
      setPending(false)
    }
  }

  const confirmDelete = (
    title: string,
    operation: () => void,
    explanation = 'Это действие нельзя отменить.'
  ): void => {
    if (guard.current) return
    void confirm({
      title,
      description: explanation,
      tone: 'danger',
      onConfirm: () => {
        mutate(operation, 'Удалено')
      }
    })
  }

  return { data, error, loading, pending, refresh, mutate, confirmDelete }
}
