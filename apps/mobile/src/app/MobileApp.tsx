import { useCallback, useEffect, useState } from 'react'
import {
  BackHandler,
  FlatList,
  Platform,
  Pressable,
  Text,
  useColorScheme,
  View
} from 'react-native'
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
import { moreRoutes, primaryTabs, routeIcons, routeTitles, type Route } from './navigation'
import { exportMobileBackup, restoreMobileBackup } from '../shared/backup/mobileBackup'
import { openMobileDatabase } from '../shared/storage/mobileDatabase'
import { ThemeContext } from '../shared/ui/theme'
import { ErrorState, LoadingState } from '../shared/ui/primitives'
import { AppIcon } from '../shared/ui/icons'
import { messageFor } from '../shared/ui/form-model'
import { StudyScreen } from '../modules/study/StudyScreen'
import { BoardsScreen } from '../modules/boards/BoardsScreen'
import { TasksScreen } from '../modules/tasks/TasksScreen'
import { HabitsScreen } from '../modules/habits/HabitsScreen'
import { NotesScreen } from '../modules/notes/NotesScreen'
import { CatalogScreen } from '../modules/catalog/CatalogScreen'
import { CalendarScreen } from '../modules/calendar/CalendarScreen'
import { DiaryScreen } from '../modules/diary/DiaryScreen'
import { WorkoutsScreen } from '../modules/workouts/WorkoutsScreen'
import { NutritionScreen } from '../modules/nutrition/NutritionScreen'
import { FinanceScreen } from '../modules/finance/FinanceScreen'
import { PasswordsScreen } from '../modules/passwords/PasswordsScreen'
import { Home } from './Home'
import { Settings } from './Settings'
import { ReminderStatus } from './ReminderStatus'

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
  const [boardResourceId, setBoardResourceId] = useState<string | null>(null)
  const [immersive, setImmersive] = useState(false)
  const [backupOperation, setBackupOperation] = useState<BackupOperation | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const dark = (appearance.theme === 'system' ? (system ?? 'dark') : appearance.theme) === 'dark'
  const palette = {
    ...(dark ? appearanceTokens.dark : appearanceTokens.light),
    accent: appearanceTokens.accents[appearance.accent]
  }

  const navigate = useCallback(
    (next: Route): void => {
      if (backupOperation) return
      setImmersive(false)
      setBoardResourceId(null)
      setRoute(next)
    },
    [backupOperation]
  )

  const openBoard = useCallback(
    (boardId: string): void => {
      if (backupOperation) return
      setImmersive(false)
      setBoardResourceId(boardId)
      setRoute('boards')
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
      if (backupOperation) return true
      if (immersive) return false
      if (route === 'home') return false
      navigate(['notes', 'tasks', 'habits', 'more'].includes(route) ? 'home' : 'more')
      return true
    })
    return () => subscription.remove()
  }, [backupOperation, immersive, navigate, route])

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

  const inMore = !['home', 'notes', 'tasks', 'habits', 'more'].includes(route)

  return (
    <SafeAreaProvider>
      <ThemeContext.Provider value={palette}>
        <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
          <StatusBar style={dark ? 'light' : 'dark'} backgroundColor={palette.background} />

          {!immersive ? (
            <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 }}>
              <View
                style={{
                  minHeight: 66,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: palette.border,
                  borderRadius: 22,
                  backgroundColor: palette.surface,
                  elevation: 2
                }}
              >
                <View
                  style={{
                    position: 'absolute',
                    top: -54,
                    right: -24,
                    width: 132,
                    height: 132,
                    borderRadius: 66,
                    backgroundColor: palette.accent + '0D'
                  }}
                />
                <View
                  style={{
                    width: 42,
                    height: 42,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: palette.accent + '32',
                    borderRadius: 14,
                    backgroundColor: palette.accent + '14'
                  }}
                >
                  <AppIcon name={routeIcons[route]} size={21} color={palette.accent} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{
                      color: palette.muted,
                      fontSize: 10,
                      fontWeight: '700',
                      letterSpacing: 1.25
                    }}
                  >
                    MYMIND
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      marginTop: 1,
                      color: palette.text,
                      fontSize: 21,
                      lineHeight: 27,
                      fontWeight: '700',
                      letterSpacing: -0.35
                    }}
                  >
                    {routeTitles[route]}
                  </Text>
                </View>
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
                style={{ flex: 1, paddingHorizontal: immersive ? 0 : 16, minHeight: 0 }}
                key={route}
              >
                {route === 'home' ? (
                  <Home services={services} navigate={navigate} />
                ) : route === 'study' ? (
                  <StudyScreen onImmersiveChange={setImmersive} onOpenBoard={openBoard} />
                ) : route === 'boards' ? (
                  <BoardsScreen initialBoardId={boardResourceId} />
                ) : route === 'notes' ? (
                  <NotesScreen onOpenBoard={openBoard} />
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
                ) : route === 'workouts' ? (
                  <WorkoutsScreen />
                ) : route === 'nutrition' ? (
                  <NutritionScreen />
                ) : route === 'finance' ? (
                  <FinanceScreen />
                ) : route === 'passwords' ? (
                  <PasswordsScreen />
                ) : route === 'settings' ? (
                  <Settings
                    appearance={appearance}
                    save={saveAppearance}
                    exportBackup={exportBackup}
                    restoreBackup={restoreBackup}
                  />
                ) : (
                  <FlatList
                    data={moreRoutes}
                    numColumns={2}
                    keyExtractor={(item) => item}
                    columnWrapperStyle={{ gap: 10, justifyContent: 'space-between' }}
                    contentContainerStyle={{ paddingBottom: 12, gap: 10 }}
                    renderItem={({ item }) => (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={routeTitles[item]}
                        onPress={() => navigate(item)}
                        style={({ pressed }) => ({
                          width: '48.5%',
                          minHeight: 106,
                          justifyContent: 'space-between',
                          padding: 14,
                          borderWidth: 1,
                          borderColor: palette.border,
                          borderRadius: 18,
                          backgroundColor: pressed ? palette.raised : palette.surface,
                          opacity: pressed ? 0.78 : 1,
                          elevation: 1
                        })}
                      >
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: palette.accent + '26',
                            backgroundColor: palette.accent + '10'
                          }}
                        >
                          <AppIcon name={routeIcons[item]} size={18} color={palette.accent} />
                        </View>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8
                          }}
                        >
                          <Text style={{ color: palette.text, fontSize: 14, fontWeight: '600' }}>
                            {routeTitles[item]}
                          </Text>
                          <AppIcon name="forward" size={17} color={palette.muted} />
                        </View>
                      </Pressable>
                    )}
                  />
                )}
              </View>

              {!immersive && !backupOperation ? (
                <View
                  style={{
                    marginHorizontal: 10,
                    marginTop: 8,
                    marginBottom: 6,
                    padding: 5,
                    flexDirection: 'row',
                    borderWidth: 1,
                    borderColor: palette.border,
                    borderRadius: 22,
                    backgroundColor: palette.surface,
                    elevation: 4
                  }}
                >
                  {primaryTabs.map((tab) => {
                    const selected = route === tab || (tab === 'more' && inMore)
                    return (
                      <Pressable
                        key={tab}
                        accessibilityRole="tab"
                        accessibilityLabel={routeTitles[tab]}
                        accessibilityState={{ selected }}
                        onPress={() => navigate(tab)}
                        style={({ pressed }) => ({
                          flex: 1,
                          minHeight: 54,
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 3,
                          borderRadius: 17,
                          backgroundColor: selected ? palette.accent + '16' : 'transparent',
                          opacity: pressed ? 0.68 : 1
                        })}
                      >
                        <AppIcon
                          name={routeIcons[tab]}
                          size={20}
                          color={selected ? palette.accent : palette.muted}
                        />
                        <Text
                          style={{
                            fontSize: 10.5,
                            lineHeight: 13,
                            fontWeight: selected ? '700' : '600',
                            color: selected ? palette.accent : palette.muted
                          }}
                        >
                          {routeTitles[tab]}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              ) : null}
            </ServicesContext.Provider>
          )}
        </SafeAreaView>
      </ThemeContext.Provider>
    </SafeAreaProvider>
  )
}
