import { createContext, useContext } from 'react'

import type {
  AppearancePreferences,
  AppAccentColor,
  AppResolvedTheme,
  AppThemePreference
} from '../../../../shared/contracts/preferences'

export type AppearanceStatus = 'loading' | 'ready' | 'saving' | 'error'

export interface AppearanceContextValue {
  preferences: AppearancePreferences
  resolvedTheme: AppResolvedTheme
  status: AppearanceStatus
  error: string | null
  setTheme: (theme: AppThemePreference) => void
  setAccent: (accent: AppAccentColor) => void
}

export const AppearanceContext = createContext<AppearanceContextValue | null>(null)

export function useAppearance(): AppearanceContextValue {
  const context = useContext(AppearanceContext)

  if (!context) {
    throw new Error('useAppearance must be used inside AppearanceProvider')
  }

  return context
}
