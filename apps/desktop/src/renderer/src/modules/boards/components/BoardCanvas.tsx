import { getAssetUrlsByImport } from '@tldraw/assets/imports.vite'
import {
  Box,
  createTLStore,
  DefaultQuickActions,
  DefaultQuickActionsContent,
  defaultAssetUtils,
  defaultBindingUtils,
  defaultShapeUtils,
  getSnapshot,
  react,
  Tldraw,
  TldrawUiButton,
  type Editor,
  type TLComponents,
  type TLEditorSnapshot,
  type TLShape,
  type TLStore,
  type TLUiQuickActionsProps,
  type TldrawOptions
} from 'tldraw'
import 'tldraw/tldraw.css'
import { FileDown, FileText, LoaderCircle, Maximize2, Minimize2, TriangleAlert } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import {
  BOARD_A4_BOUNDS,
  BOARD_A4_MAX_PAGES,
  createBoardSnapshotEnvelope,
  readBoardSnapshot,
  type BoardCanvasMode,
  type BoardSnapshot
} from '../../../../../shared/contracts/boards'
import '../../../assets/board-pdf-export.css'
import { useAppearance } from '../../../app/appearance/appearance-context'
import { cn } from '../../../shared/lib/cn'
import { Tooltip, TooltipProvider } from '../../../shared/ui/tooltip'
import { boardsClient } from '../api/boards-client'
import { registerBoardDraftHandle } from '../lib/board-draft-lifecycle'
import { BoardSaveQueue, type BoardSaveState } from '../lib/board-save-queue'

const assetUrls = getAssetUrlsByImport((assetUrl) => assetUrl)
const BOARD_AUTOSAVE_DELAY_MS = 800

const infiniteBoardOptions: Partial<TldrawOptions> = {}
const A4_PAGE_BOX = new Box(
  BOARD_A4_BOUNDS.x,
  BOARD_A4_BOUNDS.y,
  BOARD_A4_BOUNDS.w,
  BOARD_A4_BOUNDS.h
)

const a4BoardOptions: Partial<TldrawOptions> = {
  maxPages: BOARD_A4_MAX_PAGES,
  camera: {
    zoomSteps: [1, 1.25, 1.5, 2, 3, 4, 6, 8],
    constraints: {
      bounds: { ...BOARD_A4_BOUNDS },
      padding: { x: 0, y: 0 },
      origin: { x: 0.5, y: 0.5 },
      initialZoom: 'fit-max',
      baseZoom: 'fit-max',
      behavior: { x: 'contain', y: 'contain' }
    }
  }
}

interface BoardLoadState {
  boardId: string
  store: TLStore | null
  canvasMode: BoardCanvasMode
  error: string | null
}

interface BoardCanvasProps {
  boardId: string
  title?: string
  focusMode?: boolean
  onFocusModeChange?: (active: boolean) => void
  onSaveStateChange?: (state: BoardSaveState) => void
}

interface BoardCanvasUiContextValue {
  isFullscreen: boolean
  fullscreenLabel: string
  toggleFullscreen: () => void
  canExportPdf: boolean
  isExportingPdf: boolean
  exportPdf: () => void
  canConvertToA4: boolean
  isConvertingToA4: boolean
  convertToA4: () => void
}

interface BoardPdfPage {
  id: string
  name: string
  svg: string
}

const BoardCanvasUiContext = createContext<BoardCanvasUiContextValue | null>(null)

const boardCanvasComponents: TLComponents = {
  QuickActions: BoardCanvasQuickActions
}

const a4BoardCanvasComponents: TLComponents = {
  QuickActions: BoardCanvasQuickActions,
  Background: A4PageBackground
}

