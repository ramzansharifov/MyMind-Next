'use dom'

import { getAssetUrlsByMetaUrl } from '@tldraw/assets/urls'
import { useDOMImperativeHandle, type DOMImperativeFactory } from 'expo/dom'
import { useEffect, useRef, useState, type Ref } from 'react'
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
  ref?: Ref<BoardCanvasDomRef>
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
  const saveActionRef = useRef(saveSnapshot)
  const stateActionRef = useRef(onSaveState)
  const errorActionRef = useRef(onError)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const queueRef = useRef<BoardSaveQueue | null>(null)

  saveActionRef.current = saveSnapshot
  stateActionRef.current = onSaveState
  errorActionRef.current = onError

  if (!queueRef.current) {
    queueRef.current = new BoardSaveQueue(
      async (next) => saveActionRef.current(next),
      (state) => {
        void stateActionRef.current(state)
      }
    )
  }

  const clearTimer = (): void => {
    if (timerRef.current === null) return
    clearTimeout(timerRef.current)
    timerRef.current = null
  }

  const flush = async (): Promise<void> => {
    clearTimer()
    const queue = queueRef.current
    if (!queue) return
    try {
      await queue.flush()
    } catch (reason) {
      await errorActionRef.current(messageFor(reason))
      throw reason
    }
  }

  useDOMImperativeHandle(
    ref,
    () => ({
      flush
    }),
    []
  )

  useEffect(() => {
    if (!storeState.error) return
    void errorActionRef.current(storeState.error)
  }, [storeState.error])

  useEffect(() => {
    const store = storeState.store
    const queue = queueRef.current
    if (!store || !queue) return undefined

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
          void errorActionRef.current(messageFor(reason))
        })
      }, AUTOSAVE_DELAY_MS)
    })

    void stateActionRef.current('saved')

    return () => {
      clearTimer()
      stopListening()
      void queue
        .flush()
        .catch((reason: unknown) => errorActionRef.current(messageFor(reason)))
        .finally(() => queue.dispose())
      store.dispose()
    }
  }, [storeState.store])

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
