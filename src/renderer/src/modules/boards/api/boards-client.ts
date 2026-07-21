import type {
  BoardApi,
  BoardDocument,
  BoardNode,
  BoardSnapshot,
  CreateBoardNodeInput,
  EnsureStudyBoardInput,
  MoveBoardNodeInput
} from '../../../../../shared/contracts/boards'
import type { StudyFolderIconName } from '../../../../../shared/contracts/study'

export const BOARDS_API_DEV_MOCK_KEY = 'mymind:boards-api-mode'

function isBoardsApiMockedMissing(): boolean {
  if (!import.meta.env.DEV) return false

  try {
    return window.sessionStorage.getItem(BOARDS_API_DEV_MOCK_KEY) === 'missing'
  } catch {
    return false
  }
}

function getBoardApi(): BoardApi {
  const appApi = window.api

  if (isBoardsApiMockedMissing() || !appApi?.boards) {
    const developmentDetails = import.meta.env.DEV
      ? ` Доступные разделы window.api: ${
          appApi && typeof appApi === 'object' ? Object.keys(appApi).join(', ') || '(нет)' : '(нет)'
        }.`
      : ''

    throw new Error(
      `API досок недоступен. Перезапустите или пересоберите приложение.${developmentDetails}`
    )
  }

  return appApi.boards
}

function isManagedBoardFolder(node: BoardNode | undefined): boolean {
  return Boolean(node?.type === 'folder' && (node.isSystem || node.sourceStudyNodeId))
}

async function findBoardNode(api: BoardApi, nodeId: string): Promise<BoardNode | undefined> {
  const nodes = await api.listNodes()
  return nodes.find((node) => node.id === nodeId)
}

export const boardsClient = {
  async listNodes(): Promise<BoardNode[]> {
    return getBoardApi().listNodes()
  },

  async createNode(input: CreateBoardNodeInput): Promise<BoardNode> {
    const api = getBoardApi()

    if (input.parentId) {
      const parent = await findBoardNode(api, input.parentId)

      if (isManagedBoardFolder(parent)) {
        throw new Error('В зафиксированной папке нельзя создавать папки или доски')
      }
    }

    return api.createNode(input)
  },

  async renameNode(id: string, title: string): Promise<BoardNode> {
    const api = getBoardApi()
    const target = await findBoardNode(api, id)

    if (isManagedBoardFolder(target)) {
      throw new Error('Зафиксированную папку нельзя переименовать')
    }

    return api.renameNode({ id, title })
  },

  async updateFolderIcon(id: string, icon: StudyFolderIconName): Promise<BoardNode> {
    const api = getBoardApi()
    const target = await findBoardNode(api, id)

    if (isManagedBoardFolder(target)) {
      throw new Error('У зафиксированной папки нельзя изменить иконку')
    }

    return api.updateFolderIcon({ id, icon })
  },

  async deleteNode(id: string): Promise<boolean> {
    const api = getBoardApi()
    const target = await findBoardNode(api, id)

    if (isManagedBoardFolder(target)) {
      throw new Error('Зафиксированную папку нельзя удалить')
    }

    return api.deleteNode(id)
  },

  async updateExpansion(id: string, isExpanded: boolean): Promise<BoardNode> {
    return getBoardApi().updateExpansion({ id, isExpanded })
  },

  async moveNode(input: MoveBoardNodeInput): Promise<BoardNode[]> {
    const api = getBoardApi()

    if (input.parentId) {
      const parent = await findBoardNode(api, input.parentId)

      if (isManagedBoardFolder(parent)) {
        throw new Error('В зафиксированную папку нельзя перемещать элементы')
      }
    }

    return api.moveNode(input)
  },

  async getDocument(nodeId: string): Promise<BoardDocument> {
    return getBoardApi().getDocument(nodeId)
  },

  async saveDocument(nodeId: string, snapshot: BoardSnapshot): Promise<BoardDocument> {
    return getBoardApi().saveDocument({ nodeId, snapshot })
  },

  async ensureStudyBoard(input: EnsureStudyBoardInput): Promise<BoardNode> {
    return getBoardApi().ensureStudyBoard(input)
  }
}
