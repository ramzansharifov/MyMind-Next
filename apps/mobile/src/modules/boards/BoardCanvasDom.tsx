'use dom'

import { getAssetUrlsByMetaUrl } from '@tldraw/assets/urls'
import { useDOMImperativeHandle, type DOMImperativeFactory } from 'expo/dom'
import { useCallback, useEffect, useRef, useState, type Ref } from 'react'
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
import type { BoardSnapshot } from '@mymind/contracts/boards'
import { BoardSaveQueue, type BoardSaveState } from '@mymind/core/board-save-queue'

const assetUrls = getAssetUrlsByMetaUrl()
const AUTOSAVE_DELAY_MS = 800

export interface BoardCanvasDomRef extends DOMImperativeFactory {
  flush: () => Promise<void>
}

interface BoardCanvasDomProps {
  ref: Ref<BoardCanvasDomRef>
  dom?: import('expo/dom').DOMProps
  snapshot: BoardSnapshot | null
  colorScheme: 'light' | 'dark'
  saveSnapshot: (snapshot: BoardSnapshot) => Promise<void>
  onSaveState: (state: BoardSaveState) => Promise<void>
  onError: (message: string) => Promise<void>
}

interface StoreState {
  store: TLStore | null
  error: string | null
}

function messageFor(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'Не удалось обработать доску'
}

function createStore(snapshot: BoardSnapshot | null): StoreState {
  try {
    return {
      store: createTLStore({
        snapshot: (snapshot ?? undefined) as TLEditorSnapshot | undefined,
        assetUtils: defaultAssetUtils,
        bindingUtils: defaultBindingUtils,
        shapeUtils: defaultShapeUtils
      }),
      error: null
    }
  } catch (reason) {
    return { store: null, error: messageFor(reason) }
  }
}

function serializeSnapshot(store: TLStore): BoardSnapshot {
  return JSON.parse(JSON.stringify(getSnapshot(store))) as BoardSnapshot
}

export default function BoardCanvasDom({
  ref,
  snapshot,
  colorScheme,
  saveSnapshot,
  onSaveState,
  onError
}: BoardCanvasDomProps): React.JSX.Element {
  const [storeState] = useState(() => createStore(snapshot))
  const [queue] = useState(
    () =>
      new BoardSaveQueue(saveSnapshot, (state) => {
        void onSaveState(state)
      })
  )
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback((): void => {
    if (timerRef.current === null) return
    clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  const reportError = useCallback(
    async (reason: unknown): Promise<void> => {
      await onError(messageFor(reason))
    },
    [onError]
  )

  const flush = useCallback(async (): Promise<void> => {
    clearTimer()
    try {
      await queue.flush()
    } catch (reason) {
      await reportError(reason)
      throw reason
    }
  }, [clearTimer, queue, reportError])

  useDOMImperativeHandle(ref, () => ({ flush }), [flush])

  useEffect(() => {
    if (!storeState.error) return
    void onError(storeState.error)
  }, [onError, storeState.error])

  useEffect(() => {
    const store = storeState.store
    if (!store) return undefined

    let observedHistory = store.history.get()
    const stopListening = react('autosave mobile board', () => {
      const nextHistory = store.history.get()
      if (nextHistory === observedHistory) return
      observedHistory = nextHistory
      queue.update(serializeSnapshot(store))
      clearTimer()
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        void queue.saveLatest().catch((reason: unknown) => {
          void reportError(reason)
        })
      }, AUTOSAVE_DELAY_MS)
    })

    void onSaveState('saved')

    return () => {
      clearTimer()
      stopListening()
      void queue.flush().catch((reason: unknown) => reportError(reason))
    }
  }, [clearTimer, onSaveState, queue, reportError, storeState.store])

  if (storeState.error || !storeState.store) {
    return (
      <main className="board-error">
        <strong>Не удалось открыть доску</strong>
        <span>{storeState.error ?? 'Неизвестная ошибка снимка доски'}</span>
        <style>{styles}</style>
      </main>
    )
  }

  return (
    <main className="board-root">
      <Tldraw
        store={storeState.store}
        assetUrls={assetUrls}
        colorScheme={colorScheme}
        forceMobile
        autoFocus
      />
      <style>{styles}</style>
    </main>
  )
}

const styles = `
  html, body, #root {
    margin: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: transparent;
  }
  * { box-sizing: border-box; }
  .board-root, .tldraw__editor {
    width: 100%;
    height: 100%;
    min-height: 0;
  }
  .board-root { position: fixed; inset: 0; }
  .board-error {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 24px;
    font: 14px system-ui, sans-serif;
    text-align: center;
    color: #ef4444;
  }
  .board-error span { opacity: 0.8; }
`
