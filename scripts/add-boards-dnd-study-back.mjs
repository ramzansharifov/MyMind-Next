import { readFileSync, writeFileSync } from 'node:fs'

function read(path) {
  return readFileSync(path, 'utf8')
}

function write(path, content) {
  writeFileSync(path, content, 'utf8')
}

function replaceOnce(path, before, after) {
  const content = read(path)

  if (content.includes(after)) return

  const index = content.indexOf(before)
  if (index < 0) {
    throw new Error(`Pattern not found in ${path}: ${before.slice(0, 220)}`)
  }

  if (content.indexOf(before, index + before.length) >= 0) {
    throw new Error(`Pattern is not unique in ${path}: ${before.slice(0, 220)}`)
  }

  write(path, content.slice(0, index) + after + content.slice(index + before.length))
}

function replaceRange(path, startMarker, endMarker, replacement) {
  const content = read(path)

  if (content.includes(replacement)) return

  const startIndex = content.indexOf(startMarker)
  if (startIndex < 0) {
    throw new Error(`Start marker not found in ${path}: ${startMarker}`)
  }

  const endIndex = content.indexOf(endMarker, startIndex)
  if (endIndex < 0) {
    throw new Error(`End marker not found in ${path}: ${endMarker}`)
  }

  write(path, content.slice(0, startIndex) + replacement + content.slice(endIndex))
}

const boardsPagePath = 'src/renderer/src/modules/boards/BoardsPage.tsx'

replaceOnce(
  boardsPagePath,
  `import * as AlertDialog from '@radix-ui/react-alert-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Folder,
  FolderPlus,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  MoreHorizontal,
  Pencil,
  Presentation,
  Search,
  Trash2,
  TriangleAlert,
  X
} from 'lucide-react'`,
  `import * as AlertDialog from '@radix-ui/react-alert-dialog'
import {
  ArrowLeft,
  Check,
  Clock3,
  Folder,
  FolderPlus,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  Pencil,
  Presentation,
  Search,
  TriangleAlert,
  X
} from 'lucide-react'`
)

replaceOnce(
  boardsPagePath,
  `  BOARD_SYSTEM_ROOT_ID,
  type BoardNode,
  type BoardNodeType
} from '../../../../shared/contracts/boards'
import { cn } from '../../shared/lib/cn'`,
  `  BOARD_SYSTEM_ROOT_ID,
  type BoardNode,
  type BoardNodeType,
  type MoveBoardNodeInput
} from '../../../../shared/contracts/boards'
import { requestAppModuleNavigation } from '../../app/module-navigation'
import { cn } from '../../shared/lib/cn'`
)

replaceOnce(
  boardsPagePath,
  `import { BoardCanvasErrorBoundary } from './components/BoardCanvasErrorBoundary'
import { loadBoardCanvas } from './components/load-board-canvas'`,
  `import { BoardCanvasErrorBoundary } from './components/BoardCanvasErrorBoundary'
import { BoardTree } from './components/BoardTree'
import { loadBoardCanvas } from './components/load-board-canvas'`
)

replaceOnce(
  boardsPagePath,
  `  function startCreate(type: BoardNodeType, parentId: string | null): void {`,
  `  async function moveNode(input: MoveBoardNodeInput): Promise<void> {
    setError(null)

    try {
      const nextNodes = await boardsClient.moveNode(input)
      setNodes(nextNodes)
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Не удалось переместить элемент')
    }
  }

  function startCreate(type: BoardNodeType, parentId: string | null): void {`
)

replaceRange(
  boardsPagePath,
  `        {(nodesByParent.get(null) ?? []).length === 0 ? (`,
  `      </ModuleSidebar>`,
  `        <BoardTree
          nodes={nodes}
          selectedNodeId={selectedId}
          collapsed={sidebarCollapsed}
          onOpen={(id) => void openNode(id)}
          onToggle={async (folder) => {
            await boardsClient.updateExpansion(folder.id, !folder.isExpanded)
            await refreshNodes()
          }}
          onRename={startRename}
          onDelete={setDeleteTarget}
          onCreate={startCreate}
          onMove={(input) => void moveNode(input)}
        />
`
)