function BoardCanvasQuickActions(props: TLUiQuickActionsProps): React.JSX.Element {
  const controls = useContext(BoardCanvasUiContext)

  return (
    <DefaultQuickActions {...props}>
      <DefaultQuickActionsContent />
      {controls?.canConvertToA4 && (
        <Tooltip
          content="Перевести эту доску в A4-документ"
          side="bottom"
          contentClassName="z-[1000]"
        >
          <TldrawUiButton
            type="icon"
            aria-label="Перевести доску в A4"
            disabled={controls.isConvertingToA4}
            onClick={controls.convertToA4}
          >
            {controls.isConvertingToA4 ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <FileText aria-hidden="true" className="size-4" />
            )}
          </TldrawUiButton>
        </Tooltip>
      )}
      {controls?.canExportPdf && (
        <Tooltip
          content="Экспортировать все листы A4 в PDF"
          side="bottom"
          contentClassName="z-[1000]"
        >
          <TldrawUiButton
            type="icon"
            aria-label="Экспортировать доску в PDF"
            disabled={controls.isExportingPdf}
            onClick={controls.exportPdf}
          >
            {controls.isExportingPdf ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <FileDown aria-hidden="true" className="size-4" />
            )}
          </TldrawUiButton>
        </Tooltip>
      )}
      {controls && (
        <Tooltip content={controls.fullscreenLabel} side="bottom" contentClassName="z-[1000]">
          <TldrawUiButton
            type="icon"
            aria-label={controls.fullscreenLabel}
            aria-pressed={controls.isFullscreen}
            data-board-fullscreen-control="true"
            onClick={controls.toggleFullscreen}
          >
            {controls.isFullscreen ? (
              <Minimize2 aria-hidden="true" className="size-4" />
            ) : (
              <Maximize2 aria-hidden="true" className="size-4" />
            )}
          </TldrawUiButton>
        </Tooltip>
      )}
    </DefaultQuickActions>
  )
}

function A4PageBackground(): React.JSX.Element {
  return <div className="pointer-events-none absolute inset-0 bg-white" aria-hidden="true" />
}

