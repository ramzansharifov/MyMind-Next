import { eq } from 'drizzle-orm'

import {
  DEFAULT_APPEARANCE_PREFERENCES,
  type AppearancePreferences,
  type UpdateAppearancePreferencesInput
} from '../../shared/contracts/preferences'
import {
  appearancePreferencesSchema,
  parseAppearancePreferences
} from '../../shared/validation/preferences'
import { getDatabase } from '../database/client'
import { appMeta } from '../database/schema'

const APPEARANCE_PREFERENCES_KEY = 'preferences.appearance'

function getDefaultAppearancePreferences(): AppearancePreferences {
  return {
    ...DEFAULT_APPEARANCE_PREFERENCES
  }
}

function parseStoredAppearancePreferences(value: string): AppearancePreferences {
  try {
    return parseAppearancePreferences(JSON.parse(value))
  } catch {
    return getDefaultAppearancePreferences()
  }
}

export function getAppearancePreferences(): AppearancePreferences {
  const row = getDatabase()
    .select({
      value: appMeta.value
    })
    .from(appMeta)
    .where(eq(appMeta.key, APPEARANCE_PREFERENCES_KEY))
    .get()

  return row ? parseStoredAppearancePreferences(row.value) : getDefaultAppearancePreferences()
}

export function updateAppearancePreferences(
  input: UpdateAppearancePreferencesInput
): AppearancePreferences {
  const database = getDatabase()
  const nextPreferences = appearancePreferencesSchema.parse({
    ...getAppearancePreferences(),
    ...input
  })
  const updatedAt = new Date()
  const value = JSON.stringify(nextPreferences)

  database
    .insert(appMeta)
    .values({
      key: APPEARANCE_PREFERENCES_KEY,
      value,
      updatedAt
    })
    .onConflictDoUpdate({
      target: appMeta.key,
      set: {
        value,
        updatedAt
      }
    })
    .run()

  return nextPreferences
}
