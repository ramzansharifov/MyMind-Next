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
  it('exposes the complete boards, notes, diary, movies, music, tasks, habits and finance contracts in the renderer', async () => {
    Object.defineProperty(process, 'contextIsolated', {
      configurable: true,
      value: true
    })

    await import('./index')

    expect(electronMocks.exposeInMainWorld).toHaveBeenCalledOnce()
    const [key, api] = electronMocks.exposeInMainWorld.mock.calls[0]

    expect(key).toBe('api')
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
