import { describe, expect, it } from 'vitest'

import { readRepoText } from '../../test/read-repo-text'

const sharedRow = readRepoText('src/renderer/src/shared/ui/ModuleTreeNodeRow.tsx')
const studyTree = readRepoText('src/renderer/src/modules/study/components/StudyTree.tsx')
const boardTree = readRepoText('src/renderer/src/modules/boards/components/BoardTree.tsx')

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
