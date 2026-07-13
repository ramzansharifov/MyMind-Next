import type {
  AppearancePreferences,
  PreferencesApi,
  UpdateAppearancePreferencesInput
} from '../../../../shared/contracts/preferences'

function getPreferencesApi(): PreferencesApi {
  if (!window.api.preferences) {
    throw new Error('Preferences API is unavailable')
  }

  return window.api.preferences
}

export const appearanceClient = {
  getAppearance(): Promise<AppearancePreferences> {
    return getPreferencesApi().getAppearance()
  },

  updateAppearance(input: UpdateAppearancePreferencesInput): Promise<AppearancePreferences> {
    return getPreferencesApi().updateAppearance(input)
  }
}
