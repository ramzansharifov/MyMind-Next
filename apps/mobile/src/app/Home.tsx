import { useCallback, useEffect, useState } from 'react'
import { FlatList, Pressable, Text, View } from 'react-native'
import type { CalendarUnreadReminderRecord } from '@mymind/contracts/calendar'
import type { HabitUnreadReminderRecord } from '@mymind/contracts/habits'
import { isHabitScheduledOn, localDateKey } from '@mymind/core/habits'
import { formatMoneyMinor } from '@mymind/core/finance-money'
import { ErrorState, IconButton } from '../shared/ui/primitives'
import { AppIcon } from '../shared/ui/icons'
import { messageFor } from '../shared/ui/form-model'
import { useTheme } from '../shared/ui/theme'
import { routeIcons, type Route } from './navigation'
import { subscribeDataChanges } from './changes'
import type { MobileServices } from './services'

interface HomeCard {
  route: Route
  title: string
  subtitle: string
}

export function Home({
  services,
  navigate
}: {
  services: MobileServices
  navigate(route: Route): void
}): React.JSX.Element {
  const theme = useTheme()
  const [error, setError] = useState('')
  const [cards, setCards] = useState<HomeCard[]>([])
  const [calendarReminders, setCalendarReminders] = useState<CalendarUnreadReminderRecord[]>([])
  const [habitReminders, setHabitReminders] = useState<HabitUnreadReminderRecord[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback((): void => {
    setRefreshing(true)
    try {
      const date = localDateKey()
      const tasks = services.tasks.listTasksOverview().tasks
      const habits = services.habits.listHabitsOverview({ date })
      const scheduled = habits.habits.filter((habit) => isHabitScheduledOn(habit, date))
      const complete = scheduled.filter((habit) =>
        habits.entries.some(
          (entry) =>
            entry.habitId === habit.id && !entry.skipped && entry.value >= habit.targetValue
        )
      )
      const events = services.calendar.listCalendarOccurrences({ from: date, to: date })
      const notes = services.notes.listNotesOverview().notes
      const studyNodes = services.study.listNodes()
      const boards = services.boards.listNodes()
      const workouts = services.workouts.listOverview()
      const nutrition = services.nutrition.listOverview({ date })
      const finance = services.finance.getDashboard()
      const passwordVault = services.passwords.getPasswordVaultStatus()
      const unreadCalendar = services.calendar.listUnreadCalendarReminders()
      const unreadHabits = services.habits.listUnreadHabitReminders()

      setCalendarReminders(unreadCalendar)
      setHabitReminders(unreadHabits)
      setCards([
        {
          route: 'tasks',
          title: 'Задачи',
          subtitle:
            tasks.filter((task) => task.status === 'active').length +
            ' активных · ' +
            tasks.filter((task) => task.status === 'active' && task.dueDate && task.dueDate < date)
              .length +
            ' просрочено'
        },
        {
          route: 'habits',
          title: 'Привычки',
          subtitle: complete.length + ' из ' + scheduled.length + ' выполнено'
        },
        {
          route: 'study',
          title: 'Обучение',
          subtitle:
            studyNodes.filter((node) => node.type === 'material').length +
            ' материалов · ' +
            studyNodes.filter((node) => node.type === 'folder').length +
            ' папок'
        },
        {
          route: 'notes',
          title: 'Заметки',
          subtitle: notes.length + ' ' + (notes.length === 1 ? 'заметка' : 'заметок')
        },
        {
          route: 'boards',
          title: 'Доски',
          subtitle: boards.filter((node) => node.type === 'board').length + ' досок'
        },
        {
          route: 'calendar',
          title: 'Календарь',
          subtitle: events.length
            ? events
                .slice(0, 2)
                .map((event) => event.title)
                .join(' · ')
            : 'Свободный день'
        },
        { route: 'diary', title: 'Дневник', subtitle: 'Мысли и записи дня' },
        {
          route: 'workouts',
          title: 'Тренировки',
          subtitle:
            workouts.sessions.length +
            ' тренировок · ' +
            workouts.programs.filter((program) => program.status === 'active').length +
            ' активных'
        },
        {
          route: 'nutrition',
          title: 'Питание',
          subtitle:
            Math.round(nutrition.day.nutrients.calories) +
            ' ккал · ' +
            nutrition.day.waterMl +
            ' мл'
        },
        {
          route: 'finance',
          title: 'Финансы',
          subtitle:
            formatMoneyMinor(finance.totalBalanceMinor, finance.settings.baseCurrencyCode) +
            (finance.totalBalanceComplete ? '' : ' · неполные курсы')
        },
        {
          route: 'passwords',
          title: 'Пароли',
          subtitle: passwordVault.initialized
            ? passwordVault.unlocked
              ? 'Хранилище открыто'
              : 'Хранилище заблокировано'
            : 'Хранилище не настроено'
        },
        {
          route: 'movies',
          title: 'Фильмы',
          subtitle: services.movies.listMoviesOverview().movies.length + ' в коллекции'
        },
        {
          route: 'music',
          title: 'Музыка',
          subtitle: services.music.listMusicOverview().items.length + ' в коллекции'
        }
      ])
      setError('')
    } catch (reason) {
      setError(messageFor(reason))
    } finally {
      setRefreshing(false)
    }
  }, [services])

  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (active) refresh()
    })
    const unsubscribe = subscribeDataChanges(() => {
      if (active) refresh()
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [refresh])

  const acknowledgeCalendar = (deliveryId: string): void => {
    try {
      services.calendar.acknowledgeCalendarReminder({ deliveryId })
      refresh()
    } catch (reason) {
      setError(messageFor(reason))
    }
  }

  const acknowledgeHabit = (deliveryId: string): void => {
    try {
      services.habits.acknowledgeHabitReminder({ deliveryId })
      refresh()
    } catch (reason) {
      setError(messageFor(reason))
    }
  }

  return (
    <View style={{ flex: 1 }}>
      {error ? <ErrorState message={error} retry={refresh} /> : null}
      <FlatList
        data={cards}
        numColumns={2}
        keyExtractor={(item) => item.route}
        columnWrapperStyle={{ gap: 10, justifyContent: 'space-between' }}
        contentContainerStyle={{ paddingBottom: 12, gap: 10 }}
        onRefresh={refresh}
        refreshing={refreshing}
        ListHeaderComponent={
          <View style={{ paddingBottom: 4, gap: 14 }}>
            <View
              style={{
                minHeight: 128,
                justifyContent: 'flex-end',
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 24,
                backgroundColor: theme.surface,
                padding: 18,
                elevation: 2
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  width: 170,
                  height: 170,
                  borderRadius: 85,
                  top: -90,
                  right: -30,
                  backgroundColor: theme.accent + '13'
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  width: 110,
                  height: 110,
                  borderRadius: 55,
                  bottom: -72,
                  left: -34,
                  backgroundColor: theme.accent + '08'
                }}
              />
              <Text
                style={{
                  color: theme.accent,
                  fontSize: 10,
                  fontWeight: '700',
                  letterSpacing: 1.4
                }}
              >
                СЕГОДНЯ
              </Text>
              <Text
                style={{
                  marginTop: 5,
                  color: theme.text,
                  fontSize: 23,
                  lineHeight: 29,
                  fontWeight: '700',
                  letterSpacing: -0.45
                }}
              >
                {new Date().toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  weekday: 'long'
                })}
              </Text>
              <Text style={{ marginTop: 4, color: theme.muted, fontSize: 13, lineHeight: 19 }}>
                Ваш день, в вашем ритме.
              </Text>
            </View>

            <HomeReminderInbox
              calendarReminders={calendarReminders}
              habitReminders={habitReminders}
              openCalendar={() => navigate('calendar')}
              openHabits={() => navigate('habits')}
              acknowledgeCalendar={acknowledgeCalendar}
              acknowledgeHabit={acknowledgeHabit}
            />

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 2,
                paddingTop: 2
              }}
            >
              <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>Разделы</Text>
              <Text style={{ color: theme.muted, fontSize: 11 }}>{cards.length}</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const hasNotification =
            (item.route === 'calendar' && calendarReminders.length > 0) ||
            (item.route === 'habits' && habitReminders.length > 0)

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.title}
              onPress={() => navigate(item.route)}
              style={({ pressed }) => ({
                width: '48.5%',
                minHeight: 126,
                justifyContent: 'space-between',
                padding: 14,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 18,
                backgroundColor: pressed ? theme.raised : theme.surface,
                opacity: pressed ? 0.78 : 1,
                elevation: 1
              })}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 13,
                  borderWidth: 1,
                  borderColor: theme.accent + '28',
                  backgroundColor: theme.accent + '11'
                }}
              >
                <AppIcon name={routeIcons[item.route]} size={18} color={theme.accent} />
                {hasNotification ? (
                  <View
                    accessibilityLabel="Есть непрочитанные напоминания"
                    style={{
                      position: 'absolute',
                      top: -3,
                      right: -3,
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: theme.error,
                      borderWidth: 2,
                      borderColor: theme.surface
                    }}
                  />
                ) : null}
              </View>

              <View style={{ gap: 4 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 6
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={{ flex: 1, color: theme.text, fontSize: 14, fontWeight: '600' }}
                  >
                    {item.title}
                  </Text>
                  <AppIcon name="forward" size={15} color={theme.muted} />
                </View>
                <Text
                  numberOfLines={2}
                  style={{ color: theme.muted, fontSize: 11, lineHeight: 16 }}
                >
                  {item.subtitle}
                </Text>
              </View>
            </Pressable>
          )
        }}
      />
    </View>
  )
}

