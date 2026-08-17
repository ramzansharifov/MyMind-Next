import {
  BookHeart,
  Disc3,
  Dumbbell,
  Film,
  GraduationCap,
  KeyRound,
  ListTodo,
  Notebook,
  Repeat2,
  Wallet
} from 'lucide-react'
import { describe, expect, it } from 'vitest'

import { appModuleRegistry, appModules, defineAppModules, getAppModule } from './module-registry'
import { primaryNavigationItems, utilityNavigationItems } from './navigation'

describe('app module registry', () => {
  it('drives lookup, workspace layout and navigation from the same definitions', () => {
    expect(appModules).toEqual(Object.values(appModuleRegistry))
    expect(getAppModule('study')).toBe(appModuleRegistry.study)
    expect(getAppModule('boards')).toBe(appModuleRegistry.boards)
    expect(getAppModule('notes')).toBe(appModuleRegistry.notes)
    expect(getAppModule('tasks')).toBe(appModuleRegistry.tasks)
    expect(getAppModule('habits')).toBe(appModuleRegistry.habits)
    expect(getAppModule('workouts')).toBe(appModuleRegistry.workouts)
    expect(getAppModule('diary')).toBe(appModuleRegistry.diary)
    expect(getAppModule('movies')).toBe(appModuleRegistry.movies)
    expect(getAppModule('music')).toBe(appModuleRegistry.music)
    expect(getAppModule('finance')).toBe(appModuleRegistry.finance)
    expect(getAppModule('passwords')).toBe(appModuleRegistry.passwords)
    expect(getAppModule('settings')).toBe(appModuleRegistry.settings)
    expect(appModuleRegistry.study.icon).toBe(GraduationCap)
    expect(appModuleRegistry.notes.icon).toBe(Notebook)
    expect(appModuleRegistry.tasks.icon).toBe(ListTodo)
    expect(appModuleRegistry.habits.icon).toBe(Repeat2)
    expect(appModuleRegistry.workouts.icon).toBe(Dumbbell)
    expect(appModuleRegistry.diary.icon).toBe(BookHeart)
    expect(appModuleRegistry.movies.icon).toBe(Film)
    expect(appModuleRegistry.music.icon).toBe(Disc3)
    expect(appModuleRegistry.finance.icon).toBe(Wallet)
    expect(appModuleRegistry.passwords.icon).toBe(KeyRound)
    expect(appModuleRegistry.study.workspaceLayout).toBe('study')
    expect(appModuleRegistry.boards.workspaceLayout).toBe('boards')
    expect(
      Object.values(appModuleRegistry)
        .filter(({ id }) => id !== 'study' && id !== 'boards')
        .every(({ workspaceLayout }) => workspaceLayout === 'standard')
    ).toBe(true)
    expect(primaryNavigationItems.map(({ id }) => id)).toEqual([
      'study',
      'boards',
      'notes',
      'tasks',
      'habits',
      'workouts',
      'diary',
      'movies',
      'music',
      'finance',
      'passwords'
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
