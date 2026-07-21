import { readFileSync, writeFileSync } from 'node:fs'

function replaceOnce(path, before, after) {
  const content = readFileSync(path, 'utf8')
  const index = content.indexOf(before)

  if (index < 0) {
    throw new Error(`Pattern not found in ${path}: ${before.slice(0, 180)}`)
  }

  if (content.indexOf(before, index + before.length) >= 0) {
    throw new Error(`Pattern is not unique in ${path}: ${before.slice(0, 180)}`)
  }

  writeFileSync(path, content.slice(0, index) + after + content.slice(index + before.length), 'utf8')
}

function replaceRegex(path, pattern, after) {
  const content = readFileSync(path, 'utf8')
  const matches = [...content.matchAll(pattern)]

  if (matches.length !== 1) {
    throw new Error(`Expected exactly one regex match in ${path}, got ${matches.length}`)
  }

  writeFileSync(path, content.replace(pattern, after), 'utf8')
}

const contractsPath = 'src/shared/contracts/boards.ts'
replaceOnce(
  contractsPath,
  `export type { StudyBoardBlock } from './study'`,
  `import type { StudyFolderIconName } from './study'\n\nexport type { StudyBoardBlock } from './study'`
)
replaceOnce(contractsPath, `  title: string\n  position: number`, `  title: string\n  icon?: StudyFolderIconName\n  position: number`)
replaceOnce(
  contractsPath,
  `  title?: string\n}\n\nexport interface RenameBoardNodeInput`,
  `  title?: string\n  icon?: StudyFolderIconName\n}\n\nexport interface RenameBoardNodeInput`
)
replaceOnce(
  contractsPath,
  `export interface UpdateBoardNodeExpansionInput {`,
  `export interface UpdateBoardFolderIconInput {\n  id: string\n  icon: StudyFolderIconName\n}\n\nexport interface UpdateBoardNodeExpansionInput {`
)
replaceOnce(
  contractsPath,
  `  renameNode: 'boards:rename-node',\n  deleteNode:`,
  `  renameNode: 'boards:rename-node',\n  updateFolderIcon: 'boards:update-folder-icon',\n  deleteNode:`
)
replaceOnce(
  contractsPath,
  `  renameNode(input: RenameBoardNodeInput): Promise<BoardNode>\n  deleteNode`,
  `  renameNode(input: RenameBoardNodeInput): Promise<BoardNode>\n  updateFolderIcon(input: UpdateBoardFolderIconInput): Promise<BoardNode>\n  deleteNode`
)

const validationPath = 'src/shared/validation/boards.ts'
replaceOnce(
  validationPath,
  `import { STUDY_SAFE_ID_PATTERN } from '../contracts/study'`,
  `import { STUDY_SAFE_ID_PATTERN } from '../contracts/study'\nimport { studyFolderIconSchema } from './study'`
)
replaceOnce(validationPath, `  title: z.string().trim().min(1).max(BOARD_DOCUMENT_LIMITS.maxTitleLength),\n  position:`, `  title: z.string().trim().min(1).max(BOARD_DOCUMENT_LIMITS.maxTitleLength),\n  icon: studyFolderIconSchema.optional(),\n  position:`)
replaceOnce(validationPath, `  title: z.string().trim().max(BOARD_DOCUMENT_LIMITS.maxTitleLength).optional()\n})`, `  title: z.string().trim().max(BOARD_DOCUMENT_LIMITS.maxTitleLength).optional(),\n  icon: studyFolderIconSchema.optional()\n})`)
replaceOnce(
  validationPath,
  `export const updateBoardNodeExpansionInputSchema = z.object({`,
  `export const updateBoardFolderIconInputSchema = z.object({\n  id: boardSafeIdSchema.refine(\n    (id) => id !== BOARD_SYSTEM_ROOT_ID,\n    'Системную папку нельзя изменять'\n  ),\n  icon: studyFolderIconSchema\n})\n\nexport const updateBoardNodeExpansionInputSchema = z.object({`
)

const schemaPath = 'src/main/database/schema/boards.ts'
replaceOnce(
  schemaPath,
  `import type { BoardNodeType, BoardSnapshot } from '../../../shared/contracts/boards'\nimport { studyNodes } from './study'`,
  `import type { BoardNodeType, BoardSnapshot } from '../../../shared/contracts/boards'\nimport type { StudyFolderIconName } from '../../../shared/contracts/study'\nimport { studyNodes } from './study'`
)
replaceOnce(schemaPath, `    title: text('title').notNull(),\n    position:`, `    title: text('title').notNull(),\n    icon: text('icon').$type<StudyFolderIconName>(),\n    position:`)

