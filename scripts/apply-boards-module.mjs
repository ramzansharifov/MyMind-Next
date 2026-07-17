import { readFileSync, writeFileSync } from 'node:fs'

function read(path) {
  return readFileSync(path, 'utf8')
}

function write(path, content) {
  writeFileSync(path, content, 'utf8')
}

function replaceOnce(path, before, after) {
  const content = read(path)

  if (content.includes(after)) {
    return
  }

  const first = content.indexOf(before)
  const last = content.lastIndexOf(before)

  if (first < 0 || first !== last) {
    throw new Error(`Expected exactly one match in ${path}: ${before.slice(0, 100)}`)
  }

  write(path, `${content.slice(0, first)}${after}${content.slice(first + before.length)}`)
}

function appendBefore(path, marker, addition) {
  const content = read(path)
  if (content.includes(addition.trim())) return
  const index = content.indexOf(marker)
  if (index < 0) throw new Error(`Marker not found in ${path}: ${marker}`)
  write(path, `${content.slice(0, index)}${addition}${content.slice(index)}`)
}

replaceOnce(
  'src/main/database/schema/index.ts',
  "export { appMeta } from './app-meta'\n",
  "export { appMeta } from './app-meta'\nexport { boardDocuments, boardNodes } from './boards'\n"
)

replaceOnce(
  'src/shared/contracts/system.ts',
  "import type { StudyApi } from './study'\n",
  "import type { BoardApi } from './boards'\nimport type { StudyApi } from './study'\n"
)
replaceOnce(
  'src/shared/contracts/system.ts',
  '  study: StudyApi\n  preferences: PreferencesApi\n',
  '  study: StudyApi\n  boards: BoardApi\n  preferences: PreferencesApi\n'
)

replaceOnce(
  'src/preload/index.ts',
  "import { contextBridge, ipcRenderer } from 'electron'\n\n",
  "import { contextBridge, ipcRenderer } from 'electron'\n\nimport {\n  BOARD_IPC_CHANNELS,\n  type BoardDocument,\n  type BoardNode\n} from '../shared/contracts/boards'\n"
)
replaceOnce(
  'src/preload/index.ts',
  "  study: {\n",
  `  boards: {
    listNodes: () => ipcRenderer.invoke(BOARD_IPC_CHANNELS.listNodes) as Promise<BoardNode[]>,

    createNode: (input) =>
      ipcRenderer.invoke(BOARD_IPC_CHANNELS.createNode, input) as Promise<BoardNode>,

    renameNode: (input) =>
      ipcRenderer.invoke(BOARD_IPC_CHANNELS.renameNode, input) as Promise<BoardNode>,

    deleteNode: (nodeId) =>
      ipcRenderer.invoke(BOARD_IPC_CHANNELS.deleteNode, nodeId) as Promise<boolean>,

    updateExpansion: (input) =>
      ipcRenderer.invoke(BOARD_IPC_CHANNELS.updateExpansion, input) as Promise<BoardNode>,

    moveNode: (input) =>
      ipcRenderer.invoke(BOARD_IPC_CHANNELS.moveNode, input) as Promise<BoardNode[]>,

    getDocument: (nodeId) =>
      ipcRenderer.invoke(BOARD_IPC_CHANNELS.getDocument, nodeId) as Promise<BoardDocument>,

    saveDocument: (input) =>
      ipcRenderer.invoke(BOARD_IPC_CHANNELS.saveDocument, input) as Promise<BoardDocument>,

    ensureStudyBoard: (input) =>
      ipcRenderer.invoke(BOARD_IPC_CHANNELS.ensureStudyBoard, input) as Promise<BoardNode>
  },

  study: {
`
)

