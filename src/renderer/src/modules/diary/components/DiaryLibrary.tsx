import { ArrowRight, BookOpen, Plus } from 'lucide-react'

import type { DiarySummary } from '../../../../../shared/contracts/diary'
import { formatShortDate } from '../lib/diary-ui'
import { DiaryIcon } from './DiaryIcon'

export function DiaryLibrary({
  diaries,
  onOpenDiary,
  onCreateDiary
}: {
  diaries: DiarySummary[]
  onOpenDiary: (diary: DiarySummary) => void
  onCreateDiary: () => void
}): React.JSX.Element {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4 max-[620px]:flex-col max-[620px]:items-start">
        <div>
          <h2 className="text-lg font-semibold text-[var(--app-text)]">Мои дневники</h2>
          <p className="mt-1 text-sm text-[var(--app-muted)]">
            Отдельные книги для разных частей жизни. У каждого дневника своя история, календарь и
            отчёты.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-400"
          onClick={onCreateDiary}
        >
          <Plus aria-hidden="true" className="size-4" />
          Новый дневник
        </button>
      </div>

      <div className="grid grid-cols-3 gap-5 max-[1050px]:grid-cols-2 max-[650px]:grid-cols-1">
        {diaries.map((diary) => (
          <button
            key={diary.id}
            type="button"
            className="group relative min-h-64 overflow-hidden rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-0 text-left shadow-[var(--app-shadow-card)] transition-transform outline-none hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-violet-500/40"
            onClick={() => onOpenDiary(diary)}
          >
            <div className="absolute inset-y-0 left-0 w-3 border-r border-violet-500/15 bg-violet-500/10" />
            <div className="flex h-full min-h-64 flex-col p-5 pl-7">
              <div className="flex items-start justify-between gap-4">
                <span className="flex size-12 items-center justify-center rounded-2xl border border-violet-500/15 bg-violet-500/10 text-violet-300 shadow-inner">
                  <DiaryIcon name={diary.icon} className="size-6" />
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="size-5 text-[var(--app-muted)] transition-transform group-hover:translate-x-1 group-hover:text-violet-300"
                />
              </div>

              <div className="mt-8 flex-1">
                <h3 className="text-xl font-semibold tracking-tight text-[var(--app-text)]">
                  {diary.title}
                </h3>
                <div className="mt-2 flex items-center gap-2 text-xs text-[var(--app-muted)]">
                  <BookOpen aria-hidden="true" className="size-3.5" />
                  {diary.pageCount} страниц · {diary.entryCount} записей
                </div>
              </div>

              <div className="mt-5 border-t border-[var(--app-border)] pt-3 text-xs text-[var(--app-muted)]">
                Последняя активность: {formatShortDate(diary.lastActivityAt)}
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
