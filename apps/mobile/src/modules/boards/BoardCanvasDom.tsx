'use dom'

import { getAssetUrlsByImport } from '@tldraw/assets/imports'
import { useDOMImperativeHandle, type DOMImperativeFactory } from 'expo/dom'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type Ref
} from 'react'
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
import type { BoardSnapshot } from '@mymind/contracts/boards'
import { BoardSaveQueue, type BoardSaveState } from '@mymind/core/board-save-queue'
import RichContentDom, { type RichContentDomProps } from '../../shared/ui/RichContentDom'
import { DomViewportMeta } from '../../shared/ui/DomViewportMeta'

function normalizeBundledAssetUrl(asset: unknown): string {
  if (typeof asset === 'string') return asset

  if (asset && typeof asset === 'object') {
    if ('uri' in asset && typeof asset.uri === 'string') return asset.uri
    if ('default' in asset) return normalizeBundledAssetUrl(asset.default)

    return `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(asset))}`
  }

  return String(asset ?? '')
}

const assetUrls = getAssetUrlsByImport((assetUrl) =>
  normalizeBundledAssetUrl(assetUrl as unknown)
)
const AUTOSAVE_DELAY_MS = 800

export interface BoardCanvasDomRef extends DOMImperativeFactory {
  flush: () => Promise<void>
}

interface BoardSurfaceProps {
  ref: Ref<BoardCanvasDomRef>
  dom?: import('expo/dom').DOMProps
  mode?: 'board'
  snapshot: BoardSnapshot | null
  colorScheme: 'light' | 'dark'
  focusMode?: boolean
  onFocusModeChange?: (active: boolean) => Promise<void>
  saveSnapshot: (snapshot: BoardSnapshot) => Promise<void>
  onSaveState: (state: BoardSaveState) => Promise<void>
  onError: (message: string) => Promise<void>
}

interface RichSurfaceProps extends RichContentDomProps {
  mode: 'rich'
}

type BoardCanvasDomProps = BoardSurfaceProps | RichSurfaceProps

interface StoreState {
  store: TLStore | null
  error: string | null
}

interface BoardCanvasUiContextValue {
  focusMode: boolean
  toggleFocusMode(): void
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
      {controls ? (
        <TldrawUiButton
          type="icon"
          aria-label={controls.focusMode ? 'Выйти из полноэкранного режима' : 'Развернуть доску на весь экран'}
          aria-pressed={controls.focusMode}
          onClick={controls.toggleFocusMode}
        >
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {controls.focusMode ? (
              <path d="M8 3v5H3M16 3v5h5M8 21v-5H3M16 21v-5h5" />
            ) : (
              <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
            )}
          </svg>
        </TldrawUiButton>
      ) : null}
    </DefaultQuickActions>
  )
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

function BoardSurface({
  ref,
  snapshot,
  colorScheme,
  focusMode = false,
  onFocusModeChange,
  saveSnapshot,
  onSaveState,
  onError
}: BoardSurfaceProps): React.JSX.Element {
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

  const controls: BoardCanvasUiContextValue = {
    focusMode,
    toggleFocusMode: () => {
      void onFocusModeChange?.(!focusMode)
    }
  }

  return (
    <>
      <DomViewportMeta />
      <main className="board-root">
      <BoardCanvasUiContext.Provider value={controls}>
        <Tldraw
          store={storeState.store}
          assetUrls={assetUrls}
          colorScheme={colorScheme}
          components={boardCanvasComponents}
          forceMobile
          locale="ru"
          autoFocus
        />
      </BoardCanvasUiContext.Provider>
        <style>{styles}</style>
      </main>
    </>
  )
}

export default function BoardCanvasDom(props: BoardCanvasDomProps): React.JSX.Element {
  if (props.mode === 'rich') return <RichContentDom {...props} />
  return <BoardSurface {...props} />
}

const styles = `
  html, body, #root {
    margin: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    overscroll-behavior: none;
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
