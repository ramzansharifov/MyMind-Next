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
  readonly epoch: number
  readonly promise: Promise<StudyDraftDeletionOutcome>
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

function createPendingDeletion(epoch: number): PendingStudyDraftDeletion {
  let resolvePromise: ((outcome: StudyDraftDeletionOutcome) => void) | undefined

  let rejectPromise: ((reason: unknown) => void) | undefined

  const promise = new Promise<StudyDraftDeletionOutcome>((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })

  /*
   * Rollback errors are also returned to their direct caller. This handler
   * prevents an unhandled-rejection warning when no transition or shutdown is
   * waiting for the same deletion barrier.
   */
  void promise.catch(() => undefined)

  return {
    epoch,
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

  /*
   * The latest barrier remains available after it settles. A deletion can
   * begin and finish while source.flush() is awaiting I/O, so checking only the
   * current pending value after that await would miss the completed deletion.
   */
  let latestDeletion: PendingStudyDraftDeletion | null = null

  let deletionEpoch = 0

  return {
    materialId: source.materialId,

    hasUnsavedChanges: () => pendingDeletion !== null || source.hasUnsavedChanges(),

    flush: async () => {
      let observedDeletionEpoch = deletionEpoch

      while (true) {
        const deletionBeforeFlush = pendingDeletion

        if (deletionBeforeFlush) {
          const outcome = await deletionBeforeFlush.promise

          observedDeletionEpoch = deletionBeforeFlush.epoch

          if (outcome === 'deleted') {
            return
          }

          /*
           * Rollback may have saved the retained draft itself, but invoking the
           * source flush again is intentional and safe. The autosave queue will
           * no-op when the latest version is already persisted.
           */
          continue
        }

        await source.flush()

        /*
         * No deletion started while source.flush() was awaiting. The flush is
         * complete and the transition can continue.
         */
        if (deletionEpoch === observedDeletionEpoch) {
          return
        }

        const deletionDuringFlush = latestDeletion

        observedDeletionEpoch = deletionEpoch

        if (!deletionDuringFlush || deletionDuringFlush.epoch !== observedDeletionEpoch) {
          /*
           * Defensive retry for an impossible inconsistent snapshot. Keeping
           * the loop is safer than allowing a transition to bypass deletion.
           */
          continue
        }

        const outcome = await deletionDuringFlush.promise

        if (outcome === 'deleted') {
          return
        }

        /*
         * The deletion rolled back. Repeat source.flush() so the restored
         * material is guaranteed to have its newest draft persisted.
         */
      }
    },

    suspendForDeletion: () => {
      if (pendingDeletion) {
        throw new Error('Study material deletion is already pending')
      }

      const sourceSuspension = source.suspendForDeletion()

      deletionEpoch += 1

      const deletion = createPendingDeletion(deletionEpoch)

      pendingDeletion = deletion
      latestDeletion = deletion

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
   * A pending deletion is reported as unsaved work. Module navigation and
   * application shutdown therefore wait for commit or rollback even when the
   * document itself was clean before deletion started.
   */
  if (handle?.hasUnsavedChanges()) {
    await handle.flush()
  }
}
