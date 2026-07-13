import { describe, expect, it } from 'vitest'

import {
  DEFAULT_DIVIDER_COLOR,
  DEFAULT_DIVIDER_CSS_COLOR,
  resolveStudyDividerColor
} from './study-document'

describe('resolveStudyDividerColor', () => {
  it('uses the active application accent for default and legacy dividers', () => {
    expect(resolveStudyDividerColor()).toBe(DEFAULT_DIVIDER_CSS_COLOR)
    expect(resolveStudyDividerColor(DEFAULT_DIVIDER_COLOR.toUpperCase())).toBe(
      DEFAULT_DIVIDER_CSS_COLOR
    )
  })

  it('preserves a custom divider color', () => {
    expect(resolveStudyDividerColor('#123456')).toBe('#123456')
  })
})
