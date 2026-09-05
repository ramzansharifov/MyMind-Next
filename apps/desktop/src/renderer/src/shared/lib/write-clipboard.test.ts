import { afterEach, describe, expect, it, vi } from 'vitest'

import { writeClipboard } from './write-clipboard'

afterEach(() => {
  vi.restoreAllMocks()

  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: undefined
  })

  Object.defineProperty(document, 'execCommand', {
    configurable: true,
    value: undefined
  })

  document.getSelection()?.removeAllRanges()

  document.body.replaceChildren()
})

describe('writeClipboard', () => {
  it('uses the async clipboard API without creating a fallback textarea', async () => {
    const writeText = vi.fn<(value: string) => Promise<void>>().mockResolvedValue(undefined)

    const execCommand = vi.fn()

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText
      }
    })

    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand
    })

    await writeClipboard('code')

    expect(writeText).toHaveBeenCalledOnce()

    expect(writeText).toHaveBeenCalledWith('code')

    expect(execCommand).not.toHaveBeenCalled()

    expect(document.querySelector('textarea[aria-hidden="true"]')).toBeNull()
  })

  it('falls back when the Clipboard API is unavailable', async () => {
    const execCommand = vi.fn<(command: string) => boolean>().mockReturnValue(true)

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined
    })

    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand
    })

    await writeClipboard('fallback')

    expect(execCommand).toHaveBeenCalledOnce()

    expect(execCommand).toHaveBeenCalledWith('copy')

    expect(document.querySelector('textarea[aria-hidden="true"]')).toBeNull()
  })

  it('falls back when async writeText rejects', async () => {
    const writeText = vi
      .fn<(value: string) => Promise<void>>()
      .mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'))

    const execCommand = vi.fn<(command: string) => boolean>().mockReturnValue(true)

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText
      }
    })

    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand
    })

    await expect(writeClipboard('recovered')).resolves.toBeUndefined()

    expect(writeText).toHaveBeenCalledWith('recovered')

    expect(execCommand).toHaveBeenCalledWith('copy')
  })

  it('reports failure only after both clipboard mechanisms fail', async () => {
    const writeText = vi
      .fn<(value: string) => Promise<void>>()
      .mockRejectedValue(new Error('Async clipboard failed'))

    const execCommand = vi.fn<(command: string) => boolean>().mockReturnValue(false)

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText
      }
    })

    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand
    })

    await expect(writeClipboard('failure')).rejects.toThrow('Clipboard is unavailable')

    expect(writeText).toHaveBeenCalledOnce()

    expect(execCommand).toHaveBeenCalledOnce()

    expect(document.querySelector('textarea[aria-hidden="true"]')).toBeNull()
  })

  it('restores the focused text control and its selection', async () => {
    const input = document.createElement('input')

    input.type = 'text'
    input.value = 'abcdef'

    document.body.appendChild(input)

    input.focus()
    input.setSelectionRange(1, 4, 'forward')

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined
    })

    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: vi.fn().mockReturnValue(true)
    })

    await writeClipboard('copy')

    expect(document.activeElement).toBe(input)

    expect(input.selectionStart).toBe(1)

    expect(input.selectionEnd).toBe(4)

    expect(input.selectionDirection).toBe('forward')
  })

  it('restores an existing document range after fallback copying', async () => {
    const paragraph = document.createElement('p')

    paragraph.textContent = 'abcdef'

    document.body.appendChild(paragraph)

    const textNode = paragraph.firstChild

    if (!textNode) {
      throw new Error('Expected a text node')
    }

    const selection = document.getSelection()

    if (!selection) {
      throw new Error('Expected document selection')
    }

    const range = document.createRange()

    range.setStart(textNode, 1)
    range.setEnd(textNode, 4)

    selection.removeAllRanges()
    selection.addRange(range)

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined
    })

    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: vi.fn().mockReturnValue(true)
    })

    await writeClipboard('copy')

    expect(selection.toString()).toBe('bcd')

    expect(selection.rangeCount).toBe(1)

    expect(selection.getRangeAt(0).startOffset).toBe(1)

    expect(selection.getRangeAt(0).endOffset).toBe(4)
  })
})
