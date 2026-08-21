import * as Tabs from '@radix-ui/react-tabs'
import { ArrowLeft, BookOpen, Check, Edit3, LoaderCircle, Pencil } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  NOTE_BLOCK_TYPES,
  type NoteDocument,
  type NoteRecord,
  type NoteSummary
} from '../../../../../shared/contracts/notes'
import type { StudyDocument } from '../../../../../shared/contracts/study'
import { cn } from '../../../shared/lib/cn'
import { Tooltip } from '../../../shared/ui/tooltip'
import { StudyActionButton } from '../../study/components/StudyActionButton'
import { StudyBlockAssetProvider } from '../../study/components/StudyBlockAssetProvider'
import { StudyBlockEditor } from '../../study/components/StudyBlockEditor'
import { StudyAutosaveQueue, type StudyAutosaveState } from '../../study/lib/study-autosave-queue'
import { notesBlockAssetClient, notesClient } from '../api/notes-client'
import { registerNotesDraftHandle } from '../lib/notes-draft-lifecycle'
import './NoteEditor.css'
import { NoteNameDialog } from './NoteNameDialog'

interface NoteEditorProps {
  noteId: string
  onBack: () => void
  onNoteUpdated: (note: NoteSummary) => void
}

type NoteEditorMode = 'edit' | 'read'

