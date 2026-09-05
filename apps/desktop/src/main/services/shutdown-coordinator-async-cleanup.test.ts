import { describe, expect, it, vi } from 'vitest'

import { ShutdownCoordinator, type ShutdownTarget } from './shutdown-coordinator'

function createDeferred(): { promise: Promise<void>; resolve(): void } {
  let resolvePromise: (() => void) | undefined
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve
  })

  return {
    promise,
    resolve: () => resolvePromise?.()
  }
}

describe('ShutdownCoordinator async cleanup', () => {
  it('does not close the target until asynchronous resources are released', async () => {
    const cleanup = createDeferred()
    const close = vi.fn()
    const sendRequest = vi.fn()
    const target: ShutdownTarget = {
      sendRequest,
      isAvailable: () => true,
      close
    }

    const coordinator = new ShutdownCoordinator({
      closeResources: () => cleanup.promise,
      waitForOperations: () => Promise.resolve(),
      pauseOperations: vi.fn(),
      resumeOperations: vi.fn(),
      resolveFallback: async () => 'cancel'
    })

    coordinator.requestShutdown(target)
    const requestId = sendRequest.mock.calls[0][0]
    const responsePromise = coordinator.respond({ requestId, decision: 'success' })

    await Promise.resolve()
    await Promise.resolve()
    expect(close).not.toHaveBeenCalled()

    cleanup.resolve()
    await responsePromise

    expect(close).toHaveBeenCalledOnce()
    expect(coordinator.isApproved()).toBe(true)
  })
})
