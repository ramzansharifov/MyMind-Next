import * as Tabs from '@radix-ui/react-tabs'
import {
  ArrowLeft,
  BookOpen,
  Braces,
  Check,
  Edit3,
  FileDown,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Pencil
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import type {
  StudyCodeApplyResult,
  StudyDocument,
  StudyNode
} from '../../../../../shared/contracts/study'
import { cn } from '../../../shared/lib/cn'
import { AppDialog } from '../../../shared/ui/AppDialog'
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
import { StudyCodeWorkspace } from './code-mode/StudyCodeWorkspace'
import { StudyMaterialPdfExport, waitForStudyMaterialPdfReady } from './StudyMaterialPdfExport'
import { StudyReadNavigation } from './StudyReadNavigation'

type StudyMaterialMode = 'read' | 'edit' | 'code'

interface StudyMaterialEditorProps {
  node: StudyNode
  focusMode?: boolean
  onFocusModeChange?: (active: boolean) => void
  onRename: () => void
  onBack?: () => void
  navigation: StudyInternalLinkNavigationRequest | null
  onNavigationHandled: (requestId: number) => void
  onCodeApplied?: (result: StudyCodeApplyResult) => void | Promise<void>
}

export function StudyMaterialEditor({
  node,
  focusMode = false,
  onFocusModeChange,
  onRename,
  onBack,
  navigation,
  onNavigationHandled,
  onCodeApplied
}: StudyMaterialEditorProps): React.JSX.Element {
  const [document, setDocument] = useState<StudyDocument>(createEmptyStudyDocument())
  const [mode, setMode] = useState<StudyMaterialMode>(() => (focusMode ? 'read' : 'edit'))
  const [saveState, setSaveState] = useState<StudyAutosaveState>('saved')
  const [isLoading, setIsLoading] = useState(true)
  const [codeDirty, setCodeDirty] = useState(false)
  const [pendingMode, setPendingMode] = useState<Exclude<StudyMaterialMode, 'code'> | null>(null)
  const [pdfExportActive, setPdfExportActive] = useState(false)
  const [pdfExporting, setPdfExporting] = useState(false)
  const [pdfExportSaved, setPdfExportSaved] = useState(false)
  const [pdfExportError, setPdfExportError] = useState<string | null>(null)

  const activeMode: StudyMaterialMode = focusMode ? 'read' : mode

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
    if (saveTimerRef.current === null) return
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
        pause: () => autosaveQueue.pause(),
        resume: () => autosaveQueue.resume(),
        dispose: () => autosaveQueue.dispose()
      }),
    [autosaveQueue, clearSaveTimer]
  )

  useEffect(() => {
    autosaveQueue.activate()

    if (activeMode === 'code') {
      clearSaveTimer()
      autosaveQueue.deactivate()
      return undefined
    }

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
  }, [activeMode, autosaveQueue, clearSaveTimer, flushLatestDraft, node.id, suspendForDeletion])

  const reloadMaterial = useCallback(async (): Promise<void> => {
    const loadedMaterial = await studyClient.getMaterial(node.id)
    autosaveQueue.hydrate(loadedMaterial.document)
    setDocument(loadedMaterial.document)
    setSaveState('saved')
  }, [autosaveQueue, node.id])

  useEffect(() => {
    let active = true

    studyClient
      .getMaterial(node.id)
      .then((loadedMaterial) => {
        if (!active) return
        autosaveQueue.hydrate(loadedMaterial.document)
        setDocument(loadedMaterial.document)
        setSaveState('saved')
      })
      .catch(() => {
        if (active) setSaveState('error')
      })
      .finally(() => {
        if (active) setIsLoading(false)
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
              detail: { headingId: navigation.headingId }
            })
          )
        }

        if (navigation.revealSourceBlockId) {
          window.dispatchEvent(
            new CustomEvent(STUDY_REVEAL_BLOCK_EVENT, {
              detail: { blockId: navigation.revealSourceBlockId }
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
                scrollContainer.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' })

                if (exact) target.focus({ preventScroll: true })

                target.animate(
                  [
                    {
                      boxShadow: exact
                        ? '0 0 0 4px color-mix(in srgb, var(--app-accent-500) 35%, transparent)'
                        : '0 0 0 2px color-mix(in srgb, var(--app-accent-500) 30%, transparent)'
                    },
                    {
                      boxShadow: '0 0 0 0 color-mix(in srgb, var(--app-accent-500) 0%, transparent)'
                    }
                  ],
                  { duration: 1400, easing: 'ease-out' }
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
                scrollContainer.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' })
                target.animate(
                  [
                    {
                      backgroundColor: 'color-mix(in srgb, var(--app-accent-500) 24%, transparent)'
                    },
                    { backgroundColor: 'transparent' }
                  ],
                  { duration: 1400, easing: 'ease-out' }
                )
              }
            } else {
              scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
            }
          }

          onNavigationHandled(navigation.requestId)
        })
      })
    })

    return () => {
      frames.forEach((frame) => window.cancelAnimationFrame(frame))
    }
  }, [isLoading, navigation, node.id, onNavigationHandled])

  function updateDocument(nextDocument: StudyDocument): void {
    setDocument(nextDocument)
    autosaveQueue.updateDraft(nextDocument)
    clearSaveTimer()
    if (autosaveQueue.isPaused()) return

    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null
      void autosaveQueue.saveLatest().catch((reason: unknown) => {
        console.error('Failed to autosave study material', reason)
      })
    }, 800)
  }

  async function requestMode(nextMode: StudyMaterialMode): Promise<void> {
    if (nextMode === activeMode || focusMode) return

    if (activeMode === 'code' && nextMode !== 'code' && codeDirty) {
      setPendingMode(nextMode)
      return
    }

    if (nextMode === 'code') {
      try {
        await flushLatestDraft()
        setSaveState('saved')
        setMode('code')
      } catch (reason: unknown) {
        console.error('Failed to save study material before Code Mode', reason)
        setSaveState('error')
      }
      return
    }

    setMode(nextMode)
  }

  async function handleCodeApplied(result: StudyCodeApplyResult): Promise<void> {
    await reloadMaterial()
    await onCodeApplied?.(result)
  }

  async function handlePdfExport(): Promise<void> {
    if (pdfExporting || (activeMode === 'code' && codeDirty)) return

    setPdfExporting(true)
    setPdfExportSaved(false)
    setPdfExportError(null)
    setPdfExportActive(true)

    try {
      await waitForStudyMaterialPdfReady()
      const result = await studyClient.exportMaterialPdf({ nodeId: node.id })

      if (result.status === 'saved') {
        setPdfExportSaved(true)
        window.setTimeout(() => setPdfExportSaved(false), 1400)
      }
    } catch (reason: unknown) {
      setPdfExportError(reason instanceof Error ? reason.message : 'Не удалось экспортировать PDF')
    } finally {
      setPdfExportActive(false)
      setPdfExporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[var(--app-muted)]">
        <LoaderCircle aria-hidden="true" className="mr-2 size-4 animate-spin" />
        Загрузка материала…
      </div>
    )
  }

  const pdfBlockedByCodeChanges = activeMode === 'code' && codeDirty

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
          <p className="text-accent-300 text-[11px] font-semibold tracking-[0.08em] uppercase">
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

        {!focusMode && activeMode !== 'code' && (
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
          <Tooltip
            content={
              pdfBlockedByCodeChanges
                ? 'Сначала сохраните изменения DSL'
                : 'Экспортировать материал в PDF'
            }
            side="bottom"
          >
            <StudyActionButton
              type="button"
              aria-label="Экспортировать материал в PDF"
              className="w-10 shrink-0 px-0"
              disabled={pdfExporting || pdfBlockedByCodeChanges}
              onClick={() => void handlePdfExport()}
            >
              {pdfExporting ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              ) : pdfExportSaved ? (
                <Check aria-hidden="true" className="text-emerald-300" />
              ) : (
                <FileDown aria-hidden="true" />
              )}
            </StudyActionButton>
          </Tooltip>
        )}

        {!focusMode && (
          <Tabs.Root
            value={mode}
            onValueChange={(value) => void requestMode(value as StudyMaterialMode)}
          >
            <Tabs.List
              aria-label="Режим материала"
              className="inline-flex rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-1"
            >
              <Tabs.Trigger
                value="read"
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-[var(--app-muted)] transition-colors outline-none hover:text-[var(--app-text)] data-[state=active]:bg-[var(--app-surface-raised)] data-[state=active]:text-[var(--app-text)]"
              >
                <BookOpen aria-hidden="true" className="size-4" />
                Чтение
              </Tabs.Trigger>
              <Tabs.Trigger
                value="edit"
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-[var(--app-muted)] transition-colors outline-none hover:text-[var(--app-text)] data-[state=active]:bg-[var(--app-surface-raised)] data-[state=active]:text-[var(--app-text)]"
              >
                <Edit3 aria-hidden="true" className="size-4" />
                Редактирование
              </Tabs.Trigger>
              <Tabs.Trigger
                value="code"
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-[var(--app-muted)] transition-colors outline-none hover:text-[var(--app-text)] data-[state=active]:bg-[var(--app-surface-raised)] data-[state=active]:text-[var(--app-text)]"
              >
                <Braces aria-hidden="true" className="size-4" />
                Код
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
        ) : activeMode === 'read' ? (
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

      {activeMode === 'code' ? (
        <StudyCodeWorkspace
          node={node}
          onApplied={handleCodeApplied}
          onDirtyChange={setCodeDirty}
        />
      ) : (
        <div
          ref={activeMode === 'read' ? readScrollRef : undefined}
          data-study-scroll-container={activeMode === 'read'}
          className={cn(
            'min-h-0 flex-1 overflow-y-auto px-6 py-6',
            'max-[640px]:px-3 max-[640px]:py-4',
            activeMode === 'read' && '[scrollbar-gutter:stable] bg-[var(--app-reader-surface)]'
          )}
        >
          <div
            className={
              activeMode === 'read'
                ? 'mx-auto grid w-full max-w-[1500px] grid-cols-[minmax(0,1fr)_280px] items-start gap-5 max-[1180px]:grid-cols-1'
                : undefined
            }
          >
            <StudyBlockEditor
              materialId={node.id}
              document={document}
              mode={activeMode}
              focusMode={focusMode}
              onChange={updateDocument}
            />

            {activeMode === 'read' && (
              <StudyReadNavigation blocks={document.blocks} scrollContainerRef={readScrollRef} />
            )}
          </div>
        </div>
      )}

      {pdfExportActive && (
        <StudyMaterialPdfExport materialId={node.id} title={node.title} studyDocument={document} />
      )}

      <AppDialog
        open={pendingMode !== null}
        onOpenChange={(open) => {
          if (!open) setPendingMode(null)
        }}
        title="Отменить изменения кода?"
        description="Несохранённый DSL не был применён к материалу."
        footer={
          <>
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-sm text-[var(--app-muted)]"
              onClick={() => setPendingMode(null)}
            >
              Остаться
            </button>
            <button
              type="button"
              className="bg-accent-500/15 text-accent-200 rounded-lg px-3 py-2 text-sm font-medium"
              onClick={() => {
                const next = pendingMode
                setPendingMode(null)
                setCodeDirty(false)
                if (next) setMode(next)
              }}
            >
              Отменить и перейти
            </button>
          </>
        }
      >
        <p className="text-sm text-[var(--app-muted)]">
          Сохраните DSL, если хотите применить изменения.
        </p>
      </AppDialog>

      <AppDialog
        open={pdfExportError !== null}
        onOpenChange={(open) => {
          if (!open) setPdfExportError(null)
        }}
        title="Не удалось экспортировать PDF"
        description="Материал остался без изменений. Можно закрыть окно и попробовать снова."
        footer={
          <button
            type="button"
            className="bg-accent-500/15 text-accent-200 rounded-lg px-3 py-2 text-sm font-medium"
            onClick={() => setPdfExportError(null)}
          >
            Закрыть
          </button>
        }
      >
        <p className="text-sm text-red-300">{pdfExportError}</p>
      </AppDialog>
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
      <span className="text-accent-300 flex items-center gap-2 text-xs">
        <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
        Сохранение
      </span>
    )
  }

  if (state === 'dirty') return <span className="text-xs text-amber-300">Есть изменения</span>

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
