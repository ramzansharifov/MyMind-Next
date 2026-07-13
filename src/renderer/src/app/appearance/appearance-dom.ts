import type {
  AppearancePreferences,
  AppResolvedTheme,
  AppThemePreference
} from '../../../../shared/contracts/preferences'

export const SYSTEM_DARK_THEME_QUERY = '(prefers-color-scheme: dark)'

export function resolveAppearanceTheme(
  theme: AppThemePreference,
  systemPrefersDark: boolean
): AppResolvedTheme {
  if (theme === 'system') {
    return systemPrefersDark ? 'dark' : 'light'
  }

  return theme
}

export function applyAppearanceToRoot(
  root: HTMLElement,
  preferences: AppearancePreferences,
  systemPrefersDark: boolean
): AppResolvedTheme {
  const resolvedTheme = resolveAppearanceTheme(preferences.theme, systemPrefersDark)

  root.dataset.theme = resolvedTheme
  root.dataset.accent = preferences.accent
  root.style.colorScheme = resolvedTheme

  return resolvedTheme
}
