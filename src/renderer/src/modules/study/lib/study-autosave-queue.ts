export type StudyAutosaveState = 'saved' | 'dirty' | 'saving' | 'error'

export interface StudyAutosaveSnapshot {
  latestDraftVersion: number
  lastQueuedVersion: number
  lastSuccessfullySavedVersion: number
  state: StudyAutosaveState
}

export class StudyAutosaveQueue<Document> {
  private latestDocument: Document | null = null
  private latestDraftVersion = 0
  private lastQueuedVersion = 0
  private lastSuccessfullySavedVersion = 0
  private activeSave: Promise<void> | null = null
  private state: StudyAutosaveState = 'saved'

  constructor(
    private readonly save: (document: Document) => Promise<void>,
    private readonly onStateChange: (state: StudyAutosaveState) => void
  ) {}

  hydrate(document: Document): void {
    this.latestDocument = document
    this.latestDraftVersion = 0
    this.lastQueuedVersion = 0
    this.lastSuccessfullySavedVersion = 0
    this.setState('saved')
  }

  updateDraft(document: Document): number {
    this.latestDocument = document
    this.latestDraftVersion += 1
    this.setState(this.activeSave ? 'saving' : 'dirty')
    return this.latestDraftVersion
  }

  hasUnsavedChanges(): boolean {
    return this.latestDraftVersion > this.lastSuccessfullySavedVersion
  }

  getSnapshot(): StudyAutosaveSnapshot {
    return {
      latestDraftVersion: this.latestDraftVersion,
      lastQueuedVersion: this.lastQueuedVersion,
      lastSuccessfullySavedVersion: this.lastSuccessfullySavedVersion,
      state: this.state
    }
  }

  saveLatest(): Promise<void> {
    if (!this.hasUnsavedChanges()) return Promise.resolve()

    if (this.activeSave) return this.activeSave

    const operation = this.drainLatestDrafts()
    this.activeSave = operation

    void operation.then(
      () => {
        if (this.activeSave === operation) this.activeSave = null
      },
      () => {
        if (this.activeSave === operation) this.activeSave = null
      }
    )

    return operation
  }

  flushLatestDraft(): Promise<void> {
    return this.saveLatest()
  }

  private async drainLatestDrafts(): Promise<void> {
    while (this.hasUnsavedChanges()) {
      const version = this.latestDraftVersion
      const document = this.latestDocument

      if (document === null) return

      this.lastQueuedVersion = version
      this.setState('saving')

      try {
        await this.save(document)
      } catch (reason: unknown) {
        this.setState('error')
        throw reason
      }

      this.lastSuccessfullySavedVersion = version
    }

    this.setState('saved')
  }

  private setState(state: StudyAutosaveState): void {
    this.state = state
    this.onStateChange(state)
  }
}
