import { describe, expect, it, vi } from 'vitest'

import {
  createStudyDraftDeletionSuspension,
  flushActiveStudyDraft,
  getActiveStudyDraftHandle,
  registerStudyDraftHandle,
  type StudyDraftDeletionSuspension
} from './study-draft-lifecycle'

function createSuspendForDeletion(): () => StudyDraftDeletionSuspension {
  return () => ({
    commit: () => undefined,
    rollback: async () => undefined
  })
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

  it('resumes and saves the retained draft after deletion failure', async () => {
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
})
