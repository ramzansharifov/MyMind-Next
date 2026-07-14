export interface StudyDraftHandle {
  readonly materialId: string
  hasUnsavedChanges(): boolean
  flush(): Promise<void>
}

let activeHandle: StudyDraftHandle | null = null

export function registerStudyDraftHandle(handle: StudyDraftHandle): () => void {
  activeHandle = handle

  return () => {
    if (activeHandle === handle) {
      activeHandle = null
    }
  }
}

export function getActiveStudyDraftHandle(): StudyDraftHandle | null {
  return activeHandle
}

export async function flushActiveStudyDraft(): Promise<void> {
  const handle = activeHandle

  if (handle?.hasUnsavedChanges()) {
    await handle.flush()
  }
}
