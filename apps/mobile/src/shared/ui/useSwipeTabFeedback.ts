import { useCallback, useEffect, useRef, useState } from 'react'

export interface SwipeTabFeedback<T extends string> {
  value: T
  sequence: number
}

export function useSwipeTabFeedback<T extends string>(): [
  SwipeTabFeedback<T> | null,
  (value: T) => void
] {
  const sequenceRef = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [feedback, setFeedback] = useState<SwipeTabFeedback<T> | null>(null)

  const show = useCallback((value: T): void => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    sequenceRef.current += 1
    setFeedback({ value, sequence: sequenceRef.current })

    timeoutRef.current = setTimeout(() => {
      setFeedback(null)
      timeoutRef.current = null
    }, 1_120)
  }, [])

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    },
    []
  )

  return [feedback, show]
}
