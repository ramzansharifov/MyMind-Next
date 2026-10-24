import { Platform } from 'react-native'

type IdleGlobal = typeof globalThis & {
  requestIdleCallback?: (callback: () => void) => number
}

/** Preserve native scheduling; browser idle time is not guaranteed after a user action. */
export function runAfterInteraction(callback: () => void): void {
  if (Platform.OS !== 'web') {
    const requestIdle = (globalThis as IdleGlobal).requestIdleCallback
    if (typeof requestIdle === 'function') {
      requestIdle(callback)
      return
    }
  }
  setTimeout(callback, 0)
}
