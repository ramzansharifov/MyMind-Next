import * as Tabs from '@radix-ui/react-tabs'
import {
  ArrowLeft,
  BookOpen,
  Check,
  Edit3,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Pencil
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { StudyDocument, StudyNode } from '../../../../../shared/contracts/study'
import { cn } from '../../../shared/lib/cn'
import { Tooltip } from '../../../shared/ui/tooltip'

import { studyClient } from '../api/study-client'
import { StudyAutosaveQueue, type StudyAutosaveState } from '../lib/study-autosave-queue'
import {
  createStudyDraftDeletionSuspension,
  registerStudyDraftHandle
} from '../lib/study-draft-lifecycle'
import { createEmptyStudyDocument } from '../lib/study-document'
import {
  findStudyInternalLinkReturnTarget,
  type StudyInternalLinkNavigationRequest
} from '../lib/study-internal-link'
import {
  getStudyHeadingElementId,
  STUDY_REVEAL_BLOCK_EVENT,
  STUDY_REVEAL_HEADING_EVENT
} from '../lib/study-read-navigation'
import { StudyActionButton } from './StudyActionButton'
import { StudyBlockEditor } from './StudyBlockEditor'
import { StudyReadNavigation } from './StudyReadNavigation'

interface StudyMaterialEditorProps {
  node: StudyNode
  focusMode?: boolean
  onFocusModeChange?: (active: boolean) => void
  onRename: () => void
  onBack?: () => void
  navigation: StudyInternalLinkNavigationRequest | null
  onNavigationHandled: (requestId: number) => void
}

export function StudyMaterialEditor({
  node,
  focusMode = false,
  onFocusModeChange,
  onRename,
  onBack,
  navigation,
  onNavigationHandled
}: StudyMaterialEditorProps): React.JSX.Element {
  const [document, setDocument] = useState<StudyDocument>(createEmptyStudyDocument())
  const [mode, setMode] = useState<'edit' | 'read'>(() => (focusMode ? 'read' : 'edit'))
  const [saveState, setSaveState] = useState<StudyAutosaveState>('saved')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (focusMode) {
      setMode('read')
    }
  }, [focusMode])

  useEffect(() => {
    if (!focusMode) return undefined

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      onFocusModeChange?.(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusMode, onFocusModeChange])

  const saveTimerRef = useRef<number | null>(null)
  const readScrollRef = useRef<HTMLDivElement | null>(null)
  const handledNavigationRef = useRef<number | null>(null)

  const [autosaveQueue] = useState(
    () =>
      new StudyAutosaveQueue<StudyDocument>(async (nextDocument) => {
        await studyClient.saveMaterial({
          nodeId: node.id,
          document: nextDocument
        })
      }, setSaveState)
  )

  const clearSaveTimer = useCallback((): void => {
    if (saveTimerRef.current === null) {
      return
    }

    window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = null
  }, [])

  const flushLatestDraft = useCallback((): Promise<void> => {
    clearSaveTimer()
    return autosaveQueue.flushLatestDraft()
  }, [autosaveQueue, clearSaveTimer])

  const suspendForDeletion = useCallback(
    () =>
      createStudyDraftDeletionSuspension({
        cancelScheduledSave: clearSaveTimer,
        pause: () => {
          autosaveQueue.pause()
        },
        resume: () => autosaveQueue.resume(),
        dispose: () => {
          autosaveQueue.dispose()
        }
      }),
    [autosaveQueue, clearSaveTimer]
  )

  useEffect(() => {
    /*
     * React Strict Mode intentionally runs effect setup and cleanup twice in
     * development. Deactivation is reversible; permanent disposal happens
     * only after the backend confirms deletion.
     */
    autosaveQueue.activate()

    const unregister = registerStudyDraftHandle({
      materialId: node.id,
      hasUnsavedChanges: () => autosaveQueue.hasUnsavedChanges(),
      flush: flushLatestDraft,
      suspendForDeletion
    })

    return () => {
      clearSaveTimer()
      autosaveQueue.deactivate()
      unregister()
    }
  }, [autosaveQueue, clearSaveTimer, flushLatestDraft, node.id, suspendForDeletion])

  useEffect(() => {
    let active = true

    studyClient
      .getMaterial(node.id)
      .then((loadedMaterial) => {
        if (!active) {
          return
        }

        autosaveQueue.hydrate(loadedMaterial.document)
        setDocument(loadedMaterial.document)
        setSaveState('saved')
      })
      .catch(() => {
        if (active) {
          setSaveState('error')
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [autosaveQueue, node.id])

  useEffect(() => {
    if (
      isLoading ||
      !navigation ||
      navigation.materialId !== node.id ||
      handledNavigationRef.current === navigation.requestId
    ) {
      return
    }

    handledNavigationRef.current = navigation.requestId

    const frames: number[] = []

    function schedule(callback: () => void): void {
      frames.push(window.requestAnimationFrame(callback))
    }

    schedule(() => {
      setMode('read')

      schedule(() => {
        if (navigation.headingId) {
          window.dispatchEvent(
            new CustomEvent(STUDY_REVEAL_HEADING_EVENT, {
              detail: {
                headingId: navigation.headingId
              }
            })
          )
        }

        if (navigation.revealSourceBlockId) {
          window.dispatchEvent(
            new CustomEvent(STUDY_REVEAL_BLOCK_EVENT, {
              detail: {
                blockId: navigation.revealSourceBlockId
              }
            })
          )
        }

        schedule(() => {
          const scrollContainer = readScrollRef.current

          if (scrollContainer) {
            if (
              navigation.revealSourcePosition !== undefined ||
              navigation.revealSourceBlockId !== undefined
            ) {
              const { target, exact } = findStudyInternalLinkReturnTarget(
                scrollContainer,
                navigation.revealSourcePosition,
                navigation.revealSourceBlockId
              )

              if (target) {
                const containerRect = scrollContainer.getBoundingClientRect()
                const targetRect = target.getBoundingClientRect()
                const top = scrollContainer.scrollTop + targetRect.top - containerRect.top - 80

                scrollContainer.scrollTo({
                  top: Math.max(top, 0),
                  behavior: 'smooth'
                })

                if (exact) {
                  target.focus({
                    preventScroll: true
                  })
                }

                target.animate(
                  [
                    {
                      boxShadow: exact
                        ? '0 0 0 4px rgb(139 92 246 / 35%)'
                        : '0 0 0 2px rgb(139 92 246 / 30%)'
                    },
                    {
                      boxShadow: '0 0 0 0 rgb(139 92 246 / 0%)'
                    }
                  ],
                  {
                    duration: 1400,
                    easing: 'ease-out'
                  }
                )
              }
            } else if (navigation.headingId) {
              const target = window.document.getElementById(
                getStudyHeadingElementId(navigation.headingId)
              )

              if (target) {
                const containerRect = scrollContainer.getBoundingClientRect()
                const targetRect = target.getBoundingClientRect()
                const top = scrollContainer.scrollTop + targetRect.top - containerRect.top - 24

                scrollContainer.scrollTo({
                  top: Math.max(top, 0),
                  behavior: 'smooth'
                })

                target.animate(
                  [
                    {
                      backgroundColor: 'rgb(139 92 246 / 24%)'
                    },
                    {
                      backgroundColor: 'transparent'
                    }
                  ],
                  {
                    duration: 1400,
                    easing: 'ease-out'
                  }
                )
              }
            } else {
              scrollContainer.scrollTo({
                top: 0,
                behavior: 'smooth'
              })
            }
          }

          onNavigationHandled(navigation.requestId)
        })
      })
    })

    return () => {
      frames.forEach((frame) => {
        window.cancelAnimationFrame(frame)
      })
    }
  }, [isLoading, navigation, node.id, onNavigationHandled])

  function updateDocument(nextDocument: StudyDocument): void {
    setDocument(nextDocument)
    autosaveQueue.updateDraft(nextDocument)

    clearSaveTimer()

    /*
     * While deletion is pending the draft remains editable in memory, but no
     * new save is scheduled. A failed deletion resumes the queue and persists
     * the newest retained draft immediately.
     */
    if (autosaveQueue.isPaused()) {
      return
    }

    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null

      void autosaveQueue.saveLatest().catch((reason: unknown) => {
        console.error('Failed to autosave study material', reason)
      })
    }, 800)
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[var(--app-muted)]">
        <LoaderCircle aria-hidden="true" className="mr-2 size-4 animate-spin" />
        Загрузка материала…
      </div>
    )
  }

  return (
    <section
      data-study-material-focus={focusMode}
      className="flex h-full min-h-0 flex-col bg-[var(--app-workspace)]"
    >
      <header
        className={cn(
          'flex shrink-0 items-center gap-4 border-b border-[var(--app-border)]',
          focusMode
            ? 'min-h-14 bg-[var(--app-surface)] px-5'
            : 'min-h-20 bg-[var(--app-workspace)] px-6'
        )}
      >
        {onBack && (
          <Tooltip content="Вернуться к внутренней ссылке" side="bottom">
            <StudyActionButton
              type="button"
              aria-label="Вернуться к внутренней ссылке"
              className="w-auto shrink-0 px-3"
              onClick={onBack}
            >
              <ArrowLeft aria-hidden="true" />
              <span className="max-[760px]:hidden">Назад</span>
            </StudyActionButton>
          </Tooltip>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-violet-300 uppercase">
            {focusMode ? 'Режим фокуса' : 'Материал'}
          </p>

          <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-[var(--app-text)]">
            {node.title}
          </h1>
        </div>

        {!focusMode && (
          <Tooltip content="Переименовать материал" side="bottom">
            <StudyActionButton
              type="button"
              aria-label="Переименовать материал"
              className="w-auto shrink-0 px-3 max-[760px]:w-10 max-[760px]:px-0"
              onClick={onRename}
            >
              <Pencil aria-hidden="true" />

              <span className="max-[760px]:hidden">Переименовать</span>
            </StudyActionButton>
          </Tooltip>
        )}

        {!focusMode && (
          <SaveStatus
            state={saveState}
            onRetry={() => {
              void autosaveQueue.flushLatestDraft().catch((reason: unknown) => {
                console.error('Failed to retry study material save', reason)
              })
            }}
          />
        )}

        {!focusMode && (
          <Tabs.Root
            value={mode}
            onValueChange={(value) => {
              if (value === 'edit' || value === 'read') {
                setMode(value)
              }
            }}
          >
            <Tabs.List
              aria-label="Режим просмотра материала"
              className="inline-flex rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-1"
            >
              <Tabs.Trigger
                value="edit"
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-[var(--app-muted)] transition-colors outline-none hover:text-[var(--app-text)] data-[state=active]:bg-[var(--app-surface-raised)] data-[state=active]:text-[var(--app-text)]"
              >
                <Edit3 aria-hidden="true" className="size-4" />
                Правка
              </Tabs.Trigger>

              <Tabs.Trigger
                value="read"
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-[var(--app-muted)] transition-colors outline-none hover:text-[var(--app-text)] data-[state=active]:bg-[var(--app-surface-raised)] data-[state=active]:text-[var(--app-text)]"
              >
                <BookOpen aria-hidden="true" className="size-4" />
                Чтение
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>
        )}

        {focusMode ? (
          <Tooltip content="Выйти из режима фокуса" side="bottom">
            <StudyActionButton
              type="button"
              aria-label="Выйти из режима фокуса"
              className="w-auto shrink-0 px-3"
              onClick={() => onFocusModeChange?.(false)}
            >
              <Minimize2 aria-hidden="true" />
              <span className="max-[640px]:hidden">Выйти из фокуса</span>
            </StudyActionButton>
          </Tooltip>
        ) : mode === 'read' ? (
          <Tooltip content="Открыть режим фокуса" side="bottom">
            <StudyActionButton
              type="button"
              aria-label="Открыть режим фокуса"
              className="w-auto shrink-0 px-3 max-[760px]:w-10 max-[760px]:px-0"
              onClick={() => onFocusModeChange?.(true)}
            >
              <Maximize2 aria-hidden="true" />
              <span className="max-[760px]:hidden">Фокус</span>
            </StudyActionButton>
          </Tooltip>
        ) : null}
      </header>

      <div
        ref={mode === 'read' ? readScrollRef : undefined}
        data-study-scroll-container={mode === 'read'}
        className={cn(
          'min-h-0 flex-1 overflow-y-auto px-6 py-6',
          'max-[640px]:px-3 max-[640px]:py-4',
          mode === 'read' && '[scrollbar-gutter:stable] bg-[var(--app-reader-surface)]'
        )}
      >
        <div
          className={
            mode === 'read'
              ? 'mx-auto grid w-full max-w-[1500px] grid-cols-[minmax(0,1fr)_280px] items-start gap-5 max-[1180px]:grid-cols-1'
              : undefined
          }
        >
          <StudyBlockEditor
            materialId={node.id}
            document={document}
            mode={mode}
            focusMode={focusMode}
            onChange={updateDocument}
          />

          {mode === 'read' && (
            <StudyReadNavigation blocks={document.blocks} scrollContainerRef={readScrollRef} />
          )}
        </div>
      </div>
    </section>
  )
}

function SaveStatus({
  state,
  onRetry
}: {
  state: StudyAutosaveState
  onRetry: () => void
}): React.JSX.Element {
  if (state === 'saving') {
    return (
      <span className="flex items-center gap-2 text-xs text-violet-300">
        <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
        Сохранение
      </span>
    )
  }

  if (state === 'dirty') {
    return <span className="text-xs text-amber-300">Есть изменения</span>
  }

  if (state === 'error') {
    return (
      <button type="button" className="text-xs text-red-300 underline" onClick={onRetry}>
        Повторить сохранение
      </button>
    )
  }

  return (
    <span className="flex items-center gap-1.5 text-xs text-emerald-300">
      <Check aria-hidden="true" className="size-3.5" />
      Сохранено
    </span>
  )
}
