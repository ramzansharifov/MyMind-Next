import { Tooltip } from '../../shared/ui/tooltip'
import {
  BarChart3,
  Braces,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Target,
  Utensils,
  X,
  type LucideIcon
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import type {
  ImportNutritionMealsInput,
  ImportNutritionMealsResult,
  NutritionLogEntryRecord,
  NutritionMealType,
  NutritionOverview,
  NutritionReport,
  SetNutritionTargetsInput,
  UpdateNutritionLogEntryInput
} from '../../../../shared/contracts/nutrition'
import { cn } from '../../shared/lib/cn'
import { AppDateField } from '../../shared/ui/AppDateField'
import { AppSelect } from '../../shared/ui/AppSelect'
import { DeleteConfirmationDialog } from '../../shared/ui/DeleteConfirmationDialog'
import { StandardModulePage } from '../../shared/ui/StandardModulePage'
import { nutritionClient } from './api/nutrition-client'
import { NutritionDiaryView } from './components/NutritionDiaryView'
import { NutritionEntryEditDialog } from './components/NutritionEntryEditDialog'
import { NutritionGoalView } from './components/NutritionGoalView'
import { NutritionMealsJsonImportDialog } from './components/NutritionMealsJsonImportDialog'
import {
  NutritionProgressView,
  type NutritionProgressPeriod
} from './components/NutritionProgressView'
import { NUTRITION_MEAL_OPTIONS } from './nutrition-options'
import {
  nutritionDaysAgoKey,
  nutritionErrorMessage,
  nutritionLocalDateKey,
  shiftNutritionDate
} from './nutrition-utils'

type NutritionTab = 'today' | 'diary' | 'goal' | 'progress'

const TABS: Array<{ id: NutritionTab; label: string; icon: LucideIcon }> = [
  { id: 'today', label: 'Сегодня', icon: Utensils },
  { id: 'diary', label: 'Дневник', icon: CalendarDays },
  { id: 'goal', label: 'Цель', icon: Target },
  { id: 'progress', label: 'Прогресс', icon: BarChart3 }
]

interface NutritionPageProps {
  resourceId?: string | null
  onResourceHandled?: () => void
}

export function NutritionPage({
  resourceId,
  onResourceHandled
}: NutritionPageProps): React.JSX.Element {
  const [tab, setTab] = useState<NutritionTab>('today')
  const [diaryDate, setDiaryDate] = useState(nutritionLocalDateKey())
  const todayDate = nutritionLocalDateKey()
  const overviewDate = tab === 'today' ? todayDate : diaryDate
  const [overview, setOverview] = useState<NutritionOverview | null>(null)
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<NutritionLogEntryRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<NutritionLogEntryRecord | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isBusy, setIsBusy] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importNotice, setImportNotice] = useState<string | null>(null)
  const handledResourceRef = useRef<string | null>(null)

  const [reportPeriod, setReportPeriod] = useState<NutritionProgressPeriod>('30')
  const [reportDateFrom, setReportDateFrom] = useState(nutritionDaysAgoKey(29))
  const [reportDateTo, setReportDateTo] = useState(nutritionLocalDateKey())
  const [reportMealType, setReportMealType] = useState<'all' | NutritionMealType>('all')
  const [report, setReport] = useState<NutritionReport | null>(null)
  const [reportLoading, setReportLoading] = useState(false)

  const loadOverview = useCallback(async (): Promise<void> => {
    try {
      const nextOverview = await nutritionClient.listOverview({ date: overviewDate })
      setOverview(nextOverview)
      setError(null)
    } catch (reason) {
      setError(nutritionErrorMessage(reason))
    } finally {
      setIsLoading(false)
    }
  }, [overviewDate])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setIsLoading(true)
      void loadOverview()
    }, 0)
    return () => window.clearTimeout(timerId)
  }, [loadOverview])

  useEffect(() => {
    if (!overview || !resourceId || handledResourceRef.current === resourceId) return

    const timerId = window.setTimeout(() => {
      if (handledResourceRef.current === resourceId) return
      handledResourceRef.current = resourceId
      const entry = overview.entries.find((candidate) => candidate.id === resourceId)
      if (entry) {
        setEditingLog(entry)
        if (entry.date === nutritionLocalDateKey()) {
          setTab('today')
        } else {
          setDiaryDate(entry.date)
          setTab('diary')
        }
      }
      onResourceHandled?.()
    }, 0)
    return () => window.clearTimeout(timerId)
  }, [onResourceHandled, overview, resourceId])

  async function withBusy(action: () => Promise<unknown>): Promise<void> {
    setIsBusy(true)
    setError(null)
    try {
      await action()
      await loadOverview()
    } catch (reason) {
      setError(nutritionErrorMessage(reason))
      throw reason
    } finally {
      setIsBusy(false)
    }
  }

  async function importMeals(
    input: ImportNutritionMealsInput
  ): Promise<ImportNutritionMealsResult> {
    setIsBusy(true)
    setError(null)
    setImportNotice(null)
    try {
      const result = await nutritionClient.importMeals(input)
      setImportNotice(`Добавлено позиций: ${result.itemCount}. Приёмов пищи: ${result.mealCount}.`)

      if (input.date === overviewDate) {
        await loadOverview()
      } else if (input.date === nutritionLocalDateKey()) {
        setTab('today')
      } else {
        setDiaryDate(input.date)
        setTab('diary')
      }
      return result
    } catch (reason) {
      setError(nutritionErrorMessage(reason))
      throw reason
    } finally {
      setIsBusy(false)
    }
  }

  async function saveLog(input: UpdateNutritionLogEntryInput): Promise<void> {
    await withBusy(() => nutritionClient.updateLogEntry(input))
  }

  async function saveTargets(input: SetNutritionTargetsInput): Promise<void> {
    await withBusy(() => nutritionClient.setTargets(input))
  }

  async function changeWater(delta: number): Promise<void> {
    if (!overview) return

    const waterMl = Math.max(0, overview.day.waterMl + delta)
    setIsBusy(true)
    setError(null)
    try {
      const day = await nutritionClient.setWater({ date: overview.day.date, waterMl })
      setOverview((current) => (current ? { ...current, day } : current))
    } catch (reason) {
      setError(nutritionErrorMessage(reason))
    } finally {
      setIsBusy(false)
    }
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteTarget) return

    setIsDeleting(true)
    setError(null)
    try {
      await nutritionClient.deleteLogEntry({ id: deleteTarget.id })
      setDeleteTarget(null)
      await loadOverview()
    } catch (reason) {
      setError(nutritionErrorMessage(reason))
    } finally {
      setIsDeleting(false)
    }
  }

  function applyReportPeriod(period: NutritionProgressPeriod): void {
    setReportPeriod(period)
    if (period === 'custom') return

    const days = Number(period)
    setReportDateTo(nutritionLocalDateKey())
    setReportDateFrom(nutritionDaysAgoKey(days - 1))
  }

  const loadReport = useCallback(async (): Promise<void> => {
    if (tab !== 'progress') return

    setReportLoading(true)
    try {
      const nextReport = await nutritionClient.getReport({
        dateFrom: reportDateFrom,
        dateTo: reportDateTo,
        mealType: reportMealType === 'all' ? null : reportMealType,
        sourceType: null,
        foodId: null,
        recipeId: null
      })
      setReport(nextReport)
      setError(null)
    } catch (reason) {
      setError(nutritionErrorMessage(reason))
    } finally {
      setReportLoading(false)
    }
  }, [reportDateFrom, reportDateTo, reportMealType, tab])

  useEffect(() => {
    if (tab !== 'progress') return
    const timerId = window.setTimeout(() => void loadReport(), 80)
    return () => window.clearTimeout(timerId)
  }, [loadReport, tab])

  if (isLoading || !overview) {
    return (
      <StandardModulePage>
        <div className="flex min-h-72 items-center justify-center text-sm text-[var(--app-muted)]">
          Загружаем питание…
        </div>
      </StandardModulePage>
    )
  }

  const headerAction =
    tab === 'today' || tab === 'diary' ? (
      <Tooltip content="Добавить из JSON" side="bottom">
        <button
          type="button"
          aria-label="Добавить из JSON"
          className="bg-accent-500 hover:bg-accent-400 focus-visible:ring-accent-500/35 flex size-10 shrink-0 items-center justify-center rounded-xl text-white transition-colors outline-none focus-visible:ring-2"
          onClick={() => setJsonDialogOpen(true)}
        >
          <Braces className="size-[18px]" />
        </button>
      </Tooltip>
    ) : undefined

  return (
    <StandardModulePage>
      <header
        data-module-header
        className="relative isolate flex flex-wrap items-center gap-3 overflow-hidden rounded-[28px] border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-[var(--app-shadow-card)] max-[700px]:p-5 max-[480px]:gap-2"
      >
        <div
          aria-hidden="true"
          className="bg-accent-500/10 pointer-events-none absolute -top-32 right-8 -z-10 size-80 rounded-full blur-3xl"
        />
        <div
          aria-hidden="true"
          className="bg-accent-900/10 pointer-events-none absolute -bottom-44 -left-24 -z-10 size-80 rounded-full blur-3xl"
        />
        <h1 className="sr-only">Питание</h1>
        <span className="border-accent-500/20 bg-accent-500/10 text-accent-300 shadow-accent-500/5 flex size-12 shrink-0 items-center justify-center rounded-2xl border shadow-inner">
          <Utensils className="size-6" />
        </span>

        {tab === 'diary' && (
          <div
            role="group"
            aria-label="Дата дневника питания"
            className="flex min-w-0 items-center gap-1 max-[640px]:order-last max-[640px]:w-full"
          >
            <Tooltip content="Предыдущий день" side="bottom">
              <button
                type="button"
                aria-label="Предыдущий день"
                className="focus-visible:ring-accent-500/35 flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] text-[var(--app-muted)] transition-colors outline-none hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] focus-visible:ring-2"
                onClick={() => setDiaryDate(shiftNutritionDate(diaryDate, -1))}
              >
                <ChevronLeft className="size-[18px]" />
              </button>
            </Tooltip>
            <AppDateField
              value={diaryDate}
              ariaLabel="Дата дневника питания"
              className="w-[155px] max-[640px]:flex-1"
              onChange={(date) => {
                if (date) setDiaryDate(date)
              }}
            />
            <Tooltip content="Следующий день" side="bottom">
              <button
                type="button"
                aria-label="Следующий день"
                className="focus-visible:ring-accent-500/35 flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] text-[var(--app-muted)] transition-colors outline-none hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] focus-visible:ring-2"
                onClick={() => setDiaryDate(shiftNutritionDate(diaryDate, 1))}
              >
                <ChevronRight className="size-[18px]" />
              </button>
            </Tooltip>
            <Tooltip content="Вернуться к сегодняшнему дню" side="bottom">
              <button
                type="button"
                aria-label="Вернуться к сегодняшнему дню"
                className="focus-visible:ring-accent-500/35 flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] text-[var(--app-muted)] transition-colors outline-none hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] focus-visible:ring-2"
                onClick={() => setDiaryDate(nutritionLocalDateKey())}
              >
                <RotateCcw className="size-[18px]" />
              </button>
            </Tooltip>
          </div>
        )}

        {tab === 'progress' && (
          <div
            role="group"
            aria-label="Фильтры прогресса питания"
            className="flex min-w-0 flex-wrap items-center gap-2 max-[1100px]:order-last max-[1100px]:grid max-[1100px]:w-full max-[1100px]:grid-cols-2"
          >
            <div className="w-[150px] min-w-0 max-[1100px]:w-auto">
              <AppSelect
                ariaLabel="Период прогресса"
                value={reportPeriod}
                options={[
                  { value: '7', label: '7 дней' },
                  { value: '30', label: '30 дней' },
                  { value: '90', label: '90 дней' },
                  { value: '365', label: '365 дней' },
                  { value: 'custom', label: 'Свой период' }
                ]}
                onValueChange={(value) => applyReportPeriod(value as NutritionProgressPeriod)}
              />
            </div>
            <AppDateField
              ariaLabel="Начало периода"
              value={reportDateFrom}
              className="w-[155px] max-[1100px]:w-auto"
              onChange={(date) => {
                if (!date) return
                setReportPeriod('custom')
                setReportDateFrom(date)
              }}
            />
            <AppDateField
              ariaLabel="Конец периода"
              value={reportDateTo}
              className="w-[155px] max-[1100px]:w-auto"
              onChange={(date) => {
                if (!date) return
                setReportPeriod('custom')
                setReportDateTo(date)
              }}
            />
            <div className="w-[190px] min-w-0 max-[1100px]:w-auto">
              <AppSelect
                ariaLabel="Приём пищи в прогрессе"
                value={reportMealType}
                options={[{ value: 'all', label: 'Все приёмы пищи' }, ...NUTRITION_MEAL_OPTIONS]}
                onValueChange={(value) => setReportMealType(value as 'all' | NutritionMealType)}
              />
            </div>
          </div>
        )}

        <div
          role="group"
          aria-label="Вкладки питания"
          className="ml-auto flex h-10 shrink-0 items-center gap-1 rounded-xl bg-[var(--app-workspace)] p-0.5 ring-1 ring-[var(--app-border)] ring-inset"
        >
          {TABS.map((item) => {
            const Icon = item.icon
            return (
              <Tooltip key={item.id} content={item.label} side="bottom">
                <button
                  type="button"
                  aria-label={item.label}
                  aria-pressed={tab === item.id}
                  className={cn(
                    'focus-visible:ring-accent-500/35 flex h-full w-9 shrink-0 items-center justify-center rounded-[10px] transition-colors outline-none focus-visible:ring-2',
                    tab === item.id
                      ? 'bg-accent-500 text-white'
                      : 'text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                  )}
                  onClick={() => setTab(item.id)}
                >
                  <Icon className="size-[18px]" />
                </button>
              </Tooltip>
            )
          })}
        </div>
        {headerAction}
      </header>

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          <span>{error}</span>
          <Tooltip content="Закрыть ошибку" side="top">
            <button
              type="button"
              aria-label="Закрыть ошибку"
              className="flex size-7 items-center justify-center rounded-lg hover:bg-red-500/10"
              onClick={() => setError(null)}
            >
              <X className="size-4" />
            </button>
          </Tooltip>
        </div>
      )}

      {importNotice && (
        <div
          role="status"
          className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
        >
          <span>{importNotice}</span>
          <Tooltip content="Закрыть сообщение об импорте" side="top">
            <button
              type="button"
              aria-label="Закрыть сообщение об импорте"
              className="flex size-7 items-center justify-center rounded-lg hover:bg-emerald-500/10"
              onClick={() => setImportNotice(null)}
            >
              <X className="size-4" />
            </button>
          </Tooltip>
        </div>
      )}

      {tab === 'today' && (
        <NutritionDiaryView
          overview={overview}
          target={overview.currentTarget}
          busy={isBusy}
          summaryLabel="Сегодня"
          onEdit={setEditingLog}
          onDelete={setDeleteTarget}
          onWaterChange={(delta) => void changeWater(delta)}
        />
      )}

      {tab === 'diary' && (
        <NutritionDiaryView
          overview={overview}
          target={overview.currentTarget}
          busy={isBusy}
          summaryLabel="За день"
          onEdit={setEditingLog}
          onDelete={setDeleteTarget}
          onWaterChange={(delta) => void changeWater(delta)}
        />
      )}

      {tab === 'goal' && (
        <NutritionGoalView
          key={overview.currentTarget?.id ?? 'nutrition-goal-empty'}
          target={overview.currentTarget}
          busy={isBusy}
          onSave={saveTargets}
        />
      )}

      {tab === 'progress' && <NutritionProgressView report={report} loading={reportLoading} />}

      <NutritionMealsJsonImportDialog
        open={jsonDialogOpen}
        busy={isBusy}
        selectedDate={tab === 'today' ? todayDate : diaryDate}
        onOpenChange={setJsonDialogOpen}
        onImport={importMeals}
      />

      <NutritionEntryEditDialog
        open={editingLog !== null}
        entry={editingLog}
        busy={isBusy}
        onOpenChange={(open) => {
          if (!open) setEditingLog(null)
        }}
        onSave={saveLog}
      />

      <DeleteConfirmationDialog
        open={deleteTarget !== null}
        title="Удалить запись питания?"
        subject={deleteTarget?.title}
        description="Запись будет удалена из дневника и перестанет учитываться в прогрессе."
        isSubmitting={isDeleting}
        error={null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onConfirm={confirmDelete}
      />
    </StandardModulePage>
  )
}
