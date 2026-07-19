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

  const index = content.indexOf(before)
  if (index < 0) {
    throw new Error(`Pattern not found in ${path}: ${before.slice(0, 180)}`)
  }

  if (content.indexOf(before, index + before.length) >= 0) {
    throw new Error(`Pattern is not unique in ${path}: ${before.slice(0, 180)}`)
  }

  write(path, content.slice(0, index) + after + content.slice(index + before.length))
}

const boardsRepositoryPath = 'src/main/repositories/boards.repository.ts'

replaceOnce(
  boardsRepositoryPath,
  "import { boardDocuments, boardNodes, studyMaterials, studyNodes } from '../database/schema'",
  `import { boardDocuments, boardNodes, studyMaterials, studyNodes } from '../database/schema'
import { documentToPlainText } from '../domain/study-document-index'
import { studyMaterialCoordinator } from '../services/study-material-coordinator'`
)

replaceOnce(
  boardsRepositoryPath,
  `export function deleteBoardNode(id: string): boolean {
  if (id === BOARD_SYSTEM_ROOT_ID) {
    throw new Error('Системную папку «Обучение» нельзя удалить')
  }

  return getDatabase().delete(boardNodes).where(eq(boardNodes.id, id)).run().changes > 0
}`,
  `function getBoardSubtreeIds(rootId: string): Set<string> {
  const rows = getDatabase().select().from(boardNodes).all()
  const includedIds = new Set<string>([rootId])
  let changed = true

  while (changed) {
    changed = false

    rows.forEach((row) => {
      if (row.parentId && includedIds.has(row.parentId) && !includedIds.has(row.id)) {
        includedIds.add(row.id)
        changed = true
      }
    })
  }

  return includedIds
}

function containsLinkedStudyBoard(folderId: string): boolean {
  const subtreeIds = getBoardSubtreeIds(folderId)

  return getDatabase()
    .select()
    .from(boardNodes)
    .all()
    .some(
      (row) =>
        subtreeIds.has(row.id) &&
        row.type === 'board' &&
        Boolean(row.sourceMaterialId && row.sourceBlockId)
    )
}

function pruneEmptyLinkedStudyFolders(startParentId: string | null): void {
  const database = getDatabase()
  const visited = new Set<string>()
  let folderId = startParentId

  while (folderId && folderId !== BOARD_SYSTEM_ROOT_ID && !visited.has(folderId)) {
    visited.add(folderId)

    const folder = database.select().from(boardNodes).where(eq(boardNodes.id, folderId)).get()

    if (!folder || folder.type !== 'folder' || !folder.sourceStudyNodeId) {
      return
    }

    const child = database
      .select({ id: boardNodes.id })
      .from(boardNodes)
      .where(eq(boardNodes.parentId, folder.id))
      .get()

    if (child) {
      return
    }

    database.delete(boardNodes).where(eq(boardNodes.id, folder.id)).run()
    folderId = folder.parentId
  }
}

function deleteBoardRowAndPrune(id: string, parentId: string | null): boolean {
  const deleted = getDatabase().delete(boardNodes).where(eq(boardNodes.id, id)).run().changes > 0

  if (deleted) {
    pruneEmptyLinkedStudyFolders(parentId)
  }

  return deleted
}

async function deleteLinkedStudyBoard(
  board: typeof boardNodes.$inferSelect
): Promise<boolean> {
  const materialId = board.sourceMaterialId

  if (!materialId) {
    return deleteBoardRowAndPrune(board.id, board.parentId)
  }

  return studyMaterialCoordinator.run(materialId, async () => {
    const database = getDatabase()
    const currentBoard = database.select().from(boardNodes).where(eq(boardNodes.id, board.id)).get()

    if (!currentBoard) {
      return false
    }

    const material = database
      .select()
      .from(studyMaterials)
      .where(eq(studyMaterials.nodeId, materialId))
      .get()
    const now = new Date()
    let nextDocument: StudyDocument | null = null

    if (material && currentBoard.sourceBlockId) {
      const document = studyDocumentSchema.parse(material.document)
      const nextBlocks = document.blocks.filter(
        (block) =>
          !(
            block.type === 'board' &&
            (block.id === currentBoard.sourceBlockId || block.boardId === currentBoard.id)
          )
      )

      if (nextBlocks.length !== document.blocks.length) {
        nextDocument = {
          ...document,
          blocks: nextBlocks
        }
      }
    }

    database.transaction((transaction) => {
      if (nextDocument) {
        transaction
          .update(studyMaterials)
          .set({
            document: nextDocument,
            plainText: documentToPlainText(nextDocument),
            updatedAt: now
          })
          .where(eq(studyMaterials.nodeId, materialId))
          .run()

        transaction
          .update(studyNodes)
          .set({ updatedAt: now })
          .where(eq(studyNodes.id, materialId))
          .run()
      }

      transaction.delete(boardNodes).where(eq(boardNodes.id, currentBoard.id)).run()
    })

    pruneEmptyLinkedStudyFolders(currentBoard.parentId)
    return true
  })
}

export async function deleteBoardNode(id: string): Promise<boolean> {
  if (id === BOARD_SYSTEM_ROOT_ID) {
    throw new Error('Системную папку «Обучение» нельзя удалить')
  }

  const existing = getDatabase().select().from(boardNodes).where(eq(boardNodes.id, id)).get()

  if (!existing) {
    return false
  }

  if (existing.type === 'folder') {
    if (existing.sourceStudyNodeId || containsLinkedStudyBoard(existing.id)) {
      throw new Error(
        'Папки раздела «Обучение» удаляются автоматически после удаления последней связанной доски'
      )
    }

    return deleteBoardRowAndPrune(existing.id, existing.parentId)
  }

  if (existing.sourceMaterialId && existing.sourceBlockId) {
    return deleteLinkedStudyBoard(existing)
  }

  return deleteBoardRowAndPrune(existing.id, existing.parentId)
}`
)

