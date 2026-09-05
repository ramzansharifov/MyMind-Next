import { describe, expect, it, vi } from 'vitest'

import { focusExistingAppWindow } from './single-instance'

describe('focusExistingAppWindow', () => {
  it('restores and focuses a minimized window', () => {
    const window = {
      isMinimized: vi.fn(() => true),
      restore: vi.fn(),
      show: vi.fn(),
      focus: vi.fn()
    }

    focusExistingAppWindow(window)

    expect(window.restore).toHaveBeenCalledOnce()
    expect(window.show).toHaveBeenCalledOnce()
    expect(window.focus).toHaveBeenCalledOnce()
  })

  it('does not restore a visible window', () => {
    const window = {
      isMinimized: vi.fn(() => false),
      restore: vi.fn(),
      show: vi.fn(),
      focus: vi.fn()
    }

    focusExistingAppWindow(window)

    expect(window.restore).not.toHaveBeenCalled()
    expect(window.focus).toHaveBeenCalledOnce()
  })
})
