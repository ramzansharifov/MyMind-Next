import { describe, expect, it, vi } from 'vitest'

import {
  appendStudyInternalLinkHistory,
  clearStudyInternalLinkHistory,
  dispatchStudyInternalLinkNavigation,
  findStudyInternalLinkReturnTarget,
  normalizeStudyInternalLinkHistory,
  STUDY_INTERNAL_LINK_NAVIGATE_EVENT,
  type StudyInternalLinkHistoryEntry
} from './study-internal-link'

describe('normalizeStudyInternalLinkHistory', () => {
  it('removes only invalid entries from the end and exposes earlier history', () => {
    const history: StudyInternalLinkHistoryEntry[] = [
      { sourceMaterialId: 'A', destinationMaterialId: 'B' },
      { sourceMaterialId: 'B', destinationMaterialId: 'C' }
    ]

    expect(normalizeStudyInternalLinkHistory(history, new Set(['A', 'C']))).toEqual([
      { sourceMaterialId: 'A', destinationMaterialId: 'B' }
    ])
  })

  it('preserves invalid entries below a valid top entry', () => {
    const history: StudyInternalLinkHistoryEntry[] = [
      { sourceMaterialId: 'deleted', destinationMaterialId: 'B' },
      { sourceMaterialId: 'B', destinationMaterialId: 'C' }
    ]

    expect(normalizeStudyInternalLinkHistory(history, new Set(['B', 'C']))).toBe(history)
  })
})

describe('internal-link history behavior', () => {
  it('returns through A → B → C one entry at a time', () => {
    let history: StudyInternalLinkHistoryEntry[] = []
    history = appendStudyInternalLinkHistory(history, {
      sourceMaterialId: 'A',
      destinationMaterialId: 'B'
    })
    history = appendStudyInternalLinkHistory(history, {
      sourceMaterialId: 'B',
      destinationMaterialId: 'C'
    })

    expect(history.at(-1)?.sourceMaterialId).toBe('B')
    history = history.slice(0, -1)
    expect(history.at(-1)?.sourceMaterialId).toBe('A')
    history = history.slice(0, -1)
    expect(history).toEqual([])
  })

  it('records a same-material transition', () => {
    const history = appendStudyInternalLinkHistory([], {
      sourceMaterialId: 'A',
      destinationMaterialId: 'A'
    })

    expect(history.at(-1)).toEqual({ sourceMaterialId: 'A', destinationMaterialId: 'A' })
  })

  it('clears all entries for manual navigation', () => {
    expect(clearStudyInternalLinkHistory()).toEqual([])
  })
})

describe('internal-link navigation target', () => {
  it('does not dispatch when the resolved target is missing', () => {
    const listener = vi.fn()
    window.addEventListener(STUDY_INTERNAL_LINK_NAVIGATE_EVENT, listener)

    const dispatched = dispatchStudyInternalLinkNavigation(
      { kind: 'material', materialId: 'missing', headingId: null },
      null
    )

    expect(dispatched).toBe(false)
    expect(listener).not.toHaveBeenCalled()
    window.removeEventListener(STUDY_INTERNAL_LINK_NAVIGATE_EVENT, listener)
  })

  it('prefers an exact position globally and falls back to the source block', () => {
    const scrollContainer = document.createElement('div')
    const sourceBlock = document.createElement('div')
    sourceBlock.dataset.studyBlockId = 'source-block'
    const otherBlock = document.createElement('div')
    const exactLink = document.createElement('span')
    exactLink.dataset.studyInternalLinkPosition = '42'
    otherBlock.append(exactLink)
    scrollContainer.append(sourceBlock, otherBlock)

    expect(findStudyInternalLinkReturnTarget(scrollContainer, 42, 'source-block')).toEqual({
      target: exactLink,
      exact: true
    })
    expect(findStudyInternalLinkReturnTarget(scrollContainer, 999, 'source-block')).toEqual({
      target: sourceBlock,
      exact: false
    })
    expect(findStudyInternalLinkReturnTarget(scrollContainer, undefined, 'source-block')).toEqual({
      target: sourceBlock,
      exact: false
    })
  })
})
