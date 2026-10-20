import { navigationRoutes, type Route } from './navigation'

/** Only current Android routes can be opened, including restored bookmarks. */
export function routeFromHash(hash: string): Route {
  const route = hash.replace(/^#/, '') as Route
  return navigationRoutes.includes(route) ? route : 'home'
}
