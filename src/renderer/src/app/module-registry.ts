import { lazy, type ComponentType } from 'react'
import { BookOpen, Presentation, Settings, type LucideIcon } from 'lucide-react'

export type AppNavigationGroup = 'primary' | 'utility'

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

const StudyModule = lazy(() =>
  import('../modules/study/StudyPage').then(({ StudyPage }) => ({ default: StudyPage }))
) as ComponentType<AppModuleProps>
const BoardsModule = lazy(() =>
  import('../modules/boards/BoardsPage').then(({ BoardsPage }) => ({ default: BoardsPage }))
) as ComponentType<AppModuleProps>
const SettingsModule = lazy(() =>
  import('../modules/settings/SettingsModule').then(({ SettingsModule }) => ({
    default: SettingsModule
  }))
) as ComponentType<AppModuleProps>

export const appModuleRegistry = defineAppModules({
  study: {
    id: 'study',
    label: 'Обучение',
    loadingLabel: 'Загрузка обучения',
    icon: BookOpen,
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
