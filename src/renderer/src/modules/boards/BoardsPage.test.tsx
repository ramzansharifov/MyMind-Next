import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { BoardNode } from '../../../../shared/contracts/boards'
import { AppErrorBoundary } from '../../app/AppErrorBoundary'

const testHarness = vi.hoisted(() => ({
  listNodes: vi.fn(),
  loadBoardCanvas: vi.fn()
}))

vi.mock('./api/boards-client', () => ({
  boardsClient: {
    listNodes: testHarness.listNodes,
    createNode: vi.fn(),
    renameNode: vi.fn(),
    deleteNode: vi.fn(),
    updateExpansion: vi.fn(),
    moveNode: vi.fn(),
    getDocument: vi.fn(),
    saveDocument: vi.fn(),
    ensureStudyBoard: vi.fn()
  }
}))

vi.mock('./components/load-board-canvas', () => ({
  loadBoardCanvas: testHarness.loadBoardCanvas
}))

import { BoardsPage } from './BoardsPage'

const systemFolder: BoardNode = {
  id: 'boards-study-root',
  type: 'folder',
  parentId: null,
  title: 'Обучение',
  position: 0,
  isExpanded: true,
  isSystem: true,
  createdAt: 1,
  updatedAt: 1
}

const boardNode: BoardNode = {
  id: 'test-board',
  type: 'board',
  parentId: null,
  title: 'Тестовая доска',
  position: 1,
  isExpanded: true,
  isSystem: false,
  createdAt: 1,
  updatedAt: 1
}

beforeEach(() => {
  testHarness.loadBoardCanvas.mockReset()
  testHarness.loadBoardCanvas.mockRejectedValue(
    new Error('Failed to fetch dynamically imported module: BoardCanvas')
  )
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('BoardsPage', () => {
  it('renders loading and then the boards home without loading tldraw', async () => {
    const nodes = deferred<BoardNode[]>()
    testHarness.listNodes.mockReturnValueOnce(nodes.promise)

    render(<BoardsPage />)

    expect(screen.getByText('Загрузка модуля досок…')).toBeInTheDocument()
    expect(testHarness.loadBoardCanvas).not.toHaveBeenCalled()

    nodes.resolve([systemFolder])

    expect(await screen.findByRole('heading', { name: 'Доски', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Обучение' })).toBeInTheDocument()
    expect(testHarness.loadBoardCanvas).not.toHaveBeenCalled()
  })

  it('shows a rejected listNodes call locally instead of reaching AppErrorBoundary', async () => {
    testHarness.listNodes.mockRejectedValueOnce(new Error('IPC list failed'))

    render(
      <AppErrorBoundary scope="boards-test">
        <BoardsPage />
      </AppErrorBoundary>
    )

    expect(await screen.findByText('IPC list failed')).toBeInTheDocument()
    expect(screen.queryByText('Не удалось открыть раздел')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Доски', level: 1 })).toBeInTheDocument()
  })

  it('uses the shared module sidebar dimensions and collapse behavior', async () => {
    testHarness.listNodes.mockResolvedValueOnce([systemFolder])

    render(<BoardsPage />)

    await screen.findByRole('heading', { name: 'Доски', level: 1 })

    const sidebar = screen.getByRole('complementary', { name: 'Дерево досок' })

    expect(sidebar).toHaveAttribute('data-module-sidebar')
    expect(sidebar).toHaveAttribute('data-collapsed', 'false')
    expect(screen.getByRole('button', { name: 'Обучение' })).toHaveClass('text-sm')

    fireEvent.click(screen.getByRole('button', { name: 'Скрыть дерево досок' }))

    expect(sidebar).toHaveAttribute('data-collapsed', 'true')
    expect(screen.getByRole('button', { name: 'Показать дерево досок' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Главная досок' })).toBeInTheDocument()
  })

  it('loads BoardCanvas only for a board and isolates a lazy import failure in the workspace', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    testHarness.listNodes.mockResolvedValueOnce([systemFolder, boardNode])

    render(
      <AppErrorBoundary scope="boards-test">
        <BoardsPage />
      </AppErrorBoundary>
    )

    await screen.findByRole('heading', { name: 'Доски', level: 1 })
    expect(testHarness.loadBoardCanvas).not.toHaveBeenCalled()

    fireEvent.click(screen.getAllByRole('button', { name: 'Тестовая доска' })[0])

    expect(await screen.findByRole('alert', { name: 'Ошибка редактора доски' })).toBeInTheDocument()
    await waitFor(() => expect(testHarness.loadBoardCanvas).toHaveBeenCalledOnce())
    expect(screen.getByRole('button', { name: 'Тестовая доска' })).toBeInTheDocument()
    expect(screen.queryByText('Не удалось открыть раздел')).not.toBeInTheDocument()
  })
})

function deferred<T>(): {
  promise: Promise<T>
  resolve(value: T): void
} {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve
  })

  return { promise, resolve }
}
