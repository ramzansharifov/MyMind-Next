import { clipboard } from 'electron'

const CLEAR_AFTER_MS = 30_000

let clearTimer: NodeJS.Timeout | null = null
let copiedValue: string | null = null

export function copyPasswordValue(value: string): void {
  if (clearTimer) clearTimeout(clearTimer)

  clipboard.writeText(value)
  copiedValue = value

  clearTimer = setTimeout(() => {
    if (copiedValue !== null && clipboard.readText() === copiedValue) {
      clipboard.clear()
    }
    copiedValue = null
    clearTimer = null
  }, CLEAR_AFTER_MS)
  clearTimer.unref?.()
}

export function clearTrackedPasswordClipboard(): void {
  if (clearTimer) clearTimeout(clearTimer)
  clearTimer = null

  if (copiedValue !== null && clipboard.readText() === copiedValue) {
    clipboard.clear()
  }
  copiedValue = null
}
