import { BarChart3, Braces, Utensils, X, type LucideIcon } from 'lucide-react'
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
import { DeleteConfirmationDialog } from '../../shared/ui/DeleteConfirmationDialog'
import { ModuleHeader } from '../../shared/ui/ModuleHeader'
import { StandardModulePage } from '../../shared/ui/StandardModulePage'
import { nutritionClient } from './api/nutrition-client'
import { NutritionDiaryView } from './components/NutritionDiaryView'
import { NutritionEntryEditDialog } from './components/NutritionEntryEditDialog'
import { NutritionMealsJsonImportDialog } from './components/NutritionMealsJsonImportDialog'
import {
  NutritionProgressView,
  type NutritionProgressPeriod
} from './components/NutritionProgressView'
import { NutritionTargetsDialog } from './components/NutritionTargetsDialog'
import {
  nutritionDaysAgoKey,
  nutritionErrorMessage,
  nutritionLocalDateKey
} from './nutrition-utils'

type NutritionTab = 'diary' | 'progress'

const TABS: Array<{ id: NutritionTab; label: string; icon: LucideIcon }> = [
  { id: 'diary', label: 'Дневник', icon: Utensils },
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
  const [tab, setTab] = useState<NutritionTab>('diary')
  const [selectedDate, setSelectedDate] = useState(nutritionLocalDateKey())
  const [overview, setOverview] = useState<NutritionOverview | null>(null)
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<NutritionLogEntryRecord | null>(null)
  const [targetsDialogOpen, setTargetsDialogOpen] = useState(false)
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
      const nextOverview = await nutritionClient.listOverview({ date: selectedDate })
      setOverview(nextOverview)
      setError(null)
    } catch (reason) {
      setError(nutritionErrorMessage(reason))
    } finally {
      setIsLoading(false)
    }
  }, [selectedDate])

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
        setTab('diary')
        setEditingLog(entry)
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

  async function importMeals(input: ImportNutritionMealsInput): Promise<ImportNutritionMealsResult> {
    setIsBusy(true)
    setError(null)
    setImportNotice(null)
    try {
      const result = await nutritionClient.importMeals(input)
      setImportNotice(
        `Добавлено позиций: ${result.itemCount}. Приёмов пищи: ${result.mealCount}.`
      )
      if (input.date === selectedDate) {
        await loadOverview()
      } else {
        setSelectedDate(input.date)
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
      const day = await nutritionClient.setWater({ date: selectedDate, waterMl })
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
          Загружаем дневник питания…
        </div>
      </StandardModulePage>
    )
  }

  const headerAction =
    tab === 'diary' ? (
      <button
        type="button"
        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-400"
        onClick={() => setJsonDialogOpen(true)}
      >
        <Braces className="size-4" /> Добавить из JSON
      </button>
    ) : undefined

  return (
    <StandardModulePage>
      <ModuleHeader
        icon={Utensils}
        title="Питание"
        description="GPT формирует данные о еде, MyMind хранит их, считает КБЖУ и показывает прогресс."
        actions={headerAction}
      >
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-1">
          {TABS.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={tab === item.id}
                className={cn(
                  'inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors',
                  tab === item.id
                    ? 'bg-violet-500 font-semibold text-white'
                    : 'text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                )}
                onClick={() => setTab(item.id)}
              >
                <Icon className="size-4" />
                {item.label}
              </button>
            )
          })}
        </div>
      </ModuleHeader>

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          <span>{error}</span>
          <button
            type="button"
            aria-label="Закрыть ошибку"
            className="flex size-7 items-center justify-center rounded-lg hover:bg-red-500/10"
            onClick={() => setError(null)}
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {importNotice && (
        <div
          role="status"
          className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
        >
          <span>{importNotice}</span>
          <button
            type="button"
            aria-label="Закрыть сообщение об импорте"
            className="flex size-7 items-center justify-center rounded-lg hover:bg-emerald-500/10"
            onClick={() => setImportNotice(null)}
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {tab === 'diary' && (
        <NutritionDiaryView
          overview={overview}
          selectedDate={selectedDate}
          target={overview.day.target}
          busy={isBusy}
          onDateChange={setSelectedDate}
          onImportJson={() => setJsonDialogOpen(true)}
          onEdit={setEditingLog}
          onDelete={setDeleteTarget}
          onWaterChange={(delta) => void changeWater(delta)}
          onEditTargets={() => setTargetsDialogOpen(true)}
        />
      )}

      {tab === 'progress' && (
        <NutritionProgressView
          report={report}
          loading={reportLoading}
          period={reportPeriod}
          dateFrom={reportDateFrom}
          dateTo={reportDateTo}
          mealType={reportMealType}
          onPeriodChange={applyReportPeriod}
          onDateFromChange={(date) => {
            setReportPeriod('custom')
            setReportDateFrom(date)
          }}
          onDateToChange={(date) => {
            setReportPeriod('custom')
            setReportDateTo(date)
          }}
          onMealTypeChange={setReportMealType}
        />
      )}

      <NutritionMealsJsonImportDialog
        open={jsonDialogOpen}
        busy={isBusy}
        selectedDate={selectedDate}
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

      <NutritionTargetsDialog
        open={targetsDialogOpen}
        target={overview.currentTarget}
        busy={isBusy}
        onOpenChange={setTargetsDialogOpen}
        onSave={saveTargets}
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
