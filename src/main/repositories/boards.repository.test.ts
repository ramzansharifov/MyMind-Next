import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { BOARD_SYSTEM_ROOT_ID } from '../../shared/contracts/boards'
import { closeDatabase, getSqlite, initializeDatabaseForTesting } from '../database/client'
import {
  createBoardNode,
  getBoardDocument,
  listBoardNodes,
  moveBoardNode,
  saveBoardDocument
} from './boards.repository'

const migrations = [
  '0000_rare_umar.sql',
  '0001_regular_iron_lad.sql',
  '0002_orange_young_avengers.sql',
  '0003_flowery_beast.sql',
  '0004_typical_deathbird.sql',
  '0005_cooing_roland_deschain.sql',
  '0006_nasty_the_executioner.sql',
  '0007_boards.sql'
]

beforeEach(async () => {
  initializeDatabaseForTesting(':memory:')

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