replaceOnce(
  boardsRepositoryPath,
  `export function cleanupBoardsForStudyDocument(materialId: string, document: StudyDocument): void {
  const retainedBlockIds = new Set(
    document.blocks.filter((block) => block.type === 'board').map((block) => block.id)
  )
  const linkedBoards = getDatabase()
    .select()
    .from(boardNodes)
    .where(eq(boardNodes.sourceMaterialId, materialId))
    .all()

  linkedBoards.forEach((board) => {
    if (!board.sourceBlockId || retainedBlockIds.has(board.sourceBlockId)) {
      return
    }

    getDatabase().delete(boardNodes).where(eq(boardNodes.id, board.id)).run()
  })
}`,
  `export function cleanupBoardsForStudyDocument(materialId: string, document: StudyDocument): void {
  const retainedBlockIds = new Set(
    document.blocks.filter((block) => block.type === 'board').map((block) => block.id)
  )
  const linkedBoards = getDatabase()
    .select()
    .from(boardNodes)
    .where(eq(boardNodes.sourceMaterialId, materialId))
    .all()
  const affectedParentIds: Array<string | null> = []

  linkedBoards.forEach((board) => {
    if (!board.sourceBlockId || retainedBlockIds.has(board.sourceBlockId)) {
      return
    }

    const deleted = getDatabase().delete(boardNodes).where(eq(boardNodes.id, board.id)).run()

    if (deleted.changes > 0) {
      affectedParentIds.push(board.parentId)
    }
  })

  affectedParentIds.forEach((parentId) => {
    pruneEmptyLinkedStudyFolders(parentId)
  })
}`
)

const studyRepositoryPath = 'src/main/repositories/study.repository.ts'

replaceOnce(
  studyRepositoryPath,
  "import { documentToPlainText } from '../domain/study-document-index'",
  `import { documentToPlainText } from '../domain/study-document-index'
import { cleanupBoardsForStudyDocument } from './boards.repository'`
)

replaceOnce(
  studyRepositoryPath,
  `  await cleanupStudyAssetsForDocument(input.nodeId, savedMaterial.document).catch(
    (reason: unknown) => {
      console.error('Failed to clean up unreferenced study assets', reason)
    }
  )`,
  `  cleanupBoardsForStudyDocument(input.nodeId, savedMaterial.document)

  await cleanupStudyAssetsForDocument(input.nodeId, savedMaterial.document).catch(
    (reason: unknown) => {
      console.error('Failed to clean up unreferenced study assets', reason)
    }
  )`
)

