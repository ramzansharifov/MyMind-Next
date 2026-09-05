import { describe, expect, it, vi } from 'vitest'

import type { StudyDraftDeletionSuspension } from './study-draft-lifecycle'
import { StudyMaterialTransitionCoordinator } from './study-material-transition'

function createDeletionSuspension(): StudyDraftDeletionSuspension {
  return {
    commit: () => undefined,
    rollback: async () => undefined
  }
}

describe('StudyMaterialTransitionCoordinator', () => {
  it('keeps B closed until the dirty A save completes', async () => {
    const saveControl: {
      resolve?: () => void
    } = {}

    const flush = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          saveControl.resolve = resolve
        })
    )

    const transition = vi.fn()

    const coordinator = new StudyMaterialTransitionCoordinator(() => ({
      materialId: 'material-a',
      hasUnsavedChanges: () => true,
      flush,
      suspendForDeletion: createDeletionSuspension
    }))

    const pending = coordinator.run({
      targetMaterialId: 'material-b',
      transition,
      onSavingChange: vi.fn()
    })

    expect(flush).toHaveBeenCalledOnce()
    expect(transition).not.toHaveBeenCalled()

    saveControl.resolve?.()

    await expect(pending).resolves.toEqual({
      status: 'completed'
    })

    expect(transition).toHaveBeenCalledOnce()
  })

  it('retains A after failure, blocks duplicate transitions, and succeeds on retry', async () => {
    const saveControl: {
      reject?: (reason: Error) => void
    } = {}

    const flush = vi
      .fn<() => Promise<void>>()
      .mockImplementationOnce(
        () =>
          new Promise<void>((_resolve, reject) => {
            saveControl.reject = reject
          })
      )
      .mockResolvedValueOnce(undefined)

    const transition = vi.fn()

    const coordinator = new StudyMaterialTransitionCoordinator(() => ({
      materialId: 'material-a',
      hasUnsavedChanges: () => true,
      flush,
      suspendForDeletion: createDeletionSuspension
    }))

    const input = {
      targetMaterialId: 'material-b',
      transition,
      onSavingChange: vi.fn()
    }

    const first = coordinator.run(input)

    await expect(coordinator.run(input)).resolves.toEqual({
      status: 'busy'
    })

    saveControl.reject?.(new Error('disk full'))

    await expect(first).resolves.toEqual({
      status: 'failed',
      reason: new Error('disk full')
    })

    expect(transition).not.toHaveBeenCalled()

    await expect(coordinator.run(input)).resolves.toEqual({
      status: 'completed'
    })

    expect(transition).toHaveBeenCalledOnce()
  })

  it('does not flush for same-material navigation', async () => {
    const flush = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

    const transition = vi.fn()

    const coordinator = new StudyMaterialTransitionCoordinator(() => ({
      materialId: 'material-a',
      hasUnsavedChanges: () => true,
      flush,
      suspendForDeletion: createDeletionSuspension
    }))

    await expect(
      coordinator.run({
        targetMaterialId: 'material-a',
        transition,
        onSavingChange: vi.fn()
      })
    ).resolves.toEqual({
      status: 'completed'
    })

    expect(flush).not.toHaveBeenCalled()
    expect(transition).toHaveBeenCalledOnce()
  })

  it('does not flush a clean draft when navigating to another material', async () => {
    const flush = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

    const transition = vi.fn()

    const coordinator = new StudyMaterialTransitionCoordinator(() => ({
      materialId: 'material-a',
      hasUnsavedChanges: () => false,
      flush,
      suspendForDeletion: createDeletionSuspension
    }))

    await expect(
      coordinator.run({
        targetMaterialId: 'material-b',
        transition,
        onSavingChange: vi.fn()
      })
    ).resolves.toEqual({
      status: 'completed'
    })

    expect(flush).not.toHaveBeenCalled()
    expect(transition).toHaveBeenCalledOnce()
  })
})
