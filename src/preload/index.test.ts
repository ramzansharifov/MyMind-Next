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
  it('exposes the complete boards, notes, diary, movies and finance contracts in the renderer', async () => {
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
