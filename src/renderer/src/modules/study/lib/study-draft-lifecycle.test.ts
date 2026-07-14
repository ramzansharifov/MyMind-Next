import { describe, expect, it, vi } from 'vitest'

import {
  createStudyDraftDeletionSuspension,
  flushActiveStudyDraft,
  getActiveStudyDraftHandle,
  registerStudyDraftHandle,
  type StudyDraftDeletionSuspension
} from './study-draft-lifecycle'

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

function createSuspendForDeletion(): () => StudyDraftDeletionSuspension {
  return () => ({
    commit: () => undefined,
    rollback: async () => undefined
  })
}

async function flushPromises(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

describe('study draft lifecycle', () => {
  it('flushes the active dirty material and retains its material identity', async () => {
    const flush = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

    const unregister = registerStudyDraftHandle({
      materialId: 'material-a',
      hasUnsavedChanges: () => true,
      flush,
      suspendForDeletion: createSuspendForDeletion()
    })

    await flushActiveStudyDraft()

    expect(flush).toHaveBeenCalledOnce()

    expect(getActiveStudyDraftHandle()?.materialId).toBe('material-a')

    unregister()
  })

  it('does not flush a clean draft and unregisters only the matching handle', async () => {
    const firstFlush = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

    const firstCleanup = registerStudyDraftHandle({
      materialId: 'material-a',
      hasUnsavedChanges: () => false,
      flush: firstFlush,
      suspendForDeletion: createSuspendForDeletion()
    })

    const flushB = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

    const secondCleanup = registerStudyDraftHandle({
      materialId: 'material-b',
      hasUnsavedChanges: () => false,
      flush: flushB,
      suspendForDeletion: createSuspendForDeletion()
    })

    firstCleanup()

    await flushActiveStudyDraft()

    expect(getActiveStudyDraftHandle()?.materialId).toBe('material-b')

    expect(firstFlush).not.toHaveBeenCalled()

    expect(flushB).not.toHaveBeenCalled()

    secondCleanup()
  })

  it('cancels the scheduled save and permanently disposes after confirmed deletion', () => {
    const cancelScheduledSave = vi.fn()
    const pause = vi.fn()

    const resume = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

    const dispose = vi.fn()

    const suspension = createStudyDraftDeletionSuspension({
      cancelScheduledSave,
      pause,
      resume,
      dispose
    })

    expect(cancelScheduledSave).toHaveBeenCalledOnce()

    expect(pause).toHaveBeenCalledOnce()

    suspension.commit()
    suspension.commit()

    expect(cancelScheduledSave).toHaveBeenCalledTimes(2)

    expect(dispose).toHaveBeenCalledOnce()

    expect(resume).not.toHaveBeenCalled()
  })

  it('resumes the retained draft once after deletion failure', async () => {
    const cancelScheduledSave = vi.fn()
    const pause = vi.fn()

    const resume = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

    const dispose = vi.fn()

    const suspension = createStudyDraftDeletionSuspension({
      cancelScheduledSave,
      pause,
      resume,
      dispose
    })

    await suspension.rollback()
    await suspension.rollback()
    suspension.commit()

    expect(resume).toHaveBeenCalledOnce()

    expect(dispose).not.toHaveBeenCalled()
  })

  it('makes a clean draft appear pending and blocks flush until deletion commits', async () => {
    const sourceFlush = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

    const sourceCommit = vi.fn()

    const unregister = registerStudyDraftHandle({
      materialId: 'material-a',
      hasUnsavedChanges: () => false,
      flush: sourceFlush,
      suspendForDeletion: () => ({
        commit: sourceCommit,
        rollback: async () => undefined
      })
    })

    const handle = getActiveStudyDraftHandle()

    expect(handle).not.toBeNull()

    const suspension = handle!.suspendForDeletion()

    expect(handle!.hasUnsavedChanges()).toBe(true)

    const pendingFlush = handle!.flush()

    await flushPromises()

    expect(sourceFlush).not.toHaveBeenCalled()

    suspension.commit()

    await expect(pendingFlush).resolves.toBeUndefined()

    expect(sourceCommit).toHaveBeenCalledOnce()

    expect(sourceFlush).not.toHaveBeenCalled()

    expect(handle!.hasUnsavedChanges()).toBe(false)

    unregister()
  })

  it('waits for deletion rollback and then performs the normal draft flush', async () => {
    const rollbackControl = createDeferred()

    const sourceFlush = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

    const sourceRollback = vi.fn(() => rollbackControl.promise)

    const unregister = registerStudyDraftHandle({
      materialId: 'material-a',
      hasUnsavedChanges: () => false,
      flush: sourceFlush,
      suspendForDeletion: () => ({
        commit: vi.fn(),
        rollback: sourceRollback
      })
    })

    const handle = getActiveStudyDraftHandle()

    const suspension = handle!.suspendForDeletion()

    const rollbackPromise = suspension.rollback()

    const pendingFlush = handle!.flush()

    await flushPromises()

    expect(sourceFlush).not.toHaveBeenCalled()

    rollbackControl.resolve()

    await rollbackPromise
    await pendingFlush

    expect(sourceRollback).toHaveBeenCalledOnce()

    expect(sourceFlush).toHaveBeenCalledOnce()

    unregister()
  })

  it('waits for deletion that starts during an active flush and skips another save after commit', async () => {
    const sourceFlushControl = createDeferred()

    const sourceFlush = vi
      .fn<() => Promise<void>>()
      .mockImplementationOnce(() => sourceFlushControl.promise)
      .mockResolvedValue(undefined)

    const sourceCommit = vi.fn()

    const unregister = registerStudyDraftHandle({
      materialId: 'material-a',
      hasUnsavedChanges: () => true,
      flush: sourceFlush,
      suspendForDeletion: () => ({
        commit: sourceCommit,
        rollback: async () => undefined
      })
    })

    const handle = getActiveStudyDraftHandle()

    const pendingFlush = handle!.flush()

    expect(sourceFlush).toHaveBeenCalledOnce()

    const suspension = handle!.suspendForDeletion()

    let flushSettled = false

    void pendingFlush.then(() => {
      flushSettled = true
    })

    sourceFlushControl.resolve()
    await flushPromises()

    expect(flushSettled).toBe(false)

    suspension.commit()
    await pendingFlush

    expect(sourceCommit).toHaveBeenCalledOnce()

    expect(sourceFlush).toHaveBeenCalledOnce()

    unregister()
  })

  it('waits for rollback when deletion starts during an active flush and flushes the restored material again', async () => {
    const sourceFlushControl = createDeferred()
    const rollbackControl = createDeferred()

    const sourceFlush = vi
      .fn<() => Promise<void>>()
      .mockImplementationOnce(() => sourceFlushControl.promise)
      .mockResolvedValue(undefined)

    const sourceRollback = vi.fn(() => rollbackControl.promise)

    const unregister = registerStudyDraftHandle({
      materialId: 'material-a',
      hasUnsavedChanges: () => true,
      flush: sourceFlush,
      suspendForDeletion: () => ({
        commit: vi.fn(),
        rollback: sourceRollback
      })
    })

    const handle = getActiveStudyDraftHandle()

    const pendingFlush = handle!.flush()

    const suspension = handle!.suspendForDeletion()

    sourceFlushControl.resolve()
    await flushPromises()

    expect(sourceFlush).toHaveBeenCalledOnce()

    const rollbackPromise = suspension.rollback()

    await flushPromises()

    expect(sourceFlush).toHaveBeenCalledOnce()

    rollbackControl.resolve()

    await rollbackPromise
    await pendingFlush

    expect(sourceRollback).toHaveBeenCalledOnce()

    expect(sourceFlush).toHaveBeenCalledTimes(2)

    unregister()
  })

  it('propagates rollback save failure to transitions and shutdown waiters', async () => {
    const sourceFlush = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

    const rollbackError = new Error('rollback save failed')

    const unregister = registerStudyDraftHandle({
      materialId: 'material-a',
      hasUnsavedChanges: () => false,
      flush: sourceFlush,
      suspendForDeletion: () => ({
        commit: vi.fn(),
        rollback: vi.fn<() => Promise<void>>().mockRejectedValue(rollbackError)
      })
    })

    const handle = getActiveStudyDraftHandle()

    const suspension = handle!.suspendForDeletion()

    const pendingFlush = handle!.flush()

    await expect(suspension.rollback()).rejects.toThrow('rollback save failed')

    await expect(pendingFlush).rejects.toThrow('rollback save failed')

    expect(sourceFlush).not.toHaveBeenCalled()

    unregister()
  })
})
