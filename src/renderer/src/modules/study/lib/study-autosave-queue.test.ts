import { describe, expect, it, vi } from 'vitest'

import { StudyAutosaveQueue } from './study-autosave-queue'

interface Deferred {
  promise: Promise<void>
  resolve(): void
  reject(reason: unknown): void
}

function createDeferred(): Deferred {
  let resolvePromise: (() => void) | undefined
  let rejectPromise: ((reason: unknown) => void) | undefined

  const promise = new Promise<void>((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })

  return {
    promise,
    resolve: () => {
      resolvePromise?.()
    },
    reject: (reason) => {
      rejectPromise?.(reason)
    }
  }
}

async function flushPromises(): Promise<void> {
  await new Promise<void>((resolve) => {
    setImmediate(resolve)
  })
}

describe('StudyAutosaveQueue', () => {
  it('retries the same latest draft after a failed save and reaches saved state', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('disk error')).mockResolvedValue(undefined)

    const states: string[] = []

    const queue = new StudyAutosaveQueue<string>(save, (state) => {
      states.push(state)
    })

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
    const firstSave = createDeferred()

    const save = vi
      .fn<(document: string) => Promise<void>>()
      .mockImplementationOnce(() => firstSave.promise)
      .mockResolvedValue(undefined)

    const queue = new StudyAutosaveQueue<string>(save, () => undefined)

    queue.hydrate('initial')
    queue.updateDraft('version-1')

    const active = queue.saveLatest()

    await flushPromises()

    queue.updateDraft('version-2')
    queue.updateDraft('version-3')

    firstSave.resolve()
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

  it('pauses follow-up saves during deletion and persists the latest draft after rollback', async () => {
    const firstSave = createDeferred()

    const save = vi
      .fn<(document: string) => Promise<void>>()
      .mockImplementationOnce(() => firstSave.promise)
      .mockResolvedValue(undefined)

    const queue = new StudyAutosaveQueue<string>(save, () => undefined)

    queue.hydrate('initial')
    queue.updateDraft('before-delete')

    const active = queue.saveLatest()

    await flushPromises()

    queue.pause()
    queue.updateDraft('edited-during-delete')

    firstSave.resolve()
    await active

    expect(save).toHaveBeenCalledTimes(1)

    expect(queue.getSnapshot()).toMatchObject({
      isPaused: true,
      isActive: true,
      latestDraftVersion: 2,
      lastSuccessfullySavedVersion: 1,
      state: 'dirty'
    })

    await queue.resume()

    expect(save).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenNthCalledWith(2, 'edited-during-delete')

    expect(queue.getSnapshot()).toMatchObject({
      isPaused: false,
      isActive: true,
      lastSuccessfullySavedVersion: 2,
      state: 'saved'
    })
  })

  it('suppresses a failing active save while deletion is pending and retries after rollback', async () => {
    const firstSave = createDeferred()

    const save = vi
      .fn<(document: string) => Promise<void>>()
      .mockImplementationOnce(() => firstSave.promise)
      .mockResolvedValue(undefined)

    const queue = new StudyAutosaveQueue<string>(save, () => undefined)

    queue.hydrate('initial')
    queue.updateDraft('latest')

    const active = queue.saveLatest()

    await flushPromises()

    queue.pause()

    firstSave.reject(new Error('material is being deleted'))

    await expect(active).resolves.toBeUndefined()

    expect(queue.getSnapshot()).toMatchObject({
      isPaused: true,
      isActive: true,
      lastSuccessfullySavedVersion: 0
    })

    await queue.resume()

    expect(save).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenNthCalledWith(2, 'latest')
    expect(queue.hasUnsavedChanges()).toBe(false)
  })

  it('deactivates for Strict Mode cleanup without creating a deletion pause', async () => {
    const save = vi.fn().mockResolvedValue(undefined)

    const states: string[] = []

    const queue = new StudyAutosaveQueue<string>(save, (state) => {
      states.push(state)
    })

    queue.hydrate('initial')
    queue.updateDraft('latest')
    queue.deactivate()

    await queue.saveLatest()

    expect(save).not.toHaveBeenCalled()

    expect(queue.getSnapshot()).toMatchObject({
      isActive: false,
      isPaused: false,
      isDisposed: false
    })

    queue.activate()
    await queue.saveLatest()

    expect(save).toHaveBeenCalledOnce()
    expect(save).toHaveBeenCalledWith('latest')
    expect(states.at(-1)).toBe('saved')
  })

  it('does not reactivate an unmounted queue when deletion rollback finishes', async () => {
    const save = vi.fn().mockResolvedValue(undefined)

    const queue = new StudyAutosaveQueue<string>(save, () => undefined)

    queue.hydrate('initial')
    queue.updateDraft('latest')

    queue.pause()
    queue.deactivate()

    await queue.resume()

    expect(save).not.toHaveBeenCalled()

    expect(queue.getSnapshot()).toMatchObject({
      isActive: false,
      isPaused: false,
      isDisposed: false,
      latestDraftVersion: 1,
      lastSuccessfullySavedVersion: 0
    })

    /*
     * A later real mount may explicitly reactivate the same queue. Rollback
     * itself did not perform that activation.
     */
    queue.activate()
    await queue.saveLatest()

    expect(save).toHaveBeenCalledOnce()
    expect(save).toHaveBeenCalledWith('latest')
  })

  it('permanently disposes the queue after confirmed deletion', async () => {
    const save = vi.fn().mockResolvedValue(undefined)

    const queue = new StudyAutosaveQueue<string>(save, () => undefined)

    queue.hydrate('initial')
    queue.updateDraft('discarded')
    queue.dispose()

    queue.updateDraft('ignored')
    queue.activate()

    await queue.saveLatest()
    await queue.resume()

    expect(save).not.toHaveBeenCalled()
    expect(queue.hasUnsavedChanges()).toBe(false)

    expect(queue.getSnapshot()).toMatchObject({
      isDisposed: true,
      isActive: false,
      isPaused: true
    })
  })
})
