import { useCallback, useEffect, useState } from 'react'
import { FlatList, Text, View } from 'react-native'
import type { CalendarUnreadReminderRecord } from '@mymind/contracts/calendar'
import type { HabitUnreadReminderRecord } from '@mymind/contracts/habits'
import { isHabitScheduledOn, localDateKey } from '@mymind/core/habits'
import { formatMoneyMinor } from '@mymind/core/finance-money'
import { Button, ErrorState, Label, Row } from '../shared/ui/primitives'
import { messageFor } from '../shared/ui/form-model'
import { useTheme } from '../shared/ui/theme'
import { subscribeDataChanges } from './changes'
import type { MobileServices } from './services'
import type { Route } from './MobileApp'

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
          subtitle: `${tasks.filter((task) => task.status === 'active').length} активных · ${tasks.filter((task) => task.status === 'active' && task.dueDate && task.dueDate < date).length} просрочено`
        },
        {
          route: 'habits',
          title: 'Привычки сегодня',
          subtitle: `${complete.length} из ${scheduled.length} выполнено${unreadHabits.length > 0 ? ` · ${unreadHabits.length} непрочит.` : ''}`
        },
        {
          route: 'study',
          title: 'Обучение',
          subtitle: `${studyNodes.filter((node) => node.type === 'material').length} материалов · ${studyNodes.filter((node) => node.type === 'folder').length} папок`
        },
        {
          route: 'notes',
          title: 'Заметки',
          subtitle: `${notes.length} ${notes.length === 1 ? 'заметка' : 'заметок'}`
        },
        {
          route: 'boards',
          title: 'Доски',
          subtitle: `${boards.filter((node) => node.type === 'board').length} досок`
        },
        {
          route: 'calendar',
          title: 'Сегодня в календаре',
          subtitle: `${
            events.length
              ? events
                  .slice(0, 3)
                  .map((event) => event.title)
                  .join(' · ')
              : 'Свободный день'
          }${unreadCalendar.length > 0 ? ` · ${unreadCalendar.length} непрочит.` : ''}`
        },
        { route: 'diary', title: 'Дневник', subtitle: 'Запишите мысли о сегодняшнем дне' },
        {
          route: 'workouts',
          title: 'Тренировки',
          subtitle: `${workouts.sessions.length} тренировок · ${workouts.programs.filter((program) => program.status === 'active').length} активных программ`
        },
        {
          route: 'nutrition',
          title: 'Питание',
          subtitle: `${Math.round(nutrition.day.nutrients.calories)} ккал · ${nutrition.day.waterMl} мл воды`
        },
        {
          route: 'finance',
          title: 'Финансы',
          subtitle: `${formatMoneyMinor(finance.totalBalanceMinor, finance.settings.baseCurrencyCode)}${finance.totalBalanceComplete ? '' : ' · не все курсы заданы'}`
        },
        {
          route: 'passwords',
          title: 'Пароли',
          subtitle: passwordVault.initialized
            ? passwordVault.unlocked
              ? 'Хранилище открыто'
              : 'Хранилище защищено и заблокировано'
            : 'Настройте зашифрованное хранилище'
        },
        {
          route: 'movies',
          title: 'Фильмы',
          subtitle: `${services.movies.listMoviesOverview().movies.length} в коллекции`
        },
        {
          route: 'music',
          title: 'Музыка',
          subtitle: `${services.music.listMusicOverview().items.length} в коллекции`
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
        keyExtractor={(item) => item.route}
        onRefresh={refresh}
        refreshing={refreshing}
        ListHeaderComponent={
          <View style={{ paddingBottom: 20, gap: 16 }}>
            <View>
              <Label title>
                {new Date().toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  weekday: 'long'
                })}
              </Label>
              <Label muted>Ваш день, в вашем ритме.</Label>
            </View>
            <HomeReminderInbox
              calendarReminders={calendarReminders}
              habitReminders={habitReminders}
              openCalendar={() => navigate('calendar')}
              openHabits={() => navigate('habits')}
              acknowledgeCalendar={acknowledgeCalendar}
              acknowledgeHabit={acknowledgeHabit}
            />
          </View>
        }
        renderItem={({ item }) => (
          <Row title={item.title} subtitle={item.subtitle} onPress={() => navigate(item.route)} />
        )}
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
        borderRadius: 16,
        backgroundColor: theme.surface,
        padding: 12,
        gap: 10
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: theme.text, fontSize: 15, fontWeight: '800' }}>Напоминания</Text>
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
          key={`calendar-${reminder.deliveryId}`}
          title={reminder.title}
          subtitle={`Календарь · ${reminder.occurrenceDate}${reminder.eventTime ? ` · ${reminder.eventTime}` : ''}`}
          onOpen={openCalendar}
          onAcknowledge={() => acknowledgeCalendar(reminder.deliveryId)}
        />
      ))}
      {habitReminders.slice(0, 3).map((reminder) => (
        <ReminderCard
          key={`habit-${reminder.deliveryId}`}
          title={reminder.title}
          subtitle={`Привычка · ${reminder.occurrenceDate} · ${reminder.preferredTime}`}
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
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 13,
        backgroundColor: theme.raised,
        padding: 11,
        gap: 9
      }}
    >
      <View style={{ gap: 3 }}>
        <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>{title}</Text>
        <Text style={{ color: theme.muted, fontSize: 11 }}>{subtitle}</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button label="Открыть" onPress={onOpen} />
        <Button label="Прочитано" onPress={onAcknowledge} />
      </View>
    </View>
  )
}
