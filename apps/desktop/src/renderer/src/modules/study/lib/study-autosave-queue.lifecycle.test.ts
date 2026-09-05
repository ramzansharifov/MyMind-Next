import { describe, expect, it, vi } from 'vitest'

import { StudyAutosaveQueue } from './study-autosave-queue'

interface Deferred {
  promise: Promise<void>
  resolve(): void
}

function createDeferred(): Deferred {
  let resolvePromise: (() => void) | undefined

  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve
  })

  return {
    promise,
    resolve: () => {
      resolvePromise?.()
    }
  }
}

describe('StudyAutosaveQueue lifecycle edge cases', () => {
  it('keeps a clean queue saved across pause and resume and ignores calls after disposal', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const states: string[] = []
    const queue = new StudyAutosaveQueue<string>(save, (state) => {
      states.push(state)
    })

    queue.hydrate('initial')
    queue.activate()
    queue.pause()

    expect(queue.isPaused()).toBe(true)
    expect(queue.getSnapshot().state).toBe('saved')

    await queue.resume()

    expect(queue.isPaused()).toBe(false)
    expect(queue.getSnapshot().state).toBe('saved')
    expect(save).not.toHaveBeenCalled()

    queue.dispose()
    queue.hydrate('ignored')
    queue.deactivate()
    queue.pause()

    expect(queue.getSnapshot()).toMatchObject({
      isDisposed: true,
      isActive: false,
      isPaused: true
    })
    expect(states.at(-1)).toBe('saved')
  })

  it('returns the active save and restores saving state when reactivated mid-flight', async () => {
    const deferred = createDeferred()
    const save = vi.fn().mockReturnValue(deferred.promise)
    const states: string[] = []
    const queue = new StudyAutosaveQueue<string>(save, (state) => {
      states.push(state)
    })

    queue.hydrate('initial')
    queue.updateDraft('latest')

    const activeSave = queue.saveLatest()
    const duplicateRequest = queue.saveLatest()

    expect(duplicateRequest).toBe(activeSave)

    queue.deactivate()
    queue.activate()

    expect(states.at(-1)).toBe('saving')

    deferred.resolve()
    await activeSave

    expect(save).toHaveBeenCalledOnce()
    expect(queue.getSnapshot()).toMatchObject({
      lastSuccessfullySavedVersion: 1,
      state: 'saved'
    })
  })

  it('does not publish a completion state after the editor unmounts during a save', async () => {
    const deferred = createDeferred()
    const save = vi.fn().mockReturnValue(deferred.promise)
    const states: string[] = []
    const queue = new StudyAutosaveQueue<string>(save, (state) => {
      states.push(state)
    })

    queue.hydrate('initial')
    queue.updateDraft('latest')

    const activeSave = queue.saveLatest()
    queue.deactivate()

    deferred.resolve()
    await activeSave

    expect(queue.getSnapshot()).toMatchObject({
      isActive: false,
      lastSuccessfullySavedVersion: 1,
      state: 'saving'
    })
    expect(states.at(-1)).toBe('saving')
  })
})
