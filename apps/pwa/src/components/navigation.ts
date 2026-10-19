import {
  navigationRoutes as mobileRoutes,
  routeTitles as mobileTitles,
  routeIcons as mobileIcons,
  type Route as MobileRoute
} from '../../../mobile/src/app/navigation'
import type { AppIconName } from '../../../mobile/src/shared/ui/icons'

export type Route = MobileRoute | 'study' | 'boards' | 'workouts'
export const navigationRoutes: Route[] = [
  ...mobileRoutes.filter((route) => route !== 'settings'),
  'study',
  'boards',
  'workouts',
  'settings'
]
export const routeTitles: Record<Route, string> = {
  ...mobileTitles,
  study: 'Учёба',
  boards: 'Доски',
  workouts: 'Тренировки'
}
export const routeIcons: Record<Route, AppIconName> = {
  ...mobileIcons,
  study: 'folder',
  boards: 'json',
  workouts: 'chart'
}
