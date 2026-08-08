import { CalendarDays, Pencil, Trash2 } from 'lucide-react'

import type { DiarySummary } from '../../../../../shared/contracts/diary'
import { formatShortDate } from '../lib/diary-ui'
import { DiaryIcon } from './DiaryIcon'

export function DiarySettings({
  diary,
  canDelete,
  onEdit,
  onDelete
}: {
  diary: DiarySummary
  canDelete: boolean
  onEdit: () => void
  onDelete: () => void
}): React.JSX.Element {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[var(--app-text)]">Настройки дневника</h2>
        <p className="mt-1 text-sm text-[var(--app-muted)]">Название и иконка относятся только к этой книге. Цветовой настройки у дневника нет.</p>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_20rem] gap-5 max-[900px]:grid-cols-1">
        <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)]">
          <div className="flex items-start gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-violet-500/15 bg-violet-500/10 text-violet-300">
              <DiaryIcon name={diary.icon} className="size-7" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-xl font-semibold text-[var(--app-text)]">{diary.title}</h3>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--app-muted)]">
                <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" /> Создан {formatShortDate(diary.createdAt)}</span>
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
          <p className="mt-2 text-xs leading-5 text-[var(--app-muted)]">
            Вместе с дневником удалятся все его страницы, настроения и записи. Это действие нельзя отменить.
          </p>
          {!canDelete && (
            <div className="mt-3 rounded-xl border border-amber-500/15 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-200">
              В приложении всегда должен оставаться хотя бы один дневник.
            </div>
          )}
          <button
            type="button"
            disabled={!canDelete}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-35"
            onClick={onDelete}
          >
            <Trash2 className="size-4" /> Удалить дневник
          </button>
        </div>
      </div>
    </section>
  )
}
