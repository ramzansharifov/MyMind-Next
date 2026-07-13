import { z } from 'zod'

import {
  DEFAULT_APPEARANCE_PREFERENCES,
  type AppearancePreferences
} from '../contracts/preferences'

export const appThemePreferenceSchema = z.enum(['system', 'light', 'dark'])

export const appAccentColorSchema = z.enum(['violet', 'blue', 'emerald', 'amber', 'rose'])

export const appearancePreferencesSchema = z.object({
  version: z.literal(1),
  theme: appThemePreferenceSchema,
  accent: appAccentColorSchema
})

export const updateAppearancePreferencesInputSchema = z
  .object({
    theme: appThemePreferenceSchema.optional(),
    accent: appAccentColorSchema.optional()
  })
  .refine((input) => input.theme !== undefined || input.accent !== undefined, {
    message: 'At least one appearance preference must be provided'
  })

export function parseAppearancePreferences(value: unknown): AppearancePreferences {
  const result = appearancePreferencesSchema.safeParse(value)

  return result.success ? result.data : { ...DEFAULT_APPEARANCE_PREFERENCES }
}
