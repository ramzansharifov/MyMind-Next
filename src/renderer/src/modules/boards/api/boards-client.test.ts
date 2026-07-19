import { afterEach, describe, expect, it } from 'vitest'

import { boardsClient } from './boards-client'

afterEach(() => {
  window.sessionStorage.removeItem('mymind:boards-api-mode')
  Reflect.deleteProperty(window, 'api')
})

describe('boardsClient', () => {
  it('returns a rejected promise instead of throwing synchronously when boards API is absent', async () => {
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        study: {},
        system: {}
      }
    })

    let request: Promise<unknown> | undefined

    expect(() => {
      request = boardsClient.listNodes()
    }).not.toThrow()

    expect(request).toBeInstanceOf(Promise)
    await expect(request).rejects.toThrow(
      'API досок недоступен. Перезапустите или пересоберите приложение.'
    )
    await expect(request).rejects.toThrow('Доступные разделы window.api: study, system.')
  })

  it('normalizes missing-preload failures for every public operation', async () => {
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: undefined
    })

    const operations = [
      () => boardsClient.listNodes(),
      () => boardsClient.createNode({ type: 'board', parentId: null }),
      () => boardsClient.renameNode('board-id', 'Board'),
      () => boardsClient.deleteNode('board-id'),
      () => boardsClient.updateExpansion('folder-id', true),
      () => boardsClient.moveNode({ id: 'board-id', parentId: null, position: 0 }),
      () => boardsClient.getDocument('board-id'),
      () => boardsClient.saveDocument('board-id', {}),
      () => boardsClient.ensureStudyBoard({ materialId: 'material-id', blockId: 'block-id' })
    ]

    for (const invoke of operations) {
      let request: Promise<unknown> | undefined
      expect(() => {
        request = invoke()
      }).not.toThrow()
      await expect(request).rejects.toThrow('API досок недоступен')
    }
  })

  it('supports the development-only missing API runtime diagnostic', async () => {
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        boards: {
          listNodes: () => Promise.resolve([])
        }
      }
    })
    window.sessionStorage.setItem('mymind:boards-api-mode', 'missing')

    await expect(boardsClient.listNodes()).rejects.toThrow('API')
  })
})
