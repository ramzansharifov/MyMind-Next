import { describe, expect, it } from 'vitest'

import type { StudyBlock } from '../../../../../shared/contracts/study'
import {
  estimateStudyEditBlockHeight,
  shouldVirtualizeStudyEditBlocks,
  STUDY_EDIT_VIRTUALIZATION_THRESHOLD
} from './useStudyEditBlockVirtualization'

describe('study edit block virtualization', () => {
  it('enables virtualization only for sufficiently large documents with IntersectionObserver', () => {
    expect(shouldVirtualizeStudyEditBlocks(STUDY_EDIT_VIRTUALIZATION_THRESHOLD - 1, true)).toBe(false)
    expect(shouldVirtualizeStudyEditBlocks(STUDY_EDIT_VIRTUALIZATION_THRESHOLD, true)).toBe(true)
    expect(shouldVirtualizeStudyEditBlocks(STUDY_EDIT_VIRTUALIZATION_THRESHOLD + 20, false)).toBe(false)
  })

  it('uses content-aware placeholder estimates instead of one height for every block', () => {
    const shortText: StudyBlock = {
      id: 'short-text',
      type: 'text',
      text: 'Короткий текст',
      html: '<p>Короткий текст</p>'
    }
    const longText: StudyBlock = {
      id: 'long-text',
      type: 'text',
      text: 'Длинная строка '.repeat(300),
      html: '<p>Длинная строка</p>'
    }
    const divider: StudyBlock = {
      id: 'divider',
      type: 'divider',
      variant: 'solid',
      thickness: 1,
      color: '#6d5dfc'
    }

    expect(estimateStudyEditBlockHeight(longText)).toBeGreaterThan(
      estimateStudyEditBlockHeight(shortText)
    )
    expect(estimateStudyEditBlockHeight(divider)).toBeLessThan(
      estimateStudyEditBlockHeight(shortText)
    )
  })
})
