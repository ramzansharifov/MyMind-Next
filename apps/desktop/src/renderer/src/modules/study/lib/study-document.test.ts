import { describe, expect, it } from 'vitest'

import {
  DEFAULT_DIVIDER_COLOR,
  DEFAULT_DIVIDER_CSS_COLOR,
  resolveStudyDividerColor,
  resolveStudyHeadingColor
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

describe('resolveStudyHeadingColor', () => {
  it('uses semantic text color for headings without an explicit custom color', () => {
    expect(resolveStudyHeadingColor()).toBe('var(--app-text)')
    expect(resolveStudyHeadingColor('#F2F3F5')).toBe('var(--app-text)')
  })

  it('preserves an explicit custom heading color', () => {
    expect(resolveStudyHeadingColor('#123456')).toBe('#123456')
  })
})
