import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { BOARD_SYSTEM_ROOT_ID } from '../../shared/contracts/boards'
import { closeDatabase, getSqlite, initializeDatabaseForTesting } from '../database/client'
import {
  createBoardNode,
  getBoardDocument,
  listBoardNodes,
  moveBoardNode,
  saveBoardDocument,
  updateBoardFolderIcon
} from './boards.repository'
import { updateStudyFolderIcon } from './study.repository'

beforeEach(async () => {
  initializeDatabaseForTesting(':memory:')

  const migrations = (await readdir(resolve(process.cwd(), 'drizzle')))
    .filter((fileName) => /^\d{4}_.+\.sql$/.test(fileName))
    .sort()

  for (const migration of migrations) {
    await executeMigration(migration)
  }
})

afterEach(() => {
  closeDatabase()
})

describe('boards repository documents', () => {
  it('moves only ordinary board nodes and protects the study section', () => {
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

    expect(moveBoardNode({ id: ordinaryBoard.id, parentId: targetFolder.id, position: 0 })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: ordinaryBoard.id, parentId: targetFolder.id, position: 0 })
      ])
    )

    expect(() => moveBoardNode({ id: protectedBoard.id, parentId: null, position: 1 })).toThrow(
      'Папки и доски раздела «Обучение» нельзя перемещать'
    )

    expect(() =>
      moveBoardNode({ id: ordinaryBoard.id, parentId: BOARD_SYSTEM_ROOT_ID, position: 0 })
    ).toThrow('Нельзя перемещать элементы внутрь раздела «Обучение»')
  })

  it('persists ordinary folder icons and synchronizes study-managed folder icons', () => {
    const ordinaryFolder = createBoardNode({
      type: 'folder',
      parentId: null,
      title: 'Обычная папка'
    })

    expect(updateBoardFolderIcon({ id: ordinaryFolder.id, icon: 'science' })).toMatchObject({
      id: ordinaryFolder.id,
      icon: 'science'
    })

    getSqlite()
      .prepare(
        'INSERT INTO study_nodes (id, type, parent_id, title, icon, position, is_expanded, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run('study-folder', 'folder', null, 'Учебная папка', 'book', 0, 1, 1, 1)
    getSqlite()
      .prepare(
        'INSERT INTO board_nodes (id, type, parent_id, title, icon, position, is_expanded, is_system, source_study_node_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        'linked-folder',
        'folder',
        BOARD_SYSTEM_ROOT_ID,
        'Учебная папка',
        'book',
        0,
        1,
        0,
        'study-folder',
        1,
        1
      )

    updateStudyFolderIcon('study-folder', 'calculator')

    expect(listBoardNodes()).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'linked-folder', icon: 'calculator' })])
    )
    expect(() => updateBoardFolderIcon({ id: 'linked-folder', icon: 'science' })).toThrow(
      'Иконка этой папки управляется модулем обучения'
    )
  })

  it('creates, reads and saves a compatible BoardDocument snapshot', () => {
    const created = createBoardNode({
      type: 'board',
      parentId: null,
      title: 'Repository board'
    })

    expect(listBoardNodes()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'boards-study-root', type: 'folder', title: 'Обучение' }),
        expect.objectContaining({ id: created.id, type: 'board', title: 'Repository board' })
      ])
    )
    expect(getBoardDocument(created.id)).toMatchObject({
      nodeId: created.id,
      snapshot: null
    })

    const snapshot = {
      store: {
        'document:document': {
          id: 'document:document',
          typeName: 'document',
          name: 'Repository board'
        }
      },
      schema: {
        schemaVersion: 2,
        sequences: {}
      }
    }

    expect(saveBoardDocument(created.id, snapshot)).toMatchObject({
      nodeId: created.id,
      snapshot
    })
    expect(getBoardDocument(created.id).snapshot).toEqual(snapshot)
  })
})

async function executeMigration(fileName: string): Promise<void> {
  const source = await readFile(resolve(process.cwd(), 'drizzle', fileName), 'utf8')

  for (const statement of source.split('--> statement-breakpoint')) {
    if (statement.trim()) {
      getSqlite().exec(statement)
    }
  }
}