replaceOnce(
  boardsPagePath,
  `            node={selectedNode}
            saveState={saveState}
            onSaveStateChange={setSaveState}
            onRename={() => startRename(selectedNode)}`,
  `            node={selectedNode}
            saveState={saveState}
            onSaveStateChange={setSaveState}
            onRename={() => startRename(selectedNode)}
            onBackToMaterial={
              selectedNode.sourceMaterialId
                ? () => {
                    requestAppModuleNavigation({
                      view: 'study',
                      resourceId: selectedNode.sourceMaterialId
                    })
                  }
                : undefined
            }`
)

replaceRange(
  boardsPagePath,
  `function BoardTreeNode({`,
  `const boardDateFormatter = new Intl.DateTimeFormat('ru-RU', {`,
  `const boardDateFormatter = new Intl.DateTimeFormat('ru-RU', {`
)

replaceRange(
  boardsPagePath,
  `function BoardWorkspace({`,
  `function BoardCanvasLoadingFallback(): React.JSX.Element {`,
  `function BoardWorkspace({
  node,
  saveState,
  onSaveStateChange,
  onRename,
  onBackToMaterial
}: {
  node: BoardNode
  saveState: BoardSaveState
  onSaveStateChange: (state: BoardSaveState) => void
  onRename: () => void
  onBackToMaterial?: () => void
}): React.JSX.Element {
  return (
    <section className="flex h-full min-h-0 flex-col">
      <header className="flex h-20 shrink-0 items-center gap-4 border-b border-[var(--app-border)] bg-[var(--app-workspace)] px-5">
        {onBackToMaterial && (
          <WorkspaceActionButton
            type="button"
            className="w-auto px-3 max-[720px]:size-10 max-[720px]:px-0"
            onClick={onBackToMaterial}
          >
            <ArrowLeft aria-hidden="true" />
            <span className="max-[720px]:hidden">Назад к материалу</span>
          </WorkspaceActionButton>
        )}
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--app-accent-500)]/10 text-[var(--app-accent-300)]">
          <Presentation aria-hidden className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold tracking-[0.12em] text-[var(--app-accent-300)] uppercase">
            Доска
          </p>
          <h1 className="mt-1 truncate text-lg font-semibold text-[var(--app-text)]">
            {node.title}
          </h1>
        </div>
        <WorkspaceActionButton
          type="button"
          className="w-auto px-3 max-[720px]:size-10 max-[720px]:px-0"
          onClick={onRename}
        >
          <Pencil aria-hidden="true" />
          <span className="max-[720px]:hidden">Переименовать</span>
        </WorkspaceActionButton>
        <BoardSaveStatus state={saveState} />
      </header>
      <div className="min-h-0 flex-1">
        <BoardCanvasErrorBoundary resetKey={node.id}>
          <Suspense fallback={<BoardCanvasLoadingFallback />}>
            <BoardCanvas boardId={node.id} onSaveStateChange={onSaveStateChange} />
          </Suspense>
        </BoardCanvasErrorBoundary>
      </div>
    </section>
  )
}

`
)

const studyPagePath = 'src/renderer/src/modules/study/StudyPage.tsx'

replaceOnce(
  studyPagePath,
  `import type { StudyFolderIconName, StudyNode } from '../../../../shared/contracts/study'
import { cn } from '../../shared/lib/cn'`,
  `import type { StudyFolderIconName, StudyNode } from '../../../../shared/contracts/study'
import type { AppModuleProps } from '../../app/module-registry'
import { cn } from '../../shared/lib/cn'`
)

replaceOnce(
  studyPagePath,
  `export function StudyPage(): React.JSX.Element {`,
  `export function StudyPage({ resourceId, onResourceHandled }: AppModuleProps): React.JSX.Element {`
)

replaceOnce(
  studyPagePath,
  `  const internalNavigationSequenceRef = useRef(0)`,
  `  const internalNavigationSequenceRef = useRef(0)
  const handledResourceIdRef = useRef<string | null>(null)`
)

