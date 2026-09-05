import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { StudyNode } from '../../../../../../shared/contracts/study'
import { TooltipProvider } from '../../../../shared/ui/tooltip'
import { StudyCodeWorkspace } from './StudyCodeWorkspace'

const mocks = vi.hoisted(() => ({
  getCodeSnapshot: vi.fn(),
  previewCode: vi.fn(),
  applyCode: vi.fn()
}))

vi.mock('../../api/study-client', () => ({
  studyClient: mocks
}))

vi.mock('../../lib/study-draft-lifecycle', () => ({
  registerStudyDraftHandle: () => () => undefined
}))

const folderNode: StudyNode = {
  id: '7fe46e6d-c5c3-45ef-99b4-937377034475',
  type: 'folder',
  parentId: null,
  title: 'Курс',
  position: 0,
  isExpanded: true,
  createdAt: 1,
  updatedAt: 1
}

describe('StudyCodeWorkspace layout', () => {
  it('uses the workspace itself as the visual code container', () => {
    mocks.getCodeSnapshot.mockResolvedValue({
      nodeId: folderNode.id,
      nodeType: 'folder',
      title: folderNode.title,
      source: '@version(1)\n\nfolder Folder1 "Курс" {\n}',
      revision: 'a'.repeat(64)
    })

    const { container } = render(
      <TooltipProvider>
        <StudyCodeWorkspace node={folderNode} onApplied={vi.fn()} />
      </TooltipProvider>
    )

    const workspace = container.querySelector('[data-study-code-workspace]')
    const editorSurface = container.querySelector('[data-study-code-editor-surface]')
    const editorScroll = container.querySelector('[data-study-code-editor-scroll]')

    expect(workspace).toBeInTheDocument()
    expect(editorSurface).toBeInTheDocument()
    expect(editorScroll).toBeInTheDocument()
    expect(editorSurface).not.toHaveClass('p-4')
    expect(editorScroll).not.toHaveClass('rounded-xl')
    expect(editorScroll).not.toHaveClass('border')
    expect(editorSurface?.parentElement).toBe(workspace)
  })
})