export function BoardCanvas({
  boardId,
  title = 'Доска',
  focusMode = false,
  onFocusModeChange,
  onSaveStateChange
}: BoardCanvasProps): React.JSX.Element {
  const { resolvedTheme } = useAppearance()
  const [loadState, setLoadState] = useState<BoardLoadState | null>(null)
  const [fullscreenBoardId, setFullscreenBoardId] = useState<string | null>(null)
  const [pdfPages, setPdfPages] = useState<BoardPdfPage[] | null>(null)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [isConvertingToA4, setIsConvertingToA4] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const saveTimerRef = useRef<number | null>(null)
  const saveQueueRef = useRef<BoardSaveQueue | null>(null)
  const editorRef = useRef<Editor | null>(null)
  const isLocalFullscreen = fullscreenBoardId === boardId
  const isFullscreen = focusMode || isLocalFullscreen

  useEffect(() => {
    let active = true
    let loadedStore: TLStore | null = null

    void boardsClient
      .getDocument(boardId)
      .then((document) => {
        if (!active) {
          return
        }

        const boardState = readBoardSnapshot(document.snapshot)
        const nextStore = createTLStore({
          snapshot: (boardState.tldrawSnapshot ?? undefined) as TLEditorSnapshot | undefined,
          assetUtils: defaultAssetUtils,
          bindingUtils: defaultBindingUtils,
          shapeUtils: defaultShapeUtils
        })
        loadedStore = nextStore

        setLoadState({
          boardId,
          store: nextStore,
          canvasMode: boardState.canvasMode,
          error: null
        })
      })
      .catch((reason: unknown) => {
        if (!active) {
          return
        }

        setLoadState({
          boardId,
          store: null,
          canvasMode: 'infinite',
          error: reason instanceof Error ? reason.message : 'Не удалось загрузить доску'
        })
      })

    return () => {
      active = false
      editorRef.current = null
      loadedStore?.dispose()
    }
  }, [boardId])

  const store = loadState?.boardId === boardId ? loadState.store : null
  const canvasMode = loadState?.boardId === boardId ? loadState.canvasMode : 'infinite'
  const loadError = loadState?.boardId === boardId ? loadState.error : null

  useEffect(() => {
    if (!store) return

    const clearSaveTimer = (): void => {
      if (saveTimerRef.current === null) return
      window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }

    const queue = new BoardSaveQueue(
      async (snapshot) => {
        await boardsClient.saveDocument(boardId, snapshot)
      },
      (state) => {
        onSaveStateChange?.(state)
      }
    )
    saveQueueRef.current = queue

    const captureSnapshot = (): BoardSnapshot => {
      const tldrawSnapshot = JSON.parse(JSON.stringify(getSnapshot(store))) as BoardSnapshot
      return canvasMode === 'a4'
        ? createBoardSnapshotEnvelope('a4', tldrawSnapshot)
        : tldrawSnapshot
    }

    const saveLatest = (): void => {
      queue.update(captureSnapshot())
      clearSaveTimer()
      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = null
        void queue.saveLatest().catch((reason: unknown) => {
          console.error('Failed to autosave board', reason)
        })
      }, BOARD_AUTOSAVE_DELAY_MS)
    }

    let observedHistory = store.history.get()
    const stopListening = react(`autosave board ${boardId}`, () => {
      const nextHistory = store.history.get()
      if (nextHistory === observedHistory) return
      observedHistory = nextHistory
      saveLatest()
    })

    const unregisterDraft = registerBoardDraftHandle({
      boardId,
      hasUnsavedChanges: () => queue.hasUnsavedChanges(),
      flush: async () => {
        clearSaveTimer()
        if (queue.hasUnsavedChanges()) {
          await queue.flush()
        }
      }
    })

    onSaveStateChange?.('saved')

    return () => {
      clearSaveTimer()
      stopListening()
      unregisterDraft()
      if (saveQueueRef.current === queue) {
        saveQueueRef.current = null
      }
      queue.dispose()
    }
  }, [boardId, canvasMode, onSaveStateChange, store])

  useEffect(() => {
    if (!isFullscreen) return undefined

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Escape' || event.defaultPrevented) return

      if (focusMode) {
        onFocusModeChange?.(false)
      } else {
        setFullscreenBoardId(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [focusMode, isFullscreen, onFocusModeChange])

  const toggleFullscreen = useCallback(() => {
    if (focusMode) {
      onFocusModeChange?.(false)
      return
    }

    setFullscreenBoardId((current) => (current === boardId ? null : boardId))
  }, [boardId, focusMode, onFocusModeChange])

  const handleEditorMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor

      const disposeA4Constraints =
        canvasMode === 'a4' ? installA4EditorConstraints(editor) : undefined

      if (canvasMode === 'a4') {
        renameDefaultA4Pages(editor)
        editor.zoomToBounds(A4_PAGE_BOX, { inset: 0, immediate: true })
      }

      return () => {
        disposeA4Constraints?.()
        if (editorRef.current === editor) {
          editorRef.current = null
        }
      }
    },
    [canvasMode]
  )

  const convertToA4 = useCallback(() => {
    const editor = editorRef.current

    if (!store || !editor || canvasMode === 'a4' || isConvertingToA4) {
      return
    }

    setIsConvertingToA4(true)
    setExportError(null)

    void (async () => {
      try {
        if (saveTimerRef.current !== null) {
          window.clearTimeout(saveTimerRef.current)
          saveTimerRef.current = null
        }

        await saveQueueRef.current?.flush()
        prepareEditorForA4(editor)

        if (saveTimerRef.current !== null) {
          window.clearTimeout(saveTimerRef.current)
          saveTimerRef.current = null
        }

        const tldrawSnapshot = JSON.parse(JSON.stringify(getSnapshot(store))) as BoardSnapshot
        await boardsClient.saveDocument(boardId, createBoardSnapshotEnvelope('a4', tldrawSnapshot))

        setLoadState((current) =>
          current?.boardId === boardId ? { ...current, canvasMode: 'a4' } : current
        )
        onSaveStateChange?.('saved')
      } catch (reason: unknown) {
        setExportError(reason instanceof Error ? reason.message : 'Не удалось перевести доску в A4')
      } finally {
        setIsConvertingToA4(false)
      }
    })()
  }, [boardId, canvasMode, isConvertingToA4, onSaveStateChange, store])

  const exportPdf = useCallback(() => {
    const editor = editorRef.current

    if (!editor || canvasMode !== 'a4' || isExportingPdf) {
      return
    }

    setIsExportingPdf(true)
    setExportError(null)

    void (async () => {
      const originalPageId = editor.getCurrentPageId()

      try {
        const renderedPages: BoardPdfPage[] = []

        for (const page of editor.getPages()) {
          editor.setCurrentPage(page.id)
          await nextAnimationFrame()

          const result = await editor.getSvgString([...editor.getCurrentPageShapeIds()], {
            bounds: new Box(
              BOARD_A4_BOUNDS.x,
              BOARD_A4_BOUNDS.y,
              BOARD_A4_BOUNDS.w,
              BOARD_A4_BOUNDS.h
            ),
            padding: 0,
            background: false,
            darkMode: false,
            scale: 1
          })

          renderedPages.push({
            id: page.id,
            name: page.name,
            svg: result?.svg ?? createBlankA4Svg()
          })
        }

        if (editor.getPage(originalPageId)) {
          editor.setCurrentPage(originalPageId)
        }

        setPdfPages(renderedPages)
        await waitForBoardPdfReady()
        await boardsClient.exportPdf({ nodeId: boardId, title })
      } catch (reason: unknown) {
        setExportError(reason instanceof Error ? reason.message : 'Не удалось экспортировать PDF')
      } finally {
        if (editor.getPage(originalPageId)) {
          editor.setCurrentPage(originalPageId)
        }
        setPdfPages(null)
        setIsExportingPdf(false)
      }
    })()
  }, [boardId, canvasMode, isExportingPdf, title])

  if (loadError) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-[var(--app-workspace)] p-8">
        <div className="max-w-md rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-5 text-center">
          <TriangleAlert aria-hidden="true" className="mx-auto size-6 text-red-300" />
          <p className="mt-3 text-sm font-medium text-[var(--app-text)]">
            Не удалось открыть доску
          </p>
          <p className="mt-1 text-xs leading-5 text-red-200/75">{loadError}</p>
        </div>
      </div>
    )
  }

  if (!store) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-[var(--app-workspace)] text-sm text-[var(--app-muted)]">
        <LoaderCircle aria-hidden="true" className="mr-2 size-4 animate-spin" />
        Загрузка доски…
      </div>
    )
  }

  const fullscreenLabel = focusMode
    ? 'Выйти из режима фокуса'
    : isFullscreen
      ? 'Вернуть обычный вид доски'
      : 'Развернуть доску на весь экран'

  const boardCanvasUi: BoardCanvasUiContextValue = {
    isFullscreen,
    fullscreenLabel,
    toggleFullscreen,
    canExportPdf: canvasMode === 'a4',
    isExportingPdf,
    exportPdf,
    canConvertToA4: canvasMode !== 'a4',
    isConvertingToA4,
    convertToA4
  }

  return (
    <TooltipProvider>
      <BoardCanvasUiContext.Provider value={boardCanvasUi}>
        <div
          role="region"
          aria-label="Холст доски"
          data-board-canvas-mode={canvasMode}
          data-board-fullscreen={isFullscreen}
          data-board-focus-mode={focusMode}
          className={cn(
            'mymind-board-canvas relative h-full min-h-0 w-full overflow-hidden bg-[var(--app-workspace)]',
            canvasMode !== 'a4' && 'tldraw__editor',
            isLocalFullscreen && 'app-fullscreen-bounds fixed z-40 h-auto w-screen'
          )}
        >
          {canvasMode === 'a4' ? (
            <div
              data-board-a4-stage
              className="flex h-full min-h-0 w-full items-center justify-center overflow-hidden bg-slate-300 p-5"
              style={{ containerType: 'size' }}
            >
              <div
                data-board-a4-page-surface
                className="tldraw__editor relative overflow-hidden bg-white shadow-[0_18px_60px_rgba(15,23,42,0.28)] ring-1 ring-slate-400"
                style={{
                  width: 'min(calc(100cqw - 40px), calc(70.707cqh - 28.283px))',
                  aspectRatio: '210 / 297'
                }}
              >
                <Tldraw
                  key={`${boardId}:a4`}
                  store={store}
                  assetUrls={assetUrls}
                  colorScheme="light"
                  components={a4BoardCanvasComponents}
                  options={a4BoardOptions}
                  onMount={handleEditorMount}
                />
              </div>
            </div>
          ) : (
            <>
              <Tldraw
                key={`${boardId}:infinite`}
                store={store}
                assetUrls={assetUrls}
                colorScheme={resolvedTheme}
                components={boardCanvasComponents}
                options={infiniteBoardOptions}
                onMount={handleEditorMount}
              />
              <div className="absolute top-3 left-1/2 z-[1000] -translate-x-1/2">
                <button
                  type="button"
                  aria-label="Перевести эту доску в A4"
                  disabled={isConvertingToA4}
                  className="flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-raised)]/95 px-3 py-1.5 text-xs font-semibold text-[var(--app-text)] shadow-lg backdrop-blur transition-colors hover:bg-[var(--app-control-hover)] disabled:cursor-wait disabled:opacity-60"
                  onClick={convertToA4}
                >
                  {isConvertingToA4 ? (
                    <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                  ) : (
                    <FileText aria-hidden="true" className="size-3.5" />
                  )}
                  Сделать A4
                </button>
              </div>
            </>
          )}
          {exportError && (
            <div
              role="alert"
              className="absolute right-4 bottom-4 z-[1000] max-w-sm rounded-xl border border-red-500/25 bg-[var(--app-surface-raised)] px-4 py-3 text-sm text-red-200 shadow-2xl"
            >
              {exportError}
            </div>
          )}
        </div>
        {pdfPages && <BoardPdfExportRoot pages={pdfPages} />}
      </BoardCanvasUiContext.Provider>
    </TooltipProvider>
  )
}

