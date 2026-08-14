import { CalendarDays, Check, LoaderCircle, Palette, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  DIARY_PAPER_PATTERNS,
  DIARY_PAPER_TONES,
  type DiaryPaperPattern,
  type DiaryPaperTone,
  type DiarySummary
} from '../../../../../shared/contracts/diary'
import '../diary-premium.css'
import { formatShortDate } from '../lib/diary-ui'
import { diaryPaperPatternMeta, diaryPaperToneMeta, getDiaryPaperStyle } from '../lib/diary-paper'
import { DiaryIcon } from './DiaryIcon'

export function DiarySettings({
  diary,
  canDelete,
  onEdit,
  onAppearanceChange,
  onDelete
}: {
  diary: DiarySummary
  canDelete: boolean
  onEdit: () => void
  onAppearanceChange: (
    appearance: Pick<DiarySummary, 'paperPattern' | 'paperTone'>
  ) => Promise<void>
  onDelete: () => void
}): React.JSX.Element {
  const [paperPattern, setPaperPattern] = useState<DiaryPaperPattern>(diary.paperPattern)
  const [paperTone, setPaperTone] = useState<DiaryPaperTone>(diary.paperTone)
  const [isSavingAppearance, setIsSavingAppearance] = useState(false)

  useEffect(() => {
    setPaperPattern(diary.paperPattern)
    setPaperTone(diary.paperTone)
  }, [diary.paperPattern, diary.paperTone])

  async function saveAppearance(
    nextPattern: DiaryPaperPattern,
    nextTone: DiaryPaperTone
  ): Promise<void> {
    if (isSavingAppearance || (nextPattern === paperPattern && nextTone === paperTone)) return

    const previousPattern = paperPattern
    const previousTone = paperTone
    setPaperPattern(nextPattern)
    setPaperTone(nextTone)
    setIsSavingAppearance(true)
    try {
      await onAppearanceChange({ paperPattern: nextPattern, paperTone: nextTone })
    } catch {
      setPaperPattern(previousPattern)
      setPaperTone(previousTone)
    } finally {
      setIsSavingAppearance(false)
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[var(--app-text)]">Настройки дневника</h2>
        <p className="mt-1 text-sm text-[var(--app-muted)]">
          Название, иконка и оформление бумаги сохраняются отдельно для каждого дневника.
        </p>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_20rem] gap-5 max-[900px]:grid-cols-1">
        <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)]">
          <div className="flex items-start gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-violet-500/15 bg-violet-500/10 text-violet-300">
              <DiaryIcon name={diary.icon} className="size-7" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-xl font-semibold text-[var(--app-text)]">
                {diary.title}
              </h3>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--app-muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" /> Создан {formatShortDate(diary.createdAt)}
                </span>
                <span>{diary.pageCount} страниц</span>
                <span>{diary.entryCount} записей</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-control)] px-4 py-2 text-sm font-medium text-[var(--app-text)] transition-colors hover:bg-[var(--app-control-hover)]"
            onClick={onEdit}
          >
            <Pencil className="size-4" /> Изменить название и иконку
          </button>
        </div>

        <div className="rounded-[24px] border border-red-500/15 bg-red-500/[0.035] p-5">
          <h3 className="font-semibold text-red-200">Удаление дневника</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
            Удаляются все страницы, настроения и записи. Действие необратимо.
          </p>
          <button
            type="button"
            disabled={!canDelete}
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-35"
            onClick={onDelete}
          >
            <Trash2 className="size-4" /> Удалить дневник
          </button>
          {!canDelete && (
            <p className="mt-2 text-xs text-[var(--app-muted)]">
              Последний дневник удалить нельзя.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/15 bg-violet-500/10 text-violet-300">
              <Palette className="size-5" />
            </span>
            <div>
              <h3 className="font-semibold text-[var(--app-text)]">Оформление бумаги</h3>
              <p className="mt-1 text-sm text-[var(--app-muted)]">
                Выберите разметку и оттенок листов. Изменение применяется ко всему дневнику.
              </p>
            </div>
          </div>
          {isSavingAppearance && (
            <span className="inline-flex shrink-0 items-center gap-2 text-xs text-[var(--app-muted)]">
              <LoaderCircle className="size-3.5 animate-spin" /> Сохраняем…
            </span>
          )}
        </div>

        <div className="mt-5 grid grid-cols-[minmax(0,1fr)_minmax(17rem,24rem)] gap-7 max-[900px]:grid-cols-1">
          <div className="space-y-6">
            <fieldset disabled={isSavingAppearance}>
              <legend className="text-sm font-medium text-[var(--app-text)]">Разметка</legend>
              <div className="mt-3 grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
                {DIARY_PAPER_PATTERNS.map((pattern) => {
                  const meta = diaryPaperPatternMeta[pattern]
                  const selected = paperPattern === pattern
                  return (
                    <button
                      key={pattern}
                      type="button"
                      aria-pressed={selected}
                      className={`group relative flex min-h-24 items-center gap-3 rounded-2xl border p-3 text-left transition-colors outline-none disabled:cursor-wait ${selected ? 'border-violet-500/45 bg-violet-500/[0.08]' : 'border-[var(--app-border)] bg-[var(--app-control)] hover:bg-[var(--app-control-hover)]'} focus-visible:ring-2 focus-visible:ring-violet-500/30`}
                      onClick={() => void saveAppearance(pattern, paperTone)}
                    >
                      <span
                        data-paper-pattern={pattern}
                        className="diary-paper-pattern-surface diary-paper-pattern-thumbnail shrink-0"
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-[var(--app-text)]">
                          {meta.label}
                        </span>
                        <span className="mt-1 block text-xs leading-4 text-[var(--app-muted)]">
                          {meta.description}
                        </span>
                      </span>
                      {selected && (
                        <span className="absolute top-2.5 right-2.5 flex size-5 items-center justify-center rounded-full bg-violet-500 text-white">
                          <Check className="size-3" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <fieldset disabled={isSavingAppearance}>
              <legend className="text-sm font-medium text-[var(--app-text)]">Цвет бумаги</legend>
              <div className="mt-3 grid grid-cols-5 gap-2 max-[620px]:grid-cols-3">
                {DIARY_PAPER_TONES.map((tone) => {
                  const meta = diaryPaperToneMeta[tone]
                  const selected = paperTone === tone
                  return (
                    <button
                      key={tone}
                      type="button"
                      aria-pressed={selected}
                      title={meta.description}
                      className={`relative flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-center transition-colors outline-none disabled:cursor-wait ${selected ? 'border-violet-500/45 bg-violet-500/[0.08]' : 'border-[var(--app-border)] bg-[var(--app-control)] hover:bg-[var(--app-control-hover)]'} focus-visible:ring-2 focus-visible:ring-violet-500/30`}
                      onClick={() => void saveAppearance(paperPattern, tone)}
                    >
                      <span
                        className="size-9 rounded-full border shadow-sm"
                        style={{ backgroundColor: meta.paper, borderColor: meta.border }}
                        aria-hidden="true"
                      />
                      <span className="text-[11px] leading-4 font-medium text-[var(--app-muted)]">
                        {meta.label}
                      </span>
                      {selected && (
                        <span className="absolute top-2 right-2 flex size-4 items-center justify-center rounded-full bg-violet-500 text-white">
                          <Check className="size-2.5" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          </div>

          <div>
            <div className="mb-2 text-xs font-medium tracking-wide text-[var(--app-muted)] uppercase">
              Предпросмотр
            </div>
            <div
              className="diary-paper diary-premium-paper diary-paper-preview border"
              data-paper-tone={paperTone}
              style={getDiaryPaperStyle(paperTone)}
            >
              <div className="diary-paper-preview-header">Четверг, 14 августа</div>
              <div
                data-paper-pattern={paperPattern}
                className="diary-ruled-surface diary-paper-pattern-surface diary-paper-preview-surface"
              >
                <div className="diary-paper-preview-entry">
                  <span>09:15</span>
                  <strong className="diary-handwriting">
                    Спокойное утро и хороший план на день.
                  </strong>
                </div>
                <div className="diary-paper-preview-entry">
                  <span>18:40</span>
                  <strong className="diary-handwriting">Запомнить эту мысль ✦</strong>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--app-muted)]">
              Так будут выглядеть листы в разделах «Сегодня» и «Просмотр».
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