replaceOnce(
  studyPagePath,
  `    [selectNode, studyNodes, toggleFolder]
  )

  const clearInternalLinkNavigation = useCallback((): void => {`,
  `    [selectNode, studyNodes, toggleFolder]
  )

  useEffect(() => {
    if (!resourceId) {
      handledResourceIdRef.current = null
      return undefined
    }

    if (study.isLoading || handledResourceIdRef.current === resourceId) {
      return undefined
    }

    let active = true
    const target = studyNodes.find(
      (node) => node.id === resourceId && node.type === 'material'
    )

    void Promise.resolve().then(() => {
      if (!active || handledResourceIdRef.current === resourceId) {
        return
      }

      handledResourceIdRef.current = resourceId

      if (target) {
        setInternalLinkHistory(clearStudyInternalLinkHistory())
        setInternalNavigation(null)
        openStudyNode(target.id)
      }

      onResourceHandled?.()
    })

    return () => {
      active = false
    }
  }, [onResourceHandled, openStudyNode, resourceId, study.isLoading, studyNodes])

  const clearInternalLinkNavigation = useCallback((): void => {`
)

const boardsRepositoryPath = 'src/main/repositories/boards.repository.ts'

replaceOnce(
  boardsRepositoryPath,
  `export function moveBoardNode(input: MoveBoardNodeInput): BoardNode[] {
  if (input.id === BOARD_SYSTEM_ROOT_ID) {
    throw new Error('Системную папку «Обучение» нельзя перемещать')
  }

  ensureBoardsSystemRoot()
  assertBoardFolder(input.parentId)

  const database = getDatabase()
  const rows = database.select().from(boardNodes).all()
  const source = rows.find((node) => node.id === input.id)

  if (!source) {
    throw new Error('Элемент досок не найден')
  }`,
  `type BoardNodeRow = typeof boardNodes.$inferSelect

function getStudyManagedBoardRowIds(rows: BoardNodeRow[]): Set<string> {
  const rowsById = new Map(rows.map((row) => [row.id, row]))
  const protectedIds = new Set<string>()

  rows.forEach((row) => {
    const visited = new Set<string>()
    let current: BoardNodeRow | undefined = row

    while (current && !visited.has(current.id)) {
      visited.add(current.id)

      if (isStudyManagedBoardRowAnchor(current)) {
        protectedIds.add(row.id)
        break
      }

      current = current.parentId ? rowsById.get(current.parentId) : undefined
    }
  })

  for (const protectedId of [...protectedIds]) {
    const visited = new Set<string>()
    let current = rowsById.get(protectedId)

    while (current?.parentId && !visited.has(current.parentId)) {
      visited.add(current.parentId)
      protectedIds.add(current.parentId)
      current = rowsById.get(current.parentId)
    }
  }

  return protectedIds
}

function isStudyManagedBoardRowAnchor(row: BoardNodeRow): boolean {
  return Boolean(
    row.id === BOARD_SYSTEM_ROOT_ID ||
      row.sourceStudyNodeId ||
      row.sourceMaterialId ||
      row.sourceBlockId
  )
}

export function moveBoardNode(input: MoveBoardNodeInput): BoardNode[] {
  if (input.id === BOARD_SYSTEM_ROOT_ID) {
    throw new Error('Системную папку «Обучение» нельзя перемещать')
  }

  ensureBoardsSystemRoot()

  const database = getDatabase()
  const rows = database.select().from(boardNodes).all()
  const source = rows.find((node) => node.id === input.id)

  if (!source) {
    throw new Error('Элемент досок не найден')
  }

  const studyManagedIds = getStudyManagedBoardRowIds(rows)

  if (studyManagedIds.has(source.id)) {
    throw new Error('Папки и доски раздела «Обучение» нельзя перемещать')
  }

  if (input.parentId && studyManagedIds.has(input.parentId)) {
    throw new Error('Нельзя перемещать элементы внутрь раздела «Обучение»')
  }

  assertBoardFolder(input.parentId)`
)

const boardsRepositoryTestPath = 'src/main/repositories/boards.repository.test.ts'

