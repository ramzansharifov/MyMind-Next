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
  it('exposes the complete boards and notes contracts in the renderer', async () => {
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
      'ensureStudyBoard'
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

    await api.boards.listNodes()
    expect(electronMocks.invoke).toHaveBeenCalledWith('boards:list-nodes')

    await api.notes.listOverview()
    expect(electronMocks.invoke).toHaveBeenCalledWith('notes:list-overview')
  })
})
