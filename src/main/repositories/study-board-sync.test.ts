import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { StudyDocument } from '../../shared/contracts/study'
import { closeDatabase, getSqlite, initializeDatabaseForTesting } from '../database/client'
import { deleteBoardNode, ensureStudyBoard, listBoardNodes } from './boards.repository'
import { createStudyNode, getStudyMaterial, saveStudyMaterial } from './study.repository'

beforeEach(async () => {
  initializeDatabaseForTesting(':memory:')

  const migrationsDirectory = resolve(process.cwd(), 'drizzle')
  const migrations = (await readdir(migrationsDirectory))
    .filter((fileName) => /^\d+.*\.sql$/.test(fileName))
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
      expect.arrayContaining([expect.objectContaining({ sourceStudyNodeId: setup.folderId })])
    )
    expect(listBoardNodes()).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'boards-study-root', type: 'folder' })])
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
