import { randomUUID } from 'node:crypto'
import type {
  ProfileSyncPrepareRequest,
  ProfileSyncPrepareResponse
} from '../../shared/contracts/profile-sync'

interface PendingRequest {
  resolve(): void
  reject(reason: Error): void
  timer: ReturnType<typeof setTimeout>
}

export interface LanSyncRendererTarget {
  isAvailable(): boolean
  send(request: ProfileSyncPrepareRequest): void
}

export class LanSyncRendererCoordinator {
  private readonly pending = new Map<string, PendingRequest>()

  constructor(
    private readonly timeoutMs = 8_000,
    private readonly createId: () => string = randomUUID
  ) {}

  prepare(modules: readonly string[], target: LanSyncRendererTarget): Promise<void> {
    if (!target.isAvailable()) return Promise.resolve()

    const request: ProfileSyncPrepareRequest = {
      requestId: this.createId(),
      modules: [...new Set(modules)]
    }

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(request.requestId)
        reject(new Error('Не удалось подготовить открытый экран к синхронизации'))
      }, this.timeoutMs)

      this.pending.set(request.requestId, {
        resolve: () => {
          clearTimeout(timer)
          resolve()
        },
        reject: (reason) => {
          clearTimeout(timer)
          reject(reason)
        },
        timer
      })

      try {
        target.send(request)
      } catch (reason) {
        const pending = this.pending.get(request.requestId)
        this.pending.delete(request.requestId)
        pending?.reject(
          reason instanceof Error
            ? reason
            : new Error('Не удалось запросить сохранение открытого экрана')
        )
      }
    })
  }

  respond(response: ProfileSyncPrepareResponse): void {
    const pending = this.pending.get(response.requestId)
    if (!pending) return
    this.pending.delete(response.requestId)

    if (response.success) {
      pending.resolve()
      return
    }

    pending.reject(
      new Error(response.message?.trim() || 'Открытые изменения не удалось сохранить')
    )
  }

  cancelAll(message = 'Подготовка к синхронизации отменена'): void {
    const error = new Error(message)
    for (const [requestId, pending] of this.pending) {
      this.pending.delete(requestId)
      clearTimeout(pending.timer)
      pending.reject(error)
    }
  }
}
