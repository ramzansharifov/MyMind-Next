import * as Clipboard from 'expo-clipboard'

const CLEAR_AFTER_MS = 30_000

type TrackedClipboardValue = {
  token: number
  value: string
}

export interface PasswordClipboardAdapter {
  getStringAsync(): Promise<string>
  setStringAsync(value: string): Promise<unknown>
}

export interface PasswordClipboardManager {
  copy(value: string): Promise<void>
  clearTracked(): Promise<void>
}

export function createPasswordClipboardManager(
  adapter: PasswordClipboardAdapter,
  clearAfterMs = CLEAR_AFTER_MS
): PasswordClipboardManager {
  let clearTimer: ReturnType<typeof setTimeout> | null = null
  let latestCopyRequest = 0
  let nextTrackedToken = 0
  let trackedValue: TrackedClipboardValue | null = null
  let operationQueue: Promise<void> = Promise.resolve()

  const cancelClearTimer = (): void => {
    if (clearTimer !== null) clearTimeout(clearTimer)
    clearTimer = null
  }

  const enqueue = (operation: () => Promise<void>): Promise<void> => {
    const result = operationQueue.then(operation)
    operationQueue = result.then(
      () => undefined,
      () => undefined
    )
    return result
  }

  const clearIfOwned = async (tracked: TrackedClipboardValue): Promise<void> => {
    if (trackedValue?.token !== tracked.token) return
    try {
      if ((await adapter.getStringAsync()) === tracked.value) {
        await adapter.setStringAsync('')
      }
    } catch {
      if (trackedValue?.token === tracked.token) {
        await adapter.setStringAsync('').catch(() => undefined)
      }
    } finally {
      if (trackedValue?.token === tracked.token) trackedValue = null
    }
  }

  const scheduleClear = (tracked: TrackedClipboardValue): void => {
    clearTimer = setTimeout(() => {
      clearTimer = null
      void enqueue(() => clearIfOwned(tracked)).catch((reason: unknown) => {
        console.warn('Failed to clear the tracked password clipboard after timeout', reason)
      })
    }, clearAfterMs)
  }

  const copy = (value: string): Promise<void> => {
    const request = ++latestCopyRequest
    return enqueue(async () => {
      if (request !== latestCopyRequest) return
      await adapter.setStringAsync(value)
      const tracked = { token: ++nextTrackedToken, value }
      cancelClearTimer()
      trackedValue = tracked
      scheduleClear(tracked)
    })
  }

  const clearTracked = (): Promise<void> => {
    ++latestCopyRequest
    return enqueue(async () => {
      cancelClearTimer()
      const tracked = trackedValue
      if (!tracked) return
      await clearIfOwned(tracked)
    })
  }

  return { copy, clearTracked }
}

export const passwordClipboard = createPasswordClipboardManager({
  getStringAsync: Clipboard.getStringAsync,
  setStringAsync: Clipboard.setStringAsync
})