replaceOnce(
  'src/main/ipc/register-ipc.ts',
  "import { registerPreferencesIpcHandlers } from './register-preferences-ipc'\n",
  "import { registerBoardsIpcHandlers } from './register-boards-ipc'\nimport { registerPreferencesIpcHandlers } from './register-preferences-ipc'\n"
)
replaceOnce(
  'src/main/ipc/register-ipc.ts',
  '  registerStudyIpcHandlers()\n  registerPreferencesIpcHandlers()\n',
  '  registerStudyIpcHandlers()\n  registerBoardsIpcHandlers()\n  registerPreferencesIpcHandlers()\n'
)

replaceOnce(
  'src/main/index.ts',
  "import { runStudyLinkTargetsMaintenance } from './repositories/study.repository'\n",
  "import { ensureBoardsSystemRoot } from './repositories/boards.repository'\nimport { runStudyLinkTargetsMaintenance } from './repositories/study.repository'\n"
)
replaceOnce(
  'src/main/index.ts',
  '    initializeDatabase()\n    runDatabaseMigrations()\n\n    const plainTextMaintenance',
  '    initializeDatabase()\n    runDatabaseMigrations()\n    ensureBoardsSystemRoot()\n\n    const plainTextMaintenance'
)

replaceOnce(
  'src/shared/contracts/study.ts',
  "  | 'divider'\n",
  "  | 'divider'\n  | 'board'\n"
)
replaceOnce(
  'src/shared/contracts/study.ts',
  `export interface StudyDividerBlock {
  id: string
  type: 'divider'
  variant?: StudyDividerVariant
  thickness?: number
  color?: string
}

export type StudyBlock =`,
  `export interface StudyDividerBlock {
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

export type StudyBlock =`
)
replaceOnce(
  'src/shared/contracts/study.ts',
  '  | StudyFileBlock\n  | StudyDividerBlock\n',
  '  | StudyFileBlock\n  | StudyDividerBlock\n  | StudyBoardBlock\n'
)

replaceOnce(
  'src/shared/validation/study.ts',
  `export const studyDividerBlockSchema = z.object({
  id: studySafeIdSchema,
  type: z.literal('divider'),
  variant: z.enum(['solid', 'tapered', 'dashed', 'dotted']).optional(),
  thickness: z.number().int().min(1).max(12).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
})

export const studyBlockSchema`,
  `export const studyDividerBlockSchema = z.object({
  id: studySafeIdSchema,
  type: z.literal('divider'),
  variant: z.enum(['solid', 'tapered', 'dashed', 'dotted']).optional(),
  thickness: z.number().int().min(1).max(12).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
})

export const studyBoardBlockSchema = z.object({
  id: studySafeIdSchema,
  type: z.literal('board'),
  boardId: studySafeIdSchema.optional(),
  title: z.string().max(STUDY_DOCUMENT_LIMITS.maxTitleLength).optional()
})

export const studyBlockSchema`
)
replaceOnce(
  'src/shared/validation/study.ts',
  '  studyFileBlockSchema,\n  studyDividerBlockSchema\n',
  '  studyFileBlockSchema,\n  studyDividerBlockSchema,\n  studyBoardBlockSchema\n'
)

replaceOnce(
  'src/main/domain/study-document-index.ts',
  "  divider: () => ''\n",
  "  divider: () => '',\n  board: (block) => (block.type === 'board' ? (block.title ?? 'Доска') : '')\n"
)

replaceOnce(
  'src/renderer/src/modules/study/lib/study-document.ts',
  `export function cloneStudyBlock(block: StudyBlock): StudyBlock {
  return {
    ...block,
    id: crypto.randomUUID()
  }
}`,
  `export function cloneStudyBlock(block: StudyBlock): StudyBlock {
  if (block.type === 'board') {
    return {
      id: crypto.randomUUID(),
      type: 'board'
    }
  }

  return {
    ...block,
    id: crypto.randomUUID()
  }
}`
)

