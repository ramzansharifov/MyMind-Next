import { describe, expect, it } from 'vitest'

import type { StudyNode } from '../../../../../shared/contracts/study'
import { createStudyMoveInput, getStudyDropPlacement } from './study-dnd'

const nodes: StudyNode[] = [
  createNode('folder-a', 'folder', null, 0),
  createNode('folder-child', 'folder', 'folder-a', 0),
  createNode('material-a', 'material', null, 1),
  createNode('material-b', 'material', null, 2)
]

describe('study drag and drop', () => {
  it('moves a material into a folder', () => {
    expect(createStudyMoveInput(nodes, 'material-a', 'folder-a', 'inside')).toEqual({
      id: 'material-a',
      parentId: 'folder-a',
      position: 1
    })
  })

  it('prevents moving a folder into its descendant', () => {
    expect(createStudyMoveInput(nodes, 'folder-a', 'folder-child', 'inside')).toBeNull()
  })

  it('places a node after its target', () => {
    expect(createStudyMoveInput(nodes, 'material-a', 'material-b', 'after')).toEqual({
      id: 'material-a',
      parentId: null,
      position: 2
    })
  })

  it('uses the middle of a folder as the inside zone', () => {
    expect(getStudyDropPlacement(50, 0, 100, true)).toBe('inside')
  })
})

function createNode(
  id: string,
  type: StudyNode['type'],
  parentId: string | null,
  position: number
): StudyNode {
  return {
    id,
    type,
    parentId,
    position,
    title: id,
    isExpanded: true,
    createdAt: 1,
    updatedAt: 1
  }
}
