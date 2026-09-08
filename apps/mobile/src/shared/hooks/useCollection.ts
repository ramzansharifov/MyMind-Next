import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert } from 'react-native'
import { messageFor } from '../ui/form-model'
import { notifyDataChanged } from '../../app/changes'

interface CollectionState<T> {
  data: T | null
  error: string
  loading: boolean
  pending: boolean
  refresh(): void
  mutate(operation: () => void): void
  confirmDelete(title: string, operation: () => void, explanation?: string): void
}
export function useCollection<T>(read: () => T): CollectionState<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const guard = useRef(false)
  const confirming = useRef(false)
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
  const mutate = (operation: () => void): void => {
    if (guard.current) return
    guard.current = true
    setPending(true)
    setError('')
    try {
      operation()
      notifyDataChanged()
      refresh()
    } catch (reason) {
      setError(messageFor(reason))
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
    if (guard.current || confirming.current) return
    confirming.current = true
    Alert.alert(
      title,
      explanation,
      [
        {
          text: 'Отмена',
          style: 'cancel',
          onPress: () => {
            confirming.current = false
          }
        },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            confirming.current = false
            mutate(operation)
          }
        }
      ],
      {
        cancelable: true,
        onDismiss: () => {
          confirming.current = false
        }
      }
    )
  }
  return { data, error, loading, pending, refresh, mutate, confirmDelete }
}
