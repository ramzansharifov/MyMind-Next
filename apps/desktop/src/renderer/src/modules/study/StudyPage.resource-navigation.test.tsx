import { render, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { StudyNode } from '../../../../shared/contracts/study'

const testHarness = vi.hoisted(() => ({
  nodes: [] as StudyNode[],
  selectNode: vi.fn(),
  toggleFolder: vi.fn(),
  createNode: vi.fn(),
  renameNode: vi.fn(),
  duplicateNode: vi.fn(),
  updateFolderIcon: vi.fn(),
  deleteNode: vi.fn(),
  moveNode: vi.fn()
}))

vi.mock('./hooks/use-study', () => ({
  useStudy: () => ({
    nodes: testHarness.nodes,
    selectedNodeId: null,
    isLoading: false,
    error: null,
    selectNode: testHarness.selectNode,
    toggleFolder: testHarness.toggleFolder,
    createNode: testHarness.createNode,
    renameNode: testHarness.renameNode,
    duplicateNode: testHarness.duplicateNode,
    updateFolderIcon: testHarness.updateFolderIcon,
    deleteNode: testHarness.deleteNode,
    moveNode: testHarness.moveNode
  })
}))

vi.mock('../../shared/ui/ModuleSidebar', () => ({
  ModuleSidebar: ({ children }: { children: ReactNode }) => <aside>{children}</aside>
}))

vi.mock('../../shared/ui/module-sidebar-layout', () => ({
  getModuleSidebarLayoutClassName: () => 'study-layout'
}))

vi.mock('./components/StudyTree', () => ({
  StudyTree: () => <div data-testid="study-tree" />
}))

vi.mock('./components/StudyHome', () => ({
  StudyHome: () => <div data-testid="study-home" />
}))

vi.mock('./components/StudyMaterialEditor', () => ({
  StudyMaterialEditor: () => <div data-testid="study-material-editor" />
}))

vi.mock('./components/DeleteConfirmationDialog', () => ({
  DeleteConfirmationDialog: () => null
}))

vi.mock('./components/RenameStudyNodeDialog', () => ({
  RenameStudyNodeDialog: () => null
}))

import { StudyPage } from './StudyPage'

const folder: StudyNode = {
  id: 'folder-1',
  type: 'folder',
  parentId: null,
  title: 'Физика',
  position: 0,
  isExpanded: false,
  createdAt: 1,
  updatedAt: 1
}

const material: StudyNode = {
  id: 'material-1',
  type: 'material',
  parentId: folder.id,
  title: 'Механика',
  position: 0,
  isExpanded: true,
  createdAt: 1,
  updatedAt: 1
}

beforeEach(() => {
  testHarness.nodes.splice(0, testHarness.nodes.length, folder, material)
  testHarness.selectNode.mockReset()
  testHarness.toggleFolder.mockReset()
  testHarness.toggleFolder.mockResolvedValue(undefined)
})

describe('StudyPage resource navigation', () => {
  it('opens the source material and expands its ancestor folders', async () => {
    const onResourceHandled = vi.fn()

    render(<StudyPage resourceId={material.id} onResourceHandled={onResourceHandled} />)

    await waitFor(() => {
      expect(testHarness.selectNode).toHaveBeenCalledWith(material.id)
    })

    expect(testHarness.toggleFolder).toHaveBeenCalledWith(folder)
    expect(onResourceHandled).toHaveBeenCalledTimes(1)
  })

  it('handles a missing resource without changing the current selection', async () => {
    const onResourceHandled = vi.fn()

    render(<StudyPage resourceId="missing-material" onResourceHandled={onResourceHandled} />)

    await waitFor(() => {
      expect(onResourceHandled).toHaveBeenCalledTimes(1)
    })

    expect(testHarness.selectNode).not.toHaveBeenCalled()
  })
})
