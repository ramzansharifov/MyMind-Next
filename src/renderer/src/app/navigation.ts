import type { LucideIcon } from 'lucide-react'
import { appModules, type AppViewId } from './module-registry'

export type { AppViewId } from './module-registry'

export interface AppNavigationItem {
  id: AppViewId
  label: string
  icon: LucideIcon
}

export const homeNavigationItem = appModules.find(
  (module) => module.navigationGroup === 'home'
) as AppNavigationItem

export const primaryNavigationItems: AppNavigationItem[] = appModules.filter(
  (module) => module.navigationGroup === 'primary'
)

export const utilityNavigationItems: AppNavigationItem[] = appModules.filter(
  (module) => module.navigationGroup === 'utility'
)
