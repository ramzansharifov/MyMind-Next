import { describe, expect, it } from 'vitest'

import { DEFAULT_APPEARANCE_PREFERENCES } from '../../../../shared/contracts/preferences'
import { parseAppearancePreferences } from '../../../../shared/validation/preferences'

describe('appearance preference validation', () => {
  it('provides safe defaults', () => {
    expect(DEFAULT_APPEARANCE_PREFERENCES).toEqual({
      version: 1,
      theme: 'dark',
      accent: 'violet'
    })
  })

  it('replaces corrupt or unsupported saved data with defaults', () => {
    expect(parseAppearancePreferences(null)).toEqual(DEFAULT_APPEARANCE_PREFERENCES)
    expect(parseAppearancePreferences({ version: 1, theme: 'neon', accent: 'orange' })).toEqual(
      DEFAULT_APPEARANCE_PREFERENCES
    )
    expect(parseAppearancePreferences({ version: 2, theme: 'light', accent: 'blue' })).toEqual(
      DEFAULT_APPEARANCE_PREFERENCES
    )
  })
})
