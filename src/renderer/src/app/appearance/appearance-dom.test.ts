import { afterEach, describe, expect, it } from 'vitest'

import type { AppearancePreferences } from '../../../../shared/contracts/preferences'
import { applyAppearanceToRoot, resolveAppearanceTheme } from './appearance-dom'

afterEach(() => {
  delete document.documentElement.dataset.theme
  delete document.documentElement.dataset.accent
  document.documentElement.style.colorScheme = ''
})

describe('appearance DOM helpers', () => {
  it('resolves explicit themes without the system preference', () => {
    expect(resolveAppearanceTheme('dark', false)).toBe('dark')
    expect(resolveAppearanceTheme('light', true)).toBe('light')
  })

  it('resolves the system theme from the media query state', () => {
    expect(resolveAppearanceTheme('system', true)).toBe('dark')
    expect(resolveAppearanceTheme('system', false)).toBe('light')
  })

  it('applies the resolved theme and accent to the document root', () => {
    const preferences: AppearancePreferences = {
      version: 1,
      theme: 'system',
      accent: 'emerald'
    }

    const resolvedTheme = applyAppearanceToRoot(document.documentElement, preferences, false)

    expect(resolvedTheme).toBe('light')
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    expect(document.documentElement).toHaveAttribute('data-accent', 'emerald')
    expect(document.documentElement.style.colorScheme).toBe('light')
  })
})
