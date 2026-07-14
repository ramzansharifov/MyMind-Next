import { describe, expect, it } from 'vitest'

import { appModuleRegistry, appModules, defineAppModules, getAppModule } from './module-registry'
import { primaryNavigationItems, utilityNavigationItems } from './navigation'

describe('app module registry', () => {
  it('drives lookup and navigation from the same definitions', () => {
    expect(appModules).toEqual(Object.values(appModuleRegistry))
    expect(getAppModule('study')).toBe(appModuleRegistry.study)
    expect(getAppModule('settings')).toBe(appModuleRegistry.settings)
    expect(primaryNavigationItems.map(({ id }) => id)).toEqual(['study'])
    expect(utilityNavigationItems.map(({ id }) => id)).toEqual(['settings'])
  })

  it('accepts a new module as one self-contained registry entry', () => {
    const fixture = defineAppModules({
      fixture: {
        ...appModuleRegistry.study,
        id: 'fixture',
        navigationGroup: 'utility'
      }
    })

    expect(Object.values(fixture).map(({ id }) => id)).toEqual(['fixture'])
  })
})
