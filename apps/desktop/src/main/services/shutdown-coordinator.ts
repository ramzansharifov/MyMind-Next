import { randomUUID } from 'node:crypto'

import type { ShutdownResponse } from '../../shared/contracts/system'

export type ShutdownFallbackReason =
  'renderer-timeout' | 'renderer-unresponsive' | 'renderer-gone' | 'operations-timeout'

export type ShutdownFallbackDecision = 'retry' | 'cancel' | 'force'

export interface ShutdownFallbackContext {
  reason: ShutdownFallbackReason
  canRetry: boolean
}

export interface ShutdownTarget {
  sendRequest(requestId: string): void
  isAvailable(): boolean
  close(): void
}

export interface ShutdownCoordinatorOptions {
  closeResources(): void
  waitForOperations(): Promise<void>
  pauseOperations(): void
  resumeOperations(): void
  resolveFallback(context: ShutdownFallbackContext): Promise<ShutdownFallbackDecision>
  scheduleTimeout?(callback: () => void, delayMs: number): () => void
  rendererResponseTimeoutMs?: number
  operationsTimeoutMs?: number
}

type ShutdownPhase = 'idle' | 'waiting-renderer' | 'waiting-user' | 'draining' | 'approved'

const DEFAULT_RENDERER_RESPONSE_TIMEOUT_MS = 8_000
const DEFAULT_OPERATIONS_TIMEOUT_MS = 15_000

function scheduleNativeTimeout(callback: () => void, delayMs: number): () => void {
  const timeout = setTimeout(callback, delayMs)

  return () => {
    clearTimeout(timeout)
  }
}

export class ShutdownCoordinator {
  private requestId: string | null = null
  private target: ShutdownTarget | null = null
  private phase: ShutdownPhase = 'idle'
  private cancelRendererTimeout: (() => void) | null = null
  private fallbackPromise: Promise<void> | null = null
  private drainPromise: Promise<void> | null = null
  private stateVersion = 0

  private readonly scheduleTimeout: (callback: () => void, delayMs: number) => () => void
  private readonly rendererResponseTimeoutMs: number
  private readonly operationsTimeoutMs: number

  constructor(private readonly options: ShutdownCoordinatorOptions) {
    this.scheduleTimeout = options.scheduleTimeout ?? scheduleNativeTimeout
    this.rendererResponseTimeoutMs =
      options.rendererResponseTimeoutMs ?? DEFAULT_RENDERER_RESPONSE_TIMEOUT_MS
    this.operationsTimeoutMs = options.operationsTimeoutMs ?? DEFAULT_OPERATIONS_TIMEOUT_MS
  }

  requestShutdown(target: ShutdownTarget): void {
    if (this.phase === 'approved') {
      target.close()
      return
    }

    if (this.requestId !== null) {
      return
    }

    this.requestId = randomUUID()
    this.target = target
    this.phase = 'waiting-renderer'
    this.stateVersion += 1

    this.sendRendererRequest()
  }

  requestShutdownWithoutRenderer(target: ShutdownTarget): Promise<void> {
    if (this.phase === 'approved') {
      target.close()
      return Promise.resolve()
    }

    if (this.requestId !== null) {
      return this.drainPromise ?? this.fallbackPromise ?? Promise.resolve()
    }

    this.requestId = randomUUID()
    this.target = target
    this.phase = 'draining'
    this.stateVersion += 1
    this.options.pauseOperations()

    const requestId = this.requestId
    const drainPromise = this.drainAndClose(requestId).finally(() => {
      if (this.drainPromise === drainPromise) {
        this.drainPromise = null
      }
    })

    this.drainPromise = drainPromise

    return drainPromise
  }

  async respond(response: ShutdownResponse): Promise<void> {
    if (response.requestId !== this.requestId || this.target === null) {
      throw new Error('Unknown or expired shutdown request')
    }

    if (this.phase === 'draining') {
      if (response.decision === 'force') {
        this.finishClose()
      }

      return
    }

    this.stateVersion += 1

    if (response.decision === 'failed') {
      this.clearRendererTimeout()
      this.phase = 'waiting-user'
      return
    }

    if (response.decision === 'cancel') {
      this.cancelShutdown()
      return
    }

    if (response.decision === 'force') {
      this.finishClose()
      return
    }

    this.clearRendererTimeout()
    this.phase = 'draining'
    this.options.pauseOperations()

    const requestId = this.requestId
    const drainPromise = this.drainAndClose(requestId).finally(() => {
      if (this.drainPromise === drainPromise) {
        this.drainPromise = null
      }
    })

    this.drainPromise = drainPromise

    return drainPromise
  }

  notifyRendererUnavailable(
    reason: Extract<ShutdownFallbackReason, 'renderer-unresponsive' | 'renderer-gone'>
  ): void {
    if (
      this.requestId === null ||
      this.phase === 'idle' ||
      this.phase === 'draining' ||
      this.phase === 'approved'
    ) {
      return
    }

    void this.resolveRendererFallback(reason)
  }