const boardRepositoryPath = 'src/main/repositories/boards.repository.ts'
replaceOnce(
  boardRepositoryPath,
  `  type MoveBoardNodeInput,\n  type StudyBoardBlock`,
  `  type MoveBoardNodeInput,\n  type StudyBoardBlock,\n  type UpdateBoardFolderIconInput`
)
replaceOnce(
  boardRepositoryPath,
  `    ...row,\n    sourceStudyNodeId:`,
  `    ...row,\n    icon: row.icon ?? undefined,\n    sourceStudyNodeId:`
)
replaceOnce(boardRepositoryPath, `        title: 'Обучение',\n        position:`, `        title: 'Обучение',\n        icon: 'folder',\n        position:`)
replaceOnce(boardRepositoryPath, `        title: 'Обучение',\n        position: 0,\n        isSystem: true,`, `        title: 'Обучение',\n        icon: 'folder',\n        position: 0,\n        isSystem: true,`)
replaceOnce(
  boardRepositoryPath,
  `        title,\n        position: getNextBoardPosition(input.parentId),`,
  `        title,\n        icon: input.type === 'folder' ? (input.icon ?? 'folder') : null,\n        position: getNextBoardPosition(input.parentId),`
)
replaceOnce(
  boardRepositoryPath,
  `export function updateBoardNodeExpansion(id: string, isExpanded: boolean): BoardNode {`,
  `export function updateBoardFolderIcon(input: UpdateBoardFolderIconInput): BoardNode {\n  const database = getDatabase()\n  const folder = database.select().from(boardNodes).where(eq(boardNodes.id, input.id)).get()\n\n  if (!folder || folder.type !== 'folder') {\n    throw new Error('Папка досок не найдена')\n  }\n\n  if (folder.isSystem || folder.sourceStudyNodeId) {\n    throw new Error('Иконка этой папки управляется модулем обучения')\n  }\n\n  database\n    .update(boardNodes)\n    .set({ icon: input.icon, updatedAt: new Date() })\n    .where(eq(boardNodes.id, input.id))\n    .run()\n\n  const updated = database.select().from(boardNodes).where(eq(boardNodes.id, input.id)).get()\n\n  if (!updated) {\n    throw new Error('Папка досок не найдена')\n  }\n\n  return mapBoardNode(updated)\n}\n\nexport function updateBoardNodeExpansion(id: string, isExpanded: boolean): BoardNode {`
)
replaceOnce(
  boardRepositoryPath,
  `  if (existing) {\n    return existing\n  }\n\n  const now = new Date()`,
  `  const icon = sourceFolder.icon ?? 'folder'\n\n  if (existing) {\n    if (\n      existing.parentId !== parentId ||\n      existing.title !== sourceFolder.title ||\n      existing.icon !== icon\n    ) {\n      database\n        .update(boardNodes)\n        .set({ parentId, title: sourceFolder.title, icon, updatedAt: new Date() })\n        .where(eq(boardNodes.id, existing.id))\n        .run()\n\n      const synchronized = database\n        .select()\n        .from(boardNodes)\n        .where(eq(boardNodes.id, existing.id))\n        .get()\n\n      if (synchronized) return synchronized\n    }\n\n    return existing\n  }\n\n  const now = new Date()`
)
replaceOnce(boardRepositoryPath, `      title: sourceFolder.title,\n      position:`, `      title: sourceFolder.title,\n      icon,\n      position:`)

const studyRepositoryPath = 'src/main/repositories/study.repository.ts'
replaceOnce(
  studyRepositoryPath,
  `import { appMeta, studyLinkTargets, studyMaterials, studyNodes } from '../database/schema'`,
  `import { appMeta, boardNodes, studyLinkTargets, studyMaterials, studyNodes } from '../database/schema'`
)
replaceOnce(
  studyRepositoryPath,
  `  database\n    .update(studyNodes)\n    .set({\n      icon,\n      updatedAt: new Date()\n    })\n    .where(eq(studyNodes.id, id))\n    .run()`,
  `  const now = new Date()\n\n  database.transaction((transaction) => {\n    transaction\n      .update(studyNodes)\n      .set({ icon, updatedAt: now })\n      .where(eq(studyNodes.id, id))\n      .run()\n\n    transaction\n      .update(boardNodes)\n      .set({ icon, updatedAt: now })\n      .where(eq(boardNodes.sourceStudyNodeId, id))\n      .run()\n  })`
)

