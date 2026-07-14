import { describe, expect, it, vi } from 'vitest'

import { StudyAutosaveQueue } from './study-autosave-queue'

describe('StudyAutosaveQueue', () => {
  it('retries the same latest draft after a failed save and reaches saved state', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('disk error')).mockResolvedValue(undefined)
    const states: string[] = []
    const queue = new StudyAutosaveQueue<string>(save, (state) => states.push(state))
    queue.hydrate('initial')
    queue.updateDraft('latest')

    await expect(queue.saveLatest()).rejects.toThrow('disk error')
    expect(queue.getSnapshot()).toMatchObject({
      latestDraftVersion: 1,
      lastQueuedVersion: 1,
      lastSuccessfullySavedVersion: 0,
      state: 'error'
    })

    await expect(queue.flushLatestDraft()).resolves.toBeUndefined()
    expect(save).toHaveBeenNthCalledWith(1, 'latest')
    expect(save).toHaveBeenNthCalledWith(2, 'latest')
    expect(queue.getSnapshot()).toMatchObject({
      lastSuccessfullySavedVersion: 1,
      state: 'saved'
    })
    expect(states).toContain('error')
  })

  it('coalesces changes made during an active save and persists the newest document', async () => {
    let releaseFirst: (() => void) | undefined
    const save = vi
      .fn<(document: string) => Promise<void>>()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            releaseFirst = resolve
          })
      )
      .mockResolvedValue(undefined)
    const queue = new StudyAutosaveQueue<string>(save, () => undefined)
    queue.hydrate('initial')
    queue.updateDraft('version-1')
    const active = queue.saveLatest()
    await new Promise<void>((resolve) => setImmediate(resolve))

    queue.updateDraft('version-2')
    queue.updateDraft('version-3')
    releaseFirst?.()
    await active

    expect(save).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenNthCalledWith(1, 'version-1')
    expect(save).toHaveBeenNthCalledWith(2, 'version-3')
    expect(queue.getSnapshot()).toMatchObject({
      latestDraftVersion: 3,
      lastSuccessfullySavedVersion: 3,
      state: 'saved'
    })
  })
})
