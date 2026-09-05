import {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import type {
  AppearancePreferences,
  AppAccentColor,
  AppThemePreference
} from '../../../../shared/contracts/preferences'
import { appearanceClient } from './appearance-client'
import {
  AppearanceContext,
  type AppearanceContextValue,
  type AppearanceStatus
} from './appearance-context'
import {
  applyAppearanceToRoot,
  resolveAppearanceTheme,
  SYSTEM_DARK_THEME_QUERY
} from './appearance-dom'
import {
  readCachedAppearancePreferences,
  writeCachedAppearancePreferences
} from './appearance-storage'

function getSystemPrefersDark(): boolean {
  return (
    typeof window.matchMedia === 'function' && window.matchMedia(SYSTEM_DARK_THEME_QUERY).matches
  )
}

function getAppearanceError(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'Не удалось сохранить оформление'
}

export function AppearanceProvider({ children }: PropsWithChildren): React.JSX.Element {
  const [preferences, setPreferences] = useState<AppearancePreferences>(
    readCachedAppearancePreferences
  )
  const [systemPrefersDark, setSystemPrefersDark] = useState(getSystemPrefersDark)
  const [status, setStatus] = useState<AppearanceStatus>('loading')
  const [error, setError] = useState<string | null>(null)

  const mountedRef = useRef(false)
  const preferencesRef = useRef(preferences)
  const persistedPreferencesRef = useRef(preferences)
  const revisionRef = useRef(0)
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())

  const resolvedTheme = resolveAppearanceTheme(preferences.theme, systemPrefersDark)

  useLayoutEffect(() => {
    applyAppearanceToRoot(document.documentElement, preferences, systemPrefersDark)
  }, [preferences, systemPrefersDark])

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return
    }

    const mediaQuery = window.matchMedia(SYSTEM_DARK_THEME_QUERY)

    function handleSystemThemeChange(event: MediaQueryListEvent): void {
      setSystemPrefersDark(event.matches)
    }

    mediaQuery.addEventListener('change', handleSystemThemeChange)

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
    }
  }, [])

  useEffect(() => {
    let active = true
    const loadRevision = revisionRef.current

    mountedRef.current = true

    appearanceClient
      .getAppearance()
      .then((loadedPreferences) => {
        if (!active || revisionRef.current !== loadRevision) {
          return
        }

        preferencesRef.current = loadedPreferences
        persistedPreferencesRef.current = loadedPreferences
        writeCachedAppearancePreferences(loadedPreferences)

        setPreferences(loadedPreferences)
        setStatus('ready')
        setError(null)
      })
      .catch((reason: unknown) => {
        if (!active) {
          return
        }

        setStatus('error')
        setError(
          reason instanceof Error ? reason.message : 'Не удалось загрузить настройки оформления'
        )
      })

    return () => {
      active = false
      mountedRef.current = false
    }
  }, [])

  const updateAppearance = useCallback((patch: Partial<AppearancePreferences>): void => {
    const nextPreferences: AppearancePreferences = {
      ...preferencesRef.current,
      ...patch
    }

    if (
      nextPreferences.theme === preferencesRef.current.theme &&
      nextPreferences.accent === preferencesRef.current.accent
    ) {
      return
    }

    revisionRef.current += 1

    const revision = revisionRef.current

    preferencesRef.current = nextPreferences

    setPreferences(nextPreferences)
    setStatus('saving')
    setError(null)

    saveQueueRef.current = saveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const savedPreferences = await appearanceClient.updateAppearance(nextPreferences)

        persistedPreferencesRef.current = savedPreferences
        writeCachedAppearancePreferences(savedPreferences)

        if (!mountedRef.current || revision !== revisionRef.current) {
          return
        }

        preferencesRef.current = savedPreferences

        setPreferences(savedPreferences)
        setStatus('ready')
        setError(null)
      })
      .catch((reason: unknown) => {
        if (!mountedRef.current || revision !== revisionRef.current) {
          return
        }

        const fallbackPreferences = persistedPreferencesRef.current

        preferencesRef.current = fallbackPreferences
        writeCachedAppearancePreferences(fallbackPreferences)

        setPreferences(fallbackPreferences)
        setStatus('error')
        setError(getAppearanceError(reason))
      })
  }, [])

  const setTheme = useCallback(
    (theme: AppThemePreference): void => {
      updateAppearance({ theme })
    },
    [updateAppearance]
  )

  const setAccent = useCallback(
    (accent: AppAccentColor): void => {
      updateAppearance({ accent })
    },
    [updateAppearance]
  )

  const value = useMemo<AppearanceContextValue>(
    () => ({
      preferences,
      resolvedTheme,
      status,
      error,
      setTheme,
      setAccent
    }),
    [error, preferences, resolvedTheme, setAccent, setTheme, status]
  )

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
}
