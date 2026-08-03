import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const sharedRow = readFileSync(new URL('./ModuleTreeNodeRow.tsx', import.meta.url), 'utf8')
const studyTree = readFileSync(
  new URL('../../modules/study/components/StudyTree.tsx', import.meta.url),
  'utf8'
)
const boardTree = readFileSync(
  new URL('../../modules/boards/components/BoardTree.tsx', import.meta.url),
  'utf8'
)

describe('module tree architecture', () => {
  it('composes both module trees from the same row component', () => {
    expect(studyTree).toContain('<ModuleTreeNodeRow')
    expect(boardTree).toContain('<ModuleTreeNodeRow')
    expect(studyTree).toContain('<ModuleTreeNodeDropZones')
    expect(boardTree).toContain('<ModuleTreeNodeDropZones')
  })

  it('keeps visual row and menu primitives out of module adapters', () => {
    expect(studyTree).not.toContain('<ContextMenu.Root')
    expect(studyTree).not.toContain('<DropdownMenu.Root')
    expect(boardTree).not.toContain('<ContextMenu.Root')
    expect(boardTree).not.toContain('<DropdownMenu.Root')
    expect(sharedRow).toContain('<ContextMenu.Root')
    expect(sharedRow).toContain('<DropdownMenu.Root')
  })

  it('keeps module-only behavior in the adapters', () => {
    expect(studyTree).toContain('onDuplicate')
    expect(studyTree).toContain('search')
    expect(boardTree).toContain('isStudyManaged')
    expect(boardTree).toContain('LockKeyhole')
  })
})
