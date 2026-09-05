import { clipboard } from 'electron'

const CLEAR_AFTER_MS = 30_000

let clearTimer: NodeJS.Timeout | null = null
let copiedValue: string | null = null
let copyGeneration = 0
let clipboardOperationQueue: Promise<void> = Promise.resolve()

function cancelClearTimer(): void {
  if (clearTimer) clearTimeout(clearTimer)
  clearTimer = null
}

function enqueueClipboardOperation(operation: () => Promise<void>): Promise<void> {
  const result = clipboardOperationQueue.then(operation, operation)
  clipboardOperationQueue = result.then(
    () => undefined,
    () => undefined
  )
  return result
}

function scheduleTrackedClipboardClear(generation: number, value: string): void {
  clearTimer = setTimeout(() => {
    void enqueueClipboardOperation(async () => {
      if (generation !== copyGeneration || copiedValue !== value) return

      try {
        const currentValue = await clipboard.readText()

        if (
          generation === copyGeneration &&
          copiedValue === value &&
          currentValue === value
        ) {
          clipboard.clear()
        }
      } catch {
        if (generation === copyGeneration && copiedValue === value) {
          clipboard.clear()
        }
      } finally {
        if (generation === copyGeneration && copiedValue === value) {
          copiedValue = null
          clearTimer = null
        }
      }
    })
  }, CLEAR_AFTER_MS)
  clearTimer.unref?.()
}

export function copyPasswordValue(value: string): Promise<void> {
  const generation = ++copyGeneration
  copiedValue = value
  cancelClearTimer()

  return enqueueClipboardOperation(async () => {
    if (generation !== copyGeneration || copiedValue !== value) return

    try {
      await clipboard.writeText(value)
    } catch (reason: unknown) {
      if (generation === copyGeneration && copiedValue === value) {
        copiedValue = null
      }
      throw reason
    }

    if (generation !== copyGeneration || copiedValue !== value) return
    scheduleTrackedClipboardClear(generation, value)
  })
}

export function clearTrackedPasswordClipboard(): Promise<void> {
  ++copyGeneration
  cancelClearTimer()

  const value = copiedValue
  copiedValue = null

  return enqueueClipboardOperation(async () => {
    if (value === null) return

    try {
      if ((await clipboard.readText()) === value) {
        clipboard.clear()
      }
    } catch {
      // If the clipboard cannot be inspected, fail closed so a tracked secret
      // is not intentionally left behind.
      clipboard.clear()
    }
  })
}
