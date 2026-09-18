import { describe, expect, it } from 'vitest'

import { navigationRoutes, routeIcons, routeTitles } from './navigation'

describe('mobile module scope', () => {
  it('keeps Study and Boards desktop-only', () => {
    expect(navigationRoutes).not.toContain('study')
    expect(navigationRoutes).not.toContain('boards')
    expect(routeTitles).not.toHaveProperty('study')
    expect(routeTitles).not.toHaveProperty('boards')
    expect(routeIcons).not.toHaveProperty('study')
    expect(routeIcons).not.toHaveProperty('boards')
  })

  it('uses one direct module list without the old More tab', () => {
    expect(navigationRoutes).toEqual([
      'home',
      'notes',
      'tasks',
      'habits',
      'workouts',
      'nutrition',
      'calendar',
      'diary',
      'movies',
      'music',
      'finance',
      'passwords',
      'settings'
    ])
    expect(navigationRoutes).not.toContain('more')
  })
})
