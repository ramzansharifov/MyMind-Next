import { describe, expect, it } from 'vitest'

import type { StudyNode } from '../../../../../shared/contracts/study'
import { getStudySubtreeIds, isStudyNodeInSubtree } from './study-tree'

const nodes: StudyNode[] = [
  {
    id: 'folder-a',
    type: 'folder',
    parentId: null,
    title: 'Folder A',
    position: 0,
    isExpanded: true,
    createdAt: 1,
    updatedAt: 1
  },
  {
    id: 'folder-b',
    type: 'folder',
    parentId: 'folder-a',
    title: 'Folder B',
    position: 0,
    isExpanded: true,
    createdAt: 1,
    updatedAt: 1
  },
  {
    id: 'material-a',
    type: 'material',
    parentId: 'folder-b',
    title: 'Material A',
    position: 0,
    isExpanded: false,
    createdAt: 1,
    updatedAt: 1
  },
  {
    id: 'material-b',
    type: 'material',
    parentId: null,
    title: 'Material B',
    position: 1,
    isExpanded: false,
    createdAt: 1,
    updatedAt: 1
  }
]

describe('study tree subtree helpers', () => {
  it('returns the root and every nested descendant', () => {
    expect([...getStudySubtreeIds(nodes, 'folder-a')].sort()).toEqual([
      'folder-a',
      'folder-b',
      'material-a'
    ])
  })

  it('recognizes direct and nested subtree membership', () => {
    expect(isStudyNodeInSubtree(nodes, 'material-a', 'material-a')).toBe(true)
    expect(isStudyNodeInSubtree(nodes, 'folder-a', 'material-a')).toBe(true)
    expect(isStudyNodeInSubtree(nodes, 'folder-b', 'material-a')).toBe(true)
    expect(isStudyNodeInSubtree(nodes, 'folder-a', 'material-b')).toBe(false)
  })

  it('does not loop when malformed data contains a cycle', () => {
    const cyclicNodes: StudyNode[] = [
      {
        ...nodes[0],
        id: 'cycle-a',
        parentId: 'cycle-b'
      },
      {
        ...nodes[1],
        id: 'cycle-b',
        parentId: 'cycle-a'
      }
    ]

    expect([...getStudySubtreeIds(cyclicNodes, 'cycle-a')].sort()).toEqual(['cycle-a', 'cycle-b'])
  })
})
