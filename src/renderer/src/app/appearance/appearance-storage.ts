import {
  DEFAULT_APPEARANCE_PREFERENCES,
  type AppearancePreferences
} from '../../../../shared/contracts/preferences'
import { parseAppearancePreferences } from '../../../../shared/validation/preferences'

const APPEARANCE_CACHE_KEY = 'mymind.appearance.v1'

export function readCachedAppearancePreferences(): AppearancePreferences {
  try {
    const value = window.localStorage.getItem(APPEARANCE_CACHE_KEY)

    if (!value) {
      return {
        ...DEFAULT_APPEARANCE_PREFERENCES
      }
    }

    return parseAppearancePreferences(JSON.parse(value))
  } catch {
    return {
      ...DEFAULT_APPEARANCE_PREFERENCES
    }
  }
}

export function writeCachedAppearancePreferences(preferences: AppearancePreferences): void {
  try {
    window.localStorage.setItem(APPEARANCE_CACHE_KEY, JSON.stringify(preferences))
  } catch {
    // The database remains the source of truth when renderer storage is unavailable.
  }
}