replaceOnce(
  'src/renderer/src/modules/study/lib/study-block-registry.ts',
  '  Minus,\n  Sigma,\n',
  '  Minus,\n  Presentation,\n  Sigma,\n'
)
replaceOnce(
  'src/renderer/src/modules/study/lib/study-block-registry.ts',
  `  divider: {
    type: 'divider',
    label: 'Разделитель',
    icon: Minus,
    factory: (id) => ({
      id,
      type: 'divider',
      variant: 'solid',
      thickness: 1,
      color: '#6d5dfc'
    }),
    editStrategy: 'divider',
    readStrategy: 'divider',
    settingsStrategy: 'divider'
  }
}`,
  `  divider: {
    type: 'divider',
    label: 'Разделитель',
    icon: Minus,
    factory: (id) => ({
      id,
      type: 'divider',
      variant: 'solid',
      thickness: 1,
      color: '#6d5dfc'
    }),
    editStrategy: 'divider',
    readStrategy: 'divider',
    settingsStrategy: 'divider'
  },
  board: {
    type: 'board',
    label: 'Доска',
    icon: Presentation,
    factory: (id) => ({ id, type: 'board' }),
    editStrategy: 'board',
    readStrategy: 'board',
    settingsStrategy: 'board'
  }
}`
)

replaceOnce(
  'src/renderer/src/modules/study/components/BlockSettingsPanel.tsx',
  'import { Link2, LoaderCircle, Settings2, SquarePlay, Trash2, Upload } from \'lucide-react\'\n',
  `import {
  Link2,
  LoaderCircle,
  Presentation,
  Settings2,
  SquarePlay,
  Trash2,
  Upload
} from 'lucide-react'
`
)
replaceOnce(
  'src/renderer/src/modules/study/components/BlockSettingsPanel.tsx',
  '  file: AttachmentBlockSettings,\n  divider: DividerBlockSettings\n',
  '  file: AttachmentBlockSettings,\n  divider: DividerBlockSettings,\n  board: BoardBlockSettings\n'
)
replaceOnce(
  'src/renderer/src/modules/study/components/BlockSettingsPanel.tsx',
  `function DividerBlockSettings({ block, onChange }: SettingsRendererProps): React.JSX.Element {
  if (block.type !== 'divider') {
    throw new Error('Divider settings received an incompatible block')
  }

  return <DividerSettings block={block} onChange={onChange} />
}
`,
  `function DividerBlockSettings({ block, onChange }: SettingsRendererProps): React.JSX.Element {
  if (block.type !== 'divider') {
    throw new Error('Divider settings received an incompatible block')
  }

  return <DividerSettings block={block} onChange={onChange} />
}

function BoardBlockSettings({ block }: SettingsRendererProps): React.JSX.Element {
  if (block.type !== 'board') {
    throw new Error('Board settings received an incompatible block')
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-start gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-3.5">
        <Presentation aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--app-accent-300)]" />
        <div>
          <p className="text-sm font-medium text-[var(--app-text)]">
            {block.boardId ? 'Связанная доска создана' : 'Доска будет создана при открытии'}
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
            Холст хранится в модуле «Доски». Этот блок содержит только безопасную ссылку на него.
          </p>
        </div>
      </div>
    </div>
  )
}
`
)

