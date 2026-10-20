import { describe, it, expect } from 'vitest'
import * as android from '../../../mobile/src/app/navigation'
import * as pwa from './navigation'
import { routeFromHash } from './routing'

describe('Android owns PWA navigation', () => {
  it('shares the exact route list, order, titles and icons', () => {
    expect(pwa.navigationRoutes).toBe(android.navigationRoutes)
    expect(pwa.routeTitles).toBe(android.routeTitles)
    expect(pwa.routeIcons).toBe(android.routeIcons)
    expect(pwa.navigationRoutes).toEqual([
      'home',
      'notes',
      'tasks',
      'habits',
      'nutrition',
      'calendar',
      'diary',
      'movies',
      'music',
      'finance',
      'passwords',
      'settings'
    ])
    for (const route of android.navigationRoutes) expect(routeFromHash('#' + route)).toBe(route)
  })
  it.each(['#study', '#boards', '#workouts', '#study?id=legacy', '#unknown', '#', '', '#%73tudy'])(
    'rejects legacy and malformed bookmarks %s',
    (hash) => {
      expect(routeFromHash(hash)).toBe('home')
    }
  )
})
