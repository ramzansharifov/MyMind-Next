import { clipboard } from 'electron'

const CLEAR_AFTER_MS = 30_000

type TrackedClipboardValue = {
  token: number
  value: string
}

let clearTimer: NodeJS.Timeout | null = null
let latestCopyRequest = 0
let nextTrackedToken = 0
let trackedValue: TrackedClipboardValue | null = null
let clipboardOperationQueue: Promise<void> = Promise.resolve()

function cancelClearTimer(): void {
  if (clearTimer) clearTimeout(clearTimer)
  clearTimer = null
}

function enqueueClipboardOperation(operation: () => Promise<void>): Promise<void> {
  const result = clipboardOperationQueue.then(operation)
  clipboardOperationQueue = result.then(
    () => undefined,
    () => undefined
  )
  return result
}

function scheduleTrackedClipboardClear(tracked: TrackedClipboardValue): void {
  clearTimer = setTimeout(() => {
    clearTimer = null

    void enqueueClipboardOperation(async () => {
      if (trackedValue?.token !== tracked.token) return

      try {
        const currentValue = await clipboard.readText()

        if (trackedValue?.token === tracked.token && currentValue === tracked.value) {
          clipboard.clear()
        }
      } catch {
        if (trackedValue?.token === tracked.token) {
          // Password clipboard cleanup deliberately fails closed: if the OS no
          // longer lets us inspect a value that we still track as a secret,
          // clearing it is safer than intentionally leaving that secret behind.
          clipboard.clear()
        }
      } finally {
        if (trackedValue?.token === tracked.token) {
          trackedValue = null
        }
      }
    }).catch((reason: unknown) => {
      console.warn('Failed to clear the tracked password clipboard after timeout', reason)
    })
  }, CLEAR_AFTER_MS)
  clearTimer.unref?.()
}

export function copyPasswordValue(value: string): Promise<void> {
  const request = ++latestCopyRequest

  return enqueueClipboardOperation(async () => {
    // Collapse copy requests that were superseded before their queued write
    // started. A write that has already started is allowed to finish and is
    // tracked until the next queued operation replaces or clears it.
    if (request !== latestCopyRequest) return

    await clipboard.writeText(value)

    const tracked: TrackedClipboardValue = {
      token: ++nextTrackedToken,
      value
    }

    cancelClearTimer()
    trackedValue = tracked
    scheduleTrackedClipboardClear(tracked)
  })
}

export function clearTrackedPasswordClipboard(): Promise<void> {
  // Invalidate copy requests that have not started yet. Any write already in
  // progress completes before this queued cleanup and records what it wrote.
  ++latestCopyRequest

  return enqueueClipboardOperation(async () => {
    cancelClearTimer()

    const tracked = trackedValue
    trackedValue = null
    if (tracked === null) return

    try {
      if ((await clipboard.readText()) === tracked.value) {
        clipboard.clear()
      }
    } catch {
      // See the timeout cleanup above: explicit vault/shutdown cleanup also
      // fails closed while the value is still known to be password material.
      clipboard.clear()
    }
  })
}