replaceOnce(
  'src/main/repositories/boards.repository.ts',
  `  type MoveBoardNodeInput,
  type StudyBoardBlock
} from '../../shared/contracts/boards'
import type { StudyDocument } from '../../shared/contracts/study'`,
  `  type MoveBoardNodeInput
} from '../../shared/contracts/boards'
import type { StudyDocument } from '../../shared/contracts/study'`
)
replaceOnce(
  'src/main/repositories/boards.repository.ts',
  `  const material = database
    .select()
    .from(studyMaterials)
    .where(eq(studyMaterials.nodeId, input.materialId))
    .get()

  if (!materialNode || materialNode.type !== 'material' || !material) {
    throw new Error('Материал для связанной доски не найден')
  }

  const parsedDocument = studyDocumentSchema.parse(material.document)
  const boardBlock = parsedDocument.blocks.find(
    (block): block is StudyBoardBlock => block.type === 'board' && block.id === input.blockId
  )

  if (!boardBlock) {
    throw new Error('Блок доски не найден в материале')
  }
`,
  `  if (!materialNode || materialNode.type !== 'material') {
    throw new Error('Материал для связанной доски не найден')
  }
`
)
replaceOnce(
  'src/main/repositories/boards.repository.ts',
  "import { studyDocumentSchema } from '../../shared/validation/study'\n",
  ''
)
replaceOnce(
  'src/main/repositories/boards.repository.ts',
  'import { boardDocuments, boardNodes, studyMaterials, studyNodes } from \'../database/schema\'\n',
  "import { boardDocuments, boardNodes, studyNodes } from '../database/schema'\n"
)

replaceOnce(
  'src/main/repositories/study.repository.ts',
  "import { documentToPlainText } from '../domain/study-document-index'\n",
  "import { documentToPlainText } from '../domain/study-document-index'\nimport { cleanupBoardsForStudyDocument } from './boards.repository'\n"
)
replaceOnce(
  'src/main/repositories/study.repository.ts',
  `    blocks: document.blocks.map((block) => {
      if (block.type !== 'text' || !block.html) {
        return block
      }
`,
  `    blocks: document.blocks.map((block) => {
      if (block.type === 'board') {
        return {
          id: randomUUID(),
          type: 'board'
        }
      }

      if (block.type !== 'text' || !block.html) {
        return block
      }
`
)
replaceOnce(
  'src/main/repositories/study.repository.ts',
  `  await cleanupStudyAssetsForDocument(input.nodeId, savedMaterial.document).catch(
    (reason: unknown) => {
      console.error('Failed to clean up unreferenced study assets', reason)
    }
  )

  return savedMaterial
`,
  `  await cleanupStudyAssetsForDocument(input.nodeId, savedMaterial.document).catch(
    (reason: unknown) => {
      console.error('Failed to clean up unreferenced study assets', reason)
    }
  )

  try {
    cleanupBoardsForStudyDocument(input.nodeId, savedMaterial.document)
  } catch (reason: unknown) {
    console.error('Failed to clean up unreferenced study boards', reason)
  }

  return savedMaterial
`
)

