import { BookOpen, Check, Edit3, LoaderCircle, Save } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import type { StudyDocument, StudyNode } from '../../../../../shared/contracts/study'
import { studyClient } from '../api/study-client'
import { createEmptyStudyDocument } from '../lib/study-document'
import { StudyBlockEditor } from './StudyBlockEditor'

interface StudyMaterialEditorProps {
  node: StudyNode
}

type SaveState = 'saved' | 'dirty' | 'saving' | 'error'

export function StudyMaterialEditor({ node }: StudyMaterialEditorProps): React.JSX.Element {

  const [document, setDocument] = useState<StudyDocument>(createEmptyStudyDocument())
  const [mode, setMode] = useState<'edit' | 'read'>('edit')
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [isLoading, setIsLoading] = useState(true)
  const saveTimerRef = useRef<number | null>(null)

  useEffect(() => {
    let active = true



    studyClient
      .getMaterial(node.id)
      .then((loadedMaterial) => {
        if (!active) {
          return
        }

        setDocument(loadedMaterial.document)
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

      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current)
      }
    }
  }, [node.id])

  async function save(nextDocument: StudyDocument): Promise<void> {
    try {
      setSaveState('saving')

      await studyClient.saveMaterial({
        nodeId: node.id,
        document: nextDocument
      })

      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  })

      setMaterial(saved)
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }

  function updateDocument(nextDocument: StudyDocument): void {
    setDocument(nextDocument)
    setSaveState('dirty')

    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = window.setTimeout(() => {
      void save(nextDocument)
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
    <section className="flex h-full min-h-0 flex-col">
      <header className="flex min-h-20 shrink-0 items-center gap-4 border-b border-[var(--app-border)] px-6">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-violet-300 uppercase">
            Материал
          </p>

          <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-[var(--app-text)]">
            {node.title}
          </h1>
        </div>

        <SaveStatus state={saveState} />

        <div className="inline-flex rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-1">
          <button
            type="button"
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm ${
              mode === 'edit'
                ? 'bg-[var(--app-surface-raised)] text-[var(--app-text)]'
                : 'text-[var(--app-muted)]'
            }`}
            onClick={() => setMode('edit')}
          >
            <Edit3 aria-hidden="true" className="size-4" />
            Правка
          </button>

          <button
            type="button"
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm ${
              mode === 'read'
                ? 'bg-[var(--app-surface-raised)] text-[var(--app-text)]'
                : 'text-[var(--app-muted)]'
            }`}
            onClick={() => setMode('read')}
          >
            <BookOpen aria-hidden="true" className="size-4" />
            Чтение
          </button>
        </div>

        <button
          type="button"
          disabled={saveState === 'saving'}
          className="flex items-center gap-2 rounded-lg bg-violet-500 px-3 py-2 text-sm font-medium text-white hover:bg-violet-400 disabled:opacity-50"
          onClick={() => void save(document)}
        >
          <Save aria-hidden="true" className="size-4" />
          Сохранить
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <StudyBlockEditor document={document} mode={mode} onChange={updateDocument} />
      </div>
    </section>
  )
}

function SaveStatus({ state }: { state: SaveState }): React.JSX.Element {
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
    return <span className="text-xs text-red-300">Ошибка сохранения</span>
  }

  return (
    <span className="flex items-center gap-1.5 text-xs text-emerald-300">
      <Check aria-hidden="true" className="size-3.5" />
      Сохранено
    </span>
  )
}
