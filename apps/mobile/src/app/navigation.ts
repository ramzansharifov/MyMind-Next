import type { AppIconName } from '../shared/ui/icons'

export type Route =
  | 'home'
  | 'notes'
  | 'tasks'
  | 'habits'
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
  notes: 'Заметки',
  tasks: 'Задачи',
  habits: 'Привычки',
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
  notes: 'notes',
  tasks: 'tasks',
  habits: 'habits',
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

export const navigationRoutes: Route[] = [
  'home',
  'notes',
  'tasks',
  'habits',
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
