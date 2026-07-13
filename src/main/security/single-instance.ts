export interface FocusableAppWindow {
  isMinimized(): boolean
  restore(): void
  show(): void
  focus(): void
}

export function focusExistingAppWindow(window: FocusableAppWindow | null): void {
  if (!window) {
    return
  }

  if (window.isMinimized()) {
    window.restore()
  }

  window.show()
  window.focus()
}
