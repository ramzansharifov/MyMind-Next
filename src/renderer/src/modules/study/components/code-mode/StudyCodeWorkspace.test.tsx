import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  id: '4ff2e3d0-2dd5-495c-926b-d58e6b611013',
  type: 'material',
  parentId: null,
  title: 'Длинная лекция',
  position: 0,
  isExpanded: true,
  createdAt: 1,
  updatedAt: 1
}

function createLongSource(): string {
  const body = Array.from({ length: 140 }, (_, index) => `Строка лекции ${index + 1}`).join('\n')
  return `@version(1)\n\nmaterial "Длинная лекция" @id("${node.id}") {\n  text @id("35c3d864-c2eb-4eea-a2f8-51183fdaf082") """\n${body}\n  """\n}\n`
}

describe('StudyCodeWorkspace', () => {
  it('renders line numbers for the complete long document instead of viewport height', async () => {
    const source = createLongSource()
    mocks.getCodeSnapshot.mockResolvedValue({
      nodeId: node.id,
      nodeType: 'material',
      title: node.title,
      source,
      revision: 'a'.repeat(64)
    })

    const { container } = render(<StudyCodeWorkspace node={node} onApplied={vi.fn()} />)

    await screen.findByRole('textbox', { name: /DSL-код материала/ })

    const gutter = container.querySelector('[data-study-code-line-numbers]')
    const expectedLineCount = source.split('\n').length

    expect(gutter).toHaveTextContent(String(expectedLineCount))
    expect(gutter?.textContent?.split('\n')).toHaveLength(expectedLineCount)
    expect(container.querySelector('[data-study-code-editor-scroll-content]')).toBeInTheDocument()
    expect(container.querySelector('.study-code-editor__root')).toBeInTheDocument()
  })

  it('returns from an error state to a dirty state after the user fixes the source', async () => {
    const source = createLongSource()
    mocks.getCodeSnapshot.mockResolvedValue({
      nodeId: node.id,
      nodeType: 'material',
      title: node.title,
      source,
      revision: 'b'.repeat(64)
    })
    mocks.previewCode.mockResolvedValue({
      valid: false,
      diagnostics: [{ severity: 'error', line: 2, column: 1, message: 'Проверочная ошибка' }],
      summary: {
        createdFolders: 0,
        createdMaterials: 0,
        deletedFolders: 0,
        deletedMaterials: 0,
        renamedNodes: 0,
        movedNodes: 0,
        createdBlocks: 0,
        deletedBlocks: 0,
        updatedBlocks: 0,
        reorderedBlocks: 0
      },
      destructive: false
    })

    render(<StudyCodeWorkspace node={node} onApplied={vi.fn()} />)

    const editor = await screen.findByRole('textbox', { name: /DSL-код материала/ })
    fireEvent.change(editor, { target: { value: `${source} ` } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    await screen.findByText('Нужно исправить')
    expect(screen.getByText(/Проверочная ошибка/)).toBeInTheDocument()

    fireEvent.change(editor, { target: { value: `${source}  ` } })

    await waitFor(() => expect(screen.getByText('Есть изменения')).toBeInTheDocument())
    expect(screen.queryByText(/Проверочная ошибка/)).not.toBeInTheDocument()
  })

  it('opens VS Code-like replace with Ctrl+H and replaces all matches', async () => {
    const source = `@version(1)\n\nmaterial "Длинная лекция" {\n  text """\n    Roma roma ROMA\n  """\n}\n`
    mocks.getCodeSnapshot.mockResolvedValue({
      nodeId: node.id,
      nodeType: 'material',
      title: node.title,
      source,
      revision: 'c'.repeat(64)
    })

    render(<StudyCodeWorkspace node={node} onApplied={vi.fn()} />)

    const editor = await screen.findByRole('textbox', { name: /DSL-код материала/ })
    fireEvent.keyDown(editor, { key: 'h', ctrlKey: true })

    const findInput = await screen.findByRole('textbox', { name: 'Найти в коде' })
    const replaceInput = screen.getByRole('textbox', { name: 'Заменить на' })
    fireEvent.change(findInput, { target: { value: 'roma' } })
    fireEvent.change(replaceInput, { target: { value: 'Rome' } })

    await waitFor(() => expect(screen.getByText('1 / 3')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Заменить все' }))

    await waitFor(() => expect(editor).toHaveValue(source.replace(/roma/gi, 'Rome')))
    expect(screen.getByText('Есть изменения')).toBeInTheDocument()
  })
})