replaceOnce(
  'src/renderer/src/modules/study/components/StudyBlockEditor.tsx',
  "import { BlockSettingsErrorBoundary } from './BlockSettingsErrorBoundary'\n",
  "import { StudyBoardBlock } from './board/StudyBoardBlock'\nimport { BlockSettingsErrorBoundary } from './BlockSettingsErrorBoundary'\n"
)
replaceOnce(
  'src/renderer/src/modules/study/components/StudyBlockEditor.tsx',
  "    return <ReadOnlyStudyDocument document={document} />\n",
  "    return <ReadOnlyStudyDocument materialId={materialId} document={document} />\n"
)
replaceOnce(
  'src/renderer/src/modules/study/components/StudyBlockEditor.tsx',
  '            <EditableBlock block={block} onChange={onChange} />\n',
  '            <EditableBlock materialId={materialId} block={block} onChange={onChange} />\n'
)
replaceOnce(
  'src/renderer/src/modules/study/components/StudyBlockEditor.tsx',
  `function EditableBlock({
  block,
  onChange
}: {
  block: Exclude<StudyBlock, { type: 'text' }>
  onChange: (block: StudyBlock) => void
}): React.JSX.Element {
  const strategy = getStudyBlockDefinition(block.type).editStrategy
  const Editor = studyBlockEditors[strategy]
  return <Editor block={block} onChange={onChange} />
}

 type EditableBlockProps =`,
  `function EditableBlock({
  materialId,
  block,
  onChange
}: {
  materialId: string
  block: Exclude<StudyBlock, { type: 'text' }>
  onChange: (block: StudyBlock) => void
}): React.JSX.Element {
  const strategy = getStudyBlockDefinition(block.type).editStrategy
  const Editor = studyBlockEditors[strategy]
  return <Editor materialId={materialId} block={block} onChange={onChange} />
}

type EditableBlockProps =`
)
replaceOnce(
  'src/renderer/src/modules/study/components/StudyBlockEditor.tsx',
  `type EditableBlockProps = {
  block: Exclude<StudyBlock, { type: 'text' }>
  onChange: (block: StudyBlock) => void
}`,
  `type EditableBlockProps = {
  materialId: string
  block: Exclude<StudyBlock, { type: 'text' }>
  onChange: (block: StudyBlock) => void
}`
)
replaceOnce(
  'src/renderer/src/modules/study/components/StudyBlockEditor.tsx',
  '  file: EditAttachmentBlock,\n  divider: EditDividerBlock\n',
  '  file: EditAttachmentBlock,\n  divider: EditDividerBlock,\n  board: EditBoardBlock\n'
)
appendBefore(
  'src/renderer/src/modules/study/components/StudyBlockEditor.tsx',
  "function EditDividerBlock({ block }: EditableBlockProps): React.JSX.Element {",
  `function EditBoardBlock({ materialId, block, onChange }: EditableBlockProps): React.JSX.Element {
  if (block.type !== 'board') throw new Error('Board editor received an incompatible block')
  return (
    <StudyBoardBlock materialId={materialId} block={block} mode="edit" onChange={onChange} />
  )
}

`
)
replaceOnce(
  'src/renderer/src/modules/study/components/StudyBlockEditor.tsx',
  `function ReadOnlyStudyDocument({ document }: { document: StudyDocument }): React.JSX.Element {
  const outline = buildStudyReadOutline(document.blocks)`,
  `function ReadOnlyStudyDocument({
  materialId,
  document
}: {
  materialId: string
  document: StudyDocument
}): React.JSX.Element {
  const outline = buildStudyReadOutline(document.blocks)`
)
replaceOnce(
  'src/renderer/src/modules/study/components/StudyBlockEditor.tsx',
  '<StudyReadNodeView key={getStudyReadNodeKey(node)} node={node} />',
  '<StudyReadNodeView key={getStudyReadNodeKey(node)} materialId={materialId} node={node} />'
)
replaceOnce(
  'src/renderer/src/modules/study/components/StudyBlockEditor.tsx',
  `function StudyReadNodeView({ node }: { node: StudyReadNode }): React.JSX.Element {
  if (node.kind === 'section') {
    return <StudyReadSection section={node} />
  }

  return <StudyBlockReader block={node.block} />
}`,
  `function StudyReadNodeView({
  materialId,
  node
}: {
  materialId: string
  node: StudyReadNode
}): React.JSX.Element {
  if (node.kind === 'section') {
    return <StudyReadSection materialId={materialId} section={node} />
  }

  return <StudyBlockReader materialId={materialId} block={node.block} />
}`
)
replaceOnce(
  'src/renderer/src/modules/study/components/StudyBlockEditor.tsx',
  'function StudyReadSection({ section }: { section: StudyReadSectionNode }): React.JSX.Element {',
  `function StudyReadSection({
  materialId,
  section
}: {
  materialId: string
  section: StudyReadSectionNode
}): React.JSX.Element {`
)
replaceOnce(
  'src/renderer/src/modules/study/components/StudyBlockEditor.tsx',
  '<StudyReadNodeView key={getStudyReadNodeKey(child)} node={child} />',
  '<StudyReadNodeView key={getStudyReadNodeKey(child)} materialId={materialId} node={child} />'
)
replaceOnce(
  'src/renderer/src/modules/study/components/StudyBlockEditor.tsx',
  `function StudyBlockReader({ block }: { block: StudyBlock }): React.JSX.Element {
  const Reader = studyBlockReaders[getStudyBlockDefinition(block.type).readStrategy]
  return <Reader block={block} />
}

 type StudyBlockReaderProps = { block: StudyBlock }`,
  `function StudyBlockReader({
  materialId,
  block
}: {
  materialId: string
  block: StudyBlock
}): React.JSX.Element {
  const Reader = studyBlockReaders[getStudyBlockDefinition(block.type).readStrategy]
  return <Reader materialId={materialId} block={block} />
}

type StudyBlockReaderProps = { materialId: string; block: StudyBlock }`
)
replaceOnce(
  'src/renderer/src/modules/study/components/StudyBlockEditor.tsx',
  '  file: ReadAttachmentBlock,\n  divider: ReadDividerBlock\n',
  '  file: ReadAttachmentBlock,\n  divider: ReadDividerBlock,\n  board: ReadBoardBlock\n'
)
appendBefore(
  'src/renderer/src/modules/study/components/StudyBlockEditor.tsx',
  "function ReadDividerBlock({ block }: StudyBlockReaderProps): React.JSX.Element {",
  `function ReadBoardBlock({ materialId, block }: StudyBlockReaderProps): React.JSX.Element {
  if (block.type !== 'board') throw new Error('Board reader received an incompatible block')
  return <StudyBoardBlock materialId={materialId} block={block} mode="read" />
}

`
)

