export type StudyNodeType = 'folder' | 'material'

export const STUDY_FOLDER_ICON_NAMES = [
  'folder',
  'book',
  'graduation',
  'science',
  'calculator',
  'code',
  'languages',
  'history',
  'microscope',
  'art',
  'music',
  'work',
  'archive',
  'physics',
  'brain',
  'organization',
  'photography',
  'finance',
  'biology',
  'geography',
  'medicine',
  'ideas',
  'travel',
  'notes',
  'design',
  'projects',
  'law',
  'favorites',
  'goals',
  'reminders',
  'bookmarks',
  'resources',
  'calendar',
  'cloud',
  'direction',
  'database',
  'games',
  'home',
  'mail',
  'network',
  'security',
  'shopping',
  'achievements',
  'checklist',
  'personal',
  'documents',
  'downloads',
  'team',
  'weather',
  'sport'
] as const

export type StudyFolderIconName = (typeof STUDY_FOLDER_ICON_NAMES)[number]

export type StudyBlockType =
  | 'text'
  | 'heading'
  | 'code'
  | 'markdown'
  | 'latex'
  | 'mermaid'
  | 'image'
  | 'video'
  | 'audio'
  | 'file'
  | 'divider'
  | 'board'

export const STUDY_DOCUMENT_LIMITS = {
  maxBlocks: 2_000,
  maxSerializedBytes: 10 * 1024 * 1024,
  maxTextLength: 1_000_000,
  maxHtmlLength: 2_000_000,
  maxSourceLength: 1_000_000,
  maxLatexSourceLength: 200_000,
  maxMermaidSourceLength: 200_000,
  maxPlainTextLength: 1_000_000,
  maxTitleLength: 240,
  maxRemoteUrlLength: 4_096
} as const

export const STUDY_SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,120}$/

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
export type StudyLatexViewMode = 'write' | 'split' | 'preview'

export type StudyLatexDisplayMode = 'display' | 'inline'

export type StudyLatexAlignment = 'left' | 'center' | 'right'

export interface StudyLatexBlock {
  id: string
  type: 'latex'
  source: string
  viewMode?: StudyLatexViewMode
  displayMode?: StudyLatexDisplayMode
  alignment?: StudyLatexAlignment
  scale?: number
}
export type StudyMermaidViewMode = 'write' | 'split' | 'preview'

export type StudyMermaidTheme = 'dark' | 'default' | 'neutral' | 'forest'

export interface StudyMermaidBlock {
  id: string
  type: 'mermaid'
  source: string
  viewMode?: StudyMermaidViewMode
  theme?: StudyMermaidTheme
  scale?: number
}
export type StudyAssetKind = 'image' | 'video' | 'audio' | 'file'

export type StudyImageFit = 'contain' | 'cover'

export interface StudyLocalAsset {
  id: string
  materialId: string
  name: string
  mimeType: string
  size: number
  url: string
}

export interface StudyLocalAssetSource {
  type: 'local'
  asset?: StudyLocalAsset
}

export interface StudyRemoteAssetSource {
  type: 'url'
  url: string
}

export type StudyMediaAssetSource = StudyLocalAssetSource | StudyRemoteAssetSource

export interface StudyImageBlock {
  id: string
  type: 'image'
  source: StudyMediaAssetSource
  title?: string
  imageFit?: StudyImageFit
  imageHeight?: number
}

export interface StudyVideoBlock {
  id: string
  type: 'video'
  source: StudyMediaAssetSource
  title?: string
}

export interface StudyAudioBlock {
  id: string
  type: 'audio'
  source: StudyLocalAssetSource
  title?: string
}

export interface StudyFileBlock {
  id: string
  type: 'file'
  source: StudyLocalAssetSource
  title?: string
}

export type StudyDividerVariant = 'solid' | 'tapered' | 'dashed' | 'dotted'

export interface StudyDividerBlock {
  id: string
  type: 'divider'
  variant?: StudyDividerVariant
  thickness?: number
  color?: string
}