replaceOnce(
  boardsRepositoryTestPath,
  `import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, getSqlite, initializeDatabaseForTesting } from '../database/client'`,
  `import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { BOARD_SYSTEM_ROOT_ID } from '../../shared/contracts/boards'
import { closeDatabase, getSqlite, initializeDatabaseForTesting } from '../database/client'`
)

replaceOnce(
  boardsRepositoryTestPath,
  `  getBoardDocument,
  listBoardNodes,
  saveBoardDocument`,
  `  getBoardDocument,
  listBoardNodes,
  moveBoardNode,
  saveBoardDocument`
)

replaceOnce(
  boardsRepositoryTestPath,
  `  it('creates, reads and saves a compatible BoardDocument snapshot', () => {`,
  `  it('moves only ordinary board nodes and protects the study section', () => {
    const targetFolder = createBoardNode({
      type: 'folder',
      parentId: null,
      title: 'Целевая папка'
    })
    const ordinaryBoard = createBoardNode({
      type: 'board',
      parentId: null,
      title: 'Обычная доска'
    })
    const protectedBoard = createBoardNode({
      type: 'board',
      parentId: BOARD_SYSTEM_ROOT_ID,
      title: 'Доска внутри обучения'
    })

    expect(
      moveBoardNode({ id: ordinaryBoard.id, parentId: targetFolder.id, position: 0 })
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: ordinaryBoard.id, parentId: targetFolder.id, position: 0 })
      ])
    )

    expect(() =>
      moveBoardNode({ id: protectedBoard.id, parentId: null, position: 1 })
    ).toThrow('Папки и доски раздела «Обучение» нельзя перемещать')

    expect(() =>
      moveBoardNode({ id: ordinaryBoard.id, parentId: BOARD_SYSTEM_ROOT_ID, position: 0 })
    ).toThrow('Нельзя перемещать элементы внутрь раздела «Обучение»')
  })

  it('creates, reads and saves a compatible BoardDocument snapshot', () => {`
)

const boardsPageTestPath = 'src/renderer/src/modules/boards/BoardsPage.test.tsx'

replaceOnce(
  boardsPageTestPath,
  `const testHarness = vi.hoisted(() => ({
  listNodes: vi.fn(),
  loadBoardCanvas: vi.fn()
}))`,
  `const testHarness = vi.hoisted(() => ({
  listNodes: vi.fn(),
  moveNode: vi.fn(),
  loadBoardCanvas: vi.fn(),
  requestAppModuleNavigation: vi.fn()
}))`
)

replaceOnce(
  boardsPageTestPath,
  `    updateExpansion: vi.fn(),
    moveNode: vi.fn(),`,
  `    updateExpansion: vi.fn(),
    moveNode: testHarness.moveNode,`
)

replaceOnce(
  boardsPageTestPath,
  `vi.mock('../../shared/ui/tooltip', () => ({`,
  `vi.mock('../../app/module-navigation', () => ({
  requestAppModuleNavigation: testHarness.requestAppModuleNavigation
}))

vi.mock('../../shared/ui/tooltip', () => ({`
)

replaceOnce(
  boardsPageTestPath,
  `beforeEach(() => {
  testHarness.loadBoardCanvas.mockReset()`,
  `beforeEach(() => {
  testHarness.listNodes.mockReset()
  testHarness.moveNode.mockReset()
  testHarness.requestAppModuleNavigation.mockReset()
  testHarness.loadBoardCanvas.mockReset()`
)

