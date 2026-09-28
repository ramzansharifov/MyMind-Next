import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, type ReactElement, type ReactNode } from 'react'
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
  updatePage: vi.fn(),
  updateShapes: vi.fn(),
  moveShapesToPage: vi.fn(),
  deletePage: vi.fn(),
  getPageShapeIds: vi.fn(),
  updatePointer: vi.fn(),
  registerBeforeCreateHandler: vi.fn(),
  registerBeforeChangeHandler: vi.fn(),
  registerAfterCreateHandler: vi.fn(),
  unregisterBeforeCreate: vi.fn(),
  unregisterBeforeChange: vi.fn(),
  unregisterAfterCreate: vi.fn(),
  pages: [{ id: 'page:1', name: 'Page 1', meta: {} }] as Array<{
    id: string
    name: string
    meta: Record<string, unknown>
  }>,
  currentPageId: 'page:1',
  shapes: new Map<string, Record<string, unknown>>(),
  pageShapeIds: {} as Record<string, string[]>,
  activeEditor: null as Record<string, unknown> | null,
  currentToolId: 'select',
  originPagePoint: { x: 100, y: 100 },
  configureDrawShapeUtil: vi.fn(
    (_options: unknown) =>
      class BoardDrawShapeUtilMock {
        static type = 'draw'
      }
  )
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

    get maxX(): number {
      return this.x + this.w
    }

    get maxY(): number {
      return this.y + this.h
    }
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
  DrawShapeUtil: {
    configure: testHarness.configureDrawShapeUtil
  },
  getSnapshot: vi.fn(() => ({})),
  react: vi.fn(() => testHarness.stopListening),
  useEditor: vi.fn(() => testHarness.activeEditor),
  useValue: vi.fn((_name: string, getter: () => unknown) => getter()),
  Tldraw: ({
    components,
    onMount
  }: {
    components?: {
      QuickActions?: (props: { children?: ReactNode }) => ReactElement
      Background?: () => ReactElement
    }
    onMount?: (editor: unknown) => void | (() => void)
  }) => {
    const QuickActions = components?.QuickActions
    const Background = components?.Background

    const editor = {
      run: (callback: () => void) => callback(),
      getCurrentPageId: () => testHarness.currentPageId,
      getCurrentPage: () =>
        testHarness.pages.find((page) => page.id === testHarness.currentPageId) ??
        testHarness.pages[0],
      getPages: () => testHarness.pages,
      getPage: (pageId: string) => testHarness.pages.find((page) => page.id === pageId),
      setCurrentPage: (page: string | { id: string }) => {
        testHarness.currentPageId = typeof page === 'string' ? page : page.id
        testHarness.setCurrentPage(page)
      },
      updatePage: (partial: { id: string; meta?: Record<string, unknown>; name?: string }) => {
        const page = testHarness.pages.find((candidate) => candidate.id === partial.id)
        if (page) {
          if (partial.meta) page.meta = partial.meta
          if (partial.name) page.name = partial.name
        }
        testHarness.updatePage(partial)
      },
      renamePage: (page: string | { id: string }, name: string) => {
        const pageId = typeof page === 'string' ? page : page.id
        const existing = testHarness.pages.find((candidate) => candidate.id === pageId)
        if (existing) existing.name = name
        testHarness.renamePage(page, name)
      },
      getPageShapeIds: (pageId: string) => {
        testHarness.getPageShapeIds(pageId)
        return new Set(testHarness.pageShapeIds[pageId] ?? [])
      },
      getCurrentPageShapeIds: () =>
        new Set(testHarness.pageShapeIds[testHarness.currentPageId] ?? []),
      getCurrentPageBounds: () => undefined,
      getShape: (shapeId: string) => testHarness.shapes.get(shapeId),
      getShapeUtil: () => ({
        getGeometry: (shape: { props?: { w?: number; h?: number } }) => {
          const w = shape.props?.w ?? 100
          const h = shape.props?.h ?? 100
          return {
            bounds: { x: 0, y: 0, w, h, maxX: w, maxY: h }
          }
        }
      }),
      getShapePageBounds: () => undefined,
      moveShapesToPage: (shapeIds: string[], targetPageId: string) => {
        shapeIds.forEach((shapeId) => {
          const shape = testHarness.shapes.get(shapeId)
          if (shape) testHarness.shapes.set(shapeId, { ...shape, parentId: targetPageId })
        })
        testHarness.currentPageId = targetPageId
        testHarness.moveShapesToPage(shapeIds, targetPageId)
      },
      updateShapes: (updates: Array<Record<string, unknown>>) => {
        updates.forEach((update) => {
          const id = update.id as string
          const shape = testHarness.shapes.get(id)
          if (shape) testHarness.shapes.set(id, { ...shape, ...update })
        })
        testHarness.updateShapes(updates)
      },
      deletePage: (pageId: string) => {
        testHarness.pages = testHarness.pages.filter((page) => page.id !== pageId)
        delete testHarness.pageShapeIds[pageId]
        testHarness.deletePage(pageId)
      },
      resizeToBounds: testHarness.resizeToBounds,
      zoomToBounds: testHarness.zoomToBounds,
      getViewportPageBounds: () => ({ x: -200, y: -200, w: 1400, h: 5200, maxY: 5000 }),
      pageToViewport: ({ x, y }: { x: number; y: number }) => ({ x: x + 24, y: y + 24 }),
      getZoomLevel: () => 0.5,
      getCurrentToolId: () => testHarness.currentToolId,
      screenToPage: ({ x, y }: { x: number; y: number }) => ({ x, y }),
      pageToScreen: ({ x, y }: { x: number; y: number }) => ({ x, y }),
      inputs: {
        getOriginPagePoint: () => testHarness.originPagePoint
      },
      updatePointer: testHarness.updatePointer,
      sideEffects: {
        registerBeforeCreateHandler: testHarness.registerBeforeCreateHandler,
        registerBeforeChangeHandler: testHarness.registerBeforeChangeHandler,
        registerAfterCreateHandler: testHarness.registerAfterCreateHandler
      }
    }

    testHarness.activeEditor = editor
    useEffect(() => {
      const cleanup = onMount?.(editor)
      return typeof cleanup === 'function' ? cleanup : undefined
    }, [onMount])

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
  testHarness.saveDocument.mockResolvedValue({})
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
  testHarness.updatePage.mockReset()
  testHarness.updateShapes.mockReset()
  testHarness.moveShapesToPage.mockReset()
  testHarness.deletePage.mockReset()
  testHarness.getPageShapeIds.mockReset()
  testHarness.updatePointer.mockReset()
  testHarness.pages = [{ id: 'page:1', name: 'Page 1', meta: {} }]
  testHarness.currentPageId = 'page:1'
  testHarness.shapes = new Map()
  testHarness.pageShapeIds = {}
  testHarness.activeEditor = null
  testHarness.currentToolId = 'select'
  testHarness.originPagePoint = { x: 100, y: 100 }
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

describe('BoardCanvas pencil styling', () => {
  it('makes only the S pencil stroke thinner than the tldraw default', () => {
    const options = testHarness.configureDrawShapeUtil.mock.calls[0]?.[0] as {
      getCustomDisplayValues: (
        editor: unknown,
        shape: { props: { size: string } },
        theme: { strokeWidth: number }
      ) => { strokeWidth?: number }
    }

    expect(
      options.getCustomDisplayValues({}, { props: { size: 's' } }, { strokeWidth: 2 })
    ).toEqual({
      strokeWidth: 0.5
    })
    expect(
      options.getCustomDisplayValues({}, { props: { size: 'm' } }, { strokeWidth: 2 })
    ).toEqual({})
  })
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
    expect(testHarness.renamePage).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'page:1' }),
      'A4'
    )
    expect(testHarness.updatePage).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'page:1',
        meta: expect.objectContaining({ mymindA4PageCount: 1 })
      })
    )
    expect(testHarness.zoomToBounds).toHaveBeenCalled()
  })

  it('renders multiple A4 sheets one after another on the same canvas', async () => {
    testHarness.pages = [
      {
        id: 'page:1',
        name: 'A4',
        meta: { mymindA4PageCount: 3 }
      }
    ]
    testHarness.getDocument.mockResolvedValueOnce({
      snapshot: {
        __mymindBoard: { version: 1, canvasMode: 'a4' },
        tldraw: {}
      }
    })

    render(<BoardCanvas boardId="board-a4" title="Листы" />)

    const workspace = await screen.findByRole('region', { name: 'Холст доски' })
    const boundaries = workspace.querySelectorAll('[data-board-a4-page-boundary]')

    expect(workspace).toHaveAttribute('data-board-canvas-mode', 'a4')
    expect(workspace).toHaveClass('tldraw__editor')
    expect(boundaries).toHaveLength(3)
    expect(screen.getByText('Лист 1')).toBeInTheDocument()
    expect(screen.getByText('Лист 2')).toBeInTheDocument()
    expect(screen.getByText('Лист 3')).toBeInTheDocument()
    expect(screen.queryByText('Создать новую страницу')).not.toBeInTheDocument()
    expect(testHarness.zoomToBounds).toHaveBeenCalledWith(
      expect.objectContaining({ y: 0, h: 1485 }),
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

  it('adds another physical A4 sheet below the current document', async () => {
    const user = userEvent.setup()
    testHarness.pages = [
      {
        id: 'page:1',
        name: 'A4',
        meta: { mymindA4PageCount: 1 }
      }
    ]
    testHarness.getDocument.mockResolvedValueOnce({
      snapshot: {
        __mymindBoard: { version: 1, canvasMode: 'a4' },
        tldraw: {}
      }
    })

    render(<BoardCanvas boardId="board-a4-add" />)

    await screen.findByRole('region', { name: 'Холст доски' })
    await user.click(screen.getByRole('button', { name: 'Добавить лист A4' }))

    expect(testHarness.pages[0]?.meta).toMatchObject({ mymindA4PageCount: 2 })
    expect(testHarness.updatePage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: 'page:1',
        meta: expect.objectContaining({ mymindA4PageCount: 2 })
      })
    )
    expect(screen.getByText('Лист 2')).toBeInTheDocument()
    expect(testHarness.zoomToBounds).toHaveBeenLastCalledWith(
      expect.objectContaining({ y: 1581, h: 1485 }),
      expect.objectContaining({ inset: 28 })
    )
  })

  it('migrates old separate tldraw pages into one continuous A4 strip', async () => {
    testHarness.pages = [
      { id: 'page:1', name: 'Лист 1', meta: {} },
      { id: 'page:2', name: 'Страница 1', meta: {} },
      { id: 'page:3', name: 'Страница 2', meta: {} }
    ]
    testHarness.currentPageId = 'page:2'
    testHarness.shapes = new Map([
      [
        'shape:2',
        {
          id: 'shape:2',
          type: 'geo',
          parentId: 'page:2',
          x: 120,
          y: 100
        }
      ],
      [
        'shape:3',
        {
          id: 'shape:3',
          type: 'geo',
          parentId: 'page:3',
          x: 220,
          y: 200
        }
      ]
    ])
    testHarness.pageShapeIds = {
      'page:1': [],
      'page:2': ['shape:2'],
      'page:3': ['shape:3']
    }
    testHarness.getDocument.mockResolvedValueOnce({
      snapshot: {
        __mymindBoard: { version: 1, canvasMode: 'a4' },
        tldraw: {}
      }
    })

    render(<BoardCanvas boardId="board-a4-legacy" />)

    await screen.findByRole('region', { name: 'Холст доски' })

    expect(testHarness.moveShapesToPage).toHaveBeenCalledWith(['shape:2'], 'page:1')
    expect(testHarness.moveShapesToPage).toHaveBeenCalledWith(['shape:3'], 'page:1')
    expect(testHarness.shapes.get('shape:2')).toMatchObject({
      parentId: 'page:1',
      x: 120,
      y: 1681
    })
    expect(testHarness.shapes.get('shape:3')).toMatchObject({
      parentId: 'page:1',
      x: 220,
      y: 3362
    })
    expect(testHarness.deletePage).toHaveBeenCalledWith('page:2')
    expect(testHarness.deletePage).toHaveBeenCalledWith('page:3')
    expect(testHarness.pages).toHaveLength(1)
    expect(testHarness.pages[0]?.meta).toMatchObject({ mymindA4PageCount: 3 })
    expect(testHarness.zoomToBounds).toHaveBeenCalledWith(
      expect.objectContaining({ y: 1581, h: 1485 }),
      expect.objectContaining({ inset: 28, immediate: true })
    )
  })

  it('clamps the active pencil pointer to the A4 sheet before tldraw receives it', async () => {
    testHarness.pages = [
      {
        id: 'page:1',
        name: 'A4',
        meta: { mymindA4PageCount: 1 }
      }
    ]
    testHarness.currentToolId = 'draw'
    testHarness.originPagePoint = { x: 120, y: 240 }
    testHarness.getDocument.mockResolvedValueOnce({
      snapshot: {
        __mymindBoard: { version: 1, canvasMode: 'a4' },
        tldraw: {}
      }
    })

    render(<BoardCanvas boardId="board-pencil-clamp" />)

    const workspace = await screen.findByRole('region', { name: 'Холст доски' })

    fireEvent.pointerMove(workspace, {
      clientX: 1300,
      clientY: 720,
      buttons: 1,
      pointerId: 7,
      pointerType: 'mouse'
    })

    expect(testHarness.updatePointer).toHaveBeenCalledWith(
      expect.objectContaining({
        point: { x: 1050, y: 720 },
        pointerId: 7,
        immediate: true
      })
    )
  })

  it('keeps the previous pencil stroke instead of shifting the whole draw shape outside A4', async () => {
    testHarness.pages = [
      {
        id: 'page:1',
        name: 'A4',
        meta: { mymindA4PageCount: 1 }
      }
    ]
    testHarness.getDocument.mockResolvedValueOnce({
      snapshot: {
        __mymindBoard: { version: 1, canvasMode: 'a4' },
        tldraw: {}
      }
    })

    render(<BoardCanvas boardId="board-pencil-fallback" />)

    await screen.findByRole('region', { name: 'Холст доски' })

    const handler = testHarness.registerBeforeChangeHandler.mock.calls[0]?.[1] as (
      previous: Record<string, unknown>,
      next: Record<string, unknown>
    ) => Record<string, unknown>

    const previous = {
      id: 'shape:draw',
      typeName: 'shape',
      type: 'draw',
      parentId: 'page:1',
      x: 900,
      y: 600,
      rotation: 0,
      props: { w: 100, h: 80 }
    }
    const escaped = {
      ...previous,
      props: { w: 220, h: 80 }
    }

    expect(handler(previous, escaped)).toBe(previous)
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
