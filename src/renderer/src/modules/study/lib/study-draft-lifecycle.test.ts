import { describe, expect, it, vi } from 'vitest'

import {
  flushActiveStudyDraft,
  getActiveStudyDraftHandle,
  registerStudyDraftHandle
} from './study-draft-lifecycle'

describe('study draft lifecycle', () => {
  it('flushes the active dirty material and retains its material identity', async () => {
    const flush = vi.fn().mockResolvedValue(undefined)
    const unregister = registerStudyDraftHandle({
      materialId: 'material-a',
      hasUnsavedChanges: () => true,
      flush
    })

    await flushActiveStudyDraft()

    expect(flush).toHaveBeenCalledOnce()
    expect(getActiveStudyDraftHandle()?.materialId).toBe('material-a')
    unregister()
  })

  it('does not flush a clean draft and unregisters only the matching handle', async () => {
    const firstCleanup = registerStudyDraftHandle({
      materialId: 'material-a',
      hasUnsavedChanges: () => false,
      flush: vi.fn()
    })
    const flushB = vi.fn()
    const secondCleanup = registerStudyDraftHandle({
      materialId: 'material-b',
      hasUnsavedChanges: () => false,
      flush: flushB
    })

    firstCleanup()
    await flushActiveStudyDraft()
    expect(getActiveStudyDraftHandle()?.materialId).toBe('material-b')
    expect(flushB).not.toHaveBeenCalled()
    secondCleanup()
  })
})
