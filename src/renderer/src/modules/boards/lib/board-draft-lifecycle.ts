export interface BoardDraftHandle {
  boardId: string
  hasUnsavedChanges(): boolean
  flush(): Promise<void>
}

let activeBoardDraft: BoardDraftHandle | null = null

export function registerBoardDraftHandle(handle: BoardDraftHandle): () => void {
  activeBoardDraft = handle

  return () => {
    if (activeBoardDraft === handle) {
      activeBoardDraft = null
    }
  }
}

export function getActiveBoardDraftHandle(): BoardDraftHandle | null {
  return activeBoardDraft
}

export async function flushActiveBoardDraft(): Promise<void> {
  const handle = activeBoardDraft

  if (!handle || !handle.hasUnsavedChanges()) {
    return
  }

  await handle.flush()
}
