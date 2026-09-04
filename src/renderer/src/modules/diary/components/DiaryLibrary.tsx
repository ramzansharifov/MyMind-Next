import { ArrowRight, BookOpen, CalendarDays, PenLine } from 'lucide-react'

import type { DiarySummary } from '../../../../../shared/contracts/diary'
import { formatShortDate } from '../lib/diary-ui'
import { DiaryIcon } from './DiaryIcon'

const notebookRings = Array.from({ length: 7 }, (_, index) => index)

export function DiaryLibrary({
  diaries,
  onOpenDiary
}: {
  diaries: DiarySummary[]
  onOpenDiary: (diary: DiarySummary) => void
}): React.JSX.Element {
  return (
    <section>
      <div className="grid grid-cols-3 items-start gap-7 max-[1050px]:grid-cols-2 max-[650px]:grid-cols-1">
        {diaries.map((diary) => (
          <button
            key={diary.id}
            type="button"
            className="diary-notebook-card group text-left"
            aria-label={`Открыть дневник «${diary.title}»`}
            onClick={() => onOpenDiary(diary)}
          >
            <span className="diary-notebook-page-block" aria-hidden="true" />
            <span className="diary-notebook-binding" aria-hidden="true">
              {notebookRings.map((ring) => (
                <span key={ring} className="diary-notebook-ring" />
              ))}
            </span>

            <span className="diary-notebook-cover">
              <span className="diary-notebook-cover-shine" aria-hidden="true" />
              <span className="diary-notebook-elastic" aria-hidden="true" />

              <span className="flex min-h-[18.5rem] flex-col px-7 py-7 pl-9">
                <span className="flex items-start justify-between gap-4">
                  <span className="diary-notebook-emblem">
                    <DiaryIcon name={diary.icon} className="size-6" />
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-5 text-white/55 transition-transform group-hover:translate-x-1 group-hover:text-white/85"
                  />
                </span>

                <span className="mt-8 flex-1">
                  <span className="block text-[10px] font-semibold tracking-[0.24em] text-white/45 uppercase">
                    Дневник
                  </span>
                  <span className="mt-2 block max-w-[15rem] text-[1.35rem] leading-tight font-semibold tracking-tight text-white">
                    {diary.title}
                  </span>
                  <span className="mt-3 flex items-center gap-2 text-xs text-white/55">
                    <CalendarDays aria-hidden="true" className="size-3.5" />
                    Создан {formatShortDate(diary.createdAt)}
                  </span>
                </span>

                <span className="diary-notebook-stats">
                  <span className="flex items-center gap-2">
                    <BookOpen aria-hidden="true" className="size-4" />
                    <span>
                      <strong>{diary.pageCount}</strong> стр.
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <PenLine aria-hidden="true" className="size-4" />
                    <span>
                      <strong>{diary.entryCount}</strong> записей
                    </span>
                  </span>
                </span>

                <span className="mt-4 block border-t border-white/10 pt-3 text-[11px] text-white/45">
                  Последняя активность: {formatShortDate(diary.lastActivityAt)}
                </span>
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
