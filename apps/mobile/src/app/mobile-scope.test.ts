import { describe, expect, it } from 'vitest'

import { moreRoutes, primaryTabs, routeIcons, routeTitles } from './navigation'

describe('mobile module scope', () => {
  it('keeps Study and Boards desktop-only', () => {
    const routes = [...primaryTabs, ...moreRoutes]

    expect(routes).not.toContain('study')
    expect(routes).not.toContain('boards')
    expect(routeTitles).not.toHaveProperty('study')
    expect(routeTitles).not.toHaveProperty('boards')
    expect(routeIcons).not.toHaveProperty('study')
    expect(routeIcons).not.toHaveProperty('boards')
  })
})
