import { getAssetUrlsByImport } from '@tldraw/assets/imports.vite'
import {
  createTLStore,
  defaultAssetUtils,
  defaultBindingUtils,
  defaultShapeUtils,
  getSnapshot,
  react,
  Tldraw,
  type TLEditorSnapshot,
  type TLStore
} from 'tldraw'
import 'tldraw/tldraw.css'
import { LoaderCircle, Maximize2, Minimize2, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import type { BoardSnapshot } from '../../../../../shared/contracts/boards'
import { useAppearance } from '../../../app/appearance/appearance-context'
import { cn } from '../../../shared/lib/cn'
import { Tooltip } from '../../../shared/ui/tooltip'
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

  return (
    <div
      role="region"
      aria-label="Холст доски"
      data-board-fullscreen={isFullscreen}
      className={cn(
        'tldraw__editor relative h-full min-h-0 w-full overflow-hidden bg-[var(--app-workspace)]',
        isFullscreen && 'fixed inset-0 z-40 h-screen w-screen'
      )}
    >
      <Tldraw store={store} assetUrls={assetUrls} colorScheme={resolvedTheme} />

      <Tooltip content={fullscreenLabel} side="left">
        <button
          type="button"
          aria-label={fullscreenLabel}
          aria-pressed={isFullscreen}
          className={cn(
            'absolute top-3 right-3 z-[1000] flex size-10 items-center justify-center rounded-xl border outline-none',
            'border-[var(--app-border)] bg-[var(--app-surface-raised)]/95 text-[var(--app-muted)] shadow-xl backdrop-blur',
            'transition-[background-color,color,transform] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]',
            'focus-visible:ring-2 focus-visible:ring-[var(--app-accent-500)]/50 active:scale-95'
          )}
          onClick={() => {
            setFullscreenBoardId((current) => (current === boardId ? null : boardId))
          }}
        >
          {isFullscreen ? (
            <Minimize2 aria-hidden="true" className="size-4.5" />
          ) : (
            <Maximize2 aria-hidden="true" className="size-4.5" />
          )}
        </button>
      </Tooltip>
    </div>
  )
}
