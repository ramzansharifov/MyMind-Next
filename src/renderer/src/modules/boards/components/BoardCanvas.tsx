import { getAssetUrlsByImport } from '@tldraw/assets/imports.vite'
import { createTLStore, getSnapshot, Tldraw, type TLEditorSnapshot, type TLStore } from 'tldraw'
import 'tldraw/tldraw.css'
import { LoaderCircle, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import type { BoardSnapshot } from '../../../../../shared/contracts/boards'
import { useAppearance } from '../../../app/appearance/appearance-context'
import { boardsClient } from '../api/boards-client'
import { registerBoardDraftHandle } from '../lib/board-draft-lifecycle'
import { BoardSaveQueue, type BoardSaveState } from '../lib/board-save-queue'

const assetUrls = getAssetUrlsByImport()
const BOARD_AUTOSAVE_DELAY_MS = 800

interface BoardCanvasProps {
  boardId: string
  onSaveStateChange?: (state: BoardSaveState) => void
}

type BoardLoadState =
  | { status: 'loading' }
  | { status: 'ready'; store: TLStore }
  | { status: 'error'; message: string }

export function BoardCanvas({ boardId, onSaveStateChange }: BoardCanvasProps): React.JSX.Element {
  return (
    <BoardCanvasSession
      key={boardId}
      boardId={boardId}
      onSaveStateChange={onSaveStateChange}
    />
  )
}

function BoardCanvasSession({
  boardId,
  onSaveStateChange
}: BoardCanvasProps): React.JSX.Element {
  const { resolvedTheme } = useAppearance()
  const [loadState, setLoadState] = useState<BoardLoadState>({ status: 'loading' })
  const saveTimerRef = useRef<number | null>(null)

  useEffect(() => {
    let active = true

    void boardsClient
      .getDocument(boardId)
      .then((document) => {
        if (!active) return

        const store = createTLStore({
          snapshot: (document.snapshot ?? undefined) as TLEditorSnapshot | undefined
        })

        setLoadState({ status: 'ready', store })
      })
      .catch((reason: unknown) => {
        if (!active) return

        setLoadState({
          status: 'error',
          message: reason instanceof Error ? reason.message : 'Не удалось загрузить доску'
        })
      })

    return () => {
      active = false
    }
  }, [boardId])

  const store = loadState.status === 'ready' ? loadState.store : null

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

    const stopListening = store.listen(saveLatest, {
      source: 'user',
      scope: 'all'
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

  if (loadState.status === 'error') {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-[var(--app-workspace)] p-8">
        <div className="max-w-md rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-5 text-center">
          <TriangleAlert aria-hidden="true" className="mx-auto size-6 text-red-300" />
          <p className="mt-3 text-sm font-medium text-[var(--app-text)]">
            Не удалось открыть доску
          </p>
          <p className="mt-1 text-xs leading-5 text-red-200/75">{loadState.message}</p>
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

  return (
    <div className="tldraw__editor h-full min-h-0 w-full overflow-hidden bg-[var(--app-workspace)]">
      <Tldraw store={store} assetUrls={assetUrls} colorScheme={resolvedTheme} />
    </div>
  )
}
