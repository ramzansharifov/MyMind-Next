import type {
  BoardApi,
  BoardDocument,
  BoardNode,
  BoardSnapshot,
  CreateBoardNodeInput,
  EnsureStudyBoardInput,
  MoveBoardNodeInput
} from '../../../../../shared/contracts/boards'

function getBoardApi(): BoardApi {
  if (!window.api?.boards) {
    throw new Error('API досок недоступен. Полностью перезапустите приложение MyMind.')
  }

  return window.api.boards
}

export const boardsClient = {
  listNodes(): Promise<BoardNode[]> {
    return getBoardApi().listNodes()
  },

  createNode(input: CreateBoardNodeInput): Promise<BoardNode> {
    return getBoardApi().createNode(input)
  },

  renameNode(id: string, title: string): Promise<BoardNode> {
    return getBoardApi().renameNode({ id, title })
  },

  deleteNode(id: string): Promise<boolean> {
    return getBoardApi().deleteNode(id)
  },

  updateExpansion(id: string, isExpanded: boolean): Promise<BoardNode> {
    return getBoardApi().updateExpansion({ id, isExpanded })
  },

  moveNode(input: MoveBoardNodeInput): Promise<BoardNode[]> {
    return getBoardApi().moveNode(input)
  },

  getDocument(nodeId: string): Promise<BoardDocument> {
    return getBoardApi().getDocument(nodeId)
  },

  saveDocument(nodeId: string, snapshot: BoardSnapshot): Promise<BoardDocument> {
    return getBoardApi().saveDocument({ nodeId, snapshot })
  },

  ensureStudyBoard(input: EnsureStudyBoardInput): Promise<BoardNode> {
    return getBoardApi().ensureStudyBoard(input)
  }
}
