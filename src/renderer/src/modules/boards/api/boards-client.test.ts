import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  BOARD_SYSTEM_ROOT_ID,
  type BoardApi,
  type BoardNode
} from '../../../../../shared/contracts/boards'
import { boardsClient } from './boards-client'

const managedFolder: BoardNode = {
  id: BOARD_SYSTEM_ROOT_ID,
  type: 'folder',
  parentId: null,
  title: 'Обучение',
  position: 0,
  isExpanded: true,
  isSystem: true,
  createdAt: 1,
  updatedAt: 1
}

const nestedManagedFolder: BoardNode = {
  id: 'study-folder-child',
  type: 'folder',
  parentId: managedFolder.id,
  title: 'Раздел обучения',
  position: 0,
  isExpanded: true,
  isSystem: false,
  createdAt: 1,
  updatedAt: 1
}

const managedBoard: BoardNode = {
  id: 'study-board',
  type: 'board',
  parentId: nestedManagedFolder.id,
  title: 'Доска материала',
  position: 0,
  isExpanded: false,
  isSystem: false,
  sourceMaterialId: 'material-id',
  sourceBlockId: 'block-id',
  createdAt: 1,
  updatedAt: 1
}

function installBoardsApi(api: Partial<BoardApi>): void {
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: { boards: api }
  })
}

afterEach(() => {
  window.sessionStorage.removeItem('mymind:boards-api-mode')
  Reflect.deleteProperty(window, 'api')
  vi.restoreAllMocks()
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
      () => boardsClient.updateFolderIcon('folder-id', 'folder'),
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

  it('blocks hierarchy changes for every managed folder but keeps board rename and deletion', async () => {
    const createNode = vi.fn()
    const renameNode = vi.fn().mockResolvedValue(managedBoard)
    const updateFolderIcon = vi.fn()
    const deleteNode = vi.fn().mockResolvedValue(true)
    const moveNode = vi.fn()
    const nodes = [managedFolder, nestedManagedFolder, managedBoard]

    installBoardsApi({
      listNodes: vi.fn().mockResolvedValue(nodes),
      createNode,
      renameNode,
      updateFolderIcon,
      deleteNode,
      moveNode
    })

    await expect(
      boardsClient.createNode({ type: 'folder', parentId: nestedManagedFolder.id })
    ).rejects.toThrow('В зафиксированной папке нельзя создавать папки или доски')
    await expect(
      boardsClient.renameNode(nestedManagedFolder.id, 'Новое название')
    ).rejects.toThrow('Зафиксированную папку нельзя переименовать')
    await expect(boardsClient.updateFolderIcon(nestedManagedFolder.id, 'folder')).rejects.toThrow(
      'У зафиксированной папки нельзя изменить иконку'
    )
    await expect(boardsClient.deleteNode(nestedManagedFolder.id)).rejects.toThrow(
      'Зафиксированную папку нельзя удалить'
    )
    await expect(
      boardsClient.moveNode({ id: 'another-board', parentId: nestedManagedFolder.id, position: 0 })
    ).rejects.toThrow('В зафиксированную папку нельзя перемещать элементы')

    expect(createNode).not.toHaveBeenCalled()
    expect(updateFolderIcon).not.toHaveBeenCalled()
    expect(moveNode).not.toHaveBeenCalled()

    await expect(boardsClient.renameNode(managedBoard.id, 'Переименованная доска')).resolves.toBe(
      managedBoard
    )
    await expect(boardsClient.deleteNode(managedBoard.id)).resolves.toBe(true)

    expect(renameNode).toHaveBeenCalledWith({
      id: managedBoard.id,
      title: 'Переименованная доска'
    })
    expect(deleteNode).toHaveBeenCalledWith(managedBoard.id)
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
