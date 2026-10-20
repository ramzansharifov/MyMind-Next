import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore
} from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { View, useColorScheme } from 'react-native'
import { appearanceTokens } from '@mymind/design'
import {
  DEFAULT_APPEARANCE_PREFERENCES,
  type AppearancePreferences
} from '@mymind/contracts/preferences'
import { appearancePreferencesSchema } from '@mymind/core/validation/preferences'
import { ServicesContext } from '../../../mobile/src/app/context'
import type { MobileServices } from '../../../mobile/src/app/services'
import { navigationRoutes, routeTitles, routeIcons, type Route } from './navigation'
import { routeFromHash } from './routing'
import { MobileAppHeader } from '../../../mobile/src/app/MobileAppHeader'
import { MobileNavigationDrawer } from '../../../mobile/src/app/MobileNavigationDrawer'
import { dispatchHardwareBack } from '../platform/react-native'
import {
  APP_MODULE_NAVIGATE_EVENT,
  type AppModuleNavigationRequest
} from '../../../desktop/src/renderer/src/app/module-navigation'
import { ThemeContext } from '../../../mobile/src/shared/ui/theme'
import { ToastProvider } from '../../../mobile/src/shared/ui/ToastProvider'
import { ConfirmationProvider } from '../../../mobile/src/shared/ui/ConfirmationProvider'
import { MobileCreateActionOverlayProvider } from '../../../mobile/src/shared/ui/MobileCreateActionOverlay'
import { openPwaDatabase, type PwaDatabase } from '../storage/database'
import { createPwaServices, type PwaServices } from '../storage/services'
import { PwaSettings } from './PwaSettings'
import { usePwa } from './usePwa'
import { ModuleErrorBoundary } from './ModuleErrorBoundary'
import { PwaReminders } from './PwaReminders'
import { ErrorState, LoadingState } from '../../../mobile/src/shared/ui/primitives'
import { syncActivity } from '../sync/activity'
import packageInfo from '../../package.json'

const Home = lazy(() =>
  import('../../../mobile/src/app/Home').then((module) => ({ default: module.Home }))
)
const Tasks = lazy(() =>
  import('../../../mobile/src/modules/tasks/TasksScreen').then((module) => ({
    default: module.TasksScreen
  }))
)
const Habits = lazy(() =>
  import('../../../mobile/src/modules/habits/HabitsScreen').then((module) => ({
    default: module.HabitsScreen
  }))
)
const Catalog = lazy(() =>
  import('../../../mobile/src/modules/catalog/CatalogScreen').then((module) => ({
    default: module.CatalogScreen
  }))
)
const Calendar = lazy(() =>
  import('../../../mobile/src/modules/calendar/CalendarScreen').then((module) => ({
    default: module.CalendarScreen
  }))
)
const Diary = lazy(() =>
  import('../../../mobile/src/modules/diary/DiaryScreen').then((module) => ({
    default: module.DiaryScreen
  }))
)
const Nutrition = lazy(() =>
  import('../../../mobile/src/modules/nutrition/NutritionScreen').then((module) => ({
    default: module.NutritionScreen
  }))
)
const Finance = lazy(() =>
  import('../../../mobile/src/modules/finance/FinanceScreen').then((module) => ({
    default: module.FinanceScreen
  }))
)
const Passwords = lazy(() =>
  import('../../../mobile/src/modules/passwords/PasswordsScreen').then((module) => ({
    default: module.PasswordsScreen
  }))
)

const Notes = lazy(() =>
  import('../../../mobile/src/modules/notes/NotesScreen').then((module) => ({
    default: module.NotesScreen
  }))
)

let startup: Promise<{ db: PwaDatabase; services: PwaServices }> | undefined
function initialize(): NonNullable<typeof startup> {
  startup ??= openPwaDatabase().then(async (db) => ({ db, services: await createPwaServices(db) }))
  return startup
}
function appearanceFrom(services: MobileServices): AppearancePreferences {
  try {
    return appearancePreferencesSchema.parse(
      JSON.parse(services.settings.get('appearance') ?? 'null')
    )
  } catch {
    return DEFAULT_APPEARANCE_PREFERENCES
  }
}
function currentRoute(): Route {
  return routeFromHash(window.location.hash)
}

// A new Android route must deliberately wire its screen here instead of opening Settings.
function unreachableRoute(route: never): never {
  throw new Error(`Неизвестный раздел: ${String(route)}`)
}

