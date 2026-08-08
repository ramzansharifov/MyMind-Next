import { BookHeart, GraduationCap, Notebook, Wallet } from 'lucide-react'
import { describe, expect, it } from 'vitest'

import { appModuleRegistry, appModules, defineAppModules, getAppModule } from './module-registry'
import { primaryNavigationItems, utilityNavigationItems } from './navigation'

describe('app module registry', () => {
  it('drives lookup and navigation from the same definitions', () => {
    expect(appModules).toEqual(Object.values(appModuleRegistry))
    expect(getAppModule('study')).toBe(appModuleRegistry.study)
    expect(getAppModule('boards')).toBe(appModuleRegistry.boards)
    expect(getAppModule('notes')).toBe(appModuleRegistry.notes)
    expect(getAppModule('diary')).toBe(appModuleRegistry.diary)
    expect(getAppModule('finance')).toBe(appModuleRegistry.finance)
    expect(getAppModule('settings')).toBe(appModuleRegistry.settings)
    expect(appModuleRegistry.study.icon).toBe(GraduationCap)
    expect(appModuleRegistry.notes.icon).toBe(Notebook)
    expect(appModuleRegistry.diary.icon).toBe(BookHeart)
    expect(appModuleRegistry.finance.icon).toBe(Wallet)
    expect(primaryNavigationItems.map(({ id }) => id)).toEqual([
      'study',
      'boards',
      'notes',
      'diary',
      'finance'
    ])
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