replaceOnce(
  'src/renderer/src/app/module-registry.ts',
  "import { BookOpen, Settings, type LucideIcon } from 'lucide-react'\n",
  "import { BookOpen, Presentation, Settings, type LucideIcon } from 'lucide-react'\n"
)
replaceOnce(
  'src/renderer/src/app/module-registry.ts',
  `export interface AppModuleDefinition {
  id: string`,
  `export interface AppModuleProps {
  resourceId?: string | null
  onResourceHandled?: () => void
}

export interface AppModuleDefinition {
  id: string`
)
replaceOnce(
  'src/renderer/src/app/module-registry.ts',
  '  component: ComponentType\n',
  '  component: ComponentType<AppModuleProps>\n'
)
replaceOnce(
  'src/renderer/src/app/module-registry.ts',
  `const StudyModule = lazy(() =>
  import('../modules/study/StudyPage').then(({ StudyPage }) => ({ default: StudyPage }))
)
const SettingsModule`,
  `const StudyModule = lazy(() =>
  import('../modules/study/StudyPage').then(({ StudyPage }) => ({ default: StudyPage }))
) as ComponentType<AppModuleProps>
const BoardsModule = lazy(() =>
  import('../modules/boards/BoardsPage').then(({ BoardsPage }) => ({ default: BoardsPage }))
) as ComponentType<AppModuleProps>
const SettingsModule`
)
replaceOnce(
  'src/renderer/src/app/module-registry.ts',
  `const SettingsModule = lazy(() =>
  import('../modules/settings/SettingsModule').then(({ SettingsModule }) => ({
    default: SettingsModule
  }))
)`,
  `const SettingsModule = lazy(() =>
  import('../modules/settings/SettingsModule').then(({ SettingsModule }) => ({
    default: SettingsModule
  }))
) as ComponentType<AppModuleProps>`
)
replaceOnce(
  'src/renderer/src/app/module-registry.ts',
  `  settings: {
    id: 'settings',`,
  `  boards: {
    id: 'boards',
    label: 'Доски',
    loadingLabel: 'Загрузка досок',
    icon: Presentation,
    navigationGroup: 'primary',
    component: BoardsModule
  },
  settings: {
    id: 'settings',`
)