function installA4EditorConstraints(editor: Editor): () => void {
  const unregisterCreate = editor.sideEffects.registerBeforeCreateHandler('shape', (shape) =>
    constrainShapeToA4(editor, shape)
  )
  const unregisterChange = editor.sideEffects.registerBeforeChangeHandler(
    'shape',
    (previousShape, nextShape) => constrainShapeToA4(editor, nextShape, previousShape)
  )
  const unregisterShapeCreate = editor.sideEffects.registerAfterCreateHandler('shape', (shape) =>
    fitStoredShapeInsideA4(editor, shape)
  )
  const unregisterPageCreate = editor.sideEffects.registerAfterCreateHandler('page', (page) => {
    if (/^Page \\d+$/.test(page.name)) {
      const pageIndex = editor.getPages().findIndex((candidate) => candidate.id === page.id)
      editor.renamePage(page, `Лист ${pageIndex + 1}`)
    }
    editor.zoomToBounds(A4_PAGE_BOX, { inset: 0, immediate: true })
  })

  return () => {
    unregisterCreate()
    unregisterChange()
    unregisterShapeCreate()
    unregisterPageCreate()
  }
}

function fitStoredShapeInsideA4(editor: Editor, shape: TLShape): void {
  if (shape.parentId !== editor.getCurrentPageId()) {
    return
  }

  const bounds = editor.getShapePageBounds(shape)
  if (!bounds) {
    return
  }

  const pageRight = BOARD_A4_BOUNDS.x + BOARD_A4_BOUNDS.w
  const pageBottom = BOARD_A4_BOUNDS.y + BOARD_A4_BOUNDS.h
  const fitsWithoutResize =
    bounds.x >= BOARD_A4_BOUNDS.x &&
    bounds.y >= BOARD_A4_BOUNDS.y &&
    bounds.maxX <= pageRight &&
    bounds.maxY <= pageBottom

  if (fitsWithoutResize) {
    return
  }

  const scale = Math.min(1, BOARD_A4_BOUNDS.w / bounds.w, BOARD_A4_BOUNDS.h / bounds.h)
  const width = Math.max(1, bounds.w * scale)
  const height = Math.max(1, bounds.h * scale)
  const x = Math.min(Math.max(bounds.x, BOARD_A4_BOUNDS.x), pageRight - width)
  const y = Math.min(Math.max(bounds.y, BOARD_A4_BOUNDS.y), pageBottom - height)

  editor.resizeToBounds([shape.id], { x, y, w: width, h: height })
}

