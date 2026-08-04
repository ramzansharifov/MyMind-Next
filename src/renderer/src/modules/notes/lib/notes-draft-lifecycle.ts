export interface NotesDraftHandle {
  readonly noteId: string
  hasUnsavedChanges(): boolean
  flush(): Promise<void>
}

let activeHandle: NotesDraftHandle | null = null

export function registerNotesDraftHandle(handle: NotesDraftHandle): () => void {
  activeHandle = handle

  return () => {
    if (activeHandle === handle) {
      activeHandle = null
    }
  }
}

export function getActiveNotesDraftHandle(): NotesDraftHandle | null {
  return activeHandle
}

export async function flushActiveNotesDraft(): Promise<void> {
  const handle = activeHandle

  if (handle?.hasUnsavedChanges()) {
    await handle.flush()
  }
}
