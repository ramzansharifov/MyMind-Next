import { Check, LoaderCircle, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import {
  DIARY_MOODS,
  type DiaryDay,
  type DiarySummary
} from '../../../../../shared/contracts/diary'
import { DeleteConfirmationDialog } from '../../../shared/ui/DeleteConfirmationDialog'
import { diaryClient } from '../api/diary-client'
import {
  diaryMoodMeta,
  formatDiaryDate,
  formatDiaryTime,
  getDiaryErrorMessage
} from '../lib/diary-ui'

export function DiaryToday({
  diary,
  dayKey,
  onChanged
}: {
  diary: DiarySummary
  dayKey: string
  onChanged: () => void | Promise<void>
}): React.JSX.Element {
  const [day, setDay] = useState<DiaryDay | null>(null)
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      setDay(await diaryClient.getDay({ diaryId: diary.id, dayKey }))
    } catch (reason) {
      setError(getDiaryErrorMessage(reason))
    } finally {
      setIsLoading(false)
    }
  }, [dayKey, diary.id])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) void load()
    })
    return () => {
      cancelled = true
    }
  }, [load])

  async function chooseMood(mood: (typeof DIARY_MOODS)[number]): Promise<void> {
    setIsSaving(true)
    setError(null)
    try {
      const nextMood = day?.mood === mood ? null : mood
      setDay(await diaryClient.setMood({ diaryId: diary.id, dayKey, mood: nextMood }))
      await onChanged()
    } catch (reason) {
      setError(getDiaryErrorMessage(reason))
    } finally {
      setIsSaving(false)
    }
  }

  async function addEntry(): Promise<void> {
    const text = draft.trim()
    if (!text) return
    setIsSaving(true)
    setError(null)
    try {
      await diaryClient.createEntry({ diaryId: diary.id, dayKey, text })
      setDraft('')
      await load()
      await onChanged()
    } catch (reason) {
      setError(getDiaryErrorMessage(reason))
    } finally {
      setIsSaving(false)
    }
  }

  async function saveEdit(): Promise<void> {
    if (!editingId || !editingText.trim()) return
    setIsSaving(true)
    setError(null)
    try {
      await diaryClient.updateEntry({ id: editingId, text: editingText.trim() })
      setEditingId(null)
      setEditingText('')
      await load()
      await onChanged()
    } catch (reason) {
      setError(getDiaryErrorMessage(reason))
    } finally {
      setIsSaving(false)
    }
  }

  async function removeEntry(): Promise<void> {
    if (!deleteId) return
    setIsSaving(true)
    setError(null)
    try {
      await diaryClient.deleteEntry({ id: deleteId })
      setDeleteId(null)
      await load()
      await onChanged()
    } catch (reason) {
      setError(getDiaryErrorMessage(reason))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[var(--app-text)]">Сегодня</h2>
        <p className="mt-1 text-sm text-[var(--app-muted)]">
          Одна страница на день: настроение и столько коротких записей, сколько захочется.
        </p>
      </div>

      <div className="diary-book-frame mx-auto w-full max-w-[940px]">
        <article className="diary-paper min-h-[610px] overflow-hidden rounded-[24px] border shadow-2xl">
          <div className="diary-paper-content min-h-[610px]">
            <header className="diary-paper-header border-b border-stone-300/70 px-9 py-8 max-[620px]:px-6">
              <div className="text-xs font-semibold tracking-[0.16em] text-stone-500 uppercase">
                {diary.title}
              </div>
              <h3 className="mt-2 font-serif text-2xl font-semibold text-stone-900 capitalize">
                {formatDiaryDate(dayKey)}
              </h3>

              <div className="mt-5">
                <div className="mb-2 text-xs font-semibold text-stone-500">Настроение дня</div>
                <div className="flex flex-wrap gap-2">
                  {DIARY_MOODS.map((mood) => {
                    const meta = diaryMoodMeta[mood]
                    const selected = day?.mood === mood
                    return (
                      <button
                        key={mood}
                        type="button"
                        disabled={isSaving}
                        aria-pressed={selected}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-all disabled:opacity-50 ${selected ? 'border-violet-500 bg-violet-500/10 text-stone-900 shadow-sm' : 'border-stone-300 bg-white/55 text-stone-600 hover:bg-white/85'}`}
                        onClick={() => void chooseMood(mood)}
                      >
                        <span className="text-base">{meta.emoji}</span>
                        {meta.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </header>

            <div className="diary-ruled-surface diary-ruled-content min-h-[360px]">
              {isLoading ? (
                <div className="flex min-h-[324px] items-center justify-center pl-20 text-stone-500 max-[620px]:pl-8">
                  <LoaderCircle className="mr-2 size-4 animate-spin" /> Загружаем страницу…
                </div>
              ) : (
                <>
                  {(day?.entries ?? []).length === 0 && (
                    <div
                      className="flex items-center justify-center pl-20 text-center max-[620px]:pl-8"
                      style={{ minHeight: 'calc(var(--diary-rule-step) * 3)' }}
                    >
                      <p className="font-serif text-sm text-stone-500 italic">
                        Здесь пока тихо. Добавьте первую мысль этого дня.
                      </p>
                    </div>
                  )}

                  {(day?.entries ?? []).map((entry) => (
                    <div key={entry.id} className="diary-entry-row group">
                      <time className="diary-entry-time">{formatDiaryTime(entry.occurredAt)}</time>
                      <div className="relative min-w-0">
                        {editingId === entry.id ? (
                          <>
                            <textarea
                              aria-label="Текст записи"
                              value={editingText}
                              maxLength={8000}
                              rows={4}
                              className="diary-handwriting diary-inline-editor"
                              onChange={(event) => setEditingText(event.target.value)}
                              onKeyDown={(event) => {
                                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                                  event.preventDefault()
                                  void saveEdit()
                                }
                              }}
                            />
                            <div className="diary-edit-actions">
                              <button
                                type="button"
                                disabled={isSaving || !editingText.trim()}
                                aria-label="Сохранить запись"
                                className="inline-flex size-8 items-center justify-center rounded-lg bg-violet-600 text-white disabled:opacity-40"
                                onClick={() => void saveEdit()}
                              >
                                <Check className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={isSaving}
                                aria-label="Отменить редактирование"
                                className="inline-flex size-8 items-center justify-center rounded-lg border border-stone-300 bg-white/70 text-stone-600 disabled:opacity-40"
                                onClick={() => {
                                  setEditingId(null)
                                  setEditingText('')
                                }}
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="diary-handwriting diary-entry-text">{entry.text}</p>
                            <div className="diary-entry-actions">
                              <button
                                type="button"
                                disabled={isSaving}
                                aria-label="Редактировать запись"
                                className="rounded-md p-1.5 text-stone-400 hover:bg-stone-900/5 hover:text-stone-700 disabled:opacity-40"
                                onClick={() => {
                                  setEditingId(entry.id)
                                  setEditingText(entry.text)
                                }}
                              >
                                <Pencil className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={isSaving}
                                aria-label="Удалить запись"
                                className="rounded-md p-1.5 text-stone-400 hover:bg-red-500/10 hover:text-red-700 disabled:opacity-40"
                                onClick={() => setDeleteId(entry.id)}
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="diary-composer-row">
                    <span aria-hidden="true" />
                    <textarea
                      value={draft}
                      maxLength={8000}
                      rows={3}
                      className="diary-handwriting diary-composer-input"
                      placeholder="Что хочется запомнить?"
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                          event.preventDefault()
                          void addEntry()
                        }
                      }}
                    />
                  </div>
                </>
              )}
            </div>

            <footer className="diary-paper-header flex items-center justify-between gap-3 border-t border-stone-300/70 px-9 py-4 max-[620px]:px-6">
              <span className="text-[11px] text-stone-400">Ctrl + Enter — сохранить</span>
              <button
                type="button"
                disabled={isLoading || isSaving || !draft.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => void addEntry()}
              >
                {isSaving ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Добавить запись
              </button>
            </footer>
          </div>
        </article>
      </div>

      {error && (
        <div
          role="alert"
          className="mx-auto max-w-[940px] rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-200"
        >
          {error}
        </div>
      )}

      <DeleteConfirmationDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
        title="Удалить запись?"
        description="Запись будет удалена из страницы этого дня."
        confirmLabel="Удалить запись"
        isSubmitting={isSaving}
        error={error}
        onConfirm={removeEntry}
      />
    </section>
  )
}
