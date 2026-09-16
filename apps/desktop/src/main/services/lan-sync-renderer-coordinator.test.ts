import { describe, expect, it, vi } from 'vitest'
import { LanSyncRendererCoordinator } from './lan-sync-renderer-coordinator'

describe('LanSyncRendererCoordinator', () => {
  it('resolves when the renderer confirms drafts are saved', async () => {
    const coordinator = new LanSyncRendererCoordinator(1_000, () => 'request-1')
    let requestId = ''

    const promise = coordinator.prepare(['notes', 'notes'], {
      isAvailable: () => true,
      send: (request) => {
        requestId = request.requestId
        expect(request.modules).toEqual(['notes'])
      }
    })

    coordinator.respond({ requestId, success: true })
    await expect(promise).resolves.toBeUndefined()
  })

  it('rejects when renderer reports a save failure', async () => {
    const coordinator = new LanSyncRendererCoordinator(1_000, () => 'request-2')
    const promise = coordinator.prepare(['notes'], {
      isAvailable: () => true,
      send: (request) => {
        coordinator.respond({
          requestId: request.requestId,
          success: false,
          message: 'draft failed'
        })
      }
    })

    await expect(promise).rejects.toThrow('draft failed')
  })

  it('skips preparation when the renderer is unavailable', async () => {
    const send = vi.fn()
    const coordinator = new LanSyncRendererCoordinator(1_000, () => 'request-3')

    await expect(
      coordinator.prepare(['notes'], {
        isAvailable: () => false,
        send
      })
    ).resolves.toBeUndefined()
    expect(send).not.toHaveBeenCalled()
  })
})