const ipcPath = 'src/main/ipc/register-boards-ipc.ts'
replaceOnce(
  ipcPath,
  `  updateBoardNodeExpansionInputSchema`,
  `  updateBoardFolderIconInputSchema,\n  updateBoardNodeExpansionInputSchema`
)
replaceOnce(
  ipcPath,
  `  updateBoardNodeExpansion\n} from '../repositories/boards.repository'`,
  `  updateBoardFolderIcon,\n  updateBoardNodeExpansion\n} from '../repositories/boards.repository'`
)
replaceOnce(
  ipcPath,
  `  ipcMain.handle(BOARD_IPC_CHANNELS.deleteNode,`,
  `  ipcMain.handle(BOARD_IPC_CHANNELS.updateFolderIcon, (_event, rawInput: unknown) =>\n    mainOperationTracker.run(() =>\n      updateBoardFolderIcon(updateBoardFolderIconInputSchema.parse(rawInput))\n    )\n  )\n\n  ipcMain.handle(BOARD_IPC_CHANNELS.deleteNode,`
)

const preloadPath = 'src/preload/index.ts'
replaceOnce(
  preloadPath,
  `    renameNode: (input) =>\n      ipcRenderer.invoke(BOARD_IPC_CHANNELS.renameNode, input) as Promise<BoardNode>,\n\n    deleteNode:`,
  `    renameNode: (input) =>\n      ipcRenderer.invoke(BOARD_IPC_CHANNELS.renameNode, input) as Promise<BoardNode>,\n\n    updateFolderIcon: (input) =>\n      ipcRenderer.invoke(BOARD_IPC_CHANNELS.updateFolderIcon, input) as Promise<BoardNode>,\n\n    deleteNode:`
)

const clientPath = 'src/renderer/src/modules/boards/api/boards-client.ts'
replaceOnce(
  clientPath,
  `  MoveBoardNodeInput\n} from`,
  `  MoveBoardNodeInput,\n  type StudyFolderIconName\n} from`
)
replaceOnce(
  clientPath,
  `  async deleteNode(id: string): Promise<boolean> {`,
  `  async updateFolderIcon(id: string, icon: StudyFolderIconName): Promise<BoardNode> {\n    return getBoardApi().updateFolderIcon({ id, icon })\n  },\n\n  async deleteNode(id: string): Promise<boolean> {`
)

const boardTreePath = 'src/renderer/src/modules/boards/components/BoardTree.tsx'
replaceOnce(boardTreePath, `  Folder,\n  FolderPlus,`, `  FolderPlus,`)
replaceOnce(
  boardTreePath,
  `import { Tooltip } from '../../../shared/ui/tooltip'`,
  `import { FolderIcon, FOLDER_ICON_SIDEBAR_CLASS_NAME } from '../../../shared/ui/FolderIcon'\nimport { Tooltip } from '../../../shared/ui/tooltip'`
)
replaceOnce(boardTreePath, `  const Icon = isFolder ? Folder : Presentation\n`, ``)
replaceOnce(
  boardTreePath,
  `                <Icon aria-hidden="true" className="size-4 shrink-0" />`,
  `                {isFolder ? (\n                  <FolderIcon\n                    name={node.icon}\n                    expanded={node.isExpanded}\n                    className={FOLDER_ICON_SIDEBAR_CLASS_NAME}\n                  />\n                ) : (\n                  <Presentation aria-hidden="true" className="size-4 shrink-0" />\n                )}`
)
replaceOnce(
  boardTreePath,
  `function BoardDragOverlay({ node }: { node: BoardNode }): React.JSX.Element {\n  const Icon = node.type === 'folder' ? Folder : Presentation\n\n  return (\n    <ModuleTreeDragOverlay\n      icon={<Icon aria-hidden="true" className="size-4 shrink-0 text-violet-300" />}\n      title={node.title}\n    />\n  )\n}`,
  `function BoardDragOverlay({ node }: { node: BoardNode }): React.JSX.Element {\n  return (\n    <ModuleTreeDragOverlay\n      icon={\n        node.type === 'folder' ? (\n          <FolderIcon\n            name={node.icon}\n            expanded={node.isExpanded}\n            className="size-4 shrink-0 text-violet-300"\n          />\n        ) : (\n          <Presentation aria-hidden="true" className="size-4 shrink-0 text-violet-300" />\n        )\n      }\n      title={node.title}\n    />\n  )\n}`
)

