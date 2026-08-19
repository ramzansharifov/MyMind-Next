import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { StudyNode } from '../../../../../../shared/contracts/study'
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

const node: StudyNode = {
  id: '07c8c6be-bab4-4c29-a7a9-b6b4856da0bb',
  type: 'material',
  parentId: null,
  title: 'DSL Highlight',
  position: 0,
  isExpanded: true,
  createdAt: 1,
  updatedAt: 1
}

describe('StudyCodeWorkspace syntax highlighting', () => {
  it('renders semantic DSL token spans behind the editable textarea', async () => {
    const source = `@version(1)\n\nmaterial Lesson "Урок" {\n  heading Intro 1 "Введение"\n  text Body """\n    Перейти к [[Lesson.Intro|введению]]\n  """\n}\n`
    mocks.getCodeSnapshot.mockResolvedValue({
      nodeId: node.id,
      nodeType: 'material',
      title: node.title,
      source,
      revision: 'a'.repeat(64)
    })

    const { container } = render(<StudyCodeWorkspace node={node} onApplied={vi.fn()} />)

    await screen.findByRole('textbox', { name: /DSL-код материала/ })

    const highlight = container.querySelector('.study-code-editor__highlight')
    expect(highlight).toBeInTheDocument()
    expect(highlight?.querySelector('.dsl-annotation')).toHaveTextContent('@version')
    expect(highlight?.querySelector('.dsl-entity')).toHaveTextContent('material')
    expect(highlight?.querySelector('.dsl-block')).toHaveTextContent('heading')
    expect(highlight?.querySelector('.dsl-name')).toHaveTextContent('Lesson')
    expect(highlight?.querySelector('.dsl-internal-link')).toHaveTextContent(
      '[[Lesson.Intro|введению]]'
    )
  })
})
