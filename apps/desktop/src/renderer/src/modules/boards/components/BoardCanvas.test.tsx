import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement, ReactNode } from 'react'
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
  disposeQueue: vi.fn(),
  zoomToBounds: vi.fn(),
  renamePage: vi.fn(),
  resizeToBounds: vi.fn(),
  setCurrentPage: vi.fn(),
  registerBeforeCreateHandler: vi.fn(),
  registerBeforeChangeHandler: vi.fn(),
  registerAfterCreateHandler: vi.fn(),
  unregisterBeforeCreate: vi.fn(),
  unregisterBeforeChange: vi.fn(),
  unregisterAfterCreate: vi.fn()
}))

vi.mock('@tldraw/assets/imports.vite', () => ({
  getAssetUrlsByImport: vi.fn(() => ({}))
}))

vi.mock('tldraw', () => ({
  Box: class BoxMock {
    constructor(
      public x: number,
      public y: number,
      public w: number,
      public h: number
    ) {}
  },
  createTLStore: vi.fn(() => ({
    history: {
      get: vi.fn(() => 0)
    },
    dispose: testHarness.disposeStore
  })),
  DefaultQuickActions: ({ children }: { children: ReactNode }) => (
    <div data-testid="default-quick-actions">{children}</div>
  ),
  DefaultQuickActionsContent: () => <span data-testid="default-quick-actions-content" />,
  defaultAssetUtils: {},
  defaultBindingUtils: [],
  defaultShapeUtils: [],
  getSnapshot: vi.fn(() => ({})),
  react: vi.fn(() => testHarness.stopListening),
  useEditor: vi.fn(() => ({
    pageToViewport: ({ x, y }: { x: number; y: number }) => ({ x: x + 24, y: y + 24 }),
    getZoomLevel: () => 0.5
  })),
  useValue: vi.fn((_name: string, getter: () => unknown) => getter()),
  Tldraw: ({
    components,
    onMount
  }: {
    components?: {
      QuickActions?: (props: { children?: ReactNode }) => ReactElement
      Background?: () => ReactElement
    }
    onMount?: (editor: unknown) => void
  }) => {
    const QuickActions = components?.QuickActions
    const Background = components?.Background
    onMount?.({
      getCurrentPageId: () => 'page:1',
      getPages: () => [{ id: 'page:1', name: 'Page 1' }],
      getPage: () => ({ id: 'page:1', name: 'Page 1' }),
      sideEffects: {
        registerBeforeCreateHandler: testHarness.registerBeforeCreateHandler,
        registerBeforeChangeHandler: testHarness.registerBeforeChangeHandler,
        registerAfterCreateHandler: testHarness.registerAfterCreateHandler
      },
      getShapeUtil: () => ({
        getGeometry: (shape: { props?: { w?: number; h?: number } }) => {
          const w = shape.props?.w ?? 100
          const h = shape.props?.h ?? 100
          return {
            bounds: { x: 0, y: 0, w, h, maxX: w, maxY: h }
          }
        }
      }),
      setCurrentPage: testHarness.setCurrentPage,
      renamePage: testHarness.renamePage,
      getCurrentPageShapeIds: () => new Set(),
      getCurrentPageBounds: () => undefined,
      getShape: () => undefined,
      resizeToBounds: testHarness.resizeToBounds,
      zoomToBounds: testHarness.zoomToBounds
    })

    return (
      <div data-testid="tldraw-canvas">
        {Background ? <Background /> : null}
        {QuickActions ? <QuickActions /> : null}
      </div>
    )
  },
  TldrawUiButton: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) => (
    <button type="button" {...props}>
      {children}
    </button>
  )
}))