function Workspace({
  db,
  initialServices
}: {
  db: PwaDatabase
  initialServices: PwaServices
}): React.JSX.Element {
  const [services, setServices] = useState(initialServices)
  const [epoch, setEpoch] = useState(0)
  const [route, setRoute] = useState<Route>(currentRoute)
  useEffect(() => {
    // Canonicalize legacy desktop-only and malformed deep links without touching storage.
    if (window.location.hash !== '#' + currentRoute())
      history.replaceState(null, '', '#' + currentRoute())
  }, [])
  const [resourceId, setResourceId] = useState<string | null>(null)
  const [menu, setMenu] = useState(false)
  const mobileDraft = useRef<{ flush(): Promise<void>; hasUnsavedChanges(): boolean } | null>(null)
  const registerMobileDraft = useCallback((draft: typeof mobileDraft.current) => {
    mobileDraft.current = draft
  }, [])
  const flushDrafts = useCallback(() => Promise.resolve(mobileDraft.current?.flush()), [])
  const [immersive, setImmersive] = useState(false)
  const [operationBusy, setBusy] = useState(false)
  const syncBusy = useSyncExternalStore(syncActivity.subscribe, syncActivity.snapshot)
  const busy = operationBusy || syncBusy
  const [error, setError] = useState('')
  const [appearance, setAppearance] = useState(() => appearanceFrom(initialServices))
  const system = useColorScheme()
  const pwa = usePwa()
  useEffect(() => {
    const viewport = window.visualViewport
    const resize = (): void => {
      document.documentElement.style.setProperty(
        '--pwa-height',
        `${Math.min(window.innerHeight, viewport?.height ?? window.innerHeight)}px`
      )
    }
    resize()
    viewport?.addEventListener('resize', resize)
    window.addEventListener('resize', resize)
    return () => {
      viewport?.removeEventListener('resize', resize)
      window.removeEventListener('resize', resize)
      document.documentElement.style.removeProperty('--pwa-height')
    }
  }, [])
  const saveState = useSyncExternalStore(db.subscribe, () => db.state)
  const dark = (appearance.theme === 'system' ? system : appearance.theme) !== 'light'
  const palette = {
    ...(dark ? appearanceTokens.dark : appearanceTokens.light),
    accent: appearanceTokens.accents[appearance.accent]
  }
  const navigate = useCallback(
    (next: Route): void => {
      if (busy) return
      void flushDrafts()
        .then(() =>
          db.flush().then(() => {
            if (window.location.hash !== `#${next}`) history.pushState(null, '', `#${next}`)
            setRoute(next)
            setResourceId(null)
            setImmersive(false)
            setMenu(false)
          })
        )
        .catch((reason: unknown) => setError(String(reason)))
    },
    [busy, db, flushDrafts]
  )
  useEffect(() => {
    const hash = (): void => {
      if (busy || immersive) {
        history.replaceState(null, '', `#${route}`)
        return
      }
      navigate(currentRoute())
    }
    window.addEventListener('hashchange', hash)
    return () => window.removeEventListener('hashchange', hash)
  }, [busy, immersive, navigate, route])
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent): void => {
      if (db.state !== 'saved' || immersive || busy || mobileDraft.current?.hasUnsavedChanges()) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    const hidden = (): void => {
      if (document.visibilityState === 'hidden')
        void flushDrafts()
          .then(db.flush)
          .catch(() => undefined)
    }
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      document.removeEventListener('visibilitychange', hidden)
    }
  }, [busy, db, immersive, flushDrafts])
  useEffect(() => {
    const notified = (event: MessageEvent): void => {
      if (
        event.data?.type === 'MYMIND_REMINDER_NAVIGATE' &&
        (event.data.route === 'calendar' || event.data.route === 'habits')
      )
        navigate(event.data.route)
    }
    navigator.serviceWorker?.addEventListener('message', notified)
    return () => navigator.serviceWorker?.removeEventListener('message', notified)
  }, [navigate])
  useEffect(() => {
    const requested = (event: Event): void => {
      const request = (event as CustomEvent<AppModuleNavigationRequest>).detail
      if (!request?.view || !navigationRoutes.includes(request.view as Route) || busy) return
      void flushDrafts()
        .then(db.flush)
        .then(() => {
          const next = request.view as Route
          history.pushState(null, '', `#${next}`)
          setRoute(next)
          setResourceId(request.resourceId ?? null)
          setImmersive(request.focusMode ?? false)
        })
        .catch((reason: unknown) => setError(String(reason)))
    }
    window.addEventListener(APP_MODULE_NAVIGATE_EVENT, requested)
    return () => window.removeEventListener(APP_MODULE_NAVIGATE_EVENT, requested)
  }, [busy, db, immersive, route, flushDrafts])
  useEffect(() => {
    const back = (): void => {
      if (busy || menu || dispatchHardwareBack()) {
        setMenu(false)
        history.pushState(null, '', '#' + route)
      }
    }
    const escape = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.defaultPrevented || busy) return
      if (menu) setMenu(false)
      else dispatchHardwareBack()
    }
    window.addEventListener('popstate', back)
    window.addEventListener('keydown', escape)
    return () => {
      window.removeEventListener('popstate', back)
      window.removeEventListener('keydown', escape)
    }
  }, [busy, menu, route])
  const restored = async (): Promise<void> => {
    const next = await createPwaServices(db)
    services.dispose()
    setServices(next)
    setAppearance(appearanceFrom(next))
    setEpoch((value) => value + 1)
  }
  return (
    <SafeAreaProvider>
      <ThemeContext.Provider value={palette}>
        <ServicesContext.Provider value={services}>
          <ToastProvider>
            <ConfirmationProvider>
              <MobileCreateActionOverlayProvider>
                <div
                  className={`pwa ${dark ? 'dark' : 'light'}`}
                  style={
                    {
                      '--background': palette.background,
                      '--surface': palette.surface,
                      '--text': palette.text,
                      '--muted': palette.muted,
                      '--border': palette.border,
                      '--accent': palette.accent
                    } as React.CSSProperties
                  }
                >
                  <MobileNavigationDrawer
                    visible={menu}
                    currentRoute={route}
                    close={() => setMenu(false)}
                    navigate={navigate}
                    versionLabel={`v${packageInfo.version}`}
                  />
                  {!immersive ? (
                    <header className="app-header">
                      <MobileAppHeader
                        title={routeTitles[route]}
                        icon={routeIcons[route]}
                        disabled={busy}
                        onMenuPress={() => setMenu(true)}
                      />
                    </header>
                  ) : null}
                  <main
                    className={immersive ? 'workspace immersive' : 'workspace'}
                    aria-busy={busy}
                  >
                    {error ? <ErrorState message={error} /> : null}
                    <PwaReminders services={services} db={db} paused={busy} />
                    <View style={{ flex: 1, minHeight: 0 }}>
                      <ModuleErrorBoundary key={`${route}:${epoch}`}>
                        <Suspense
                          fallback={<LoadingState />}
                        >
                          <div className="module" key={`${route}:${epoch}`}>
                            {route === 'home' ? (
                              <Home services={services} navigate={navigate} />
                            ) : route === 'notes' ? (
                              <Notes
                                onImmersiveChange={setImmersive}
                                onDraftChange={registerMobileDraft}
                                resourceId={resourceId}
                                onResourceHandled={() => setResourceId(null)}
                              />
                            ) : route === 'tasks' ? (
                              <Tasks />
                            ) : route === 'habits' ? (
                              <Habits />
                            ) : route === 'movies' || route === 'music' ? (
                              <Catalog mode={route} />
                            ) : route === 'calendar' ? (
                              <Calendar />
                            ) : route === 'diary' ? (
                              <Diary />
                            ) : route === 'nutrition' ? (
                              <Nutrition />
                            ) : route === 'finance' ? (
                              <Finance />
                            ) : route === 'passwords' ? (
                              <Passwords />
                            ) : route === 'settings' ? (
                              <PwaSettings
                                services={services}
                                db={db}
                                appearance={appearance}
                                pwa={pwa}
                                busy={busy}
                                setBusy={setBusy}
                                restored={restored}
                                save={(value) => {
                                  try {
                                    const valid = appearancePreferencesSchema.parse(value)
                                    services.settings.set('appearance', JSON.stringify(valid))
                                    setAppearance(valid)
                                  } catch (reason) {
                                    setError(String(reason))
                                  }
                                }}
                              />
                            ) : (
                              unreachableRoute(route)
                            )}
                          </div>
                        </Suspense>
                      </ModuleErrorBoundary>
                    </View>
                  </main>
                  <div className="connection sr-only" role="status">
                    {!pwa.online
                      ? 'Без интернета'
                      : pwa.offlineReady
                        ? 'Готово к офлайн'
                        : 'Локальные данные'}
                  </div>
                  <footer className={`save-status ${saveState}`} role="status" aria-live="polite">
                    {saveState === 'saved' ? (
                      'Сохранено на устройстве'
                    ) : saveState === 'saving' ? (
                      'Сохраняем на устройстве…'
                    ) : (
                      <>
                        <span>Не удалось сохранить данные. Проверьте свободное место.</span>
                        <button onClick={() => void db.flush().catch(() => undefined)}>
                          Повторить сохранение
                        </button>
                      </>
                    )}
                  </footer>
                </div>
              </MobileCreateActionOverlayProvider>
            </ConfirmationProvider>
          </ToastProvider>
        </ServicesContext.Provider>
      </ThemeContext.Provider>
    </SafeAreaProvider>
  )
}

export default function PwaApp(): React.JSX.Element {
  const [value, setValue] = useState<Awaited<ReturnType<typeof initialize>>>()
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    void initialize()
      .then((result) => {
        if (active) setValue(result)
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : String(reason))
      })
    return () => {
      active = false
    }
  }, [])
  if (error)
    return (
      <div className="startup">
        <h1>Не удалось открыть MyMind</h1>
        <p role="alert">{error}</p>
        <button onClick={() => location.reload()}>Повторить запуск</button>
      </div>
    )
  if (!value)
    return (
      <div className="startup" role="status">
        Открываем локальную библиотеку…
      </div>
    )
  return <Workspace db={value.db} initialServices={value.services} />
}