function HomeReminderInbox({
  calendarReminders,
  habitReminders,
  openCalendar,
  openHabits,
  acknowledgeCalendar,
  acknowledgeHabit
}: {
  calendarReminders: CalendarUnreadReminderRecord[]
  habitReminders: HabitUnreadReminderRecord[]
  openCalendar(): void
  openHabits(): void
  acknowledgeCalendar(deliveryId: string): void
  acknowledgeHabit(deliveryId: string): void
}): React.JSX.Element | null {
  const theme = useTheme()
  const total = calendarReminders.length + habitReminders.length
  if (total === 0) return null

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 20,
        backgroundColor: theme.surface,
        padding: 12,
        gap: 9,
        elevation: 1
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 34,
            height: 34,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 11,
            backgroundColor: theme.accent + '12'
          }}
        >
          <AppIcon name="info" size={16} color={theme.accent} />
        </View>
        <Text style={{ flex: 1, color: theme.text, fontSize: 14, fontWeight: '700' }}>
          Напоминания
        </Text>
        <View
          style={{
            minWidth: 24,
            borderRadius: 99,
            backgroundColor: theme.accent,
            paddingHorizontal: 7,
            paddingVertical: 3,
            alignItems: 'center'
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '800' }}>{total}</Text>
        </View>
      </View>

      {calendarReminders.slice(0, 3).map((reminder) => (
        <ReminderCard
          key={'calendar-' + reminder.deliveryId}
          title={reminder.title}
          subtitle={
            'Календарь · ' +
            reminder.occurrenceDate +
            (reminder.eventTime ? ' · ' + reminder.eventTime : '')
          }
          onOpen={openCalendar}
          onAcknowledge={() => acknowledgeCalendar(reminder.deliveryId)}
        />
      ))}
      {habitReminders.slice(0, 3).map((reminder) => (
        <ReminderCard
          key={'habit-' + reminder.deliveryId}
          title={reminder.title}
          subtitle={'Привычка · ' + reminder.occurrenceDate + ' · ' + reminder.preferredTime}
          onOpen={openHabits}
          onAcknowledge={() => acknowledgeHabit(reminder.deliveryId)}
        />
      ))}

      {total > 6 ? (
        <Text style={{ color: theme.muted, fontSize: 11 }}>Ещё {total - 6} непрочитанных</Text>
      ) : null}
    </View>
  )
}

function ReminderCard({
  title,
  subtitle,
  onOpen,
  onAcknowledge
}: {
  title: string
  subtitle: string
  onOpen(): void
  onAcknowledge(): void
}): React.JSX.Element {
  const theme = useTheme()

  return (
    <View
      style={{
        minHeight: 60,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 14,
        backgroundColor: theme.raised,
        paddingHorizontal: 11,
        paddingVertical: 9
      }}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text numberOfLines={1} style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>
          {title}
        </Text>
        <Text numberOfLines={2} style={{ color: theme.muted, fontSize: 10.5, lineHeight: 15 }}>
          {subtitle}
        </Text>
      </View>
      <IconButton label="Открыть" icon="forward" compact onPress={onOpen} />
      <IconButton label="Прочитано" icon="check" compact selected onPress={onAcknowledge} />
    </View>
  )
}