replaceOnce(
  boardsPageTestPath,
  `  it('loads BoardCanvas only for a board and isolates a lazy import failure in the workspace', async () => {`,
  `  it('locks the study tree and returns a linked board to its source material', async () => {
    const user = userEvent.setup()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const linkedBoard: BoardNode = {
      ...boardNode,
      parentId: systemFolder.id,
      sourceMaterialId: 'material-1',
      sourceBlockId: 'board-block-1'
    }
    testHarness.listNodes.mockResolvedValueOnce([systemFolder, linkedBoard])

    render(<BoardsPage />)

    await screen.findByRole('heading', { name: 'Доски', level: 1 })

    const linkedBoardButton = screen.getAllByRole('button', { name: 'Тестовая доска' })[0]
    expect(linkedBoardButton.closest('[data-board-tree-node]')).toHaveAttribute(
      'data-study-managed',
      'true'
    )

    await user.click(linkedBoardButton)
    await user.click(await screen.findByRole('button', { name: 'Назад к материалу' }))

    expect(testHarness.requestAppModuleNavigation).toHaveBeenCalledWith({
      view: 'study',
      resourceId: 'material-1'
    })
  })

  it('loads BoardCanvas only for a board and isolates a lazy import failure in the workspace', async () => {`
)

const boardsCatalogPath =
  'src/renderer/src/modules/settings/instructions/boards-instruction-catalog.ts'

replaceOnce(
  boardsCatalogPath,
  `      {
        title: 'Почему меню содержит только действия',`,
  `      {
        title: 'Перетаскивание папок и досок',
        paragraphs: [
          'Самостоятельные папки и доски можно перетаскивать в дереве так же, как папки и материалы в модуле «Обучение».'
        ],
        bullets: [
          'Перетащите элемент выше или ниже соседнего, чтобы изменить порядок.',
          'Перетащите элемент в обычную папку, чтобы изменить его расположение.',
          'Область внизу дерева возвращает элемент в корень модуля.',
          'Системная папка «Обучение» и вся её ветка зафиксированы: элементы внутри неё нельзя перетаскивать, а обычные элементы нельзя переносить внутрь этой ветки.'
        ]
      },
      {
        title: 'Почему меню содержит только действия',`
)

replaceOnce(
  boardsCatalogPath,
  `      {
        title: 'Защищённая структура',
        paragraphs: [
          'Корневая системная папка «Обучение» не переименовывается и не удаляется.',
          'Связанные папки нельзя удалить вручную, потому что они обслуживают связь с учебными материалами. Их жизненный цикл определяется наличием связанных досок.'
        ]
      }`,
  `      {
        title: 'Возврат к материалу',
        paragraphs: [
          'У связанной учебной доски в верхней панели отображается кнопка «Назад к материалу». Она открывает исходный материал обучения, с которым связан текущий холст.'
        ],
        bullets: [
          'Перед переходом MyMind сохраняет активные изменения доски.',
          'После открытия материала автоматически раскрываются его родительские папки.',
          'У самостоятельных досок кнопка возврата не показывается.'
        ]
      },
      {
        title: 'Защищённая структура',
        paragraphs: [
          'Корневая системная папка «Обучение» не переименовывается, не удаляется и не перемещается.',
          'Связанные папки и доски нельзя перетаскивать. Обычные элементы также нельзя переносить внутрь учебной ветки, потому что её расположение определяется структурой материалов.',
          'Связанные папки нельзя удалить вручную, потому что они обслуживают связь с учебными материалами. Их жизненный цикл определяется наличием связанных досок.'
        ]
      }`
)

const instructionTestPath =
  'src/renderer/src/modules/settings/instructions/LearningInstructions.test.tsx'

replaceOnce(
  instructionTestPath,
  `  it('documents the complete bidirectional deletion behavior for study boards', () => {`,
  `  it('documents boards drag restrictions and returning to the source material', () => {
    const { rerender } = render(
      <BoardsInstructionArticlePage topicId="boards-sidebar" onBack={vi.fn()} />
    )

    expect(
      screen.getByRole('heading', { name: 'Перетаскивание папок и досок' })
    ).toBeInTheDocument()
    expect(screen.getByText(/вся её ветка зафиксированы/)).toBeInTheDocument()

    rerender(<BoardsInstructionArticlePage topicId="boards-study-links" onBack={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Возврат к материалу' })).toBeInTheDocument()
    expect(screen.getByText(/кнопка «Назад к материалу»/)).toBeInTheDocument()
  })

  it('documents the complete bidirectional deletion behavior for study boards', () => {`
)

console.log('Boards drag and drop plus study return applied')
