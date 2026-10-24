import { useCallback, useEffect, useRef, useState } from 'react'

import type { TabSwipeDirection } from './tab-swipe'

export interface SwipeTabFeedback<T extends string> {
  value: T
  direction: TabSwipeDirection
  sequence: number
}

export function useSwipeTabFeedback<T extends string>(): [
  SwipeTabFeedback<T> | null,
  (value: T, direction: TabSwipeDirection) => void
] {
  const sequenceRef = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [feedback, setFeedback] = useState<SwipeTabFeedback<T> | null>(null)

  const show = useCallback((value: T, direction: TabSwipeDirection): void => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    sequenceRef.current += 1
    setFeedback({ value, direction, sequence: sequenceRef.current })

    timeoutRef.current = setTimeout(() => {
      setFeedback(null)
      timeoutRef.current = null
    }, 1_300)
  }, [])

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    },
    []
  )

  return [feedback, show]
}