replaceOnce(
  'src/renderer/src/app/AppShell.tsx',
  "  const [isCollapsed, setIsCollapsed] = useState(() => activeView === 'study')\n",
  "  const [isCollapsed, setIsCollapsed] = useState(() => activeView === 'study' || activeView === 'boards')\n"
)
replaceOnce(
  'src/renderer/src/app/AppShell.tsx',
  `  function handleViewChange(view: AppViewId): void {
    if (view === 'study' && activeView !== 'study') {
      setIsCollapsed(true)
    }
`,
  `  function handleViewChange(view: AppViewId): void {
    if ((view === 'study' || view === 'boards') && view !== activeView) {
      setIsCollapsed(true)
    }
`
)

replaceOnce(
  'src/renderer/src/App.tsx',
  "import { getAppModule } from './app/module-registry'\n",
  "import { APP_MODULE_NAVIGATE_EVENT, type AppModuleNavigationRequest } from './app/module-navigation'\nimport { getAppModule } from './app/module-registry'\n"
)
replaceOnce(
  'src/renderer/src/App.tsx',
  "import { flushActiveStudyDraft } from './modules/study/lib/study-draft-lifecycle'\n",
  "import { flushActiveBoardDraft } from './modules/boards/lib/board-draft-lifecycle'\nimport { flushActiveStudyDraft } from './modules/study/lib/study-draft-lifecycle'\n"
)
replaceOnce(
  'src/renderer/src/App.tsx',
  `type AppFlushFailure =
  | { kind: 'view'; target: AppViewId; message: string }`,
  `type AppFlushFailure =
  | { kind: 'view'; target: AppViewId; resourceId: string | null; message: string }`
)
replaceOnce(
  'src/renderer/src/App.tsx',
  "  const [activeView, setActiveView] = useState<AppViewId>('study')\n",
  "  const [activeView, setActiveView] = useState<AppViewId>('study')\n  const [activeResourceId, setActiveResourceId] = useState<string | null>(null)\n"
)
replaceOnce(
  'src/renderer/src/App.tsx',
  `  async function changeView(target: AppViewId): Promise<void> {
    if (target === activeView || transitionPendingRef.current) return
`,
  `  async function flushActiveDrafts(): Promise<void> {
    await Promise.all([flushActiveStudyDraft(), flushActiveBoardDraft()])
  }

  async function changeView(target: AppViewId, resourceId: string | null = null): Promise<void> {
    if (
      (target === activeView && resourceId === activeResourceId) ||
      transitionPendingRef.current
    ) {
      return
    }
`
)
replaceOnce(
  'src/renderer/src/App.tsx',
  `      await flushActiveStudyDraft()
      setFlushFailure(null)
      setActiveView(target)`,
  `      await flushActiveDrafts()
      setFlushFailure(null)
      setActiveView(target)
      setActiveResourceId(resourceId)`
)
replaceOnce(
  'src/renderer/src/App.tsx',
  `        kind: 'view',
        target,
        message:`,
  `        kind: 'view',
        target,
        resourceId,
        message:`
)
replaceOnce(
  'src/renderer/src/App.tsx',
  `  useEffect(
    () =>
      window.api.system.onShutdownRequested`,
  `  useEffect(() => {
    function handleModuleNavigation(event: Event): void {
      const detail = (event as CustomEvent<AppModuleNavigationRequest>).detail
      if (!detail?.view) return
      void changeView(detail.view, detail.resourceId ?? null)
    }

    window.addEventListener(APP_MODULE_NAVIGATE_EVENT, handleModuleNavigation)
    return () => window.removeEventListener(APP_MODULE_NAVIGATE_EVENT, handleModuleNavigation)
  })

  useEffect(
    () =>
      window.api.system.onShutdownRequested`
)
replaceOnce(
  'src/renderer/src/App.tsx',
  '        void flushActiveStudyDraft()\n',
  '        void flushActiveDrafts()\n'
)
replaceOnce(
  'src/renderer/src/App.tsx',
  `        <ActiveModule />`,
  `        <ActiveModule
            resourceId={activeResourceId}
            onResourceHandled={() => setActiveResourceId(null)}
          />`
)
replaceOnce(
  'src/renderer/src/App.tsx',
  '                    void changeView(failure.target)\n',
  '                    void changeView(failure.target, failure.resourceId)\n'
)
replaceOnce(
  'src/renderer/src/App.tsx',
  '                    void flushActiveStudyDraft()\n',
  '                    void flushActiveDrafts()\n'
)
replaceOnce(
  'src/renderer/src/App.tsx',
  `                    setActiveView(flushFailure.target)
                    setFlushFailure(null)`,
  `                    setActiveView(flushFailure.target)
                    setActiveResourceId(flushFailure.resourceId)
                    setFlushFailure(null)`
)
replaceOnce(
  'src/renderer/src/App.tsx',
  '<AppErrorBoundary scope={activeModule.id} resetKey={activeModule.id}>',
  '<AppErrorBoundary scope={activeModule.id} resetKey={`${activeModule.id}:${activeResourceId ?? ""}`}> '
)