function renameDefaultA4Pages(editor: Editor): void {
  editor.getPages().forEach((page, index) => {
    if (/^Page \\d+$/.test(page.name)) {
      editor.renamePage(page, `Лист ${index + 1}`)
    }
  })
}

function constrainShapeToA4<T extends TLShape>(editor: Editor, shape: T, fallback?: T): T {
  if (shape.parentId !== editor.getCurrentPageId()) {
    return shape
  }

  const localBounds = editor.getShapeUtil(shape).getGeometry(shape).bounds
  const cos = Math.cos(shape.rotation)
  const sin = Math.sin(shape.rotation)
  const corners = [
    [localBounds.x, localBounds.y],
    [localBounds.maxX, localBounds.y],
    [localBounds.maxX, localBounds.maxY],
    [localBounds.x, localBounds.maxY]
  ].map(([x, y]) => ({
    x: shape.x + x * cos - y * sin,
    y: shape.y + x * sin + y * cos
  }))

  const minX = Math.min(...corners.map((point) => point.x))
  const maxX = Math.max(...corners.map((point) => point.x))
  const minY = Math.min(...corners.map((point) => point.y))
  const maxY = Math.max(...corners.map((point) => point.y))
  const width = maxX - minX
  const height = maxY - minY

  if (width > BOARD_A4_BOUNDS.w || height > BOARD_A4_BOUNDS.h) {
    return fallback ?? shape
  }

  let deltaX = 0
  let deltaY = 0

  if (minX < BOARD_A4_BOUNDS.x) {
    deltaX = BOARD_A4_BOUNDS.x - minX
  } else if (maxX > BOARD_A4_BOUNDS.x + BOARD_A4_BOUNDS.w) {
    deltaX = BOARD_A4_BOUNDS.x + BOARD_A4_BOUNDS.w - maxX
  }

  if (minY < BOARD_A4_BOUNDS.y) {
    deltaY = BOARD_A4_BOUNDS.y - minY
  } else if (maxY > BOARD_A4_BOUNDS.y + BOARD_A4_BOUNDS.h) {
    deltaY = BOARD_A4_BOUNDS.y + BOARD_A4_BOUNDS.h - maxY
  }

  if (deltaX === 0 && deltaY === 0) {
    return shape
  }

  return {
    ...shape,
    x: shape.x + deltaX,
    y: shape.y + deltaY
  }
}

