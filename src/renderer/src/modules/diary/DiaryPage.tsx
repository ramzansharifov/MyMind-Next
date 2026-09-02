import { Tooltip } from '../../shared/ui/tooltip'
import {
  BarChart3,
  BookHeart,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Library,
  LoaderCircle,
  Plus,
  Settings2,
  SunMedium
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type { DiarySummary } from '../../../../shared/contracts/diary'
import { DeleteConfirmationDialog } from '../../shared/ui/DeleteConfirmationDialog'
import { ModuleHeader } from '../../shared/ui/ModuleHeader'
import { StandardModulePage } from '../../shared/ui/StandardModulePage'
import { diaryClient } from './api/diary-client'
import { DiaryCalendar } from './components/DiaryCalendar'
import { DiaryDialog } from './components/DiaryDialog'
import { DiaryLibrary } from './components/DiaryLibrary'
import { DiaryReader } from './components/DiaryReader'
import { DiaryReports } from './components/DiaryReports'
import { DiarySettings } from './components/DiarySettings'
import { DiaryToday } from './components/DiaryToday'
import { getDiaryErrorMessage, localDayKey } from './lib/diary-ui'
import './diary.css'

type DiarySection = 'library' | 'today' | 'reader' | 'calendar' | 'reports' | 'settings'

interface DiaryPageProps {
  resourceId?: string | null
  onResourceHandled?: () => void
}

const diarySections: Array<{
  id: DiarySection
  label: string
  icon: typeof Library
  needsDiary?: boolean
}> = [
  { id: 'library', label: 'Мои дневники', icon: Library },
  { id: 'today', label: 'Сегодня', icon: SunMedium, needsDiary: true },
  { id: 'reader', label: 'Просмотр', icon: BookOpen, needsDiary: true },
  { id: 'calendar', label: 'Календарь', icon: CalendarDays, needsDiary: true },
  { id: 'reports', label: 'Отчёты', icon: BarChart3, needsDiary: true },
  { id: 'settings', label: 'Настройки', icon: Settings2, needsDiary: true }
]

export function DiaryPage({ resourceId, onResourceHandled }: DiaryPageProps): React.JSX.Element {
  const [diaries, setDiaries] = useState<DiarySummary[]>([])
  const [selectedDiaryId, setSelectedDiaryId] = useState<string | null>(null)
  const [section, setSection] = useState<DiarySection>('library')
  const [readerDayKey, setReaderDayKey] = useState<string | null>(null)
  const [calendarCursor, setCalendarCursor] = useState(() => new Date())
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedDiary = useMemo(
    () => diaries.find((diary) => diary.id === selectedDiaryId) ?? null,
    [diaries, selectedDiaryId]
  )

  const calendarMonthTitle = useMemo(
    () =>
      new Intl.DateTimeFormat('ru-RU', {
        month: 'long',
        year: 'numeric'
      }).format(calendarCursor),
    [calendarCursor]
  )

  const loadOverview = useCallback(async (): Promise<void> => {
    setError(null)
    try {
      const overview = await diaryClient.listOverview()
      setDiaries(overview.diaries)
      setSelectedDiaryId((current) =>
        current && overview.diaries.some((diary) => diary.id === current) ? current : null
      )
    } catch (reason) {
      setError(getDiaryErrorMessage(reason))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) void loadOverview()
    })
    return () => {
      cancelled = true
    }
  }, [loadOverview])

  useEffect(() => {
    if (!resourceId) return
    const target = diarySections.find((item) => item.id === resourceId)
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      if (target && (!target.needsDiary || selectedDiaryId)) setSection(target.id)
      onResourceHandled?.()
    })
    return () => {
      cancelled = true
    }
  }, [onResourceHandled, resourceId, selectedDiaryId])

  async function handleChanged(): Promise<void> {
    await loadOverview()
    setRefreshVersion((value) => value + 1)
  }

  function openDiary(diary: DiarySummary): void {
    setSelectedDiaryId(diary.id)
    setReaderDayKey(null)
    setSection('today')
  }

  function shiftCalendarMonth(offset: number): void {
    setCalendarCursor((date) => new Date(date.getFullYear(), date.getMonth() + offset, 1))
  }

  async function updatePaperAppearance(
    appearance: Pick<DiarySummary, 'paperPattern' | 'paperTone' | 'coverTone'>
  ): Promise<void> {
    if (!selectedDiary) return
    setError(null)
    try {
      const saved = await diaryClient.updateAppearance({ id: selectedDiary.id, ...appearance })
      setDiaries((current) => current.map((item) => (item.id === saved.id ? saved : item)))
    } catch (reason) {
      setError(getDiaryErrorMessage(reason))
      throw reason
    }
  }

  async function removeDiary(): Promise<void> {
    if (!selectedDiary) return
    setIsDeleting(true)
    setError(null)
    try {
      await diaryClient.deleteDiary({ id: selectedDiary.id })
      setDeleteOpen(false)
      setSelectedDiaryId(null)
      setReaderDayKey(null)
      setSection('library')
      await handleChanged()
    } catch (reason) {
      setError(getDiaryErrorMessage(reason))
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <StandardModulePage>
        <div className="flex min-h-72 items-center justify-center text-sm text-[var(--app-muted)]">
          <LoaderCircle className="mr-2 size-4 animate-spin" /> Загружаем дневники…
        </div>
      </StandardModulePage>
    )
  }

  const headerActions =
    section === 'library' ? (
      <button
        type="button"
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-400"
        onClick={() => setDialogMode('create')}
      >
        <Plus className="size-4" /> Новый дневник
      </button>
    ) : selectedDiary && section === 'calendar' ? (
      <div
        className="inline-flex h-11 items-center gap-1 rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-1 shadow-inner shadow-black/5"
        aria-label="Выбор месяца календаря"
      >
        <Tooltip content="Предыдущий месяц" side="top">
          <button
            type="button"
            aria-label="Предыдущий месяц"
            className="flex size-9 items-center justify-center rounded-xl text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-violet-500/35 focus-visible:outline-none"
            onClick={() => shiftCalendarMonth(-1)}
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>
        </Tooltip>
        <div className="min-w-36 px-2 text-center text-sm font-semibold text-[var(--app-text)] capitalize tabular-nums max-[420px]:min-w-28">
          {calendarMonthTitle}
        </div>
        <Tooltip content="Следующий месяц" side="top">
          <button
            type="button"
            aria-label="Следующий месяц"
            className="flex size-9 items-center justify-center rounded-xl text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-violet-500/35 focus-visible:outline-none"
            onClick={() => shiftCalendarMonth(1)}
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </Tooltip>
      </div>
    ) : selectedDiary ? (
      <button
        type="button"
        className="h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 text-sm text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
        onClick={() => setSection('library')}
      >
        Сменить дневник
      </button>
    ) : undefined

  return (
    <StandardModulePage>
      <ModuleHeader
        icon={BookHeart}
        title="Дневник"
        description={
          selectedDiary && section !== 'library'
            ? selectedDiary.title
            : 'Личные записи, календарь, настроение и история в одном пространстве.'
        }
        className="mb-5"
        actions={headerActions}
      >
        <nav
          className="flex gap-1 overflow-x-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-1.5"
          aria-label="Навигация дневника"
        >
          {diarySections
            .filter((item) => !item.needsDiary || selectedDiary)
            .map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-current={section === id ? 'page' : undefined}
                className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-violet-500/35 ${section === id ? 'bg-violet-500 text-white shadow-sm' : 'text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'}`}
                onClick={() => setSection(id)}
              >
                <Icon aria-hidden="true" className="size-4" /> {label}
              </button>
            ))}
        </nav>
      </ModuleHeader>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-200"
        >
          {error}
        </div>
      )}

      {section === 'library' && <DiaryLibrary diaries={diaries} onOpenDiary={openDiary} />}

      {selectedDiary && section === 'today' && (
        <DiaryToday diary={selectedDiary} dayKey={localDayKey()} onChanged={handleChanged} />
      )}

      {selectedDiary && section === 'reader' && (
        <DiaryReader
          diary={selectedDiary}
          requestedDayKey={readerDayKey}
          refreshVersion={refreshVersion}
          onDayChange={setReaderDayKey}
        />
      )}

      {selectedDiary && section === 'calendar' && (
        <DiaryCalendar
          diary={selectedDiary}
          refreshVersion={refreshVersion}
          cursor={calendarCursor}
          onOpenDay={(dayKey) => {
            setReaderDayKey(dayKey)
            setSection('reader')
          }}
        />
      )}

      {selectedDiary && section === 'reports' && (
        <DiaryReports diary={selectedDiary} refreshVersion={refreshVersion} />
      )}

      {selectedDiary && section === 'settings' && (
        <DiarySettings
          key={selectedDiary.id}
          diary={selectedDiary}
          canDelete={diaries.length > 1}
          onEdit={() => setDialogMode('edit')}
          onAppearanceChange={updatePaperAppearance}
          onDelete={() => setDeleteOpen(true)}
        />
      )}

      <DiaryDialog
        open={dialogMode !== null}
        diary={dialogMode === 'edit' ? selectedDiary : null}
        onOpenChange={(open) => {
          if (!open) setDialogMode(null)
        }}
        onSaved={async (saved) => {
          await handleChanged()
          if (dialogMode === 'create') {
            setSelectedDiaryId(saved.id)
            setSection('today')
          }
        }}
      />

      <DeleteConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Удалить дневник?"
        subject={selectedDiary?.title}
        description="Все страницы, настроения и записи этого дневника будут удалены."
        confirmLabel="Удалить дневник"
        isSubmitting={isDeleting}
        error={error}
        disabledReason={diaries.length <= 1 ? 'Нельзя удалить последний дневник.' : null}
        onConfirm={removeDiary}
      />
    </StandardModulePage>
  )
}
