import { afterEach, describe, expect, it, vi } from 'vitest'

import { writeClipboard } from './write-clipboard'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('writeClipboard', () => {
  it('uses the sanitized async clipboard API when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })

    await writeClipboard('code')
    expect(writeText).toHaveBeenCalledWith('code')
  })

  it('falls back to execCommand and removes the temporary textarea', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
    const execCommand = vi.fn().mockReturnValue(true)
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand })

    await writeClipboard('fallback')
    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(document.querySelector('textarea[aria-hidden="true"]')).toBeNull()
  })

  it('reports fallback copy failures and still removes the textarea', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: vi.fn().mockReturnValue(false)
    })

    await expect(writeClipboard('failure')).rejects.toThrow('Clipboard is unavailable')
    expect(document.querySelector('textarea[aria-hidden="true"]')).toBeNull()
  })
})
