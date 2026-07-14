import { lazy, type ComponentType } from 'react'
import { BookOpen, Settings, type LucideIcon } from 'lucide-react'

export type AppNavigationGroup = 'primary' | 'utility'

export interface AppModuleDefinition {
  id: string
  label: string
  loadingLabel: string
  icon: LucideIcon
  navigationGroup: AppNavigationGroup
  component: ComponentType
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
)
const SettingsModule = lazy(() =>
  import('../modules/settings/SettingsModule').then(({ SettingsModule }) => ({
    default: SettingsModule
  }))
)

export const appModuleRegistry = defineAppModules({
  study: {
    id: 'study',
    label: 'Обучение',
    loadingLabel: 'Загрузка обучения',
    icon: BookOpen,
    navigationGroup: 'primary',
    component: StudyModule
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
