import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { StudyNode } from '../../../../../shared/contracts/study'
import { studyClient } from '../api/study-client'
import {
  registerStudyDraftHandle,
  type StudyDraftDeletionSuspension
} from '../lib/study-draft-lifecycle'
import { useStudy } from './use-study'

vi.mock('../api/study-client', () => ({
  studyClient: {
    listNodes: vi.fn(),
    deleteNode: vi.fn()
  }
}))

const folder: StudyNode = {
  id: 'folder-a',
  type: 'folder',
  parentId: null,
  title: 'Folder A',
  position: 0,
  isExpanded: true,
  createdAt: 1,
  updatedAt: 1
}

const activeMaterial: StudyNode = {
  id: 'material-a',
  type: 'material',
  parentId: folder.id,
  title: 'Material A',
  position: 0,
  isExpanded: false,
  createdAt: 1,
  updatedAt: 1
}

const otherMaterial: StudyNode = {
  id: 'material-b',
  type: 'material',
  parentId: null,
  title: 'Material B',
  position: 1,
  isExpanded: false,
  createdAt: 1,
  updatedAt: 1
}

let unregisterDraft: (() => void) | null = null

function registerActiveDraft(materialId: string): {
  suspendForDeletion: ReturnType<typeof vi.fn>
  suspension: StudyDraftDeletionSuspension
  commit: ReturnType<typeof vi.fn>
  rollback: ReturnType<typeof vi.fn>
} {
  const commit = vi.fn()
  const rollback = vi.fn().mockResolvedValue(undefined)
  const suspension = {
    commit,
    rollback
  }
  const suspendForDeletion = vi.fn(() => suspension)

  unregisterDraft = registerStudyDraftHandle({
    materialId,
    hasUnsavedChanges: () => true,
    flush: vi.fn().mockResolvedValue(undefined),
    suspendForDeletion
  })

  return {
    suspendForDeletion,
    suspension,
    commit,
    rollback
  }
}

async function renderLoadedStudy(
  nodes: StudyNode[]
): Promise<ReturnType<typeof renderHook<ReturnType<typeof useStudy>, unknown>>> {
  vi.mocked(studyClient.listNodes).mockResolvedValue(nodes)

  const hook = renderHook(() => useStudy())

  await waitFor(() => {
    expect(hook.result.current.isLoading).toBe(false)
  })

  return hook
}

beforeEach(() => {
  vi.mocked(studyClient.listNodes).mockReset()
  vi.mocked(studyClient.deleteNode).mockReset()
})

afterEach(() => {
  unregisterDraft?.()
  unregisterDraft = null
  cleanup()
})

describe('useStudy safe deletion', () => {
  it('disposes the active material draft only after backend deletion succeeds', async () => {
    const { suspendForDeletion, commit, rollback } = registerActiveDraft(activeMaterial.id)

    vi.mocked(studyClient.deleteNode).mockResolvedValue(true)

    const { result } = await renderLoadedStudy([activeMaterial, otherMaterial])

    let success = false

    await act(async () => {
      success = await result.current.deleteNode(activeMaterial.id)
    })

    expect(success).toBe(true)
    expect(suspendForDeletion).toHaveBeenCalledOnce()
    expect(commit).toHaveBeenCalledOnce()
    expect(rollback).not.toHaveBeenCalled()
    expect(result.current.nodes.map((node) => node.id)).toEqual([otherMaterial.id])
  })

  it('suspends the active material when its parent folder is deleted', async () => {
    const { suspendForDeletion, commit } = registerActiveDraft(activeMaterial.id)

    vi.mocked(studyClient.deleteNode).mockResolvedValue(true)

    const { result } = await renderLoadedStudy([folder, activeMaterial, otherMaterial])

    await act(async () => {
      await result.current.deleteNode(folder.id)
    })

    expect(suspendForDeletion).toHaveBeenCalledOnce()
    expect(commit).toHaveBeenCalledOnce()
    expect(result.current.nodes.map((node) => node.id)).toEqual([otherMaterial.id])
  })

  it('resumes and preserves the draft when deletion fails', async () => {
    const { suspendForDeletion, commit, rollback } = registerActiveDraft(activeMaterial.id)

    vi.mocked(studyClient.deleteNode).mockRejectedValue(new Error('database is busy'))

    const { result } = await renderLoadedStudy([activeMaterial])

    let success = true

    await act(async () => {
      success = await result.current.deleteNode(activeMaterial.id)
    })

    expect(success).toBe(false)
    expect(suspendForDeletion).toHaveBeenCalledOnce()
    expect(commit).not.toHaveBeenCalled()
    expect(rollback).toHaveBeenCalledOnce()
    expect(result.current.nodes).toEqual([activeMaterial])
    expect(result.current.error).toBe('database is busy')
  })

  it('does not suspend an unrelated active draft', async () => {
    const { suspendForDeletion, commit, rollback } = registerActiveDraft(otherMaterial.id)

    vi.mocked(studyClient.deleteNode).mockResolvedValue(true)

    const { result } = await renderLoadedStudy([activeMaterial, otherMaterial])

    await act(async () => {
      await result.current.deleteNode(activeMaterial.id)
    })

    expect(suspendForDeletion).not.toHaveBeenCalled()
    expect(commit).not.toHaveBeenCalled()
    expect(rollback).not.toHaveBeenCalled()
  })
})
