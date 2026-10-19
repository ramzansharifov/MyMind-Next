import { Home } from '../../../mobile/src/app/Home'
import type { MobileServices } from '../../../mobile/src/app/services'
import { routeTitles, routeIcons, type Route } from './navigation'

export default function PwaHome({
  services,
  navigate
}: {
  services: MobileServices
  navigate(route: Route): void
}): React.JSX.Element {
  return (
    <Home
      services={services}
      navigate={navigate}
      additionalModules={(['study', 'boards', 'workouts'] as const).map((route) => ({
        route,
        title: routeTitles[route],
        icon: routeIcons[route],
        onPress: () => navigate(route)
      }))}
    />
  )
}
