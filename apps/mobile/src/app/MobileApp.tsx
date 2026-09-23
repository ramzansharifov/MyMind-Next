import { useCallback, useEffect, useState } from 'react'
import { BackHandler, Platform, Pressable, Text, useColorScheme, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { appearanceTokens } from '@mymind/design'
import {
  DEFAULT_APPEARANCE_PREFERENCES,
  type AppearancePreferences
} from '@mymind/contracts/preferences'
import { appearancePreferencesSchema } from '@mymind/core/validation/preferences'
import { ServicesContext } from './context'
import { createMobileServices, type MobileServices } from './services'
import { routeIcons, routeTitles, type Route } from './navigation'
import { MobileNavigationDrawer } from './MobileNavigationDrawer'
import { exportMobileBackup, restoreMobileBackup } from '../shared/backup/mobileBackup'
import { openMobileDatabase } from '../shared/storage/mobileDatabase'
import { ThemeContext } from '../shared/ui/theme'
import { ErrorState, LoadingState } from '../shared/ui/primitives'
import { AppIcon } from '../shared/ui/icons'
import { messageFor } from '../shared/ui/form-model'
import { ConfirmationProvider } from '../shared/ui/ConfirmationProvider'
import { ToastProvider } from '../shared/ui/ToastProvider'
import { MobileCreateActionOverlayProvider } from '../shared/ui/MobileCreateActionOverlay'
import { TasksScreen } from '../modules/tasks/TasksScreen'
import { HabitsScreen } from '../modules/habits/HabitsScreen'
import { NotesScreen } from '../modules/notes/NotesScreen'
import { CatalogScreen } from '../modules/catalog/CatalogScreen'
import { CalendarScreen } from '../modules/calendar/CalendarScreen'
import { DiaryScreen } from '../modules/diary/DiaryScreen'
import { NutritionScreen } from '../modules/nutrition/NutritionScreen'
import { FinanceScreen } from '../modules/finance/FinanceScreen'
import { PasswordsScreen } from '../modules/passwords/PasswordsScreen'
import { Home } from './Home'
import { Settings } from './Settings'
import { ReminderStatus } from './ReminderStatus'
import { useMobileUpdater } from './useMobileUpdater'

export type { Route } from './navigation'

type BackupOperation = 'export' | 'restore'

let databasePromise: ReturnType<typeof openMobileDatabase> | undefined
let servicesPromise: Promise<MobileServices> | undefined

function database(): ReturnType<typeof openMobileDatabase> {
  databasePromise ??= openMobileDatabase().catch((error) => {
    databasePromise = undefined
    servicesPromise = undefined
    throw error
  })
  return databasePromise
}

function initialize(): Promise<MobileServices> {
  servicesPromise ??= database()
    .then(createMobileServices)
    .catch((error) => {
      servicesPromise = undefined
      throw error
    })
  return servicesPromise
}

function readAppearance(services: MobileServices): AppearancePreferences {
  const stored = services.settings.get('appearance')
  if (!stored) return DEFAULT_APPEARANCE_PREFERENCES
  try {
    return appearancePreferencesSchema.parse(JSON.parse(stored))
  } catch {
    return DEFAULT_APPEARANCE_PREFERENCES
  }
}

export default function MobileApp(): React.JSX.Element {
  const system = useColorScheme()
  const [services, setServices] = useState<MobileServices | null>(null)
  const [servicesEpoch, setServicesEpoch] = useState(0)
  const [appearance, setAppearance] = useState<AppearancePreferences>(
    DEFAULT_APPEARANCE_PREFERENCES
  )
  const [route, setRoute] = useState<Route>('home')
  const [navigationOpen, setNavigationOpen] = useState(false)
  const [immersive, setImmersive] = useState(false)
  const [backupOperation, setBackupOperation] = useState<BackupOperation | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const updater = useMobileUpdater()
  const dark = (appearance.theme === 'system' ? (system ?? 'dark') : appearance.theme) === 'dark'
  const palette = {
    ...(dark ? appearanceTokens.dark : appearanceTokens.light),
    accent: appearanceTokens.accents[appearance.accent]
  }

  const navigate = useCallback(
    (next: Route): void => {
      if (backupOperation) return
      setNavigationOpen(false)
      setImmersive(false)
      setRoute(next)
    },
    [backupOperation]
  )

  useEffect(() => {
    let active = true
    initialize()
      .then((value) => {
        if (!active) return
        setServices(value)
        setAppearance(readAppearance(value))
        setError('')
      })
      .catch((reason) => {
        if (active) setError(messageFor(reason))
      })
    return () => {
      active = false
    }
  }, [attempt])

  useEffect(() => {
    if (Platform.OS !== 'android') return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (navigationOpen) {
        setNavigationOpen(false)
        return true
      }
      if (backupOperation) return true
      if (immersive) return false
      if (route === 'home') return false
      navigate('home')
      return true
    })
    return () => subscription.remove()
  }, [backupOperation, immersive, navigate, navigationOpen, route])

  const saveAppearance = useCallback(
    (next: AppearancePreferences): void => {
      if (backupOperation) return
      try {
        const valid = appearancePreferencesSchema.parse(next)
        services?.settings.set('appearance', JSON.stringify(valid))
        setAppearance(valid)
        setError('')
      } catch (reason) {
        setError(messageFor(reason))
      }
    },
    [backupOperation, services]
  )

  const exportBackup = useCallback(async () => {
    if (backupOperation) throw new Error('Операция резервного копирования уже выполняется')
    setNavigationOpen(false)
    setBackupOperation('export')
    setError('')
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    try {
      return await exportMobileBackup(await database())
    } catch (reason) {
      setError(messageFor(reason))
      throw reason
    } finally {
      setBackupOperation(null)
    }
  }, [backupOperation])

  const restoreBackup = useCallback(async () => {
    if (backupOperation) throw new Error('Операция резервного копирования уже выполняется')
    setNavigationOpen(false)
    setBackupOperation('restore')
    setError('')
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    try {
      const db = await database()
      const result = await restoreMobileBackup(db)
      if (result.restored) {
        const nextServices = createMobileServices(db)
        servicesPromise = Promise.resolve(nextServices)
        setServices(nextServices)
        setAppearance(readAppearance(nextServices))
        setServicesEpoch((value) => value + 1)
      }
      return result
    } catch (reason) {
      setError(messageFor(reason))
      throw reason
    } finally {
      setBackupOperation(null)
    }
  }, [backupOperation])

  return (
    <SafeAreaProvider>
      <ThemeContext.Provider value={palette}>
        <ToastProvider>
          <ConfirmationProvider>
            <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
              <StatusBar style={dark ? 'light' : 'dark'} />

              <MobileCreateActionOverlayProvider>
                <MobileNavigationDrawer
                visible={navigationOpen}
                currentRoute={route}
                updater={updater}
                close={() => setNavigationOpen(false)}
                navigate={navigate}
              />

              {!immersive ? (
                <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 }}>
                  <View
                    style={{
                      minHeight: 80,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: palette.border,
                      borderRadius: 28,
                      backgroundColor: palette.surface,
                      elevation: 2
                    }}
                  >
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        top: -82,
                        right: 18,
                        width: 190,
                        height: 190,
                        borderRadius: 95,
                        backgroundColor: palette.accent + '12'
                      }}
                    />
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        bottom: -100,
                        left: -54,
                        width: 176,
                        height: 176,
                        borderRadius: 88,
                        backgroundColor: palette.accent + '08'
                      }}
                    />

                    <View
                      style={{
                        flex: 1,
                        minWidth: 0,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12
                      }}
                    >
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: palette.accent + '33',
                          borderRadius: 16,
                          backgroundColor: palette.accent + '14'
                        }}
                      >
                        <AppIcon
                          name={routeIcons[route]}
                          size={23}
                          strokeWidth={2}
                          color={palette.accent}
                        />
                      </View>

                      <Text
                        numberOfLines={1}
                        style={{
                          flex: 1,
                          color: palette.text,
                          fontSize: 25,
                          lineHeight: 31,
                          fontWeight: '600',
                          letterSpacing: -0.8
                        }}
                      >
                        {routeTitles[route]}
                      </Text>
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Открыть меню навигации"
                      disabled={backupOperation !== null}
                      hitSlop={6}
                      onPress={() => setNavigationOpen(true)}
                      style={({ pressed }) => ({
                        width: 44,
                        height: 44,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: palette.border,
                        borderRadius: 14,
                        backgroundColor: pressed ? palette.raised : palette.background + '99',
                        opacity: backupOperation ? 0.45 : pressed ? 0.76 : 1
                      })}
                    >
                      <AppIcon name="menu" size={21} strokeWidth={2} color={palette.muted} />
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {error ? (
                <View style={{ paddingHorizontal: 16 }}>
                  <ErrorState
                    message={error}
                    retry={() => {
                      setError('')
                      setAttempt((value) => value + 1)
                    }}
                  />
                </View>
              ) : null}

              {!services ? (
                !error && <LoadingState />
              ) : (
                <ServicesContext.Provider value={services} key={servicesEpoch}>
                  {!backupOperation ? <ReminderStatus services={services} /> : null}

                  <View
                    style={{
                      flex: 1,
                      paddingHorizontal: immersive ? 0 : 16,
                      paddingBottom: immersive ? 0 : 8,
                      minHeight: 0
                    }}
                    key={route}
                  >
                    {route === 'home' ? (
                      <Home services={services} navigate={navigate} />
                    ) : route === 'notes' ? (
                      <NotesScreen onImmersiveChange={setImmersive} />
                    ) : route === 'tasks' ? (
                      <TasksScreen />
                    ) : route === 'habits' ? (
                      <HabitsScreen />
                    ) : route === 'movies' || route === 'music' ? (
                      <CatalogScreen mode={route} />
                    ) : route === 'calendar' ? (
                      <CalendarScreen />
                    ) : route === 'diary' ? (
                      <DiaryScreen />
                    ) : route === 'nutrition' ? (
                      <NutritionScreen />
                    ) : route === 'finance' ? (
                      <FinanceScreen />
                    ) : route === 'passwords' ? (
                      <PasswordsScreen />
                    ) : (
                      <Settings
                        appearance={appearance}
                        updater={updater}
                        save={saveAppearance}
                        exportBackup={exportBackup}
                        restoreBackup={restoreBackup}
                      />
                    )}
                  </View>
                </ServicesContext.Provider>
              )}
              </MobileCreateActionOverlayProvider>
            </SafeAreaView>
          </ConfirmationProvider>
        </ToastProvider>
      </ThemeContext.Provider>
    </SafeAreaProvider>
  )
}
