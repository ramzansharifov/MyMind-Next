export type StudyDraftDeletionOutcome = 'deleted' | 'restored'

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

interface PendingStudyDraftDeletion {
  promise: Promise<StudyDraftDeletionOutcome>
  resolve(outcome: StudyDraftDeletionOutcome): void
  reject(reason: unknown): void
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

function createPendingDeletion(): PendingStudyDraftDeletion {
  let resolvePromise: ((outcome: StudyDraftDeletionOutcome) => void) | undefined

  let rejectPromise: ((reason: unknown) => void) | undefined

  const promise = new Promise<StudyDraftDeletionOutcome>((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })

  /*
   * A rollback error is also returned to its direct caller. This attached
   * handler prevents an unhandled-rejection warning when no transition or
   * shutdown is concurrently waiting for the deletion outcome.
   */
  void promise.catch(() => undefined)

  return {
    promise,

    resolve: (outcome) => {
      resolvePromise?.(outcome)
    },

    reject: (reason) => {
      rejectPromise?.(reason)
    }
  }
}

function createTrackedStudyDraftHandle(source: StudyDraftHandle): StudyDraftHandle {
  let pendingDeletion: PendingStudyDraftDeletion | null = null

  return {
    materialId: source.materialId,

    hasUnsavedChanges: () => pendingDeletion !== null || source.hasUnsavedChanges(),

    flush: async () => {
      const deletion = pendingDeletion

      if (deletion) {
        const outcome = await deletion.promise

        if (outcome === 'deleted') {
          return
        }
      }

      await source.flush()
    },

    suspendForDeletion: () => {
      if (pendingDeletion) {
        throw new Error('Study material deletion is already pending')
      }

      const sourceSuspension = source.suspendForDeletion()

      const deletion = createPendingDeletion()

      pendingDeletion = deletion

      let settled = false
      let rollbackOperation: Promise<void> | null = null

      const clearPendingDeletion = (): void => {
        if (pendingDeletion === deletion) {
          pendingDeletion = null
        }
      }

      return {
        commit: () => {
          if (settled) {
            return
          }

          settled = true

          try {
            sourceSuspension.commit()
            clearPendingDeletion()
            deletion.resolve('deleted')
          } catch (reason: unknown) {
            clearPendingDeletion()
            deletion.reject(reason)
            throw reason
          }
        },

        rollback: () => {
          if (rollbackOperation) {
            return rollbackOperation
          }

          if (settled) {
            return deletion.promise.then(() => undefined)
          }

          settled = true

          rollbackOperation = sourceSuspension.rollback().then(
            () => {
              clearPendingDeletion()
              deletion.resolve('restored')
            },
            (reason: unknown) => {
              clearPendingDeletion()
              deletion.reject(reason)
              throw reason
            }
          )

          return rollbackOperation
        }
      }
    }
  }
}

export function registerStudyDraftHandle(handle: StudyDraftHandle): () => void {
  const trackedHandle = createTrackedStudyDraftHandle(handle)

  activeHandle = trackedHandle

  return () => {
    if (activeHandle === trackedHandle) {
      activeHandle = null
    }
  }
}

export function getActiveStudyDraftHandle(): StudyDraftHandle | null {
  return activeHandle
}

export async function flushActiveStudyDraft(): Promise<void> {
  const handle = activeHandle

  /*
   * The tracked handle reports a pending deletion as unsaved work. This makes
   * module navigation and application shutdown wait for commit or rollback,
   * even when the document itself was clean before deletion started.
   */
  if (handle?.hasUnsavedChanges()) {
    await handle.flush()
  }
}