  isApproved(): boolean {
    return this.phase === 'approved'
  }

  isPending(): boolean {
    return this.requestId !== null && this.phase !== 'approved'
  }

  private sendRendererRequest(): void {
    const requestId = this.requestId
    const target = this.target

    if (!requestId || !target) {
      return
    }

    this.clearRendererTimeout()

    if (!target.isAvailable()) {
      void this.resolveRendererFallback('renderer-gone')
      return
    }

    try {
      target.sendRequest(requestId)
    } catch {
      void this.resolveRendererFallback('renderer-gone')
      return
    }

    this.phase = 'waiting-renderer'
    this.scheduleRendererResponseTimeout()
  }

  private scheduleRendererResponseTimeout(): void {
    this.clearRendererTimeout()

    this.cancelRendererTimeout = this.scheduleTimeout(() => {
      this.cancelRendererTimeout = null
      void this.resolveRendererFallback('renderer-timeout')
    }, this.rendererResponseTimeoutMs)
  }

  private async resolveRendererFallback(reason: ShutdownFallbackReason): Promise<void> {
    if (
      this.fallbackPromise ||
      this.requestId === null ||
      this.target === null ||
      this.phase === 'draining' ||
      this.phase === 'approved'
    ) {
      return this.fallbackPromise ?? Promise.resolve()
    }

    const requestId = this.requestId
    const stateVersion = this.stateVersion

    this.clearRendererTimeout()
    this.phase = 'waiting-user'

    const fallbackPromise = this.resolveFallbackSafely({
      reason,
      canRetry: this.target.isAvailable()
    })
      .then((decision) => {
        if (
          this.requestId !== requestId ||
          this.stateVersion !== stateVersion ||
          this.target === null
        ) {
          return
        }

        if (decision === 'force') {
          this.finishClose()
          return
        }

        if (decision === 'cancel') {
          this.cancelShutdown()
          return
        }

        /*
         * Clear the current fallback before resending. If sendRequest fails,
         * sendRendererRequest can then open a fresh renderer-gone fallback
         * instead of being blocked by the old fallback promise.
         */
        this.fallbackPromise = null

        if (!this.target.isAvailable()) {
          void this.resolveRendererFallback('renderer-gone')
          return
        }

        /*
         * A retry must resend the original shutdown request. Merely starting
         * another timeout would not help when the first IPC message was lost.
         */
        this.sendRendererRequest()
      })
      .finally(() => {
        if (this.fallbackPromise === fallbackPromise) {
          this.fallbackPromise = null
        }
      })

    this.fallbackPromise = fallbackPromise

    return fallbackPromise
  }

  private async drainAndClose(requestId: string): Promise<void> {
    while (this.requestId === requestId && this.target !== null && this.phase === 'draining') {
      const operationsFinished = await this.waitForOperationsWithTimeout()

      if (this.requestId !== requestId || this.target === null || this.phase !== 'draining') {
        return
      }

      if (operationsFinished) {
        this.finishClose()
        return
      }

      const decision = await this.resolveFallbackSafely({
        reason: 'operations-timeout',
        canRetry: this.target.isAvailable()
      })

      if (this.requestId !== requestId || this.target === null || this.phase !== 'draining') {
        return
      }

      if (decision === 'retry') {
        continue
      }

      if (decision === 'cancel') {
        this.cancelShutdown()
        return
      }

      this.finishClose()
      return
    }
  }

  private waitForOperationsWithTimeout(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      let settled = false

      const cancelTimeout = this.scheduleTimeout(() => {
        if (settled) {
          return
        }

        settled = true
        resolve(false)
      }, this.operationsTimeoutMs)

      this.options
        .waitForOperations()
        .then(() => {
          if (settled) {
            return
          }

          settled = true
          cancelTimeout()
          resolve(true)
        })
        .catch(() => {
          if (settled) {
            return
          }

          settled = true
          cancelTimeout()
          resolve(false)
        })
    })
  }

  private async resolveFallbackSafely(
    context: ShutdownFallbackContext
  ): Promise<ShutdownFallbackDecision> {
    try {
      return await this.options.resolveFallback(context)
    } catch {
      return 'cancel'
    }
  }

  private cancelShutdown(): void {
    this.clearRendererTimeout()
    this.requestId = null
    this.target = null
    this.phase = 'idle'
    this.stateVersion += 1
    this.options.resumeOperations()
  }

  private finishClose(): void {
    if (this.phase === 'approved') {
      return
    }

    const target = this.target

    this.clearRendererTimeout()
    this.options.pauseOperations()
    this.requestId = null
    this.target = null
    this.phase = 'approved'
    this.stateVersion += 1

    try {
      this.options.closeResources()
    } finally {
      target?.close()
    }
  }

  private clearRendererTimeout(): void {
    this.cancelRendererTimeout?.()
    this.cancelRendererTimeout = null
  }
}
