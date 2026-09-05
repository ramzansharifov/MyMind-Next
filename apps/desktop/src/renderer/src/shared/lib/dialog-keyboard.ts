interface DialogKeyboardShortcutEvent {
  key: string
  shiftKey: boolean
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
}

export function isDialogConfirmShortcut(event: DialogKeyboardShortcutEvent): boolean {
  return (
    event.key === 'Enter' && event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey
  )
}
