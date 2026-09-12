import type { AppIconName } from '../shared/ui/icons'

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

export const routeTitles: Record<Route, string> = {
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

export const routeIcons: Record<Route, AppIconName> = {
  home: 'home',
  study: 'study',
  boards: 'boards',
  notes: 'notes',
  tasks: 'tasks',
  habits: 'habits',
  more: 'more',
  movies: 'movies',
  music: 'music',
  calendar: 'calendar',
  diary: 'diary',
  workouts: 'workouts',
  nutrition: 'nutrition',
  finance: 'finance',
  passwords: 'passwords',
  settings: 'settings'
}

export const primaryTabs = ['home', 'notes', 'tasks', 'habits', 'more'] as const

export const moreRoutes: Route[] = [
  'study',
  'boards',
  'workouts',
  'nutrition',
  'calendar',
  'diary',
  'movies',
  'music',
  'finance',
  'passwords',
  'settings'
]