const boardsPagePath = 'src/renderer/src/modules/boards/BoardsPage.tsx'

replaceOnce(
  boardsPagePath,
  `          {!node.isSystem ? (
            <>
              <BoardMenuItem icon={Pencil} label="Переименовать" onSelect={() => onRename(node)} />
              <DropdownMenu.Separator className="my-1 h-px bg-[var(--app-border)]" />
              <BoardMenuItem icon={Trash2} label="Удалить" danger onSelect={() => onDelete(node)} />
            </>
          ) : (
            <p className="px-2.5 py-2 text-xs text-[var(--app-muted)]">Системная папка защищена</p>
          )}`,
  `          {!node.isSystem ? (
            <>
              <BoardMenuItem icon={Pencil} label="Переименовать" onSelect={() => onRename(node)} />
              <DropdownMenu.Separator className="my-1 h-px bg-[var(--app-border)]" />
              {node.type === 'folder' && node.sourceStudyNodeId ? (
                <p className="px-2.5 py-2 text-xs leading-5 text-[var(--app-muted)]">
                  Папка удалится автоматически после удаления последней связанной доски
                </p>
              ) : (
                <BoardMenuItem
                  icon={Trash2}
                  label="Удалить"
                  danger
                  onSelect={() => onDelete(node)}
                />
              )}
            </>
          ) : (
            <p className="px-2.5 py-2 text-xs text-[var(--app-muted)]">Системная папка защищена</p>
          )}`
)

replaceOnce(
  boardsPagePath,
  `          <AlertDialog.Description className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
            «{target?.title}» будет удалена без возможности восстановления. Вложенное содержимое
            папки также будет удалено.
          </AlertDialog.Description>`,
  `          <AlertDialog.Description className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
            {target?.type === 'board' && target.sourceMaterialId ? (
              <>
                «{target.title}» и связанный блок в материале обучения будут удалены без возможности
                восстановления. Пустые учебные папки очистятся автоматически.
              </>
            ) : (
              <>
                «{target?.title}» будет удалена без возможности восстановления. Вложенное содержимое
                папки также будет удалено.
              </>
            )}
          </AlertDialog.Description>`
)

const boardsPageTestPath = 'src/renderer/src/modules/boards/BoardsPage.test.tsx'

replaceOnce(
  boardsPageTestPath,
  `  it('loads BoardCanvas only for a board and isolates a lazy import failure in the workspace', async () => {`,
  `  it('does not offer manual deletion for a folder linked to study', async () => {
    const linkedFolder: BoardNode = {
      id: 'linked-study-folder',
      type: 'folder',
      parentId: systemFolder.id,
      title: 'Физика',
      position: 0,
      isExpanded: true,
      isSystem: false,
      sourceStudyNodeId: 'study-folder-1',
      createdAt: 1,
      updatedAt: 1
    }
    const linkedBoard: BoardNode = {
      ...boardNode,
      parentId: linkedFolder.id,
      sourceMaterialId: 'material-1',
      sourceBlockId: 'board-block-1'
    }
    testHarness.listNodes.mockResolvedValueOnce([systemFolder, linkedFolder, linkedBoard])

    render(<BoardsPage />)

    await screen.findByRole('heading', { name: 'Доски', level: 1 })
    fireEvent.click(screen.getByRole('button', { name: 'Действия: Физика' }))

    expect(
      screen.getByText(
        'Папка удалится автоматически после удаления последней связанной доски'
      )
    ).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Удалить' })).not.toBeInTheDocument()
  })

  it('loads BoardCanvas only for a board and isolates a lazy import failure in the workspace', async () => {`
)

const syncTestPath = 'src/main/repositories/study-board-sync.test.ts'

