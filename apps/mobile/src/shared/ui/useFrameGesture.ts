import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Platform } from 'react-native'

/**
 * Browser touch events can arrive multiple times between paints. Keep only the latest
 * drag value and commit at most once per animation frame. The final value is flushed
 * synchronously before selecting or settling, so a quick release never loses a step.
 *
 * On native use the existing immediate responder behavior.
 */
export function useFrameGesture<T>(apply: (value: T) => void): {
  schedule(value: T): void
  flush(): void
  cancel(): void
} {
  const applyRef = useRef(apply)
  applyRef.current = apply
  const pendingRef = useRef<T | null>(null)
  const frameRef = useRef<number | null>(null)

  const cancel = useCallback((): void => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    pendingRef.current = null
  }, [])

  const flush = useCallback((): void => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    const next = pendingRef.current
    pendingRef.current = null
    if (next !== null) applyRef.current(next)
  }, [])

  const schedule = useCallback((value: T): void => {
    if (Platform.OS !== 'web') {
      applyRef.current(value)
      return
    }
    pendingRef.current = value
    if (frameRef.current !== null) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      const next = pendingRef.current
      pendingRef.current = null
      if (next !== null) applyRef.current(next)
    })
  }, [])

  useEffect(() => cancel, [cancel])
  return useMemo(() => ({ schedule, flush, cancel }), [schedule, flush, cancel])
}