vi.mock('../../../app/appearance/appearance-context', () => ({
  useAppearance: () => ({ resolvedTheme: 'dark' })
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
  testHarness.zoomToBounds.mockReset()
  testHarness.renamePage.mockReset()
  testHarness.resizeToBounds.mockReset()
  testHarness.setCurrentPage.mockReset()
  testHarness.registerBeforeCreateHandler.mockReset()
  testHarness.registerBeforeChangeHandler.mockReset()
  testHarness.registerAfterCreateHandler.mockReset()
  testHarness.unregisterBeforeCreate.mockReset()
  testHarness.unregisterBeforeChange.mockReset()
  testHarness.unregisterAfterCreate.mockReset()
  testHarness.registerBeforeCreateHandler.mockReturnValue(testHarness.unregisterBeforeCreate)
  testHarness.registerBeforeChangeHandler.mockReturnValue(testHarness.unregisterBeforeChange)
  testHarness.registerAfterCreateHandler.mockReturnValue(testHarness.unregisterAfterCreate)
})

describe('BoardCanvas A4 mode', () => {
  it('converts an existing infinite board to A4 and persists the mode envelope', async () => {
    const user = userEvent.setup()

    render(<BoardCanvas boardId="board-convert" title="Черновик" />)

    const workspace = await screen.findByRole('region', { name: 'Холст доски' })
    expect(workspace).toHaveAttribute('data-board-canvas-mode', 'infinite')

    await user.click(screen.getByRole('button', { name: 'Перевести доску в A4' }))

    await vi.waitFor(() =>
      expect(testHarness.saveDocument).toHaveBeenCalledWith(
        'board-convert',
        expect.objectContaining({
          __mymindBoard: { version: 1, canvasMode: 'a4' },
          tldraw: {}
        })
      )
    )

    expect(workspace).toHaveAttribute('data-board-canvas-mode', 'a4')
    expect(workspace).toHaveClass('tldraw__editor')
    expect(workspace.querySelector('[data-board-a4-page-boundary]')).toBeInTheDocument()
    expect(workspace.querySelector('[data-board-a4-stage]')).not.toBeInTheDocument()
    expect(workspace.querySelector('[data-board-a4-page-surface]')).not.toBeInTheDocument()
    expect(testHarness.flushQueue).toHaveBeenCalled()
    expect(testHarness.renamePage).toHaveBeenCalledWith({ id: 'page:1', name: 'Page 1' }, 'Лист 1')
    expect(testHarness.zoomToBounds).toHaveBeenCalled()
  })

  it('renders A4 boundaries directly on the full main tldraw canvas', async () => {
    testHarness.getDocument.mockResolvedValueOnce({
      snapshot: {
        __mymindBoard: { version: 1, canvasMode: 'a4' },
        tldraw: {}
      }
    })

    render(<BoardCanvas boardId="board-a4" title="Листы" />)

    const workspace = await screen.findByRole('region', { name: 'Холст доски' })
    const boundary = workspace.querySelector('[data-board-a4-page-boundary]')

    expect(workspace).toHaveAttribute('data-board-canvas-mode', 'a4')
    expect(workspace).toHaveClass('tldraw__editor')
    expect(boundary).toBeInTheDocument()
    expect(workspace.querySelector('[data-board-a4-stage]')).not.toBeInTheDocument()
    expect(workspace.querySelector('[data-board-a4-page-surface]')).not.toBeInTheDocument()
    expect(testHarness.zoomToBounds).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ inset: 28, immediate: true })
    )
    expect(testHarness.registerBeforeCreateHandler).toHaveBeenCalledWith(
      'shape',
      expect.any(Function)
    )
    expect(testHarness.registerBeforeChangeHandler).toHaveBeenCalledWith(
      'shape',
      expect.any(Function)
    )
  })

  it('clamps top-level shapes so they cannot be moved outside the A4 page', async () => {
    testHarness.getDocument.mockResolvedValueOnce({
      snapshot: {
        __mymindBoard: { version: 1, canvasMode: 'a4' },
        tldraw: {}
      }
    })

    render(<BoardCanvas boardId="board-a4-bounds" />)

    await screen.findByRole('region', { name: 'Холст доски' })

    const handler = testHarness.registerBeforeChangeHandler.mock.calls[0]?.[1] as (
      previous: Record<string, unknown>,
      next: Record<string, unknown>
    ) => Record<string, unknown>

    const previous = {
      id: 'shape:1',
      typeName: 'shape',
      type: 'geo',
      parentId: 'page:1',
      x: 900,
      y: 1300,
      rotation: 0,
      props: { w: 100, h: 100 }
    }
    const next = {
      ...previous,
      x: 1020,
      y: 1450
    }

    expect(handler(previous, next)).toMatchObject({
      x: 950,
      y: 1385
    })

    const oversized = {
      ...next,
      props: { w: 1200, h: 100 }
    }

    expect(handler(previous, oversized)).toBe(previous)
  })
})

describe('BoardCanvas fullscreen mode', () => {
  it('keeps the themed canvas mounted and places fullscreen below the application titlebar', async () => {
    const user = userEvent.setup()

    render(<BoardCanvas boardId="board-1" />)

    const workspace = await screen.findByRole('region', { name: 'Холст доски' })
    const canvas = screen.getByTestId('tldraw-canvas')
    const quickActions = screen.getByTestId('default-quick-actions')
    const expandButton = screen.getByRole('button', {
      name: 'Развернуть доску на весь экран'
    })

    expect(workspace).toHaveClass('mymind-board-canvas')
    expect(workspace).toHaveAttribute('data-board-fullscreen', 'false')
    expect(workspace).not.toHaveClass('fixed')
    expect(quickActions).toContainElement(screen.getByTestId('default-quick-actions-content'))
    expect(quickActions).toContainElement(expandButton)
    expect(expandButton).toHaveAttribute('data-board-fullscreen-control', 'true')

    await user.click(expandButton)

    expect(workspace).toHaveAttribute('data-board-fullscreen', 'true')
    expect(workspace).toHaveClass('fixed', 'app-fullscreen-bounds', 'h-auto')
    expect(workspace).not.toHaveClass('h-screen', 'inset-0')
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

  it('keeps tldraw mounted in application focus mode and exits through quick actions', async () => {
    const user = userEvent.setup()
    const onFocusModeChange = vi.fn()

    render(<BoardCanvas boardId="board-focus" focusMode onFocusModeChange={onFocusModeChange} />)

    const workspace = await screen.findByRole('region', { name: 'Холст доски' })

    expect(screen.getByTestId('tldraw-canvas')).toBeInTheDocument()
    expect(workspace).toHaveAttribute('data-board-focus-mode', 'true')
    expect(workspace).toHaveAttribute('data-board-fullscreen', 'true')
    expect(workspace).not.toHaveClass('fixed')

    await user.click(screen.getByRole('button', { name: 'Выйти из режима фокуса' }))

    expect(onFocusModeChange).toHaveBeenCalledWith(false)
  })
})