export function NoteEditor({ noteId, onBack, onNoteUpdated }: NoteEditorProps): React.JSX.Element {
  const [note, setNote] = useState<NoteRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<StudyAutosaveState>('saved')
  const [mode, setMode] = useState<NoteEditorMode>('edit')
  const [isModeChanging, setIsModeChanging] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [backError, setBackError] = useState<string | null>(null)
  const [modeError, setModeError] = useState<string | null>(null)
  const saveTimerRef = useRef<number | null>(null)

  const [autosaveQueue] = useState(
    () =>
      new StudyAutosaveQueue<NoteDocument>(async (document) => {
        const saved = await notesClient.saveNote({ id: noteId, document })
        setNote(saved)
        onNoteUpdated(saved)
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

  useEffect(() => {
    autosaveQueue.activate()

    const unregister = registerNotesDraftHandle({
      noteId,
      hasUnsavedChanges: () => autosaveQueue.hasUnsavedChanges(),
      flush: flushLatestDraft
    })

    return () => {
      clearSaveTimer()
      autosaveQueue.deactivate()
      unregister()
    }
  }, [autosaveQueue, clearSaveTimer, flushLatestDraft, noteId])

  useEffect(() => {
    let active = true

    void notesClient
      .getNote(noteId)
      .then((loaded) => {
        if (!active) return
        autosaveQueue.hydrate(loaded.document)
        setNote(loaded)
        onNoteUpdated(loaded)
      })
      .catch((reason: unknown) => {
        if (active) {
          setLoadError(reason instanceof Error ? reason.message : 'Не удалось открыть заметку')
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [autosaveQueue, noteId, onNoteUpdated])

  function updateDocument(document: NoteDocument): void {
    setNote((current) => (current ? { ...current, document } : current))
    autosaveQueue.updateDraft(document)
    clearSaveTimer()

    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null
      void autosaveQueue.saveLatest().catch(() => undefined)
    }, 700)
  }

  async function handleBack(): Promise<void> {
    setBackError(null)

    try {
      await flushLatestDraft()
      onBack()
    } catch (reason: unknown) {
      setBackError(reason instanceof Error ? reason.message : 'Не удалось сохранить заметку')
    }
  }

  function handleModeChange(value: string): void {
    if ((value !== 'edit' && value !== 'read') || value === mode || isModeChanging) return

    setModeError(null)

    if (value === 'edit') {
      setMode('edit')
      return
    }

    setIsModeChanging(true)

    void flushLatestDraft()
      .then(() => setMode('read'))
      .catch((reason: unknown) => {
        setModeError(
          reason instanceof Error ? reason.message : 'Не удалось сохранить заметку перед чтением'
        )
      })
      .finally(() => setIsModeChanging(false))
  }

  if (isLoading) {
    return (
      <section className="flex h-full min-h-0 items-center justify-center bg-[var(--app-workspace)] text-sm text-[var(--app-muted)]">
        <LoaderCircle aria-hidden="true" className="mr-2 size-4 animate-spin" />
        Загрузка заметки…
      </section>
    )
  }

  if (!note || loadError) {
    return (
      <section className="flex h-full min-h-0 items-center justify-center bg-[var(--app-workspace)] p-6">
        <div className="max-w-md rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-5 text-center">
          <p className="text-sm font-medium text-red-200">Не удалось открыть заметку</p>
          <p className="mt-2 text-xs leading-5 text-red-300/80">{loadError}</p>
          <button
            type="button"
            className="mt-4 rounded-lg border border-[var(--app-border)] px-3 py-2 text-sm text-[var(--app-text)]"
            onClick={onBack}
          >
            Вернуться к заметкам
          </button>
        </div>
      </section>
    )
  }

  return (
    <section
      data-note-editor-mode={mode}
      className="flex h-full min-h-0 flex-col bg-[var(--app-workspace)]"
    >
      <header
        data-note-editor-header
        className="min-h-20 shrink-0 border-b border-[var(--app-border)] bg-[var(--app-workspace)] px-8 max-[700px]:px-4"
      >
        <div
          data-note-editor-header-content
          className="mx-auto flex min-h-20 w-full max-w-[var(--app-standard-content-width)] items-center gap-4 max-[640px]:gap-2"
        >
          <Tooltip content="Вернуться к заметкам" side="bottom">
            <StudyActionButton
              type="button"
              aria-label="Вернуться к списку заметок"
              className="w-10 shrink-0 px-0"
              onClick={() => void handleBack()}
            >
              <ArrowLeft aria-hidden="true" />
            </StudyActionButton>
          </Tooltip>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold tracking-[0.08em] text-violet-300 uppercase">
              Заметка
            </p>
            <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-[var(--app-text)]">
              {note.title}
            </h1>
          </div>

          <Tooltip content="Переименовать заметку" side="bottom">
            <StudyActionButton
              type="button"
              aria-label="Переименовать заметку"
              className="w-auto shrink-0 px-3 max-[760px]:w-10 max-[760px]:px-0"
              onClick={() => setRenameOpen(true)}
            >
              <Pencil aria-hidden="true" />
              <span className="max-[760px]:hidden">Переименовать</span>
            </StudyActionButton>
          </Tooltip>

          <SaveStatus
            state={saveState}
            onRetry={() => {
              void autosaveQueue.flushLatestDraft().catch(() => undefined)
            }}
          />

          <Tabs.Root value={mode} onValueChange={handleModeChange}>
            <Tabs.List
              aria-label="Режим заметки"
              className="inline-flex rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-1"
            >
              <Tabs.Trigger
                value="read"
                disabled={isModeChanging}
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-[var(--app-muted)] transition-colors outline-none hover:text-[var(--app-text)] disabled:cursor-wait disabled:opacity-60 data-[state=active]:bg-[var(--app-surface-raised)] data-[state=active]:text-[var(--app-text)]"
              >
                {isModeChanging ? (
                  <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                  <BookOpen aria-hidden="true" className="size-4" />
                )}
                <span className="max-[760px]:hidden">Чтение</span>
              </Tabs.Trigger>

              <Tabs.Trigger
                value="edit"
                disabled={isModeChanging}
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-[var(--app-muted)] transition-colors outline-none hover:text-[var(--app-text)] disabled:cursor-wait disabled:opacity-60 data-[state=active]:bg-[var(--app-surface-raised)] data-[state=active]:text-[var(--app-text)]"
              >
                <Edit3 aria-hidden="true" className="size-4" />
                <span className="max-[760px]:hidden">Редактирование</span>
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>
        </div>
      </header>

      {(backError || modeError) && (
        <div className="shrink-0 px-8 pt-4 max-[700px]:px-4">
          <div
            role="alert"
            className="mx-auto w-full max-w-[var(--app-standard-content-width)] rounded-xl border border-red-500/15 bg-red-500/[0.05] px-4 py-3 text-xs text-red-300"
          >
            {backError ?? modeError}
          </div>
        </div>
      )}

      <div
        data-note-editor-scroll-container
        className={cn(
          'min-h-0 flex-1 overflow-y-auto px-8 py-6',
          'max-[700px]:px-4 max-[640px]:py-4',
          mode === 'read' && '[scrollbar-gutter:stable] bg-[var(--app-reader-surface)]'
        )}
      >
        <div
          data-note-editor-content
          className="mx-auto w-full max-w-[var(--app-standard-content-width)]"
        >
          <StudyBlockAssetProvider client={notesBlockAssetClient}>
            <StudyBlockEditor
              materialId={note.id}
              document={note.document as StudyDocument}
              mode={mode}
              boardSource="notes"
              allowedBlockTypes={NOTE_BLOCK_TYPES}
              documentLabel="заметки"
              onChange={(document) => updateDocument(document as NoteDocument)}
            />
          </StudyBlockAssetProvider>
        </div>
      </div>

      <NoteNameDialog
        open={renameOpen}
        title="Переименовать заметку"
        label="Название заметки"
        initialValue={note.title}
        confirmLabel="Сохранить"
        onOpenChange={setRenameOpen}
        onConfirm={async (title) => {
          const updated = await notesClient.renameNote(note.id, title)
          setNote((current) => (current ? { ...current, ...updated } : current))
          onNoteUpdated(updated)
        }}
      />
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
      <span className="flex shrink-0 items-center gap-2 text-xs text-violet-300">
        <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
        Сохранение
      </span>
    )
  }

  if (state === 'dirty') {
    return <span className="shrink-0 text-xs text-amber-300">Есть изменения</span>
  }

  if (state === 'error') {
    return (
      <button type="button" className="shrink-0 text-xs text-red-300 underline" onClick={onRetry}>
        Повторить сохранение
      </button>
    )
  }

  return (
    <span className="flex shrink-0 items-center gap-1.5 text-xs text-emerald-300">
      <Check aria-hidden="true" className="size-3.5" />
      Сохранено
    </span>
  )
}
