import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { StudyCodeChangeSummary, StudyNode } from '../../../../../../shared/contracts/study'
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

function createEmptySummary(overrides: Partial<StudyCodeChangeSummary> = {}): StudyCodeChangeSummary {
  return {
    createdFolders: 0,
    createdMaterials: 0,
    deletedFolders: 0,
    deletedMaterials: 0,
    renamedNodes: 0,
    movedNodes: 0,
    createdBlocks: 0,
    deletedBlocks: 0,
    updatedBlocks: 0,
    reorderedBlocks: 0,
    ...overrides
  }
}

function createLongSource(): string {
  const body = Array.from({ length: 140 }, (_, index) => `Строка лекции ${index + 1}`).join('\n')
  return `@version(1)\n\nmaterial "Длинная лекция" @id("${node.id}") {\n  text @id("35c3d864-c2eb-4eea-a2f8-51183fdaf082") """\n${body}\n  """\n}\n`
}

beforeEach(() => {
  vi.clearAllMocks()
})

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
      summary: createEmptySummary(),
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

  it('opens search and replace from dedicated toolbar buttons', async () => {
    const source = `@version(1)\n\nmaterial "Длинная лекция" {\n  text """\n    Roma\n  """\n}\n`
    mocks.getCodeSnapshot.mockResolvedValue({
      nodeId: node.id,
      nodeType: 'material',
      title: node.title,
      source,
      revision: 'c'.repeat(64)
    })

    render(<StudyCodeWorkspace node={node} onApplied={vi.fn()} />)

    await screen.findByRole('textbox', { name: /DSL-код материала/ })

    const findButton = await screen.findByRole('button', { name: 'Найти в коде' })
    const replaceButton = screen.getByRole('button', { name: 'Найти и заменить в коде' })

    fireEvent.click(findButton)
    expect(await screen.findByRole('textbox', { name: 'Найти в коде' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Заменить на' })).not.toBeInTheDocument()

    fireEvent.click(replaceButton)
    expect(await screen.findByRole('textbox', { name: 'Заменить на' })).toBeInTheDocument()
  })

  it('opens VS Code-like replace with Ctrl+H and replaces all matches', async () => {
    const source = `@version(1)\n\nmaterial "Длинная лекция" {\n  text """\n    Roma roma ROMA\n  """\n}\n`
    mocks.getCodeSnapshot.mockResolvedValue({
      nodeId: node.id,
      nodeType: 'material',
      title: node.title,
      source,
      revision: 'd'.repeat(64)
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

  it('previews non-destructive folder structure changes before applying them', async () => {
    const source = '@version(1)\n\nfolder "Курс" {\n}\n'
    const changedSource =
      '@version(1)\n\nfolder "Курс" {\n  material "Введение" {\n    text """\n      Начало курса\n    """\n  }\n}\n'
    const summary = createEmptySummary({ createdMaterials: 1, createdBlocks: 1 })
    const onApplied = vi.fn()

    mocks.getCodeSnapshot.mockResolvedValue({
      nodeId: folderNode.id,
      nodeType: 'folder',
      title: folderNode.title,
      source,
      revision: 'e'.repeat(64)
    })
    mocks.previewCode.mockResolvedValue({
      valid: true,
      diagnostics: [],
      summary,
      destructive: false
    })
    mocks.applyCode.mockResolvedValue({
      rootId: folderNode.id,
      nodes: [folderNode],
      source: changedSource,
      revision: 'f'.repeat(64),
      summary
    })

    render(<StudyCodeWorkspace node={folderNode} onApplied={onApplied} />)

    const editor = await screen.findByRole('textbox', { name: /DSL-код папки/ })
    fireEvent.change(editor, { target: { value: changedSource } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByRole('dialog', { name: 'Применить изменения структуры?' })).toBeInTheDocument()
    expect(screen.getByText('Создано материалов')).toBeInTheDocument()
    expect(mocks.applyCode).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Применить изменения' }))

    await waitFor(() =>
      expect(mocks.applyCode).toHaveBeenCalledWith({
        nodeId: folderNode.id,
        source: changedSource,
        baseRevision: 'e'.repeat(64),
        confirmDestructive: false
      })
    )
    await waitFor(() => expect(onApplied).toHaveBeenCalled())
  })

  it('keeps destructive folder changes behind the destructive confirmation', async () => {
    const source =
      '@version(1)\n\nfolder "Курс" {\n  material "Старый материал" {\n    text """\n      Текст\n    """\n  }\n}\n'
    const changedSource = '@version(1)\n\nfolder "Курс" {\n}\n'
    const summary = createEmptySummary({ deletedMaterials: 1, deletedBlocks: 1 })

    mocks.getCodeSnapshot.mockResolvedValue({
      nodeId: folderNode.id,
      nodeType: 'folder',
      title: folderNode.title,
      source,
      revision: '1'.repeat(64)
    })
    mocks.previewCode.mockResolvedValue({
      valid: true,
      diagnostics: [],
      summary,
      destructive: true
    })
    mocks.applyCode.mockResolvedValue({
      rootId: folderNode.id,
      nodes: [folderNode],
      source: changedSource,
      revision: '2'.repeat(64),
      summary
    })

    render(<StudyCodeWorkspace node={folderNode} onApplied={vi.fn()} />)

    const editor = await screen.findByRole('textbox', { name: /DSL-код папки/ })
    fireEvent.change(editor, { target: { value: changedSource } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByRole('alertdialog', { name: 'Применить удаления?' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Применить изменения' }))

    await waitFor(() =>
      expect(mocks.applyCode).toHaveBeenCalledWith(
        expect.objectContaining({ confirmDestructive: true })
      )
    )
  })
})
