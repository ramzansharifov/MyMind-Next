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
  it('exposes the complete boards, notes and finance contracts in the renderer', async () => {
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
      'setTemplateState',
      'deleteTemplate',
      'useTemplate',
      'snoozeTemplate',
      'skipTemplate',
      'getDashboard',
      'getReport'
    ])

    await api.boards.listNodes()
    expect(electronMocks.invoke).toHaveBeenCalledWith('boards:list-nodes')

    await api.notes.listOverview()
    expect(electronMocks.invoke).toHaveBeenCalledWith('notes:list-overview')

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
