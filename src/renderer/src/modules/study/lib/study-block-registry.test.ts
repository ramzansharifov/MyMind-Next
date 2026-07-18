import { describe, expect, it } from 'vitest'

import type { StudyBlockType } from '../../../../../shared/contracts/study'
import {
  getStudyBlockDefinition,
  studyBlockDefinitions,
  studyBlockRegistry
} from './study-block-registry'

const expectedBlockTypes = [
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
  'divider',
  'board'
] satisfies StudyBlockType[]

describe('study block registry', () => {
  it('contains one ordered definition for every supported block type', () => {
    const actualTypes = studyBlockDefinitions.map(({ type }) => type)

    expect(actualTypes).toEqual(expectedBlockTypes)
    expect(new Set(actualTypes).size).toBe(expectedBlockTypes.length)
    expect(Object.keys(studyBlockRegistry)).toEqual(expectedBlockTypes)
  })

  it('is the single source of block labels, icons, factories, and strategies', () => {
    for (const type of expectedBlockTypes) {
      const definition = getStudyBlockDefinition(type)

      expect(definition).toBe(studyBlockRegistry[type])
      expect(definition.type).toBe(type)
      expect(definition.label.trim()).not.toBe('')
      expect(definition.icon).toBeTruthy()

      const id = `block-${type}`
      const block = definition.factory(id)

      expect(block.id).toBe(id)
      expect(block.type).toBe(type)
      expect(definition.editStrategy).toBe(type)
      expect(definition.readStrategy).toBe(type)
      expect(definition.settingsStrategy).toBe(type)
    }
  })

  it('keeps user-facing labels stable for every registered type', () => {
    expect(
      studyBlockDefinitions.map(({ type, label }) => ({
        type,
        label
      }))
    ).toEqual([
      { type: 'text', label: 'Форматированный текст' },
      { type: 'heading', label: 'Заголовок' },
      { type: 'code', label: 'Код' },
      { type: 'markdown', label: 'Markdown' },
      { type: 'latex', label: 'LaTeX' },
      { type: 'mermaid', label: 'Mermaid' },
      { type: 'image', label: 'Фото' },
      { type: 'video', label: 'Видео' },
      { type: 'audio', label: 'Аудио' },
      { type: 'file', label: 'Файл' },
      { type: 'divider', label: 'Разделитель' },
      { type: 'board', label: 'Доска' }
    ])
  })
})
