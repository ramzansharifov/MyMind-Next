import { describe, expect, it, vi } from 'vitest'

import { StudyMaterialTransitionCoordinator } from './study-material-transition'

describe('StudyMaterialTransitionCoordinator', () => {
  it('keeps B closed until the dirty A save completes', async () => {
    const saveControl: { resolve?: () => void } = {}
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
      flush
    }))

    const pending = coordinator.run({
      targetMaterialId: 'material-b',
      transition,
      onSavingChange: vi.fn()
    })

    expect(flush).toHaveBeenCalledOnce()
    expect(transition).not.toHaveBeenCalled()
    saveControl.resolve?.()
    await expect(pending).resolves.toEqual({ status: 'completed' })
    expect(transition).toHaveBeenCalledOnce()
  })

  it('retains A after failure, blocks duplicate transitions, and succeeds on retry', async () => {
    const saveControl: { reject?: (reason: Error) => void } = {}
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
      flush
    }))
    const input = { targetMaterialId: 'material-b', transition, onSavingChange: vi.fn() }
    const first = coordinator.run(input)

    await expect(coordinator.run(input)).resolves.toEqual({ status: 'busy' })
    saveControl.reject?.(new Error('disk full'))
    await expect(first).resolves.toEqual({ status: 'failed', reason: new Error('disk full') })
    expect(transition).not.toHaveBeenCalled()

    await expect(coordinator.run(input)).resolves.toEqual({ status: 'completed' })
    expect(transition).toHaveBeenCalledOnce()
  })

  it('does not flush for same-material navigation or a clean draft', async () => {
    const flush = vi.fn()
    const transition = vi.fn()
    const coordinator = new StudyMaterialTransitionCoordinator(() => ({
      materialId: 'material-a',
      hasUnsavedChanges: () => true,
      flush
    }))

    await coordinator.run({
      targetMaterialId: 'material-a',
      transition,
      onSavingChange: vi.fn()
    })

    expect(flush).not.toHaveBeenCalled()
    expect(transition).toHaveBeenCalledOnce()
  })
})
