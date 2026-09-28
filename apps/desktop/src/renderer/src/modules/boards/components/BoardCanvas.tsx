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
  useEditor,
  useValue,
  type Editor,
  type TLComponents,
  type TLEditorSnapshot,
  type TLShape,
  type TLStore,
  type TLUiQuickActionsProps,
  type TldrawOptions
} from 'tldraw'
import 'tldraw/tldraw.css'
import {
  FileDown,
  FilePlus2,
  FileText,
  LoaderCircle,
  Maximize2,
  Minimize2,
  TriangleAlert
} from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent
} from 'react'
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
const A4_PAGE_GAP = 96
const A4_PAGE_META_KEY = 'mymindA4PageCount'

const a4BoardOptions: Partial<TldrawOptions> = {
  // A4 sheets live on one continuous tldraw page. Native tldraw pages are migrated
  // into this vertical strip and disabled afterwards.
  maxPages: 1
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
  canAddA4Page: boolean
  a4PageCount: number
  addA4Page: () => void
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
      {controls?.canAddA4Page && (
        <Tooltip
          content={`Добавить лист A4 · сейчас ${controls.a4PageCount}`}
          side="bottom"
          contentClassName="z-[1000]"
        >
          <TldrawUiButton type="icon" aria-label="Добавить лист A4" onClick={controls.addA4Page}>
            <FilePlus2 aria-hidden="true" className="size-4" />
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
  const editor = useEditor()
  const visiblePages = useValue(
    'continuous A4 pages',
    () => {
      const pageCount = getA4PageCount(editor)
      const viewport = editor.getViewportPageBounds()
      const stride = BOARD_A4_BOUNDS.h + A4_PAGE_GAP
      const firstVisible = Math.max(0, Math.floor(viewport.y / stride) - 1)
      const lastVisible = Math.min(pageCount - 1, Math.ceil(viewport.maxY / stride) + 1)
      const zoom = editor.getZoomLevel()
      const pages: Array<{
        index: number
        left: number
        top: number
        width: number
        height: number
      }> = []

      for (let index = firstVisible; index <= lastVisible; index += 1) {
        const bounds = getA4PageBox(index)
        const topLeft = editor.pageToViewport({ x: bounds.x, y: bounds.y })
        pages.push({
          index,
          left: topLeft.x,
          top: topLeft.y,
          width: bounds.w * zoom,
          height: bounds.h * zoom
        })
      }

      return pages
    },
    [editor]
  )

  return (
    <div
      className="pointer-events-none absolute inset-0 bg-[var(--app-workspace)]"
      aria-hidden="true"
    >
      {visiblePages.map((page) => (
        <div
          key={page.index}
          data-board-a4-page-boundary
          data-board-a4-page-index={page.index}
          className="absolute bg-white shadow-[0_22px_60px_rgba(0,0,0,0.28)]"
          style={{
            left: page.left,
            top: page.top,
            width: page.width,
            height: page.height,
            border: '1px solid rgba(148, 163, 184, 0.55)'
          }}
        >
          <span className="absolute top-3 left-4 rounded-md bg-slate-100/90 px-2 py-1 text-[11px] font-medium text-slate-500 shadow-sm">
            Лист {page.index + 1}
          </span>
        </div>
      ))}
    </div>
  )
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
  const [a4PageCount, setA4PageCount] = useState(1)
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

  const handleA4PointerDownCapture = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const editor = editorRef.current
      if (canvasMode !== 'a4' || !editor || editor.getCurrentToolId() !== 'draw') {
        return
      }

      const pagePoint = editor.screenToPage({ x: event.clientX, y: event.clientY })
      if (getA4PageIndexAtPoint(pagePoint, getA4PageCount(editor)) !== null) {
        return
      }

      stopA4PointerEvent(event)
    },
    [canvasMode]
  )

  const handleA4PointerMoveCapture = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const editor = editorRef.current
      if (
        canvasMode !== 'a4' ||
        !editor ||
        editor.getCurrentToolId() !== 'draw' ||
        (event.buttons & 1) !== 1
      ) {
        return
      }

      const pageCount = getA4PageCount(editor)
      const originPoint = editor.inputs.getOriginPagePoint()
      const pageIndex = getA4PageIndexAtPoint(originPoint, pageCount)
      if (pageIndex === null) {
        return
      }

      const pointerPoint = editor.screenToPage({ x: event.clientX, y: event.clientY })
      const clampedPoint = clampPointToA4Page(pointerPoint, pageIndex)
      if (clampedPoint.x === pointerPoint.x && clampedPoint.y === pointerPoint.y) {
        return
      }

      stopA4PointerEvent(event)

      editor.updatePointer({
        point: editor.pageToScreen(clampedPoint),
        pointerId: event.pointerId,
        isPen: event.pointerType === 'pen',
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        immediate: true
      })
    },
    [canvasMode]
  )

  const handleEditorMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor

      let disposeA4Constraints: (() => void) | undefined

      if (canvasMode === 'a4') {
        const migration = migrateLegacyA4Pages(editor)
        setA4PageCount(migration.pageCount)
        disposeA4Constraints = installA4EditorConstraints(editor)
        editor.zoomToBounds(getA4PageBox(migration.focusPageIndex), {
          inset: 28,
          immediate: true
        })

        if (migration.didMigrate && store) {
          const tldrawSnapshot = JSON.parse(JSON.stringify(getSnapshot(store))) as BoardSnapshot
          void boardsClient
            .saveDocument(boardId, createBoardSnapshotEnvelope('a4', tldrawSnapshot))
            .catch((reason: unknown) => {
              console.error('Failed to persist continuous A4 migration', reason)
            })
        }
      }

      return () => {
        disposeA4Constraints?.()
        if (editorRef.current === editor) {
          editorRef.current = null
        }
      }
    },
    [boardId, canvasMode, store]
  )

  const addA4Page = useCallback(() => {
    const editor = editorRef.current
    if (!editor || canvasMode !== 'a4') {
      return
    }

    const currentCount = getA4PageCount(editor)
    if (currentCount >= BOARD_A4_MAX_PAGES) {
      return
    }

    const nextCount = currentCount + 1
    setA4PageCountValue(editor, nextCount)
    setA4PageCount(nextCount)
    editor.zoomToBounds(getA4PageBox(nextCount - 1), {
      inset: 28,
      animation: { duration: 220 }
    })
  }, [canvasMode])

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
        const conversion = prepareEditorForA4(editor)
        setA4PageCount(conversion.pageCount)

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
      try {
        const renderedPages: BoardPdfPage[] = []
        const shapeIds = [...editor.getCurrentPageShapeIds()]
        const pageCount = getA4PageCount(editor)

        for (let index = 0; index < pageCount; index += 1) {
          const result = await editor.getSvgString(shapeIds, {
            bounds: getA4PageBox(index),
            padding: 0,
            background: false,
            darkMode: false,
            scale: 1
          })

          renderedPages.push({
            id: `a4-page-${index + 1}`,
            name: `Лист ${index + 1}`,
            svg: result?.svg ?? createBlankA4Svg()
          })
        }

        setPdfPages(renderedPages)
        await waitForBoardPdfReady()
        await boardsClient.exportPdf({ nodeId: boardId, title })
      } catch (reason: unknown) {
        setExportError(reason instanceof Error ? reason.message : 'Не удалось экспортировать PDF')
      } finally {
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
    canAddA4Page: canvasMode === 'a4' && a4PageCount < BOARD_A4_MAX_PAGES,
    a4PageCount,
    addA4Page,
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
          onPointerDownCapture={handleA4PointerDownCapture}
          onPointerMoveCapture={handleA4PointerMoveCapture}
          className={cn(
            'mymind-board-canvas tldraw__editor relative h-full min-h-0 w-full overflow-hidden bg-[var(--app-workspace)]',
            isLocalFullscreen && 'app-fullscreen-bounds fixed z-40 h-auto w-screen'
          )}
        >
          <Tldraw
            key={`${boardId}:${canvasMode}`}
            store={store}
            assetUrls={assetUrls}
            colorScheme={canvasMode === 'a4' ? 'light' : resolvedTheme}
            components={canvasMode === 'a4' ? a4BoardCanvasComponents : boardCanvasComponents}
            options={canvasMode === 'a4' ? a4BoardOptions : infiniteBoardOptions}
            onMount={handleEditorMount}
          />
          {canvasMode !== 'a4' && (
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

function getA4PageBox(index: number): Box {
  return new Box(
    BOARD_A4_BOUNDS.x,
    BOARD_A4_BOUNDS.y + index * (BOARD_A4_BOUNDS.h + A4_PAGE_GAP),
    BOARD_A4_BOUNDS.w,
    BOARD_A4_BOUNDS.h
  )
}

function getA4PageCount(editor: Editor): number {
  const raw = editor.getCurrentPage().meta?.[A4_PAGE_META_KEY]
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return 1
  }

  return Math.min(BOARD_A4_MAX_PAGES, Math.max(1, Math.floor(raw)))
}

function setA4PageCountValue(editor: Editor, pageCount: number): void {
  const page = editor.getCurrentPage()
  editor.updatePage({
    id: page.id,
    meta: {
      ...page.meta,
      [A4_PAGE_META_KEY]: Math.min(BOARD_A4_MAX_PAGES, Math.max(1, Math.floor(pageCount)))
    }
  })
}

function getA4PageIndexAtPoint(point: { x: number; y: number }, pageCount: number): number | null {
  const stride = BOARD_A4_BOUNDS.h + A4_PAGE_GAP
  const pageIndex = Math.floor((point.y - BOARD_A4_BOUNDS.y) / stride)
  if (pageIndex < 0 || pageIndex >= pageCount) {
    return null
  }

  const page = getA4PageBox(pageIndex)
  const isInside =
    point.x >= page.x && point.x <= page.maxX && point.y >= page.y && point.y <= page.maxY

  return isInside ? pageIndex : null
}

function clampPointToA4Page(
  point: { x: number; y: number },
  pageIndex: number
): { x: number; y: number } {
  const page = getA4PageBox(pageIndex)
  return {
    x: Math.min(page.maxX, Math.max(page.x, point.x)),
    y: Math.min(page.maxY, Math.max(page.y, point.y))
  }
}

function stopA4PointerEvent(event: ReactPointerEvent<HTMLDivElement>): void {
  event.preventDefault()
  event.stopPropagation()
  event.nativeEvent.stopImmediatePropagation()
}

function getNearestA4PageIndex(centerY: number, pageCount: number): number {
  const stride = BOARD_A4_BOUNDS.h + A4_PAGE_GAP
  const rawIndex = Math.round((centerY - BOARD_A4_BOUNDS.h / 2) / stride)
  return Math.min(pageCount - 1, Math.max(0, rawIndex))
}

function migrateLegacyA4Pages(editor: Editor): {
  pageCount: number
  focusPageIndex: number
  didMigrate: boolean
} {
  const pages = editor.getPages()
  if (pages.length <= 1) {
    const pageCount = getA4PageCount(editor)
    setA4PageCountValue(editor, pageCount)
    return { pageCount, focusPageIndex: 0, didMigrate: false }
  }

  const originalPageId = editor.getCurrentPageId()
  const focusPageIndex = Math.max(
    0,
    pages.findIndex((page) => page.id === originalPageId)
  )
  const targetPage = pages[0]

  editor.run(
    () => {
      pages.forEach((page, index) => {
        if (index === 0) {
          return
        }

        const topLevelShapeIds = [...editor.getPageShapeIds(page.id)].filter(
          (shapeId) => editor.getShape(shapeId)?.parentId === page.id
        )

        if (topLevelShapeIds.length > 0) {
          editor.moveShapesToPage(topLevelShapeIds, targetPage.id)
          const offsetY = getA4PageBox(index).y
          editor.updateShapes(
            topLevelShapeIds.flatMap((shapeId) => {
              const shape = editor.getShape(shapeId)
              return shape
                ? [
                    {
                      id: shape.id,
                      type: shape.type,
                      x: shape.x,
                      y: shape.y + offsetY
                    }
                  ]
                : []
            })
          )
        }
      })

      editor.setCurrentPage(targetPage.id)
      pages.slice(1).forEach((page) => editor.deletePage(page.id))
      editor.renamePage(targetPage, 'A4')
      setA4PageCountValue(editor, pages.length)
    },
    { history: 'ignore' }
  )

  return { pageCount: pages.length, focusPageIndex, didMigrate: true }
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

  return () => {
    unregisterCreate()
    unregisterChange()
    unregisterShapeCreate()
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

  const pageCount = getA4PageCount(editor)
  const targetPage = getA4PageBox(getNearestA4PageIndex(bounds.y + bounds.h / 2, pageCount))
  const pageRight = targetPage.x + targetPage.w
  const pageBottom = targetPage.y + targetPage.h
  const fitsWithoutResize =
    bounds.x >= targetPage.x &&
    bounds.y >= targetPage.y &&
    bounds.maxX <= pageRight &&
    bounds.maxY <= pageBottom

  if (fitsWithoutResize) {
    return
  }

  const scale = Math.min(1, targetPage.w / bounds.w, targetPage.h / bounds.h)
  const width = Math.max(1, bounds.w * scale)
  const height = Math.max(1, bounds.h * scale)
  const x = Math.min(Math.max(bounds.x, targetPage.x), pageRight - width)
  const y = Math.min(Math.max(bounds.y, targetPage.y), pageBottom - height)

  editor.resizeToBounds([shape.id], { x, y, w: width, h: height })
}

function getShapeProjectedBounds(
  editor: Editor,
  shape: TLShape
): {
  minX: number
  maxX: number
  minY: number
  maxY: number
  width: number
  height: number
} {
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

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  }
}

function constrainShapeToA4<T extends TLShape>(editor: Editor, shape: T, fallback?: T): T {
  if (shape.parentId !== editor.getCurrentPageId()) {
    return shape
  }

  const bounds = getShapeProjectedBounds(editor, shape)
  const { minX, maxX, minY, maxY, width, height } = bounds

  if (width > BOARD_A4_BOUNDS.w || height > BOARD_A4_BOUNDS.h) {
    return fallback ?? shape
  }

  const pageCount = getA4PageCount(editor)
  const fallbackBounds =
    fallback && (shape.type === 'draw' || shape.type === 'highlight')
      ? getShapeProjectedBounds(editor, fallback)
      : null
  const targetCenterY = fallbackBounds
    ? (fallbackBounds.minY + fallbackBounds.maxY) / 2
    : (minY + maxY) / 2
  const targetPage = getA4PageBox(getNearestA4PageIndex(targetCenterY, pageCount))
  const escapesTargetPage =
    minX < targetPage.x || maxX > targetPage.maxX || minY < targetPage.y || maxY > targetPage.maxY

  if (fallbackBounds && escapesTargetPage) {
    return fallback
  }

  let deltaX = 0
  let deltaY = 0

  if (minX < targetPage.x) {
    deltaX = targetPage.x - minX
  } else if (maxX > targetPage.x + targetPage.w) {
    deltaX = targetPage.x + targetPage.w - maxX
  }

  if (minY < targetPage.y) {
    deltaY = targetPage.y - minY
  } else if (maxY > targetPage.y + targetPage.h) {
    deltaY = targetPage.y + targetPage.h - maxY
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

function prepareEditorForA4(editor: Editor): { pageCount: number } {
  const pages = editor.getPages()
  const targetPage = pages[0]
  const pageCount = Math.max(1, pages.length)
  const margin = 84
  const availableWidth = BOARD_A4_BOUNDS.w - margin * 2
  const availableHeight = BOARD_A4_BOUNDS.h - margin * 2

  editor.run(() => {
    pages.forEach((page, index) => {
      editor.setCurrentPage(page.id)
      const topLevelShapeIds = [...editor.getCurrentPageShapeIds()].filter(
        (shapeId) => editor.getShape(shapeId)?.parentId === page.id
      )
      const contentBounds = editor.getCurrentPageBounds()

      if (contentBounds && topLevelShapeIds.length > 0) {
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
      }

      if (index > 0 && topLevelShapeIds.length > 0) {
        editor.moveShapesToPage(topLevelShapeIds, targetPage.id)
        const offsetY = getA4PageBox(index).y
        editor.updateShapes(
          topLevelShapeIds.flatMap((shapeId) => {
            const shape = editor.getShape(shapeId)
            return shape
              ? [
                  {
                    id: shape.id,
                    type: shape.type,
                    x: shape.x,
                    y: shape.y + offsetY
                  }
                ]
              : []
          })
        )
      }
    })

    editor.setCurrentPage(targetPage.id)
    pages.slice(1).forEach((page) => editor.deletePage(page.id))
    editor.renamePage(targetPage, 'A4')
    setA4PageCountValue(editor, pageCount)
  })

  return { pageCount }
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
