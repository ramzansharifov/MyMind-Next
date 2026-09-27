import type { StudyFolderIconName } from './study'

export type { StudyBoardBlock, StudyFolderIconName } from './study'

export const BOARD_SYSTEM_ROOT_ID = 'boards-study-root'
export const BOARD_NOTES_SYSTEM_ROOT_ID = 'boards-notes-root'
export const BOARD_SYSTEM_ROOT_IDS = [BOARD_SYSTEM_ROOT_ID, BOARD_NOTES_SYSTEM_ROOT_ID] as const

export function isBoardSystemRootId(id: string): boolean {
  return BOARD_SYSTEM_ROOT_IDS.some((rootId) => rootId === id)
}

export const BOARD_DOCUMENT_LIMITS = {
  maxTitleLength: 240,
  maxSerializedBytes: 25 * 1024 * 1024
} as const

export type BoardNodeType = 'folder' | 'board'
export type BoardCanvasMode = 'infinite' | 'a4'

export const BOARD_A4_BOUNDS = { x: 0, y: 0, w: 1050, h: 1485 } as const
export const BOARD_A4_MAX_PAGES = 10_000
export const BOARD_SNAPSHOT_META_KEY = '__mymindBoard' as const

export interface BoardNode {
  id: string
  type: BoardNodeType
  parentId: string | null
  title: string
  icon?: StudyFolderIconName
  position: number
  isExpanded: boolean
  isSystem: boolean
  sourceStudyNodeId?: string
  sourceMaterialId?: string
  sourceNoteId?: string
  sourceBlockId?: string
  createdAt: number
  updatedAt: number
}

export type BoardSnapshot = Record<string, unknown>

export interface BoardSnapshotState {
  canvasMode: BoardCanvasMode
  tldrawSnapshot: BoardSnapshot | null
}

export function createBoardSnapshotEnvelope(
  canvasMode: BoardCanvasMode,
  tldrawSnapshot: BoardSnapshot | null
): BoardSnapshot {
  return {
    [BOARD_SNAPSHOT_META_KEY]: {
      version: 1,
      canvasMode
    },
    tldraw: tldrawSnapshot
  }
}

export function readBoardSnapshot(snapshot: BoardSnapshot | null): BoardSnapshotState {
  if (!snapshot) {
    return { canvasMode: 'infinite', tldrawSnapshot: null }
  }

  const metadata = snapshot[BOARD_SNAPSHOT_META_KEY]
  const isMetadata =
    typeof metadata === 'object' &&
    metadata !== null &&
    !Array.isArray(metadata) &&
    (metadata as Record<string, unknown>).version === 1 &&
    ((metadata as Record<string, unknown>).canvasMode === 'infinite' ||
      (metadata as Record<string, unknown>).canvasMode === 'a4')

  if (!isMetadata || !Object.prototype.hasOwnProperty.call(snapshot, 'tldraw')) {
    return { canvasMode: 'infinite', tldrawSnapshot: snapshot }
  }

  const rawTldraw = snapshot.tldraw
  const tldrawSnapshot =
    typeof rawTldraw === 'object' && rawTldraw !== null && !Array.isArray(rawTldraw)
      ? (rawTldraw as BoardSnapshot)
      : null

  return {
    canvasMode: (metadata as { canvasMode: BoardCanvasMode }).canvasMode,
    tldrawSnapshot
  }
}

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
  icon?: StudyFolderIconName
  canvasMode?: BoardCanvasMode
}

export interface RenameBoardNodeInput {
  id: string
  title: string
}

export interface UpdateBoardFolderIconInput {
  id: string
  icon: StudyFolderIconName
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

export interface EnsureNoteBoardInput {
  noteId: string
  blockId: string
}

export interface ExportBoardPdfInput {
  nodeId: string
  title: string
}

export type ExportBoardPdfResult = { status: 'saved' } | { status: 'cancelled' }

export const BOARD_IPC_CHANNELS = {
  listNodes: 'boards:list-nodes',
  createNode: 'boards:create-node',
  renameNode: 'boards:rename-node',
  updateFolderIcon: 'boards:update-folder-icon',
  deleteNode: 'boards:delete-node',
  updateExpansion: 'boards:update-expansion',
  moveNode: 'boards:move-node',
  getDocument: 'boards:get-document',
  saveDocument: 'boards:save-document',
  ensureStudyBoard: 'boards:ensure-study-board',
  ensureNoteBoard: 'boards:ensure-note-board',
  exportPdf: 'boards:export-pdf'
} as const

export interface BoardApi {
  listNodes(): Promise<BoardNode[]>
  createNode(input: CreateBoardNodeInput): Promise<BoardNode>
  renameNode(input: RenameBoardNodeInput): Promise<BoardNode>
  updateFolderIcon(input: UpdateBoardFolderIconInput): Promise<BoardNode>
  deleteNode(nodeId: string): Promise<boolean>
  updateExpansion(input: UpdateBoardNodeExpansionInput): Promise<BoardNode>
  moveNode(input: MoveBoardNodeInput): Promise<BoardNode[]>
  getDocument(nodeId: string): Promise<BoardDocument>
  saveDocument(input: SaveBoardDocumentInput): Promise<BoardDocument>
  ensureStudyBoard(input: EnsureStudyBoardInput): Promise<BoardNode>
  ensureNoteBoard(input: EnsureNoteBoardInput): Promise<BoardNode>
  exportPdf(input: ExportBoardPdfInput): Promise<ExportBoardPdfResult>
}
