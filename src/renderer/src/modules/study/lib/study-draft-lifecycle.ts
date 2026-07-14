export interface StudyDraftDeletionSuspension {
  commit(): void
  rollback(): Promise<void>
}

export interface StudyDraftHandle {
  readonly materialId: string
  hasUnsavedChanges(): boolean
  flush(): Promise<void>
  suspendForDeletion(): StudyDraftDeletionSuspension
}

interface CreateStudyDraftDeletionSuspensionOptions {
  cancelScheduledSave(): void
  pause(): void
  resume(): Promise<void>
  dispose(): void
}

let activeHandle: StudyDraftHandle | null = null

export function createStudyDraftDeletionSuspension(
  options: CreateStudyDraftDeletionSuspensionOptions
): StudyDraftDeletionSuspension {
  let settled = false

  options.cancelScheduledSave()
  options.pause()

  return {
    commit: () => {
      if (settled) {
        return
      }

      settled = true
      options.cancelScheduledSave()
      options.dispose()
    },
    rollback: () => {
      if (settled) {
        return Promise.resolve()
      }

      settled = true
      return options.resume()
    }
  }
}

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
