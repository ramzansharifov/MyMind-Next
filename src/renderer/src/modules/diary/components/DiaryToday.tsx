import { Check, LoaderCircle, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { DIARY_MOODS, type DiaryDay, type DiarySummary } from '../../../../../shared/contracts/diary'
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
    void load()
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
          Зафиксируйте настроение и небольшие моменты дня — возвращаться можно сколько угодно раз.
        </p>
      </div>

      <article className="diary-paper mx-auto w-full max-w-[900px] overflow-hidden rounded-[28px] border shadow-2xl">
        <div className="diary-paper-content relative px-8 py-8 max-[620px]:px-5">
          <header className="border-b border-stone-300/70 pb-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
              {diary.title}
            </div>
            <h3 className="mt-2 font-serif text-2xl font-semibold capitalize text-stone-900">
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
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-all disabled:opacity-50 ${selected ? 'border-stone-700 bg-stone-800 text-stone-50 shadow-sm' : 'border-stone-300 bg-white/55 text-stone-600 hover:bg-white/85'}`}
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

          {isLoading ? (
            <div className="flex min-h-52 items-center justify-center text-stone-500">
              <LoaderCircle className="mr-2 size-4 animate-spin" /> Загружаем страницу…
            </div>
          ) : (
            <div className="mt-7 space-y-6">
              {(day?.entries ?? []).length === 0 && (
                <div className="py-8 text-center font-serif text-sm italic text-stone-500">
                  Здесь пока тихо. Добавьте первую мысль этого дня.
                </div>
              )}

              {(day?.entries ?? []).map((entry) => (
                <div key={entry.id} className="group relative grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4">
                  <time className="pt-1 font-mono text-xs text-stone-400">
                    {formatDiaryTime(entry.occurredAt)}
                  </time>
                  <div className="min-w-0">
                    {editingId === entry.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingText}
                          maxLength={8000}
                          rows={3}
                          className="w-full resize-y rounded-xl border border-stone-300 bg-white/80 px-3 py-2 text-sm leading-7 text-stone-800 outline-none focus:border-stone-500"
                          onChange={(event) => setEditingText(event.target.value)}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg bg-stone-800 px-2.5 py-1.5 text-xs text-white"
                            onClick={() => void saveEdit()}
                          >
                            <Check className="size-3.5" /> Сохранить
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white/60 px-2.5 py-1.5 text-xs text-stone-600"
                            onClick={() => {
                              setEditingId(null)
                              setEditingText('')
                            }}
                          >
                            <X className="size-3.5" /> Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="diary-handwriting whitespace-pre-wrap break-words text-[15px] leading-8 text-stone-800">
                          {entry.text}
                        </p>
                        <div className="mt-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                          <button
                            type="button"
                            aria-label="Редактировать запись"
                            className="rounded-md p-1.5 text-stone-400 hover:bg-stone-900/5 hover:text-stone-700"
                            onClick={() => {
                              setEditingId(entry.id)
                              setEditingText(entry.text)
                            }}
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="Удалить запись"
                            className="rounded-md p-1.5 text-stone-400 hover:bg-red-500/10 hover:text-red-700"
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

              <div className="border-t border-stone-300/70 pt-5">
                <textarea
                  value={draft}
                  maxLength={8000}
                  rows={3}
                  className="diary-handwriting w-full resize-y rounded-2xl border border-stone-300 bg-white/55 px-4 py-3 text-[15px] leading-8 text-stone-800 outline-none placeholder:text-stone-400 focus:border-stone-500 focus:bg-white/75"
                  placeholder="Что хочется запомнить?"
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                      event.preventDefault()
                      void addEntry()
                    }
                  }}
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-stone-400">Ctrl + Enter — сохранить</span>
                  <button
                    type="button"
                    disabled={isSaving || !draft.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-stone-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => void addEntry()}
                  >
                    {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    Добавить запись
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="mt-5 rounded-xl border border-red-300 bg-red-50/80 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      </article>

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
