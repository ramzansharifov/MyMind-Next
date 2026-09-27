import { getAssetUrlsByImport } from '@tldraw/assets/imports.vite'
import {
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
  type TLStore,
  type TLUiQuickActionsProps,
  type TldrawOptions
} from 'tldraw'
import 'tldraw/tldraw.css'
import { FileDown, LoaderCircle, Maximize2, Minimize2, TriangleAlert } from 'lucide-react'
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

const infiniteBoardOptions: Partial<TldrawOptions> = {
  maxPages: 1
}

const a4BoardOptions: Partial<TldrawOptions> = {
  maxPages: BOARD_A4_MAX_PAGES,
  camera: {
    constraints: {
      bounds: { ...BOARD_A4_BOUNDS },
      padding: { x: 48, y: 48 },
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
  Background: A4CanvasBackground
}

function BoardCanvasQuickActions(props: TLUiQuickActionsProps): React.JSX.Element {
  const controls = useContext(BoardCanvasUiContext)

  return (
    <DefaultQuickActions {...props}>
      <DefaultQuickActionsContent />
      {controls?.canExportPdf && (
        <Tooltip content="Экспортировать все листы A4 в PDF" side="bottom" contentClassName="z-[1000]">
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

function A4CanvasBackground(): React.JSX.Element {
  const editor = useEditor()
  const paper = useValue(
    'A4 paper bounds',
    () => {
      const topLeft = editor.pageToViewport({ x: BOARD_A4_BOUNDS.x, y: BOARD_A4_BOUNDS.y })
      const zoom = editor.getZoomLevel()

      return {
        left: topLeft.x,
        top: topLeft.y,
        width: BOARD_A4_BOUNDS.w * zoom,
        height: BOARD_A4_BOUNDS.h * zoom
      }
    },
    [editor]
  )

  return (
    <div className="absolute inset-0 bg-[var(--app-workspace)]" aria-hidden="true">
      <div
        className="absolute bg-white shadow-[0_24px_80px_rgb(0_0_0/0.22)]"
        style={{
          pointerEvents: 'none',
          left: paper.left,
          top: paper.top,
          width: paper.width,
          height: paper.height,
          border: '1px solid rgba(15, 23, 42, 0.16)'
        }}
      />
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
  const [exportError, setExportError] = useState<string | null>(null)
  const saveTimerRef = useRef<number | null>(null)
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

      if (canvasMode === 'a4') {
        const pages = editor.getPages()
        const firstPage = pages[0]

        if (pages.length === 1 && firstPage?.name === 'Page 1') {
          editor.renamePage(firstPage, 'Лист 1')
        }

        editor.resetZoom()
      }

      return () => {
        if (editorRef.current === editor) {
          editorRef.current = null
        }
      }
    },
    [canvasMode]
  )

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
            bounds: { ...BOARD_A4_BOUNDS },
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
    exportPdf
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
            'mymind-board-canvas tldraw__editor relative h-full min-h-0 w-full overflow-hidden bg-[var(--app-workspace)]',
            isLocalFullscreen && 'app-fullscreen-bounds fixed z-40 h-auto w-screen'
          )}
        >
          <Tldraw
            store={store}
            assetUrls={assetUrls}
            colorScheme={canvasMode === 'a4' ? 'light' : resolvedTheme}
            components={canvasMode === 'a4' ? a4BoardCanvasComponents : boardCanvasComponents}
            options={canvasMode === 'a4' ? a4BoardOptions : infiniteBoardOptions}
            onMount={handleEditorMount}
          />
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
