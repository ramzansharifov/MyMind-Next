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
  type TLEditorSnapshot,
  type TLStore,
  type TLUiComponents,
  type TLUiQuickActionsProps
} from 'tldraw'
import 'tldraw/tldraw.css'
import { LoaderCircle, Maximize2, Minimize2, TriangleAlert } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import type { BoardSnapshot } from '../../../../../shared/contracts/boards'
import { useAppearance } from '../../../app/appearance/appearance-context'
import { cn } from '../../../shared/lib/cn'
import { boardsClient } from '../api/boards-client'
import { registerBoardDraftHandle } from '../lib/board-draft-lifecycle'
import { BoardSaveQueue, type BoardSaveState } from '../lib/board-save-queue'

const assetUrls = getAssetUrlsByImport((assetUrl) => assetUrl)
const BOARD_AUTOSAVE_DELAY_MS = 800

interface BoardLoadState {
  boardId: string
  store: TLStore | null
  error: string | null
}

interface BoardCanvasProps {
  boardId: string
  onSaveStateChange?: (state: BoardSaveState) => void
}

interface BoardCanvasUiContextValue {
  isFullscreen: boolean
  fullscreenLabel: string
  toggleFullscreen: () => void
}

const BoardCanvasUiContext = createContext<BoardCanvasUiContextValue | null>(null)

const boardCanvasComponents: TLUiComponents = {
  QuickActions: BoardCanvasQuickActions
}

function BoardCanvasQuickActions(props: TLUiQuickActionsProps): React.JSX.Element {
  const controls = useContext(BoardCanvasUiContext)

  return (
    <DefaultQuickActions {...props}>
      <DefaultQuickActionsContent />
      {controls && (
        <TldrawUiButton
          type="icon"
          aria-label={controls.fullscreenLabel}
          aria-pressed={controls.isFullscreen}
          data-board-fullscreen-control="true"
          title={controls.fullscreenLabel}
          onClick={controls.toggleFullscreen}
        >
          {controls.isFullscreen ? (
            <Minimize2 aria-hidden="true" className="size-4" />
          ) : (
            <Maximize2 aria-hidden="true" className="size-4" />
          )}
        </TldrawUiButton>
      )}
    </DefaultQuickActions>
  )
}

export function BoardCanvas({ boardId, onSaveStateChange }: BoardCanvasProps): React.JSX.Element {
  const { resolvedTheme } = useAppearance()
  const [loadState, setLoadState] = useState<BoardLoadState | null>(null)
  const [fullscreenBoardId, setFullscreenBoardId] = useState<string | null>(null)
  const saveTimerRef = useRef<number | null>(null)
  const isFullscreen = fullscreenBoardId === boardId

  useEffect(() => {
    let active = true
    let loadedStore: TLStore | null = null

    void boardsClient
      .getDocument(boardId)
      .then((document) => {
        if (!active) {
          return
        }

        const nextStore = createTLStore({
          snapshot: (document.snapshot ?? undefined) as TLEditorSnapshot | undefined,
          assetUtils: defaultAssetUtils,
          bindingUtils: defaultBindingUtils,
          shapeUtils: defaultShapeUtils
        })
        loadedStore = nextStore

        setLoadState({
          boardId,
          store: nextStore,
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
          error: reason instanceof Error ? reason.message : 'Не удалось загрузить доску'
        })
      })

    return () => {
      active = false
      loadedStore?.dispose()
    }
  }, [boardId])

  const store = loadState?.boardId === boardId ? loadState.store : null
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

    const captureSnapshot = (): BoardSnapshot =>
      JSON.parse(JSON.stringify(getSnapshot(store))) as BoardSnapshot

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
    // Пробный cleanup редактора в React Strict Mode отменяет внутренний scheduler
    // store.listen. Независимый history reactor остаётся активным после повторного mount.
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
  }, [boardId, onSaveStateChange, store])

  useEffect(() => {
    if (!isFullscreen) return undefined

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Escape' || event.defaultPrevented) return

      setFullscreenBoardId(null)
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isFullscreen])

  const toggleFullscreen = useCallback(() => {
    setFullscreenBoardId((current) => (current === boardId ? null : boardId))
  }, [boardId])

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

  const fullscreenLabel = isFullscreen
    ? 'Вернуть обычный вид доски'
    : 'Развернуть доску на весь экран'

  const boardCanvasUi = useMemo<BoardCanvasUiContextValue>(
    () => ({
      isFullscreen,
      fullscreenLabel,
      toggleFullscreen
    }),
    [fullscreenLabel, isFullscreen, toggleFullscreen]
  )

  return (
    <BoardCanvasUiContext.Provider value={boardCanvasUi}>
      <div
        role="region"
        aria-label="Холст доски"
        data-board-fullscreen={isFullscreen}
        className={cn(
          'mymind-board-canvas tldraw__editor relative h-full min-h-0 w-full overflow-hidden bg-[var(--app-workspace)]',
          isFullscreen && 'fixed inset-0 z-40 h-screen w-screen'
        )}
      >
        <Tldraw
          store={store}
          assetUrls={assetUrls}
          colorScheme={resolvedTheme}
          components={boardCanvasComponents}
        />
      </div>
    </BoardCanvasUiContext.Provider>
  )
}
