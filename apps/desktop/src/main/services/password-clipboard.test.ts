import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  writeText: vi.fn<(value: string) => Promise<void>>(),
  readText: vi.fn<() => Promise<string>>(),
  clear: vi.fn<() => void>()
}))

vi.mock('electron', () => ({
  clipboard: {
    writeText: mocks.writeText,
    readText: mocks.readText,
    clear: mocks.clear
  }
}))

async function loadClipboardService() {
  return import('./password-clipboard')
}

beforeEach(() => {
  vi.resetModules()
  vi.useFakeTimers()
  mocks.writeText.mockReset().mockResolvedValue(undefined)
  mocks.readText.mockReset().mockResolvedValue('')
  mocks.clear.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('password clipboard', () => {
  it('clears a tracked password after the timeout when the clipboard is unchanged', async () => {
    const { copyPasswordValue } = await loadClipboardService()
    mocks.readText.mockResolvedValue('secret-123')

    await copyPasswordValue('secret-123')
    await vi.advanceTimersByTimeAsync(30_000)

    expect(mocks.writeText).toHaveBeenCalledWith('secret-123')
    expect(mocks.clear).toHaveBeenCalledOnce()
  })

  it('preserves clipboard content that the user replaced after copying a password', async () => {
    const { copyPasswordValue } = await loadClipboardService()
    mocks.readText.mockResolvedValue('user-owned-value')

    await copyPasswordValue('secret-123')
    await vi.advanceTimersByTimeAsync(30_000)

    expect(mocks.clear).not.toHaveBeenCalled()
  })

  it('clears the tracked value before an explicit vault lock completes', async () => {
    const { clearTrackedPasswordClipboard, copyPasswordValue } = await loadClipboardService()
    mocks.readText.mockResolvedValue('secret-123')

    await copyPasswordValue('secret-123')
    await clearTrackedPasswordClipboard()

    expect(mocks.clear).toHaveBeenCalledOnce()
  })

  it('skips stale queued copies when a newer password supersedes them', async () => {
    const { copyPasswordValue } = await loadClipboardService()

    const firstCopy = copyPasswordValue('old-secret')
    const secondCopy = copyPasswordValue('new-secret')
    await Promise.all([firstCopy, secondCopy])

    expect(mocks.writeText).toHaveBeenCalledTimes(1)
    expect(mocks.writeText).toHaveBeenCalledWith('new-secret')
  })

  it('clears a password whose async write was already in progress when the vault locks', async () => {
    const { clearTrackedPasswordClipboard, copyPasswordValue } = await loadClipboardService()
    let finishWrite: (() => void) | undefined

    mocks.writeText.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishWrite = resolve
        })
    )
    mocks.readText.mockResolvedValue('secret-123')

    const copy = copyPasswordValue('secret-123')
    await vi.waitFor(() => expect(mocks.writeText).toHaveBeenCalledWith('secret-123'))

    const clear = clearTrackedPasswordClipboard()
    finishWrite?.()
    await Promise.all([copy, clear])

    expect(mocks.clear).toHaveBeenCalledOnce()
  })

  it('keeps the previous password cleanup armed when a superseding write fails', async () => {
    const { copyPasswordValue } = await loadClipboardService()
    mocks.readText.mockResolvedValue('old-secret')

    await copyPasswordValue('old-secret')
    mocks.writeText.mockRejectedValueOnce(new Error('clipboard write failed'))

    await expect(copyPasswordValue('new-secret')).rejects.toThrow('clipboard write failed')
    await vi.advanceTimersByTimeAsync(30_000)

    expect(mocks.clear).toHaveBeenCalledOnce()
  })
})
