import { ArrowRight, BookOpen, CalendarDays } from 'lucide-react'

import type { DiarySummary } from '../../../../../shared/contracts/diary'
import { formatShortDate } from '../lib/diary-ui'
import { DiaryIcon } from './DiaryIcon'

export function DiaryLibrary({
  diaries,
  onOpenDiary
}: {
  diaries: DiarySummary[]
  onOpenDiary: (diary: DiarySummary) => void
}): React.JSX.Element {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[var(--app-text)]">Мои дневники</h2>
        <p className="mt-1 text-sm text-[var(--app-muted)]">
          Каждая книга хранит собственные страницы, настроение, календарь и историю.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6 max-[1050px]:grid-cols-2 max-[650px]:grid-cols-1">
        {diaries.map((diary) => (
          <button
            key={diary.id}
            type="button"
            className="diary-cover-card group p-0 text-left"
            aria-label={`Открыть дневник «${diary.title}»`}
            onClick={() => onOpenDiary(diary)}
          >
            <div className="flex min-h-[17rem] flex-col p-6 pl-8">
              <div className="flex items-start justify-between gap-4">
                <span className="flex size-12 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-violet-300 shadow-inner shadow-violet-500/5">
                  <DiaryIcon name={diary.icon} className="size-6" />
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="size-5 text-[var(--app-muted)] transition-transform group-hover:translate-x-1 group-hover:text-violet-300"
                />
              </div>

              <div className="mt-7 flex-1">
                <div className="text-[10px] font-semibold tracking-[0.2em] text-[var(--app-muted)] uppercase">
                  Дневник
                </div>
                <h3 className="mt-2 max-w-[15rem] text-xl font-semibold tracking-tight text-[var(--app-text)]">
                  {diary.title}
                </h3>
                <div className="mt-2 flex items-center gap-2 text-xs text-[var(--app-muted)]">
                  <CalendarDays aria-hidden="true" className="size-3.5" />
                  Создан {formatShortDate(diary.createdAt)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-[var(--app-border)] bg-black/[0.06] px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] text-[var(--app-muted)]">
                    <BookOpen aria-hidden="true" className="size-3.5" /> Страницы
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[var(--app-text)]">
                    {diary.pageCount}
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--app-border)] bg-black/[0.06] px-3 py-2.5">
                  <div className="text-[11px] text-[var(--app-muted)]">Записи</div>
                  <div className="mt-1 text-sm font-semibold text-[var(--app-text)]">
                    {diary.entryCount}
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-[var(--app-border)] pt-3 text-[11px] text-[var(--app-muted)]">
                Последняя активность: {formatShortDate(diary.lastActivityAt)}
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
