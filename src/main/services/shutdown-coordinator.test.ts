import { describe, expect, it, vi, type Mock } from 'vitest'

import { ShutdownCoordinator } from './shutdown-coordinator'

function createTarget(): {
  sendRequest: Mock<(requestId: string) => void>
  close: Mock<() => void>
} {
  return { sendRequest: vi.fn<(requestId: string) => void>(), close: vi.fn<() => void>() }
}

describe('ShutdownCoordinator', () => {
  it('waits for a successful renderer flush before closing resources and the window', () => {
    const closeResources = vi.fn()
    const target = createTarget()
    const coordinator = new ShutdownCoordinator(closeResources)

    coordinator.requestShutdown(target)
    const requestId = target.sendRequest.mock.calls[0][0]
    expect(target.close).not.toHaveBeenCalled()
    expect(closeResources).not.toHaveBeenCalled()

    coordinator.respond({ requestId, decision: 'failed' })
    expect(target.close).not.toHaveBeenCalled()
    expect(closeResources).not.toHaveBeenCalled()

    coordinator.respond({ requestId, decision: 'success' })
    expect(closeResources).toHaveBeenCalledOnce()
    expect(target.close).toHaveBeenCalledOnce()
  })

  it('keeps the request open for retry and cancels without closing', () => {
    const closeResources = vi.fn()
    const target = createTarget()
    const coordinator = new ShutdownCoordinator(closeResources)

    coordinator.requestShutdown(target)
    coordinator.requestShutdown(target)
    expect(target.sendRequest).toHaveBeenCalledOnce()

    const requestId = target.sendRequest.mock.calls[0][0]
    coordinator.respond({ requestId, decision: 'cancel' })
    expect(closeResources).not.toHaveBeenCalled()
    expect(target.close).not.toHaveBeenCalled()
  })

  it('closes only after an explicit force response', () => {
    const closeResources = vi.fn()
    const target = createTarget()
    const coordinator = new ShutdownCoordinator(closeResources)

    coordinator.requestShutdown(target)
    const requestId = target.sendRequest.mock.calls[0][0]
    coordinator.respond({ requestId, decision: 'force' })

    expect(closeResources).toHaveBeenCalledOnce()
    expect(target.close).toHaveBeenCalledOnce()
  })
})
