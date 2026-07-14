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
  private paused = false
  private active = true
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

    this.active = true
    this.paused = false

    if (this.activeSave) {
      this.setState('saving')
    } else if (this.hasUnsavedChanges()) {
      this.setState('dirty')
    } else {
      this.setState('saved')
    }
  }

  deactivate(): void {
    if (this.disposed) {
      return
    }

    this.active = false
    this.paused = true
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

    this.active = true
    this.paused = false

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
    return this.latestDraftVersion > this.lastSuccessfullySavedVersion
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
         * When the queue has been paused for deletion or deactivated during
         * unmount, the failed operation must not update an unmounted component
         * or schedule a retry. A failed deletion can later resume the queue and
         * retry the still-unsaved latest draft.
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
    } else {
      this.setState('saved')
    }
  }

  private setState(state: StudyAutosaveState): void {
    this.state = state

    if (this.active && !this.disposed) {
      this.onStateChange(state)
    }
  }
}
