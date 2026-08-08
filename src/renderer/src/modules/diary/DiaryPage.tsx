import {
  BarChart3,
  BookHeart,
  BookOpen,
  CalendarDays,
  Library,
  LoaderCircle,
  Plus,
  Settings2,
  SunMedium
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type { DiarySummary } from '../../../../shared/contracts/diary'
import { DeleteConfirmationDialog } from '../../shared/ui/DeleteConfirmationDialog'
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
    void loadOverview()
  }, [loadOverview])

  useEffect(() => {
    if (!resourceId) return
    const target = diarySections.find((item) => item.id === resourceId)
    if (target && (!target.needsDiary || selectedDiaryId)) setSection(target.id)
    onResourceHandled?.()
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
      <main className="h-full overflow-y-auto bg-[var(--app-workspace)] px-8 py-7 max-[700px]:px-4 max-[700px]:py-5">
        <div className="mx-auto flex min-h-72 w-full max-w-[1240px] items-center justify-center text-sm text-[var(--app-muted)]">
          <LoaderCircle className="mr-2 size-4 animate-spin" /> Загружаем дневники…
        </div>
      </main>
    )
  }

  return (
    <main className="h-full overflow-y-auto bg-[var(--app-workspace)] px-8 py-7 max-[700px]:px-4 max-[700px]:py-5">
      <div className="mx-auto w-full max-w-[1240px]">
        <header className="mb-5 overflow-hidden rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-[var(--app-shadow-card)]">
          <div className="flex items-center justify-between gap-5 max-[760px]:flex-col max-[760px]:items-start">
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-violet-300 shadow-inner shadow-violet-500/5">
                <BookHeart aria-hidden="true" className="size-6" />
              </span>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--app-text)]">
                  Дневник
                </h1>
                {selectedDiary && section !== 'library' && (
                  <div className="mt-1 truncate text-xs text-[var(--app-muted)]">
                    {selectedDiary.title}
                  </div>
                )}
              </div>
            </div>

            {section === 'library' ? (
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-400"
                onClick={() => setDialogMode('create')}
              >
                <Plus className="size-4" /> Новый дневник
              </button>
            ) : selectedDiary ? (
              <button
                type="button"
                className="rounded-xl border border-[var(--app-border)] bg-[var(--app-control)] px-4 py-2 text-sm text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                onClick={() => setSection('library')}
              >
                Сменить дневник
              </button>
            ) : null}
          </div>

          <nav
            className="mt-4 flex gap-1 overflow-x-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-1.5"
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
        </header>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-200"
          >
            {error}
          </div>
        )}

        {section === 'library' && (
          <DiaryLibrary
            diaries={diaries}
            onOpenDiary={openDiary}
            onCreateDiary={() => setDialogMode('create')}
          />
        )}

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
            diary={selectedDiary}
            canDelete={diaries.length > 1}
            onEdit={() => setDialogMode('edit')}
            onDelete={() => setDeleteOpen(true)}
          />
        )}
      </div>

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
    </main>
  )
}