const boardsPagePath = 'src/renderer/src/modules/boards/BoardsPage.tsx'
replaceOnce(boardsPagePath, `  LockKeyhole,\n  Pencil,`, `  LockKeyhole,\n  Palette,\n  Pencil,`)
replaceOnce(
  boardsPagePath,
  `import {\n  BOARD_SYSTEM_ROOT_ID,`,
  `import type { StudyFolderIconName } from '../../../../shared/contracts/study'\nimport {\n  BOARD_SYSTEM_ROOT_ID,`
)
replaceOnce(
  boardsPagePath,
  `import { ModuleSidebar } from '../../shared/ui/ModuleSidebar'`,
  `import { FolderIcon } from '../../shared/ui/FolderIcon'\nimport { FolderIconPicker } from '../../shared/ui/FolderIconPicker'\nimport { ModuleSidebar } from '../../shared/ui/ModuleSidebar'`
)
replaceOnce(
  boardsPagePath,
  `  async function deleteNode(): Promise<void> {`,
  `  async function updateFolderIcon(folder: BoardNode, icon: StudyFolderIconName): Promise<void> {\n    setError(null)\n\n    try {\n      const updated = await boardsClient.updateFolderIcon(folder.id, icon)\n      setNodes((current) => current.map((node) => (node.id === updated.id ? updated : node)))\n    } catch (reason: unknown) {\n      setError(reason instanceof Error ? reason.message : 'Не удалось изменить иконку папки')\n    }\n  }\n\n  async function deleteNode(): Promise<void> {`
)
replaceOnce(
  boardsPagePath,
  `            onRename={() => startRename(selectedNode)}\n          />`,
  `            onRename={() => startRename(selectedNode)}\n            onIconChange={(icon) => void updateFolderIcon(selectedNode, icon)}\n          />`
)
replaceOnce(
  boardsPagePath,
  `  onCreate,\n  onRename\n}: {`,
  `  onCreate,\n  onRename,\n  onIconChange\n}: {`
)
replaceOnce(
  boardsPagePath,
  `  onRename: () => void\n}): React.JSX.Element {`,
  `  onRename: () => void\n  onIconChange: (icon: StudyFolderIconName) => void\n}): React.JSX.Element {`
)
replaceOnce(
  boardsPagePath,
  `  const boards = items\n    .filter((item) => item.type === 'board')\n    .sort((first, second) => first.position - second.position)\n\n  return (`,
  `  const boards = items\n    .filter((item) => item.type === 'board')\n    .sort((first, second) => first.position - second.position)\n  const canChangeIcon = !folder.isSystem && !folder.sourceStudyNodeId\n  const activeIcon = folder.icon ?? 'folder'\n\n  return (`
)
replaceOnce(
  boardsPagePath,
  `                  {folder.isSystem ? (\n                    <LockKeyhole aria-hidden="true" className="size-6" />\n                  ) : (\n                    <Folder aria-hidden="true" className="size-6" />\n                  )}`,
  `                  {folder.isSystem ? (\n                    <LockKeyhole aria-hidden="true" className="size-6" />\n                  ) : (\n                    <FolderIcon name={activeIcon} expanded className="size-6" />\n                  )}`
)
replaceOnce(
  boardsPagePath,
  `                  folder.isSystem\n                    ? 'w-[22rem] grid-cols-2'\n                    : 'w-[33rem] grid-cols-3 max-[760px]:grid-cols-2'`,
  `                  folder.isSystem\n                    ? 'w-[22rem] grid-cols-2'\n                    : canChangeIcon\n                      ? 'w-[44rem] grid-cols-4 max-[760px]:grid-cols-2'\n                      : 'w-[33rem] grid-cols-3 max-[760px]:grid-cols-2'`
)
replaceOnce(
  boardsPagePath,
  `                {!folder.isSystem && (\n                  <WorkspaceActionButton type="button" onClick={onRename}>\n                    <Pencil aria-hidden="true" />\n                    Переименовать\n                  </WorkspaceActionButton>\n                )}\n                <WorkspaceActionButton`,
  `                {!folder.isSystem && (\n                  <WorkspaceActionButton type="button" onClick={onRename}>\n                    <Pencil aria-hidden="true" />\n                    Переименовать\n                  </WorkspaceActionButton>\n                )}\n                {canChangeIcon && (\n                  <FolderIconPicker\n                    value={activeIcon}\n                    onChange={onIconChange}\n                    trigger={\n                      <WorkspaceActionButton type="button">\n                        <Palette aria-hidden="true" className="text-violet-300" />\n                        Иконка\n                      </WorkspaceActionButton>\n                    }\n                  />\n                )}\n                <WorkspaceActionButton`
)
replaceOnce(
  boardsPagePath,
  `            <Folder aria-hidden="true" className="size-5" />\n          )\n        ) : (`,
  `            <FolderIcon\n              name={node.icon}\n              expanded={node.isExpanded}\n              className="size-5"\n            />\n          )\n        ) : (`
)