export interface StudyBoardBlock {
  id: string
  type: 'board'
  boardId?: string
  title?: string
}

export type StudyBlock =
  | StudyTextBlock
  | StudyHeadingBlock
  | StudyCodeBlock
  | StudyMarkdownBlock
  | StudyLatexBlock
  | StudyMermaidBlock
  | StudyImageBlock
  | StudyVideoBlock
  | StudyAudioBlock
  | StudyFileBlock
  | StudyDividerBlock
  | StudyBoardBlock

export interface StudyDocument {
  version: 1
  blocks: StudyBlock[]
}
export type StudyInternalLinkTargetKind = 'material' | 'heading'

export interface StudyInternalLinkTarget {
  kind: StudyInternalLinkTargetKind
  materialId: string
  headingId: string | null
  title: string
  materialTitle: string
  folderPath: string[]
  headingLevel: 1 | 2 | 3 | null
}

export interface SearchStudyInternalLinkTargetsInput {
  query: string
  currentMaterialId?: string
  limit?: number
}

export interface ResolveStudyInternalLinkTargetInput {
  kind: StudyInternalLinkTargetKind
  materialId: string
  headingId?: string | null
}

export interface StudyNode {
  id: string
  type: StudyNodeType
  parentId: string | null
  title: string
  icon?: StudyFolderIconName
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
  icon?: StudyFolderIconName
}

export interface RenameStudyNodeInput {
  id: string
  title: string
}
export interface DuplicateStudyNodeInput {
  id: string
}

export interface DuplicateStudyNodeResult {
  rootId: string
  nodes: StudyNode[]
}
export interface UpdateStudyFolderIconInput {
  id: string
  icon: StudyFolderIconName
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
export interface ImportStudyAssetInput {
  nodeId: string
  kind: StudyAssetKind
}
export type OpenStudyAssetInput = Pick<StudyLocalAsset, 'id' | 'materialId' | 'name'>

export const STUDY_IPC_CHANNELS = {
  listNodes: 'study:list-nodes',
  createNode: 'study:create-node',
  renameNode: 'study:rename-node',
  duplicateNode: 'study:duplicate-node',
  updateFolderIcon: 'study:update-folder-icon',
  deleteNode: 'study:delete-node',
  updateExpansion: 'study:update-expansion',
  moveNode: 'study:move-node',
  getMaterial: 'study:get-material',
  saveMaterial: 'study:save-material',
  searchInternalLinkTargets: 'study:search-internal-link-targets',
  resolveInternalLinkTarget: 'study:resolve-internal-link-target',
  importAsset: 'study:import-asset',
  openAsset: 'study:open-asset'
} as const

export interface StudyApi {
  listNodes(): Promise<StudyNode[]>
  createNode(input: CreateStudyNodeInput): Promise<StudyNode>
  renameNode(input: RenameStudyNodeInput): Promise<StudyNode>
  duplicateNode(input: DuplicateStudyNodeInput): Promise<DuplicateStudyNodeResult>
  updateFolderIcon(input: UpdateStudyFolderIconInput): Promise<StudyNode>
  deleteNode(nodeId: string): Promise<boolean>
  updateExpansion(input: UpdateStudyNodeExpansionInput): Promise<StudyNode>
  moveNode(input: MoveStudyNodeInput): Promise<StudyNode[]>
  getMaterial(nodeId: string): Promise<StudyMaterial>
  saveMaterial(input: SaveStudyMaterialInput): Promise<StudyMaterial>
  searchInternalLinkTargets(
    input: SearchStudyInternalLinkTargetsInput
  ): Promise<StudyInternalLinkTarget[]>
  resolveInternalLinkTarget(
    input: ResolveStudyInternalLinkTargetInput
  ): Promise<StudyInternalLinkTarget | null>
  importAsset(input: ImportStudyAssetInput): Promise<StudyLocalAsset | null>
  openAsset(input: OpenStudyAssetInput): Promise<void>
}
