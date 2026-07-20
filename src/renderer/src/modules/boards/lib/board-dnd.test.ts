import { describe, expect, it } from 'vitest'

import { BOARD_SYSTEM_ROOT_ID, type BoardNode } from '../../../../../shared/contracts/boards'
import { createBoardMoveInput, getStudyManagedBoardNodeIds } from './board-dnd'

const nodes: BoardNode[] = [
  boardNode({
    id: BOARD_SYSTEM_ROOT_ID,
    type: 'folder',
    parentId: null,
    title: 'Обучение',
    position: 0,
    isSystem: true
  }),
  boardNode({
    id: 'study-folder',
    type: 'folder',
    parentId: BOARD_SYSTEM_ROOT_ID,
    title: 'Физика',
    position: 0,
    sourceStudyNodeId: 'study-folder-1'
  }),
  boardNode({
    id: 'study-board',
    type: 'board',
    parentId: 'study-folder',
    title: 'Учебная доска',
    position: 0,
    sourceMaterialId: 'material-1',
    sourceBlockId: 'block-1'
  }),
  boardNode({
    id: 'folder-a',
    type: 'folder',
    parentId: null,
    title: 'Проект A',
    position: 1
  }),
  boardNode({
    id: 'board-a',
    type: 'board',
    parentId: 'folder-a',
    title: 'Доска A',
    position: 0
  }),
  boardNode({
    id: 'folder-b',
    type: 'folder',
    parentId: null,
    title: 'Проект B',
    position: 2
  }),
  boardNode({
    id: 'board-b',
    type: 'board',
    parentId: null,
    title: 'Доска B',
    position: 3
  })
]

describe('board drag and drop rules', () => {
  it('moves an ordinary board into an ordinary folder', () => {
    expect(createBoardMoveInput(nodes, 'board-b', 'folder-b', 'inside')).toEqual({
      id: 'board-b',
      parentId: 'folder-b',
      position: 0
    })
  })

  it('reorders ordinary root nodes while keeping the system root fixed', () => {
    expect(createBoardMoveInput(nodes, 'board-b', 'folder-a', 'before')).toEqual({
      id: 'board-b',
      parentId: null,
      position: 1
    })
  })

  it('rejects moving a board or folder managed by study', () => {
    expect(createBoardMoveInput(nodes, 'study-board', null, 'root')).toBeNull()
    expect(createBoardMoveInput(nodes, 'study-folder', null, 'root')).toBeNull()
  })

  it('rejects dropping ordinary nodes into or around the study tree', () => {
    expect(createBoardMoveInput(nodes, 'board-b', BOARD_SYSTEM_ROOT_ID, 'inside')).toBeNull()
    expect(createBoardMoveInput(nodes, 'board-b', 'study-folder', 'inside')).toBeNull()
    expect(createBoardMoveInput(nodes, 'board-b', 'study-board', 'before')).toBeNull()
  })

  it('rejects moving a folder into its own subtree', () => {
    expect(createBoardMoveInput(nodes, 'folder-a', 'board-a', 'before')).toBeNull()
  })

  it('protects ancestors and descendants of linked study nodes', () => {
    const corruptedTree = [
      boardNode({
        id: 'ordinary-container',
        type: 'folder',
        parentId: null,
        title: 'Контейнер',
        position: 1
      }),
      boardNode({
        id: 'linked-board-outside-root',
        type: 'board',
        parentId: 'ordinary-container',
        title: 'Связанная доска',
        position: 0,
        sourceMaterialId: 'material-2',
        sourceBlockId: 'block-2'
      })
    ]

    expect(getStudyManagedBoardNodeIds(corruptedTree)).toEqual(
      new Set(['ordinary-container', 'linked-board-outside-root'])
    )
  })
})

function boardNode(
  input: Pick<BoardNode, 'id' | 'type' | 'parentId' | 'title' | 'position'> &
    Partial<Omit<BoardNode, 'id' | 'type' | 'parentId' | 'title' | 'position'>>
): BoardNode {
  return {
    isExpanded: true,
    isSystem: false,
    createdAt: 1,
    updatedAt: 1,
    ...input
  }
}
