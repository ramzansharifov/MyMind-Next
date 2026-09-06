import { useCallback, useEffect, useState } from 'react'
import { FlatList, View } from 'react-native'
import { isHabitScheduledOn, localDateKey } from '@mymind/core/habits'
import { ErrorState, Label, Row } from '../shared/ui/primitives'
import { messageFor } from '../shared/ui/form-model'
import type { MobileServices } from './services'
import type { Route } from './MobileApp'

export function Home({
  services,
  navigate
}: {
  services: MobileServices
  navigate(route: Route): void
}): React.JSX.Element {
  const [error, setError] = useState('')
  const [cards, setCards] = useState<{ route: Route; title: string; subtitle: string }[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const refresh = useCallback((): void => {
    setRefreshing(true)
    try {
      const date = localDateKey()
      const tasks = services.tasks.listTasksOverview().tasks
      const habits = services.habits.listHabitsOverview({ date })
      const scheduled = habits.habits.filter((h) => isHabitScheduledOn(h, date))
      const complete = scheduled.filter((h) =>
        habits.entries.some((e) => e.habitId === h.id && !e.skipped && e.value >= h.targetValue)
      )
      const events = services.calendar.listCalendarOccurrences({ from: date, to: date })
      const studyNodes = services.study.listNodes()
      setCards([
        {
          route: 'tasks',
          title: 'Задачи',
          subtitle: `${tasks.filter((t) => t.status === 'active').length} активных · ${tasks.filter((t) => t.status === 'active' && t.dueDate && t.dueDate < date).length} просрочено`
        },
        {
          route: 'habits',
          title: 'Привычки сегодня',
          subtitle: `${complete.length} из ${scheduled.length} выполнено`
        },
        {
          route: 'study',
          title: 'Обучение',
          subtitle: `${studyNodes.filter((node) => node.type === 'material').length} материалов · ${studyNodes.filter((node) => node.type === 'folder').length} папок`
        },
        {
          route: 'calendar',
          title: 'Сегодня в календаре',
          subtitle: events.length
            ? events
                .slice(0, 3)
                .map((e) => e.title)
                .join(' · ')
            : 'Свободный день'
        },
        { route: 'diary', title: 'Дневник', subtitle: 'Запишите мысли о сегодняшнем дне' },
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
    return () => {
      active = false
    }
  }, [refresh])
  return (
    <View style={{ flex: 1 }}>
      {error && <ErrorState message={error} retry={refresh} />}
      <FlatList
        data={cards}
        keyExtractor={(item) => item.route}
        onRefresh={refresh}
        refreshing={refreshing}
        ListHeaderComponent={
          <View style={{ paddingBottom: 20 }}>
            <Label title>
              {new Date().toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                weekday: 'long'
              })}
            </Label>
            <Label muted>Ваш день, в вашем ритме.</Label>
          </View>
        }
        renderItem={({ item }) => (
          <Row title={item.title} subtitle={item.subtitle} onPress={() => navigate(item.route)} />
        )}
      />
    </View>
  )
}
