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

export const boardsClient = {
  async listNodes(): Promise<BoardNode[]> {
    return getBoardApi().listNodes()
  },

  async createNode(input: CreateBoardNodeInput): Promise<BoardNode> {
    return getBoardApi().createNode(input)
  },

  async renameNode(id: string, title: string): Promise<BoardNode> {
    return getBoardApi().renameNode({ id, title })
  },

  async updateFolderIcon(id: string, icon: StudyFolderIconName): Promise<BoardNode> {
    return getBoardApi().updateFolderIcon({ id, icon })
  },

  async deleteNode(id: string): Promise<boolean> {
    return getBoardApi().deleteNode(id)
  },

  async updateExpansion(id: string, isExpanded: boolean): Promise<BoardNode> {
    return getBoardApi().updateExpansion({ id, isExpanded })
  },

  async moveNode(input: MoveBoardNodeInput): Promise<BoardNode[]> {
    return getBoardApi().moveNode(input)
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