const boardTreeTestPath = 'src/renderer/src/modules/boards/components/BoardTree.test.tsx'
replaceOnce(boardTreeTestPath, `  title: 'Папка',\n  position:`, `  title: 'Папка',\n  icon: 'science',\n  position:`)
replaceOnce(
  boardTreeTestPath,
  `    expect(boardRow?.querySelector('[data-board-tree-guide="ancestor"]')).toBeInTheDocument()\n  })`,
  `    expect(boardRow?.querySelector('[data-board-tree-guide="ancestor"]')).toBeInTheDocument()\n    expect(folderRow?.querySelector('[data-folder-icon-name="science"]')).toBeInTheDocument()\n  })`
)
replaceOnce(
  boardTreeTestPath,
  `  it('opens the same actions by right click`,
  `  it('uses open and closed states for the default folder icon', () => {\n    const closedFolder = { ...folder, id: 'closed-folder', icon: 'folder' as const, isExpanded: false }\n\n    render(\n      <BoardTree\n        nodes={[closedFolder]}\n        selectedNodeId={null}\n        collapsed={false}\n        onOpen={vi.fn()}\n        onToggle={vi.fn()}\n        onRename={vi.fn()}\n        onDelete={vi.fn()}\n        onCreate={vi.fn()}\n        onSelectRoot={vi.fn()}\n        onMove={vi.fn()}\n      />\n    )\n\n    expect(document.querySelector('[data-folder-icon-state="closed"]')).toBeInTheDocument()\n  })\n\n  it('opens the same actions by right click`
)

const boardsRepositoryTestPath = 'src/main/repositories/boards.repository.test.ts'
replaceOnce(
  boardsRepositoryTestPath,
  `import { readFile } from 'node:fs/promises'`,
  `import { readFile, readdir } from 'node:fs/promises'`
)
replaceOnce(
  boardsRepositoryTestPath,
  `  saveBoardDocument\n} from './boards.repository'`,
  `  saveBoardDocument,\n  updateBoardFolderIcon\n} from './boards.repository'\nimport { updateStudyFolderIcon } from './study.repository'`
)
replaceRegex(
  boardsRepositoryTestPath,
  /const migrations = \[[\s\S]*?\]\n\nbeforeEach\(async \(\) => \{\n  initializeDatabaseForTesting\(':memory:'\)\n\n  for \(const migration of migrations\) \{/,
  `beforeEach(async () => {\n  initializeDatabaseForTesting(':memory:')\n\n  const migrations = (await readdir(resolve(process.cwd(), 'drizzle')))\n    .filter((fileName) => /^\\d{4}_.+\\.sql$/.test(fileName))\n    .sort()\n\n  for (const migration of migrations) {`
)
replaceOnce(
  boardsRepositoryTestPath,
  `  it('creates, reads and saves a compatible BoardDocument snapshot', () => {`,
  `  it('persists ordinary folder icons and synchronizes study-managed folder icons', () => {\n    const ordinaryFolder = createBoardNode({\n      type: 'folder',\n      parentId: null,\n      title: 'Обычная папка'\n    })\n\n    expect(updateBoardFolderIcon({ id: ordinaryFolder.id, icon: 'science' })).toMatchObject({\n      id: ordinaryFolder.id,\n      icon: 'science'\n    })\n\n    getSqlite()\n      .prepare(\n        'INSERT INTO study_nodes (id, type, parent_id, title, icon, position, is_expanded, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'\n      )\n      .run('study-folder', 'folder', null, 'Учебная папка', 'book', 0, 1, 1, 1)\n    getSqlite()\n      .prepare(\n        'INSERT INTO board_nodes (id, type, parent_id, title, icon, position, is_expanded, is_system, source_study_node_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'\n      )\n      .run('linked-folder', 'folder', BOARD_SYSTEM_ROOT_ID, 'Учебная папка', 'book', 0, 1, 0, 'study-folder', 1, 1)\n\n    updateStudyFolderIcon('study-folder', 'calculator')\n\n    expect(listBoardNodes()).toEqual(\n      expect.arrayContaining([\n        expect.objectContaining({ id: 'linked-folder', icon: 'calculator' })\n      ])\n    )\n    expect(() => updateBoardFolderIcon({ id: 'linked-folder', icon: 'science' })).toThrow(\n      'Иконка этой папки управляется модулем обучения'\n    )\n  })\n\n  it('creates, reads and saves a compatible BoardDocument snapshot', () => {`
)

console.log('Board folder icons implemented')
