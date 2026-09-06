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
import { openMobileDatabase } from '../shared/storage/sqlite'
import { ThemeContext } from '../shared/ui/theme'
import { ErrorState, Label, LoadingState, Row } from '../shared/ui/primitives'
import { messageFor } from '../shared/ui/form-model'
import { StudyScreen } from '../modules/study/StudyScreen'
import { TasksScreen } from '../modules/tasks/TasksScreen'
import { HabitsScreen } from '../modules/habits/HabitsScreen'
import { NotesScreen } from '../modules/notes/NotesScreen'
import { CatalogScreen } from '../modules/catalog/CatalogScreen'
import { CalendarScreen } from '../modules/calendar/CalendarScreen'
import { DiaryScreen } from '../modules/diary/DiaryScreen'
import { Home } from './Home'
import { Settings } from './Settings'
import { ReminderStatus } from './ReminderStatus'

export type Route =
  | 'home'
  | 'study'
  | 'notes'
  | 'tasks'
  | 'habits'
  | 'more'
  | 'movies'
  | 'music'
  | 'calendar'
  | 'diary'
  | 'settings'

const titles: Record<Route, string> = {
  home: 'Главная',
  study: 'Обучение',
  notes: 'Заметки',
  tasks: 'Задачи',
  habits: 'Привычки',
  more: 'Ещё',
  movies: 'Фильмы',
  music: 'Музыка',
  calendar: 'Календарь',
  diary: 'Дневник',
  settings: 'Настройки'
}

const primaryTabs = ['home', 'notes', 'tasks', 'habits', 'more'] as const

let servicesPromise: Promise<MobileServices> | undefined
function initialize(): Promise<MobileServices> {
  servicesPromise ??= openMobileDatabase()
    .then(createMobileServices)
    .catch((error) => {
      servicesPromise = undefined
      throw error
    })
  return servicesPromise
}

export default function MobileApp(): React.JSX.Element {
  const system = useColorScheme()
  const [services, setServices] = useState<MobileServices | null>(null)
  const [appearance, setAppearance] = useState<AppearancePreferences>(
    DEFAULT_APPEARANCE_PREFERENCES
  )
  const [route, setRoute] = useState<Route>('home')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const dark = (appearance.theme === 'system' ? (system ?? 'dark') : appearance.theme) === 'dark'
  const palette = {
    ...(dark ? appearanceTokens.dark : appearanceTokens.light),
    accent: appearanceTokens.accents[appearance.accent]
  }

  useEffect(() => {
    let active = true
    initialize()
      .then((value) => {
        if (!active) return
        const stored = value.settings.get('appearance')
        const parsed = stored
          ? appearancePreferencesSchema.parse(JSON.parse(stored))
          : DEFAULT_APPEARANCE_PREFERENCES
        if (active) {
          setServices(value)
          setAppearance(parsed)
          setError('')
        }
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
      if (route === 'home') return false
      setRoute(['notes', 'tasks', 'habits', 'more'].includes(route) ? 'home' : 'more')
      return true
    })
    return () => subscription.remove()
  }, [route])

  const saveAppearance = useCallback(
    (next: AppearancePreferences): void => {
      try {
        const valid = appearancePreferencesSchema.parse(next)
        services?.settings.set('appearance', JSON.stringify(valid))
        setAppearance(valid)
        setError('')
      } catch (reason) {
        setError(messageFor(reason))
      }
    },
    [services]
  )

  const moreRoutes = ['study', 'calendar', 'diary', 'movies', 'music', 'settings'] as Route[]
  const inMore = !['home', 'notes', 'tasks', 'habits', 'more'].includes(route)

  return (
    <SafeAreaProvider>
      <ThemeContext.Provider value={palette}>
        <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
          <StatusBar style={dark ? 'light' : 'dark'} />
          <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16, gap: 4 }}>
            <Label muted>MYMIND</Label>
            <Label title>{titles[route]}</Label>
          </View>
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
            <ServicesContext.Provider value={services}>
              <ReminderStatus services={services} />
              <View style={{ flex: 1, paddingHorizontal: 16 }} key={route}>
                {route === 'home' ? (
                  <Home services={services} navigate={setRoute} />
                ) : route === 'study' ? (
                  <StudyScreen />
                ) : route === 'notes' ? (
                  <NotesScreen />
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
                ) : route === 'settings' ? (
                  <Settings appearance={appearance} save={saveAppearance} />
                ) : (
                  <FlatList
                    data={moreRoutes}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                      <Row title={titles[item]} onPress={() => setRoute(item)} />
                    )}
                  />
                )}
              </View>
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
                      onPress={() => setRoute(tab)}
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
            </ServicesContext.Provider>
          )}
        </SafeAreaView>
      </ThemeContext.Provider>
    </SafeAreaProvider>
  )
}
