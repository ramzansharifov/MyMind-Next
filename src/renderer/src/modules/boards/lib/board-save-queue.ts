import type { BoardSnapshot } from '../../../../../shared/contracts/boards'

export type BoardSaveState = 'saved' | 'dirty' | 'saving' | 'error'

export class BoardSaveQueue {
  private latestSnapshot: BoardSnapshot | null = null
  private latestVersion = 0
  private savedVersion = 0
  private inFlight: Promise<void> | null = null
  private disposed = false

  constructor(
    private readonly save: (snapshot: BoardSnapshot) => Promise<void>,
    private readonly onStateChange: (state: BoardSaveState) => void
  ) {}

  update(snapshot: BoardSnapshot): void {
    if (this.disposed) return
    this.latestSnapshot = snapshot
    this.latestVersion += 1
    this.onStateChange('dirty')
  }

  hasUnsavedChanges(): boolean {
    return this.latestVersion > this.savedVersion
  }

  async saveLatest(): Promise<void> {
    if (this.disposed || !this.hasUnsavedChanges() || !this.latestSnapshot) {
      return
    }

    if (this.inFlight) {
      await this.inFlight
      if (this.hasUnsavedChanges()) {
        await this.saveLatest()
      }
      return
    }

    const snapshot = this.latestSnapshot
    const version = this.latestVersion
    this.onStateChange('saving')

    this.inFlight = this.save(snapshot)
      .then(() => {
        this.savedVersion = Math.max(this.savedVersion, version)
        this.onStateChange(this.hasUnsavedChanges() ? 'dirty' : 'saved')
      })
      .catch((reason: unknown) => {
        this.onStateChange('error')
        throw reason
      })
      .finally(() => {
        this.inFlight = null
      })

    await this.inFlight

    if (this.hasUnsavedChanges()) {
      await this.saveLatest()
    }
  }

  async flush(): Promise<void> {
    if (this.inFlight) {
      await this.inFlight
    }

    if (this.hasUnsavedChanges()) {
      await this.saveLatest()
    }
  }

  dispose(): void {
    this.disposed = true
  }
}
