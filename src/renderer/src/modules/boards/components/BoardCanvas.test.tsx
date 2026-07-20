import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const testHarness = vi.hoisted(() => ({
  getDocument: vi.fn(),
  saveDocument: vi.fn(),
  disposeStore: vi.fn(),
  stopListening: vi.fn(),
  unregisterDraft: vi.fn(),
  updateQueue: vi.fn(),
  saveLatestQueue: vi.fn(),
  flushQueue: vi.fn(),
  disposeQueue: vi.fn()
}))

vi.mock('@tldraw/assets/imports.vite', () => ({
  getAssetUrlsByImport: vi.fn(() => ({}))
}))

vi.mock('tldraw', () => ({
  createTLStore: vi.fn(() => ({
    history: {
      get: vi.fn(() => 0)
    },
    dispose: testHarness.disposeStore
  })),
  defaultAssetUtils: {},
  defaultBindingUtils: [],
  defaultShapeUtils: [],
  getSnapshot: vi.fn(() => ({})),
  react: vi.fn(() => testHarness.stopListening),
  Tldraw: () => <div data-testid="tldraw-canvas" />
}))

vi.mock('../../../app/appearance/appearance-context', () => ({
  useAppearance: () => ({ resolvedTheme: 'dark' })
}))

vi.mock('../../../shared/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactElement }) => children
}))

vi.mock('../api/boards-client', () => ({
  boardsClient: {
    getDocument: testHarness.getDocument,
    saveDocument: testHarness.saveDocument
  }
}))

vi.mock('../lib/board-draft-lifecycle', () => ({
  registerBoardDraftHandle: vi.fn(() => testHarness.unregisterDraft)
}))

vi.mock('../lib/board-save-queue', () => ({
  BoardSaveQueue: class BoardSaveQueueMock {
    update(): void {
      testHarness.updateQueue()
    }

    saveLatest(): Promise<void> {
      testHarness.saveLatestQueue()
      return Promise.resolve()
    }

    hasUnsavedChanges(): boolean {
      return false
    }

    flush(): Promise<void> {
      testHarness.flushQueue()
      return Promise.resolve()
    }

    dispose(): void {
      testHarness.disposeQueue()
    }
  }
}))

import { BoardCanvas } from './BoardCanvas'

beforeEach(() => {
  testHarness.getDocument.mockReset()
  testHarness.getDocument.mockResolvedValue({ snapshot: null })
  testHarness.saveDocument.mockReset()
  testHarness.disposeStore.mockReset()
  testHarness.stopListening.mockReset()
  testHarness.unregisterDraft.mockReset()
  testHarness.updateQueue.mockReset()
  testHarness.saveLatestQueue.mockReset()
  testHarness.flushQueue.mockReset()
  testHarness.disposeQueue.mockReset()
})

describe('BoardCanvas fullscreen mode', () => {
  it('expands over the application, preserves the canvas instance, and exits by button or Escape', async () => {
    const user = userEvent.setup()

    render(<BoardCanvas boardId="board-1" />)

    const workspace = await screen.findByRole('region', { name: 'Холст доски' })
    const canvas = screen.getByTestId('tldraw-canvas')

    expect(workspace).toHaveAttribute('data-board-fullscreen', 'false')
    expect(workspace).not.toHaveClass('fixed')

    await user.click(screen.getByRole('button', { name: 'Развернуть доску на весь экран' }))

    expect(workspace).toHaveAttribute('data-board-fullscreen', 'true')
    expect(workspace).toHaveClass('fixed')
    expect(screen.getByTestId('tldraw-canvas')).toBe(canvas)
    expect(screen.getByRole('button', { name: 'Вернуть обычный вид доски' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )

    await user.click(screen.getByRole('button', { name: 'Вернуть обычный вид доски' }))

    expect(workspace).toHaveAttribute('data-board-fullscreen', 'false')
    expect(workspace).not.toHaveClass('fixed')
    expect(screen.getByTestId('tldraw-canvas')).toBe(canvas)

    await user.click(screen.getByRole('button', { name: 'Развернуть доску на весь экран' }))
    await user.keyboard('{Escape}')

    expect(workspace).toHaveAttribute('data-board-fullscreen', 'false')
    expect(workspace).not.toHaveClass('fixed')
    expect(screen.getByTestId('tldraw-canvas')).toBe(canvas)
  })
})
