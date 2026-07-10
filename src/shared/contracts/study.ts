export type StudyNodeType = 'folder' | 'material'

export type StudyBlockType = 'text' | 'heading' | 'code' | 'markdown' | 'divider'

export interface StudyTextBlock {
  id: string
  type: 'text'
  text: string
  html?: string
}

export interface StudyHeadingBlock {
  id: string
  type: 'heading'
  text: string
  level: 1 | 2 | 3
  color?: string
  backgroundColor?: string
}

export interface StudyCodeBlock {
  id: string
  type: 'code'
  source: string
  language: string
}
export type StudyMarkdownViewMode = 'write' | 'split' | 'preview'

export interface StudyMarkdownBlock {
  id: string
  type: 'markdown'
  source: string
  viewMode?: StudyMarkdownViewMode
}

export interface StudyDividerBlock {
  id: string
  type: 'divider'
  thickness?: number
  color?: string
}

export type StudyBlock =
  StudyTextBlock | StudyHeadingBlock | StudyCodeBlock | StudyMarkdownBlock | StudyDividerBlock

export interface StudyDocument {
  version: 1
  blocks: StudyBlock[]
}

export interface StudyNode {
  id: string
  type: StudyNodeType
  parentId: string | null
  title: string
  position: number
  isExpanded: boolean
  createdAt: number
  updatedAt: number
}

export interface StudyMaterial {
  nodeId: string
  document: StudyDocument
  plainText: string
  createdAt: number
  updatedAt: number
}

export interface CreateStudyNodeInput {
  type: StudyNodeType
  parentId: string | null
  title?: string
}

export interface RenameStudyNodeInput {
  id: string
  title: string
}

export interface UpdateStudyNodeExpansionInput {
  id: string
  isExpanded: boolean
}
export interface MoveStudyNodeInput {
  id: string
  parentId: string | null
  position: number
}

export interface SaveStudyMaterialInput {
  nodeId: string
  document: StudyDocument
}

export const STUDY_IPC_CHANNELS = {
  listNodes: 'study:list-nodes',
  createNode: 'study:create-node',
  renameNode: 'study:rename-node',
  deleteNode: 'study:delete-node',
  updateExpansion: 'study:update-expansion',
  moveNode: 'study:move-node',
  getMaterial: 'study:get-material',
  saveMaterial: 'study:save-material'
} as const

export interface StudyApi {
  listNodes(): Promise<StudyNode[]>
  createNode(input: CreateStudyNodeInput): Promise<StudyNode>
  renameNode(input: RenameStudyNodeInput): Promise<StudyNode>
  deleteNode(nodeId: string): Promise<boolean>
  updateExpansion(input: UpdateStudyNodeExpansionInput): Promise<StudyNode>
  moveNode(input: MoveStudyNodeInput): Promise<StudyNode[]>
  getMaterial(nodeId: string): Promise<StudyMaterial>
  saveMaterial(input: SaveStudyMaterialInput): Promise<StudyMaterial>
}
