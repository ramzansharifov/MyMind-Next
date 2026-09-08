import { useCallback, useEffect, useState } from 'react'
import { BackHandler, FlatList, Pressable, Text, useColorScheme, View } from 'react-native'
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
import { exportMobileBackup, restoreMobileBackup } from '../shared/backup/mobileBackup'
import { openMobileDatabase } from '../shared/storage/mobileDatabase'
import { ThemeContext } from '../shared/ui/theme'
import { ErrorState, Label, LoadingState, Row } from '../shared/ui/primitives'
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

export type Route =
  | 'home'
  | 'study'
  | 'boards'
  | 'notes'
  | 'tasks'
  | 'habits'
  | 'more'
  | 'movies'
  | 'music'
  | 'calendar'
  | 'diary'
  | 'workouts'
  | 'nutrition'
  | 'finance'
  | 'passwords'
  | 'settings'

type BackupOperation = 'export' | 'restore'

const titles: Record<Route, string> = {
  home: 'Главная',
  study: 'Обучение',
  boards: 'Доски',
  notes: 'Заметки',
  tasks: 'Задачи',
  habits: 'Привычки',
  more: 'Ещё',
  movies: 'Фильмы',
  music: 'Музыка',
  calendar: 'Календарь',
  diary: 'Дневник',
  workouts: 'Тренировки',
  nutrition: 'Питание',
  finance: 'Финансы',
  passwords: 'Пароли',
  settings: 'Настройки'
}

const primaryTabs = ['home', 'notes', 'tasks', 'habits', 'more'] as const

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

  const moreRoutes = [
    'study',
    'boards',
    'calendar',
    'diary',
    'workouts',
    'nutrition',
    'finance',
    'passwords',
    'movies',
    'music',
    'settings'
  ] as Route[]
  const inMore = !['home', 'notes', 'tasks', 'habits', 'more'].includes(route)

  return (
    <SafeAreaProvider>
      <ThemeContext.Provider value={palette}>
        <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
          <StatusBar style={dark ? 'light' : 'dark'} />
          {!immersive ? (
            <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16, gap: 4 }}>
              <Label muted>MYMIND</Label>
              <Label title>{titles[route]}</Label>
            </View>
          ) : null}
          {error && (
            <ErrorState
              message={error}
              retry={() => {
                setError('')
                setAttempt((value) => value + 1)
              }}
            />
          )}
          {!services ? (
            !error && <LoadingState />
          ) : (
            <ServicesContext.Provider value={services} key={servicesEpoch}>
              {!backupOperation ? <ReminderStatus services={services} /> : null}
              <View style={{ flex: 1, paddingHorizontal: immersive ? 0 : 16 }} key={route}>
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
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                      <Row title={titles[item]} onPress={() => navigate(item)} />
                    )}
                  />
                )}
              </View>
              {!immersive && !backupOperation ? (
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-around',
                    borderTopWidth: 1,
                    borderColor: palette.border,
                    paddingVertical: 8,
                    gap: 2
                  }}
                >
                  {primaryTabs.map((tab) => {
                    const selected = route === tab || (tab === 'more' && inMore)
                    return (
                      <Pressable
                        key={tab}
                        accessibilityRole="tab"
                        accessibilityLabel={titles[tab]}
                        accessibilityState={{ selected }}
                        onPress={() => navigate(tab)}
                        style={({ pressed }) => ({
                          flex: 1,
                          minHeight: 52,
                          alignItems: 'center',
                          justifyContent: 'center',
                          paddingHorizontal: 2,
                          opacity: pressed ? 0.65 : 1
                        })}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '600',
                            color: selected ? palette.accent : palette.muted
                          }}
                        >
                          {titles[tab]}
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
