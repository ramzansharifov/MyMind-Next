import { describe, expect, it } from 'vitest'

import { STUDY_FOLDER_ICON_NAMES } from '../../../../../shared/contracts/study'
import { STUDY_FOLDER_ICON_OPTIONS } from './study-folder-icon-options'

describe('STUDY_FOLDER_ICON_OPTIONS', () => {
  it('covers every supported folder icon exactly once', () => {
    const optionValues = STUDY_FOLDER_ICON_OPTIONS.map((option) => option.value)

    expect(optionValues).toEqual([...STUDY_FOLDER_ICON_NAMES])
    expect(new Set(optionValues).size).toBe(optionValues.length)
  })

  it('contains at least twice as many options as the original icon set', () => {
    expect(STUDY_FOLDER_ICON_OPTIONS.length).toBeGreaterThanOrEqual(24)
  })
})
