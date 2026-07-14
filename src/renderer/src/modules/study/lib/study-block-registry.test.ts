import { describe, expect, it } from 'vitest'

import type { StudyBlockType } from '../../../../../shared/contracts/study'
import {
  getStudyBlockDefinition,
  studyBlockDefinitions,
  studyBlockRegistry
} from './study-block-registry'

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

  it('declares factories and render/settings strategies for every type', () => {
    for (const definition of studyBlockDefinitions) {
      expect(definition.factory(`block-${definition.type}`).type).toBe(definition.type)
      expect(definition.editStrategy).toBe(definition.type)
      expect(definition.readStrategy).toBe(definition.type)
      expect(definition.settingsStrategy).toBe(definition.type)
      expect(definition.icon).toBeDefined()
    }

    expect(Object.keys(studyBlockRegistry)).toHaveLength(studyBlockDefinitions.length)
  })
})