replaceOnce(
  'src/renderer/src/modules/settings/instructions/learning-instruction-catalog.ts',
  `  divider: {
    summary: 'Визуальное разделение частей материала с выбором стиля, толщины и цвета.',`,
  `  board: {
    summary: 'Связанная бесконечная доска tldraw, доступная из материала и отдельного модуля.',
    intro:
      'Блок «Доска» связывает материал с полноценным холстом tldraw. Содержимое доски хранится отдельно от JSON материала и открывается в модуле «Доски».',
    sections: [
      {
        title: 'Создание и открытие',
        steps: [
          'Добавьте блок «Доска» в материал.',
          'Нажмите «Создать доску» при первом открытии.',
          'MyMind создаст доску в защищённой папке «Обучение» и повторит путь папок материала.',
          'Последующие открытия ведут к той же доске, а не создают копию.'
        ]
      },
      {
        title: 'Работа на холсте',
        bullets: [
          'Используйте инструменты tldraw для текста, фигур, стрелок, рисования и изображений.',
          'Холст бесконечный: масштабируйте и перемещайте рабочую область.',
          'Изменения сохраняются автоматически после короткой паузы.'
        ]
      },
      {
        title: 'Связь с модулем досок',
        paragraphs: [
          'Связанная доска отображается в модуле «Доски» под системной папкой «Обучение». Удаление блока удаляет связанную доску после сохранения материала.',
          'Дублирование блока создаёт новую независимую доску при первом открытии.'
        ]
      }
    ],
    shortcuts: []
  },
  divider: {
    summary: 'Визуальное разделение частей материала с выбором стиля, толщины и цвета.',`
)

replaceOnce(
  'src/renderer/src/modules/settings/instructions/LearningInstructions.test.tsx',
  "    expect(screen.getByText('11 типов блоков')).toBeInTheDocument()\n",
  "    expect(screen.getByText(`${studyBlockDefinitions.length} типов блоков`)).toBeInTheDocument()\n"
)

replaceOnce(
  'src/renderer/src/App.test.tsx',
  `        study: {
`,
  `        boards: {
          listNodes: vi.fn().mockResolvedValue([]),
          createNode: vi.fn(),
          renameNode: vi.fn(),
          deleteNode: vi.fn(),
          updateExpansion: vi.fn(),
          moveNode: vi.fn(),
          getDocument: vi.fn(),
          saveDocument: vi.fn(),
          ensureStudyBoard: vi.fn()
        },

        study: {
`
)

write(
  '.github/workflows/ci.yml',
  `name: CI

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

jobs:
  verify:
    runs-on: windows-latest
    timeout-minutes: 25
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run native:node
      - run: npm run format:check
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:coverage
      - run: npm run db:check
      - run: npm run build:bundle
      - uses: actions/upload-artifact@v4
        if: \${{ always() && hashFiles('coverage/**') != '' }}
        with:
          name: coverage
          path: coverage
          if-no-files-found: error
`
)
