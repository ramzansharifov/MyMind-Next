export const BOARD_SYSTEM_ROOT_ID = 'boards-study-root'

export const BOARD_DOCUMENT_LIMITS = {
  maxTitleLength: 240,
  maxSerializedBytes: 25 * 1024 * 1024
} as const

export type BoardNodeType = 'folder' | 'board'

export interface BoardNode {
  id: string
  type: BoardNodeType
  parentId: string | null
  title: string
  position: number
  isExpanded: boolean
  isSystem: boolean
  sourceStudyNodeId?: string
  sourceMaterialId?: string
  sourceBlockId?: string
  createdAt: number
  updatedAt: number
}

export type BoardSnapshot = Record<string, unknown>

export interface BoardDocument {
  nodeId: string
  snapshot: BoardSnapshot | null
  createdAt: number
  updatedAt: number
}

export interface CreateBoardNodeInput {
  type: BoardNodeType
  parentId: string | null
  title?: string
}

export interface RenameBoardNodeInput {
  id: string
  title: string
}

export interface UpdateBoardNodeExpansionInput {
  id: string
  isExpanded: boolean
}

export interface MoveBoardNodeInput {
  id: string
  parentId: string | null
  position: number
}

export interface SaveBoardDocumentInput {
  nodeId: string
  snapshot: BoardSnapshot
}

export interface EnsureStudyBoardInput {
  materialId: string
  blockId: string
}

export const BOARD_IPC_CHANNELS = {
  listNodes: 'boards:list-nodes',
  createNode: 'boards:create-node',
  renameNode: 'boards:rename-node',
  deleteNode: 'boards:delete-node',
  updateExpansion: 'boards:update-expansion',
  moveNode: 'boards:move-node',
  getDocument: 'boards:get-document',
  saveDocument: 'boards:save-document',
  ensureStudyBoard: 'boards:ensure-study-board'
} as const

export interface BoardApi {
  listNodes(): Promise<BoardNode[]>
  createNode(input: CreateBoardNodeInput): Promise<BoardNode>
  renameNode(input: RenameBoardNodeInput): Promise<BoardNode>
  deleteNode(nodeId: string): Promise<boolean>
  updateExpansion(input: UpdateBoardNodeExpansionInput): Promise<BoardNode>
  moveNode(input: MoveBoardNodeInput): Promise<BoardNode[]>
  getDocument(nodeId: string): Promise<BoardDocument>
  saveDocument(input: SaveBoardDocumentInput): Promise<BoardDocument>
  ensureStudyBoard(input: EnsureStudyBoardInput): Promise<BoardNode>
}