write(
  syncTestPath,
  `import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { StudyDocument } from '../../shared/contracts/study'
import { closeDatabase, getSqlite, initializeDatabaseForTesting } from '../database/client'
import {
  deleteBoardNode,
  ensureStudyBoard,
  listBoardNodes
} from './boards.repository'
import {
  createStudyNode,
  getStudyMaterial,
  saveStudyMaterial
} from './study.repository'

beforeEach(async () => {
  initializeDatabaseForTesting(':memory:')

  const migrationsDirectory = resolve(process.cwd(), 'drizzle')
  const migrations = (await readdir(migrationsDirectory))
    .filter((fileName) => /^\\d+.*\\.sql$/.test(fileName))
    .sort()

  for (const migration of migrations) {
    await executeMigration(migration)
  }
})

afterEach(() => {
  closeDatabase()
})

describe('study board deletion synchronization', () => {
  it('removes the study block when a linked board is deleted and prunes the folder after the last board', async () => {
    const setup = await createLinkedBoards(['board-one', 'board-two'])
    const firstBoard = ensureStudyBoard({ materialId: setup.materialId, blockId: 'board-one' })
    const secondBoard = ensureStudyBoard({ materialId: setup.materialId, blockId: 'board-two' })

    await expect(deleteBoardNode(firstBoard.id)).resolves.toBe(true)

    expect(getStudyMaterial(setup.materialId).document.blocks).toEqual([
      expect.objectContaining({ id: 'board-two', type: 'board' })
    ])
    expect(listBoardNodes()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceStudyNodeId: setup.folderId }),
        expect.objectContaining({ id: secondBoard.id })
      ])
    )

    await expect(deleteBoardNode(secondBoard.id)).resolves.toBe(true)

    expect(getStudyMaterial(setup.materialId).document.blocks).toEqual([])
    expect(listBoardNodes()).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceStudyNodeId: setup.folderId })
      ])
    )
    expect(listBoardNodes()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'boards-study-root', type: 'folder' })
      ])
    )
  })

  it('deletes linked boards after board blocks are removed from the study document', async () => {
    const setup = await createLinkedBoards(['board-one', 'board-two'])
    const firstBoard = ensureStudyBoard({ materialId: setup.materialId, blockId: 'board-one' })
    const secondBoard = ensureStudyBoard({ materialId: setup.materialId, blockId: 'board-two' })

    await saveStudyMaterial({
      nodeId: setup.materialId,
      document: createBoardDocument(['board-two'])
    })

    expect(listBoardNodes()).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: firstBoard.id })])
    )
    expect(listBoardNodes()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: secondBoard.id }),
        expect.objectContaining({ sourceStudyNodeId: setup.folderId })
      ])
    )

    await saveStudyMaterial({
      nodeId: setup.materialId,
      document: createBoardDocument([])
    })

    expect(listBoardNodes()).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: secondBoard.id }),
        expect.objectContaining({ sourceStudyNodeId: setup.folderId })
      ])
    )
  })

  it('protects study-linked folders from manual deletion', async () => {
    const setup = await createLinkedBoards(['board-one'])
    const board = ensureStudyBoard({ materialId: setup.materialId, blockId: 'board-one' })
    const linkedFolder = listBoardNodes().find(
      (node) => node.type === 'folder' && node.sourceStudyNodeId === setup.folderId
    )

    expect(linkedFolder).toBeDefined()
    await expect(deleteBoardNode(linkedFolder!.id)).rejects.toThrow(
      'Папки раздела «Обучение» удаляются автоматически'
    )
    expect(listBoardNodes()).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: board.id })])
    )
  })
})

async function createLinkedBoards(blockIds: string[]): Promise<{
  folderId: string
  materialId: string
}> {
  const folder = createStudyNode({
    type: 'folder',
    parentId: null,
    title: 'Физика'
  })
  const material = createStudyNode({
    type: 'material',
    parentId: folder.id,
    title: 'Электричество'
  })

  await saveStudyMaterial({
    nodeId: material.id,
    document: createBoardDocument(blockIds)
  })

  return {
    folderId: folder.id,
    materialId: material.id
  }
}

function createBoardDocument(blockIds: string[]): StudyDocument {
  return {
    version: 1,
    blocks: blockIds.map((id) => ({
      id,
      type: 'board' as const,
      title: id
    }))
  }
}

async function executeMigration(fileName: string): Promise<void> {
  const source = await readFile(resolve(process.cwd(), 'drizzle', fileName), 'utf8')

  for (const statement of source.split('--> statement-breakpoint')) {
    if (statement.trim()) {
      getSqlite().exec(statement)
    }
  }
}
`
)

console.log('Study board deletion synchronization applied')
