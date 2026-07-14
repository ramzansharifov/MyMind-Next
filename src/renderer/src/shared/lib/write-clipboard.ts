interface TextControlSelection {
  element: HTMLInputElement | HTMLTextAreaElement
  start: number | null
  end: number | null
  direction: 'forward' | 'backward' | 'none' | null
}

interface ClipboardSelectionSnapshot {
  activeElement: HTMLElement | null
  textControl: TextControlSelection | null
  ranges: Range[]
}

export async function writeClipboard(value: string): Promise<void> {
  const writeText = navigator.clipboard?.writeText

  if (writeText) {
    try {
      await writeText.call(navigator.clipboard, value)

      return
    } catch {
      /*
       * Clipboard API can exist but reject because of permissions, focus,
       * document policy, an insecure context, or an incomplete test/runtime
       * implementation. Continue with the DOM fallback.
       */
    }
  }

  writeClipboardWithDomFallback(value)
}

function writeClipboardWithDomFallback(value: string): void {
  if (!document.body) {
    throw new Error('Clipboard is unavailable')
  }

  const snapshot = captureClipboardSelection()

  const textarea = document.createElement('textarea')

  textarea.value = value
  textarea.readOnly = true
  textarea.tabIndex = -1

  textarea.setAttribute('aria-hidden', 'true')

  Object.assign(textarea.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '1px',
    height: '1px',
    margin: '0',
    padding: '0',
    border: '0',
    opacity: '0',
    pointerEvents: 'none'
  })

  document.body.appendChild(textarea)

  try {
    textarea.focus({
      preventScroll: true
    })

    textarea.select()
    textarea.setSelectionRange(0, textarea.value.length)

    if (typeof document.execCommand !== 'function' || !document.execCommand('copy')) {
      throw new Error('Clipboard is unavailable')
    }
  } finally {
    textarea.remove()
    restoreClipboardSelection(snapshot)
  }
}

function captureClipboardSelection(): ClipboardSelectionSnapshot {
  const activeElement =
    document.activeElement instanceof HTMLElement ? document.activeElement : null

  const textControl =
    activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement
      ? {
          element: activeElement,
          start: activeElement.selectionStart,
          end: activeElement.selectionEnd,
          direction: activeElement.selectionDirection
        }
      : null

  const selection = document.getSelection()

  const ranges: Range[] = []

  if (selection) {
    for (let index = 0; index < selection.rangeCount; index += 1) {
      ranges.push(selection.getRangeAt(index).cloneRange())
    }
  }

  return {
    activeElement,
    textControl,
    ranges
  }
}

function restoreClipboardSelection(snapshot: ClipboardSelectionSnapshot): void {
  const { activeElement, textControl, ranges } = snapshot

  if (activeElement && activeElement.isConnected) {
    try {
      activeElement.focus({
        preventScroll: true
      })
    } catch {
      try {
        activeElement.focus()
      } catch {
        // A removed or non-focusable element cannot be restored.
      }
    }
  }

  if (
    textControl &&
    textControl.element.isConnected &&
    textControl.start !== null &&
    textControl.end !== null
  ) {
    try {
      textControl.element.setSelectionRange(
        textControl.start,
        textControl.end,
        textControl.direction
      )
    } catch {
      // Some input types do not support selection ranges.
    }
  }

  const selection = document.getSelection()

  if (!selection) {
    return
  }

  try {
    selection.removeAllRanges()

    ranges.forEach((range) => {
      selection.addRange(range)
    })
  } catch {
    /*
     * A saved range may refer to a node removed while the copy operation was
     * running. Clipboard success must not be converted into an error by focus
     * restoration.
     */
  }
}
