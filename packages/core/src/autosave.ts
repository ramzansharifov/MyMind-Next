export interface AutosaveQueueOptions {
  delayMs?: number
  onError?: (error: unknown) => void
}

interface PendingValue<Value> {
  revision: number
  value: Value
}

/**
 * Debounced, serialized autosave for full-state documents.
 * Newer snapshots supersede older failed snapshots, while flush() never reports
 * success until the newest scheduled revision has actually been persisted.
 */
export class AutosaveQueue<Value> {
  private timer: ReturnType<typeof setTimeout> | null = null
  private pending: PendingValue<Value> | null = null
  private running: Promise<void> | null = null
  private revision = 0
  private savedRevision = 0
  private readonly delayMs: number

  constructor(
    private readonly save: (value: Value) => Promise<void>,
    private readonly options: AutosaveQueueOptions = {}
  ) {
    this.delayMs = Math.max(0, options.delayMs ?? 350)
  }

  schedule(value: Value): number {
    const revision = ++this.revision
    this.pending = { revision, value }
    this.clearTimer()
    this.timer = setTimeout(() => {
      this.timer = null
      void this.pump().catch((error) => this.options.onError?.(error))
    }, this.delayMs)
    return revision
  }

  async flush(): Promise<void> {
    this.clearTimer()
    while (this.pending || this.running) {
      if (this.running) await this.running
      else await this.pump()
    }
    if (this.savedRevision < this.revision) {
      throw new Error('Не удалось сохранить последние изменения')
    }
  }

  discardPending(): void {
    this.clearTimer()
    this.pending = null
    this.revision = this.savedRevision
  }

  hasPendingChanges(): boolean {
    return this.pending !== null || this.running !== null || this.savedRevision < this.revision
  }

  private pump(): Promise<void> {
    if (this.running) return this.running
    this.running = this.drain().finally(() => {
      this.running = null
    })
    return this.running
  }

  private async drain(): Promise<void> {
    while (this.pending) {
      const current = this.pending
      this.pending = null
      try {
        await this.save(current.value)
        this.savedRevision = Math.max(this.savedRevision, current.revision)
      } catch (error) {
        if (!this.pending) this.pending = current
        if (this.pending.revision <= current.revision) throw error
        this.options.onError?.(error)
      }
    }
  }

  private clearTimer(): void {
    if (!this.timer) return
    clearTimeout(this.timer)
    this.timer = null
  }
}
