import { describe, expect, it } from 'vitest'

import type { StudyBlockType } from '../../../../../shared/contracts/study'
import { getStudyBlockDefinition, studyBlockDefinitions } from './study-block-registry'

describe('study block registry', () => {
  it('contains one unique definition for every supported block type', () => {
    const expected: StudyBlockType[] = [
      'text',
      'heading',
      'code',
      'markdown',
      'latex',
      'mermaid',
      'image',
      'video',
      'audio',
      'file',
      'divider'
    ]

    expect(studyBlockDefinitions.map(({ type }) => type)).toEqual(expected)
    expect(new Set(studyBlockDefinitions.map(({ type }) => type))).toHaveProperty(
      'size',
      expected.length
    )
    expect(getStudyBlockDefinition('video').label).toBe('Видео')
  })
})
