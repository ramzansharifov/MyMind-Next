import { lazy, type ComponentType } from 'react'
import {
  BookHeart,
  Disc3,
  Film,
  GraduationCap,
  House,
  ListTodo,
  Notebook,
  Presentation,
  Repeat2,
  Settings,
  Wallet,
  type LucideIcon
} from 'lucide-react'

export type AppNavigationGroup = 'home' | 'primary' | 'utility'

export interface AppModuleProps {
  resourceId?: string | null
  onResourceHandled?: () => void
  focusMode?: boolean
  onFocusModeChange?: (active: boolean) => void
}

export interface AppModuleDefinition {
  id: string
  label: string
  loadingLabel: string
  icon: LucideIcon
  navigationGroup: AppNavigationGroup
  component: ComponentType<AppModuleProps>
}

export function defineAppModules<const Definitions extends Record<string, AppModuleDefinition>>(
  definitions: Definitions & {
    [Id in keyof Definitions]: AppModuleDefinition & { id: Id }
  }
): Definitions {
  return definitions
}

const HomeModule = lazy(() =>
  import('../modules/home/HomeModule').then(({ HomeModule }) => ({ default: HomeModule }))
) as ComponentType<AppModuleProps>
const StudyModule = lazy(() =>
  import('../modules/study/StudyPage').then(({ StudyPage }) => ({ default: StudyPage }))
) as ComponentType<AppModuleProps>
const BoardsModule = lazy(() =>
  import('../modules/boards/BoardsPage').then(({ BoardsPage }) => ({ default: BoardsPage }))
) as ComponentType<AppModuleProps>
const NotesModule = lazy(() =>
  import('../modules/notes/NotesPage').then(({ NotesPage }) => ({ default: NotesPage }))
) as ComponentType<AppModuleProps>
const TasksModule = lazy(() =>
  import('../modules/tasks/TasksPage').then(({ TasksPage }) => ({ default: TasksPage }))
) as ComponentType<AppModuleProps>
const HabitsModule = lazy(() =>
  import('../modules/habits/HabitsPage').then(({ HabitsPage }) => ({ default: HabitsPage }))
) as ComponentType<AppModuleProps>
const DiaryModule = lazy(() =>
  import('../modules/diary/DiaryPage').then(({ DiaryPage }) => ({ default: DiaryPage }))
) as ComponentType<AppModuleProps>
const MoviesModule = lazy(() =>
  import('../modules/movies/MoviesPage').then(({ MoviesPage }) => ({ default: MoviesPage }))
) as ComponentType<AppModuleProps>
const MusicModule = lazy(() =>
  import('../modules/music/MusicPage').then(({ MusicPage }) => ({ default: MusicPage }))
) as ComponentType<AppModuleProps>
const FinanceModule = lazy(() =>
  import('../modules/finance/FinancePage').then(({ FinancePage }) => ({ default: FinancePage }))
) as ComponentType<AppModuleProps>
const SettingsModule = lazy(() =>
  import('../modules/settings/SettingsModule').then(({ SettingsModule }) => ({
    default: SettingsModule
  }))
) as ComponentType<AppModuleProps>

export const appModuleRegistry = defineAppModules({
  home: {
    id: 'home',
    label: 'Главная',
    loadingLabel: 'Загрузка главной',
    icon: House,
    navigationGroup: 'home',
    component: HomeModule
  },
  study: {
    id: 'study',
    label: 'Обучение',
    loadingLabel: 'Загрузка обучения',
    icon: GraduationCap,
    navigationGroup: 'primary',
    component: StudyModule
  },
  boards: {
    id: 'boards',
    label: 'Доски',
    loadingLabel: 'Загрузка досок',
    icon: Presentation,
    navigationGroup: 'primary',
    component: BoardsModule
  },
  notes: {
    id: 'notes',
    label: 'Заметки',
    loadingLabel: 'Загрузка заметок',
    icon: Notebook,
    navigationGroup: 'primary',
    component: NotesModule
  },
  tasks: {
    id: 'tasks',
    label: 'Задачи',
    loadingLabel: 'Загрузка задач',
    icon: ListTodo,
    navigationGroup: 'primary',
    component: TasksModule
  },
  habits: {
    id: 'habits',
    label: 'Привычки',
    loadingLabel: 'Загрузка привычек',
    icon: Repeat2,
    navigationGroup: 'primary',
    component: HabitsModule
  },
  diary: {
    id: 'diary',
    label: 'Дневник',
    loadingLabel: 'Загрузка дневника',
    icon: BookHeart,
    navigationGroup: 'primary',
    component: DiaryModule
  },
  movies: {
    id: 'movies',
    label: 'Фильмы',
    loadingLabel: 'Загрузка фильмов',
    icon: Film,
    navigationGroup: 'primary',
    component: MoviesModule
  },
  music: {
    id: 'music',
    label: 'Музыка',
    loadingLabel: 'Загрузка музыки',
    icon: Disc3,
    navigationGroup: 'primary',
    component: MusicModule
  },
  finance: {
    id: 'finance',
    label: 'Финансы',
    loadingLabel: 'Загрузка финансов',
    icon: Wallet,
    navigationGroup: 'primary',
    component: FinanceModule
  },
  settings: {
    id: 'settings',
    label: 'Настройки',
    loadingLabel: 'Загрузка настроек',
    icon: Settings,
    navigationGroup: 'utility',
    component: SettingsModule
  }
})

export type AppViewId = keyof typeof appModuleRegistry

export const appModules = Object.values(appModuleRegistry)

export function getAppModule(id: AppViewId): (typeof appModuleRegistry)[AppViewId] {
  return appModuleRegistry[id]
}
