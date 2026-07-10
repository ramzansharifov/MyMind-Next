import { BookOpen, Settings, type LucideIcon } from 'lucide-react'

export type AppViewId = 'study' | 'settings'

export interface AppNavigationItem {
  id: AppViewId
  label: string
  icon: LucideIcon
}

export const primaryNavigationItems: AppNavigationItem[] = [
  {
    id: 'study',
    label: 'Обучение',
    icon: BookOpen
  }
]

export const utilityNavigationItems: AppNavigationItem[] = [
  {
    id: 'settings',
    label: 'Настройки',
    icon: Settings
  }
]
