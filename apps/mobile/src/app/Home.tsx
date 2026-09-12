import { useCallback, useEffect, useState } from 'react'
import { FlatList, Pressable, Text, View } from 'react-native'
import type { CalendarUnreadReminderRecord } from '@mymind/contracts/calendar'
import type { HabitUnreadReminderRecord } from '@mymind/contracts/habits'

import { ErrorState, IconButton } from '../shared/ui/primitives'
import { AppIcon } from '../shared/ui/icons'
import { messageFor } from '../shared/ui/form-model'
import { useTheme } from '../shared/ui/theme'
import { routeIcons, type Route } from './navigation'
import { subscribeDataChanges } from './changes'
import type { MobileServices } from './services'

const HOME_MODULES: Array<{ route: Exclude<Route, 'home' | 'more' | 'settings'>; title: string }> = [
  { route: 'study', title: 'Обучение' },
  { route: 'boards', title: 'Доски' },
  { route: 'notes', title: 'Заметки' },
  { route: 'tasks', title: 'Задачи' },
  { route: 'habits', title: 'Привычки' },
  { route: 'workouts', title: 'Тренировки' },
  { route: 'nutrition', title: 'Питание' },
  { route: 'calendar', title: 'Календарь' },
  { route: 'diary', title: 'Дневник' },
  { route: 'movies', title: 'Фильмы' },
  { route: 'music', title: 'Музыка' },
  { route: 'finance', title: 'Финансы' },
  { route: 'passwords', title: 'Пароли' }
]

export function Home({
  services,
  navigate
}: {
  services: MobileServices
  navigate(route: Route): void
}): React.JSX.Element {
  const theme = useTheme()
  const [error, setError] = useState('')
  const [calendarReminders, setCalendarReminders] = useState<CalendarUnreadReminderRecord[]>([])
  const [habitReminders, setHabitReminders] = useState<HabitUnreadReminderRecord[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback((): void => {
    setRefreshing(true)
    try {
      setCalendarReminders(services.calendar.listUnreadCalendarReminders())
      setHabitReminders(services.habits.listUnreadHabitReminders())
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
        data={HOME_MODULES}
        numColumns={2}
        keyExtractor={(item) => item.route}
        columnWrapperStyle={{ gap: 10 }}
        contentContainerStyle={{ paddingBottom: 16, gap: 10 }}
        onRefresh={refresh}
        refreshing={refreshing}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            <ReminderInbox
              title="Напоминания календаря"
              reminders={calendarReminders.map((reminder) => ({
                key: reminder.deliveryId,
                title: reminder.title,
                subtitle:
                  reminder.occurrenceDate + (reminder.eventTime ? ` · ${reminder.eventTime}` : ''),
                acknowledge: () => acknowledgeCalendar(reminder.deliveryId)
              }))}
              open={() => navigate('calendar')}
            />
            <ReminderInbox
              title="Напоминания привычек"
              reminders={habitReminders.map((reminder) => ({
                key: reminder.deliveryId,
                title: reminder.title,
                subtitle: `${reminder.occurrenceDate} · ${reminder.preferredTime}`,
                acknowledge: () => acknowledgeHabit(reminder.deliveryId)
              }))}
              open={() => navigate('habits')}
            />
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
                flex: 1,
                minHeight: 112,
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                padding: 16,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                backgroundColor: pressed ? theme.raised : theme.surface,
                opacity: pressed ? 0.78 : 1
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
                  borderColor: theme.accent + '26',
                  backgroundColor: theme.accent + '12'
                }}
              >
                <AppIcon name={routeIcons[item.route]} size={19} color={theme.accent} />
                {hasNotification ? (
                  <View
                    accessibilityLabel="Есть непрочитанные напоминания"
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      width: 9,
                      height: 9,
                      borderRadius: 5,
                      backgroundColor: theme.error,
                      borderWidth: 2,
                      borderColor: theme.surface
                    }}
                  />
                ) : null}
              </View>
              <Text style={{ color: theme.text, fontSize: 15, fontWeight: '600' }}>
                {item.title}
              </Text>
            </Pressable>
          )
        }}
      />
    </View>
  )
}

function ReminderInbox({
  title,
  reminders,
  open
}: {
  title: string
  reminders: Array<{ key: string; title: string; subtitle: string; acknowledge(): void }>
  open(): void
}): React.JSX.Element | null {
  const theme = useTheme()
  if (reminders.length === 0) return null

  return (
    <View
      style={{
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        backgroundColor: theme.surface
      }}
    >
      <View
        style={{
          minHeight: 52,
          paddingHorizontal: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          borderBottomWidth: 1,
          borderBottomColor: theme.border
        }}
      >
        <AppIcon name="info" size={16} color={theme.accent} />
        <Text style={{ flex: 1, color: theme.text, fontSize: 14, fontWeight: '700' }}>{title}</Text>
        <Text style={{ color: theme.muted, fontSize: 12, fontWeight: '600' }}>
          {reminders.length}
        </Text>
      </View>

      <View style={{ padding: 10, gap: 8 }}>
        {reminders.slice(0, 3).map((reminder) => (
          <View
            key={reminder.key}
            style={{
              minHeight: 58,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 9,
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 12,
              backgroundColor: theme.background
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={reminder.title}
              onPress={open}
              style={({ pressed }) => ({ flex: 1, minWidth: 0, opacity: pressed ? 0.68 : 1 })}
            >
              <Text numberOfLines={1} style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>
                {reminder.title}
              </Text>
              <Text numberOfLines={1} style={{ marginTop: 2, color: theme.muted, fontSize: 11 }}>
                {reminder.subtitle}
              </Text>
            </Pressable>
            <IconButton label="Открыть" icon="forward" compact onPress={open} />
            <IconButton
              label="Прочитано"
              icon="check"
              compact
              selected
              onPress={reminder.acknowledge}
            />
          </View>
        ))}
        {reminders.length > 3 ? (
          <Text style={{ color: theme.muted, fontSize: 11 }}>
            Ещё {reminders.length - 3} непрочитанных
          </Text>
        ) : null}
      </View>
    </View>
  )
}
