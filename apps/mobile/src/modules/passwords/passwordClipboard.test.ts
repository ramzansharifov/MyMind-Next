import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPasswordClipboardManager } from './passwordClipboard'

vi.mock('expo-clipboard', () => ({
  getStringAsync: vi.fn(),
  setStringAsync: vi.fn()
}))

afterEach(() => {
  vi.useRealTimers()
})

describe('mobile password clipboard', () => {
  it('clears a copied secret after the TTL only while it still owns the clipboard', async () => {
    vi.useFakeTimers()
    let value = ''
    const adapter = {
      getStringAsync: vi.fn(async () => value),
      setStringAsync: vi.fn(async (next: string) => {
        value = next
      })
    }
    const manager = createPasswordClipboardManager(adapter, 1000)

    await manager.copy('secret')
    expect(value).toBe('secret')
    await vi.advanceTimersByTimeAsync(1000)
    expect(value).toBe('')
  })

  it('does not erase a value that the user copied after the password', async () => {
    vi.useFakeTimers()
    let value = ''
    const adapter = {
      getStringAsync: vi.fn(async () => value),
      setStringAsync: vi.fn(async (next: string) => {
        value = next
      })
    }
    const manager = createPasswordClipboardManager(adapter, 1000)

    await manager.copy('secret')
    value = 'user-value'
    await vi.advanceTimersByTimeAsync(1000)
    expect(value).toBe('user-value')
  })

  it('explicit cleanup invalidates queued copies and fails closed on clipboard read errors', async () => {
    let value = ''
    let releaseWrite: (() => void) | null = null
    const firstWrite = new Promise<void>((resolve) => {
      releaseWrite = resolve
    })
    const adapter = {
      getStringAsync: vi.fn(async () => {
        throw new Error('clipboard unavailable')
      }),
      setStringAsync: vi.fn(async (next: string) => {
        if (next === 'secret') await firstWrite
        value = next
      })
    }
    const manager = createPasswordClipboardManager(adapter, 30_000)

    const copy = manager.copy('secret')
    const cleanup = manager.clearTracked()
    releaseWrite?.()
    await copy
    await cleanup
    expect(value).toBe('')
  })
})