function prepareEditorForA4(editor: Editor): void {
  const originalPageId = editor.getCurrentPageId()
  const pages = editor.getPages()
  const margin = 84
  const availableWidth = BOARD_A4_BOUNDS.w - margin * 2
  const availableHeight = BOARD_A4_BOUNDS.h - margin * 2

  pages.forEach((page, index) => {
    editor.setCurrentPage(page.id)

    if (/^Page \\d+$/.test(page.name)) {
      editor.renamePage(page, `Лист ${index + 1}`)
    }

    const topLevelShapeIds = [...editor.getCurrentPageShapeIds()].filter(
      (shapeId) => editor.getShape(shapeId)?.parentId === page.id
    )
    const contentBounds = editor.getCurrentPageBounds()

    if (!contentBounds || topLevelShapeIds.length === 0) {
      return
    }

    const width = Math.max(contentBounds.w, 1)
    const height = Math.max(contentBounds.h, 1)
    const scale = Math.min(1, availableWidth / width, availableHeight / height)
    const targetWidth = width * scale
    const targetHeight = height * scale

    editor.resizeToBounds(topLevelShapeIds, {
      x: BOARD_A4_BOUNDS.x + margin + (availableWidth - targetWidth) / 2,
      y: BOARD_A4_BOUNDS.y + margin + (availableHeight - targetHeight) / 2,
      w: targetWidth,
      h: targetHeight
    })
  })

  if (editor.getPage(originalPageId)) {
    editor.setCurrentPage(originalPageId)
  }
}

function BoardPdfExportRoot({ pages }: { pages: BoardPdfPage[] }): React.JSX.Element {
  return createPortal(
    <div data-board-pdf-export-root aria-hidden="true">
      {pages.map((page) => (
        <section
          key={page.id}
          data-board-pdf-export-page
          data-board-pdf-page-name={page.name}
          dangerouslySetInnerHTML={{ __html: page.svg }}
        />
      ))}
    </div>,
    window.document.body
  )
}

function createBlankA4Svg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${BOARD_A4_BOUNDS.w}" height="${BOARD_A4_BOUNDS.h}" viewBox="0 0 ${BOARD_A4_BOUNDS.w} ${BOARD_A4_BOUNDS.h}"></svg>`
}

async function waitForBoardPdfReady(timeoutMs = 5_000): Promise<void> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    if (window.document.querySelector('[data-board-pdf-export-root]')) {
      if (window.document.fonts?.ready) {
        await window.document.fonts.ready
      }
      await nextAnimationFrame()
      await nextAnimationFrame()
      return
    }

    await delay(16)
  }

  throw new Error('Не удалось подготовить листы доски к экспорту')
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => window.requestAnimationFrame(() => resolve()))
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}
