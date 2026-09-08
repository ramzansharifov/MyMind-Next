export type AppThemePreference = 'system' | 'light' | 'dark'

export type AppResolvedTheme = Exclude<AppThemePreference, 'system'>

export type AppAccentColor = 'violet' | 'blue' | 'emerald' | 'amber' | 'rose'

export interface AppearancePreferences {
  version: 1
  theme: AppThemePreference
  accent: AppAccentColor
}

export const DEFAULT_APPEARANCE_PREFERENCES = {
  version: 1,
  theme: 'dark',
  accent: 'violet'
} as const satisfies AppearancePreferences

export interface UpdateAppearancePreferencesInput {
  theme?: AppThemePreference
  accent?: AppAccentColor
}

export const PREFERENCES_IPC_CHANNELS = {
  getAppearance: 'preferences:get-appearance',
  updateAppearance: 'preferences:update-appearance'
} as const

export interface PreferencesApi {
  getAppearance(): Promise<AppearancePreferences>
  updateAppearance(input: UpdateAppearancePreferencesInput): Promise<AppearancePreferences>
}
