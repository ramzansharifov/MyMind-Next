export type StudyAutosaveState = 'saved' | 'dirty' | 'saving' | 'error'

export interface StudyAutosaveSnapshot {
  latestDraftVersion: number
  lastQueuedVersion: number
  lastSuccessfullySavedVersion: number
  state: StudyAutosaveState
  isPaused: boolean
  isActive: boolean
  isDisposed: boolean
}

export class StudyAutosaveQueue<Document> {
  private latestDocument: Document | null = null
  private latestDraftVersion = 0
  private lastQueuedVersion = 0
  private lastSuccessfullySavedVersion = 0
  private activeSave: Promise<void> | null = null
  private state: StudyAutosaveState = 'saved'

  /**
   * `active` describes whether the owning editor is currently mounted.
   * It must never be changed by deletion rollback.
   */
  private active = true

  /**
   * `paused` describes only the temporary deletion suspension.
   * It is intentionally independent from the mounted state.
   */
  private paused = false

  private disposed = false

  constructor(
    private readonly save: (document: Document) => Promise<void>,
    private readonly onStateChange: (state: StudyAutosaveState) => void
  ) {}

  hydrate(document: Document): void {
    if (this.disposed) {
      return
    }

    this.latestDocument = document
    this.latestDraftVersion = 0
    this.lastQueuedVersion = 0
    this.lastSuccessfullySavedVersion = 0
    this.setState('saved')
  }

  updateDraft(document: Document): number {
    if (this.disposed) {
      return this.latestDraftVersion
    }

    this.latestDocument = document
    this.latestDraftVersion += 1
    this.setState(this.activeSave ? 'saving' : 'dirty')

    return this.latestDraftVersion
  }

  activate(): void {
    if (this.disposed) {
      return
    }

    /*
     * React Strict Mode can mount the same queue again after a development
     * cleanup. Activation must not silently cancel a real deletion pause.
     */
    this.active = true

    if (this.activeSave) {
      this.setState('saving')
      return
    }

    if (this.hasUnsavedChanges()) {
      this.setState('dirty')
      return
    }

    this.setState('saved')
  }

  deactivate(): void {
    if (this.disposed) {
      return
    }

    /*
     * Deactivation represents component unmount only. It must not create or
     * remove a deletion pause.
     */
    this.active = false
  }

  pause(): void {
    if (this.disposed) {
      return
    }

    this.paused = true

    if (!this.activeSave) {
      this.setState(this.hasUnsavedChanges() ? 'dirty' : 'saved')
    }
  }

  resume(): Promise<void> {
    if (this.disposed) {
      return Promise.resolve()
    }

    /*
     * A failed deletion may finish after the editor has already unmounted.
     * Rollback removes only the deletion pause and never remounts the queue.
     */
    this.paused = false

    if (!this.active) {
      return Promise.resolve()
    }

    if (!this.hasUnsavedChanges()) {
      this.setState('saved')
      return Promise.resolve()
    }

    return this.saveLatest()
  }

  dispose(): void {
    this.disposed = true
    this.active = false
    this.paused = true
    this.latestDocument = null
  }

  isPaused(): boolean {
    return this.paused
  }

  hasUnsavedChanges(): boolean {
    return !this.disposed && this.latestDraftVersion > this.lastSuccessfullySavedVersion
  }

  getSnapshot(): StudyAutosaveSnapshot {
    return {
      latestDraftVersion: this.latestDraftVersion,
      lastQueuedVersion: this.lastQueuedVersion,
      lastSuccessfullySavedVersion: this.lastSuccessfullySavedVersion,
      state: this.state,
      isPaused: this.paused,
      isActive: this.active,
      isDisposed: this.disposed
    }
  }

  saveLatest(): Promise<void> {
    if (this.activeSave) {
      return this.activeSave
    }

    if (this.disposed || !this.active || this.paused || !this.hasUnsavedChanges()) {
      return Promise.resolve()
    }

    const operation = this.drainLatestDrafts()
    this.activeSave = operation

    void operation.then(
      () => {
        if (this.activeSave === operation) {
          this.activeSave = null
        }
      },
      () => {
        if (this.activeSave === operation) {
          this.activeSave = null
        }
      }
    )

    return operation
  }

  flushLatestDraft(): Promise<void> {
    return this.saveLatest()
  }

  private async drainLatestDrafts(): Promise<void> {
    while (this.active && !this.paused && !this.disposed && this.hasUnsavedChanges()) {
      const version = this.latestDraftVersion
      const document = this.latestDocument

      if (document === null) {
        return
      }

      this.lastQueuedVersion = version
      this.setState('saving')

      try {
        await this.save(document)
      } catch (reason: unknown) {
        /*
         * A save that fails after deletion suspension or unmount must not
         * update an unmounted component. The draft version remains unsaved and
         * can be retried by rollback while the editor is still mounted.
         */
        if (this.disposed || !this.active || this.paused) {
          return
        }

        this.setState('error')
        throw reason
      }

      this.lastSuccessfullySavedVersion = version
    }

    if (this.disposed || !this.active) {
      return
    }

    if (this.paused || this.hasUnsavedChanges()) {
      this.setState('dirty')
      return
    }

    this.setState('saved')
  }

  private setState(state: StudyAutosaveState): void {
    this.state = state

    if (this.active && !this.disposed) {
      this.onStateChange(state)
    }
  }
}
