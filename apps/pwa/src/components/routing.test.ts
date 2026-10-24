import { describe, it, expect } from 'vitest'
import * as client from '../client/app/navigation'
import * as pwa from './navigation'
import { routeFromHash } from './routing'

describe('PWA navigation has one source of truth', () => {
  it('shares the exact route list, order, titles and icons', () => {
    expect(pwa.navigationRoutes).toBe(client.navigationRoutes)
    expect(pwa.routeTitles).toBe(client.routeTitles)
    expect(pwa.routeIcons).toBe(client.routeIcons)
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
    for (const route of client.navigationRoutes) expect(routeFromHash('#' + route)).toBe(route)
  })
  it.each(['#study', '#boards', '#workouts', '#study?id=legacy', '#unknown', '#', '', '#%73tudy'])(
    'rejects legacy and malformed bookmarks %s',
    (hash) => {
      expect(routeFromHash(hash)).toBe('home')
    }
  )
})
