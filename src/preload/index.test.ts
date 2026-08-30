import { afterEach, describe, expect, it, vi } from 'vitest'

const electronMocks = vi.hoisted(() => ({
  exposeInMainWorld: vi.fn(),
  invoke: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn()
}))

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: electronMocks.exposeInMainWorld
  },
  ipcRenderer: {
    invoke: electronMocks.invoke,
    on: electronMocks.on,
    removeListener: electronMocks.removeListener
  }
}))

const contextIsolatedDescriptor = Object.getOwnPropertyDescriptor(process, 'contextIsolated')

afterEach(() => {
  if (contextIsolatedDescriptor) {
    Object.defineProperty(process, 'contextIsolated', contextIsolatedDescriptor)
  } else {
    Reflect.deleteProperty(process, 'contextIsolated')
  }
})

describe('preload API contract', () => {
  it('exposes the complete boards, notes, diary, movies, music, tasks, habits, passwords, workouts and finance contracts in the renderer', async () => {
    Object.defineProperty(process, 'contextIsolated', {
      configurable: true,
      value: true
    })

    await import('./index')

    expect(electronMocks.exposeInMainWorld).toHaveBeenCalledOnce()
    const [key, api] = electronMocks.exposeInMainWorld.mock.calls[0]

    expect(key).toBe('api')
    expect(Object.keys(api.aiChat)).toEqual(['setOpen', 'setBounds', 'reload'])
    expect(Object.keys(api.boards)).toEqual([
      'listNodes',
      'createNode',
      'renameNode',
      'updateFolderIcon',
      'deleteNode',
      'updateExpansion',
      'moveNode',
      'getDocument',
      'saveDocument',
      'ensureStudyBoard',
      'ensureNoteBoard'
    ])
    expect(Object.keys(api.notes)).toEqual([
      'listOverview',
      'createGroup',
      'renameGroup',
      'updateGroupIcon',
      'deleteGroup',
      'createNote',
      'renameNote',
      'moveNote',
      'deleteNote',
      'getNote',
      'saveNote',
      'importAsset',
      'openAsset'
    ])
    expect(Object.keys(api.diary)).toEqual([
      'listOverview',
      'createDiary',
      'updateDiary',
      'updateAppearance',
      'deleteDiary',
      'getDay',
      'listDays',
      'setMood',
      'createEntry',
      'updateEntry',
      'deleteEntry',
      'getReport'
    ])
    expect(Object.keys(api.movies)).toEqual([
      'listOverview',
      'getMovie',
      'createMovie',
      'createMovies',
      'updateMovie',
      'deleteMovie',
      'searchWeb'
    ])
    expect(Object.keys(api.music)).toEqual([
      'listOverview',
      'getItem',
      'createItem',
      'createItems',
      'updateItem',
      'deleteItem',
      'searchWeb'
    ])
    expect(Object.keys(api.tasks)).toEqual([
      'listOverview',
      'createGroup',
      'updateGroup',
      'deleteGroup',
      'createTask',
      'updateTask',
      'deleteTask'
    ])
    expect(Object.keys(api.habits)).toEqual([
      'listOverview',
      'createGroup',
      'updateGroup',
      'deleteGroup',
      'createHabit',
      'updateHabit',
      'deleteHabit',
      'upsertEntry',
      'deleteEntry',
      'getReport'
    ])
    expect(Object.keys(api.passwords)).toEqual([
      'getVaultStatus',
      'setupVault',
      'unlockVault',
      'lockVault',
      'changeMasterPassword',
      'listOverview',
      'getItem',
      'createGroup',
      'updateGroup',
      'deleteGroup',
      'createItem',
      'updateItem',
      'deleteItem',
      'generatePassword',
      'copyItemField',
      'openWebsite'
    ])
    expect(Object.keys(api.workouts)).toEqual([
      'listOverview',
      'createExercise',
      'updateExercise',
      'deleteExercise',
      'createProgram',
      'updateProgram',
      'deleteProgram',
      'createSession',
      'updateSession',
      'deleteSession',
      'getSession',
      'createProgressEntry',
      'updateProgressEntry',
      'deleteProgressEntry',
      'importProgressPhoto',
      'deleteProgressPhoto',
      'getReport'
    ])
    expect(Object.keys(api.nutrition)).toEqual([
      'listOverview',
      'createFood',
      'createFoods',
      'updateFood',
      'deleteFood',
      'createRecipe',
      'updateRecipe',
      'deleteRecipe',
      'createLogEntry',
      'importMeals',
      'updateLogEntry',
      'deleteLogEntry',
      'setWater',
      'setTargets',
      'getReport'
    ])
    expect(Object.keys(api.finance)).toEqual([
      'getSettings',
      'setBaseCurrency',
      'listExchangeRates',
      'upsertExchangeRate',
      'deleteExchangeRate',
      'listAccounts',
      'getAccount',
      'createAccount',
      'updateAccount',
      'deleteAccount',
      'clearAccountHistory',
      'listTransactions',
      'getTransaction',
      'createTransaction',
      'updateTransaction',
      'deleteTransaction',
      'listTags',
      'getTag',
      'createTag',
      'updateTag',
      'deleteTag',
      'listLimits',
      'createLimit',
      'updateLimit',
      'setLimitState',
      'deleteLimit',
      'previewExpenseImpact',
      'listTemplates',
      'createTemplate',
      'updateTemplate',
      'deleteTemplate',
      'getDashboard',
      'getReport'
    ])

    await api.aiChat.setOpen({
      open: true,
      bounds: { x: 700, y: 80, width: 480, height: 720 }
    })
    expect(electronMocks.invoke).toHaveBeenCalledWith('ai-chat:set-open', {
      open: true,
      bounds: { x: 700, y: 80, width: 480, height: 720 }
    })

    await api.boards.listNodes()
    expect(electronMocks.invoke).toHaveBeenCalledWith('boards:list-nodes')

    await api.notes.listOverview()
    expect(electronMocks.invoke).toHaveBeenCalledWith('notes:list-overview')

    await api.diary.createEntry({
      diaryId: 'diary-default',
      dayKey: '2026-08-08',
      text: 'Первая запись'
    })
    expect(electronMocks.invoke).toHaveBeenCalledWith('diary:create-entry', {
      diaryId: 'diary-default',
      dayKey: '2026-08-08',
      text: 'Первая запись'
    })

    await api.movies.getMovie({ id: 'movie-1' })
    expect(electronMocks.invoke).toHaveBeenCalledWith('movies:get-movie', { id: 'movie-1' })

    await api.movies.searchWeb({ query: 'Christopher Nolan' })
    expect(electronMocks.invoke).toHaveBeenCalledWith('movies:search-web', {
      query: 'Christopher Nolan'
    })

    await api.movies.createMovies({ movies: [] })
    expect(electronMocks.invoke).toHaveBeenCalledWith('movies:create-movies', { movies: [] })

    await api.music.getItem({ id: 'music-1' })
    expect(electronMocks.invoke).toHaveBeenCalledWith('music:get-item', { id: 'music-1' })

    await api.music.searchWeb({ query: 'Слушать Blinding Lights' })
    expect(electronMocks.invoke).toHaveBeenCalledWith('music:search-web', {
      query: 'Слушать Blinding Lights'
    })

    await api.music.createItems({ items: [] })
    expect(electronMocks.invoke).toHaveBeenCalledWith('music:create-items', { items: [] })

    await api.tasks.createTask({
      title: 'Подготовить отчёт',
      description: '',
      groupId: null,
      status: 'active',
      priority: 'high',
      dueDate: '2026-08-17',
      dueTime: '10:00'
    })
    expect(electronMocks.invoke).toHaveBeenCalledWith('tasks:create-task', {
      title: 'Подготовить отчёт',
      description: '',
      groupId: null,
      status: 'active',
      priority: 'high',
      dueDate: '2026-08-17',
      dueTime: '10:00'
    })

    await api.habits.upsertEntry({
      habitId: 'habit-1',
      date: '2026-08-16',
      value: 1,
      skipped: false
    })
    expect(electronMocks.invoke).toHaveBeenCalledWith('habits:upsert-entry', {
      habitId: 'habit-1',
      date: '2026-08-16',
      value: 1,
      skipped: false
    })

    await api.habits.getReport({
      dateFrom: '2026-08-01',
      dateTo: '2026-08-16',
      groupId: null,
      ungroupedOnly: false,
      includeArchived: true
    })
    expect(electronMocks.invoke).toHaveBeenCalledWith('habits:get-report', {
      dateFrom: '2026-08-01',
      dateTo: '2026-08-16',
      groupId: null,
      ungroupedOnly: false,
      includeArchived: true
    })

    await api.passwords.unlockVault({ masterPassword: 'master-password' })
    expect(electronMocks.invoke).toHaveBeenCalledWith('passwords:unlock-vault', {
      masterPassword: 'master-password'
    })

    await api.passwords.copyItemField({ id: 'password-1', field: 'password' })
    expect(electronMocks.invoke).toHaveBeenCalledWith('passwords:copy-item-field', {
      id: 'password-1',
      field: 'password'
    })

    await api.workouts.getSession({ id: 'workout-1' })
    expect(electronMocks.invoke).toHaveBeenCalledWith('workouts:get-session', {
      id: 'workout-1'
    })

    await api.workouts.getReport({
      dateFrom: '2026-08-01',
      dateTo: '2026-08-17',
      programId: null,
      exerciseId: null,
      muscleGroup: null
    })
    expect(electronMocks.invoke).toHaveBeenCalledWith('workouts:get-report', {
      dateFrom: '2026-08-01',
      dateTo: '2026-08-17',
      programId: null,
      exerciseId: null,
      muscleGroup: null
    })

    await api.nutrition.importMeals({
      schemaVersion: 1,
      date: '2026-08-26',
      meals: [
        {
          mealType: 'lunch',
          customMealName: '',
          items: [
            {
              name: 'Плов',
              amount: 250,
              unit: 'g',
              nutrients: {
                calories: 575,
                proteinG: 17,
                fatG: 24,
                carbsG: 73,
                fiberG: 0,
                sugarG: 0,
                sodiumMg: 0
              },
              notes: ''
            }
          ]
        }
      ]
    })
    expect(electronMocks.invoke).toHaveBeenCalledWith('nutrition:import-meals', {
      schemaVersion: 1,
      date: '2026-08-26',
      meals: [
        {
          mealType: 'lunch',
          customMealName: '',
          items: [
            {
              name: 'Плов',
              amount: 250,
              unit: 'g',
              nutrients: {
                calories: 575,
                proteinG: 17,
                fatG: 24,
                carbsG: 73,
                fiberG: 0,
                sugarG: 0,
                sodiumMg: 0
              },
              notes: ''
            }
          ]
        }
      ]
    })

    await api.finance.createAccount({
      name: 'Карта',
      currencyCode: 'TJS',
      initialBalanceMinor: 0,
      icon: 'credit-card',
      color: '#8b5cf6'
    })
    expect(electronMocks.invoke).toHaveBeenCalledWith('finance:create-account', {
      name: 'Карта',
      currencyCode: 'TJS',
      initialBalanceMinor: 0,
      icon: 'credit-card',
      color: '#8b5cf6'
    })
  })
})
