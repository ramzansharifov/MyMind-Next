import { randomUUID } from 'node:crypto'

import type { ShutdownResponse } from '../../shared/contracts/system'

export interface ShutdownTarget {
  sendRequest(requestId: string): void
  close(): void
}

export class ShutdownCoordinator {
  private requestId: string | null = null
  private target: ShutdownTarget | null = null
  private approved = false

  constructor(private readonly closeResources: () => void) {}

  requestShutdown(target: ShutdownTarget): void {
    if (this.approved) {
      target.close()
      return
    }

    if (this.requestId !== null) {
      return
    }

    this.requestId = randomUUID()
    this.target = target
    target.sendRequest(this.requestId)
  }

  respond(response: ShutdownResponse): void {
    if (response.requestId !== this.requestId || this.target === null) {
      throw new Error('Unknown or expired shutdown request')
    }

    if (response.decision === 'failed') {
      return
    }

    if (response.decision === 'cancel') {
      this.requestId = null
      this.target = null
      return
    }

    const target = this.target
    this.closeResources()
    this.requestId = null
    this.target = null
    this.approved = true
    target.close()
  }

  isApproved(): boolean {
    return this.approved
  }
}
