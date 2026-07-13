import { lazy, type ComponentType } from 'react'
import { BookOpen, Settings, type LucideIcon } from 'lucide-react'

export type AppViewId = 'study' | 'settings'
export type AppNavigationGroup = 'primary' | 'utility'

export interface AppModuleDefinition {
  id: AppViewId
  label: string
  loadingLabel: string
  icon: LucideIcon
  navigationGroup: AppNavigationGroup
  component: ComponentType
}

const StudyModule = lazy(() =>
  import('../modules/study/StudyPage').then(({ StudyPage }) => ({ default: StudyPage }))
)
const SettingsModule = lazy(() =>
  import('../modules/settings/SettingsModule').then(({ SettingsModule }) => ({
    default: SettingsModule
  }))
)

export const appModules = [
  {
    id: 'study',
    label: 'Обучение',
    loadingLabel: 'Загрузка обучения',
    icon: BookOpen,
    navigationGroup: 'primary',
    component: StudyModule
  },
  {
    id: 'settings',
    label: 'Настройки',
    loadingLabel: 'Загрузка настроек',
    icon: Settings,
    navigationGroup: 'utility',
    component: SettingsModule
  }
] as const satisfies readonly AppModuleDefinition[]

export function getAppModule(id: AppViewId): AppModuleDefinition {
  return appModules.find((module) => module.id === id) ?? appModules[0]
}
