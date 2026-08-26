import { BarChart3, BookOpen, Plus, Utensils, X, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type {
  CreateNutritionFoodInput,
  CreateNutritionFoodsResult,
  CreateNutritionLogEntryInput,
  CreateNutritionRecipeInput,
  NutritionFoodRecord,
  NutritionLogEntryRecord,
  NutritionLogSourceType,
  NutritionMealType,
  NutritionOverview,
  NutritionRecipeRecord,
  NutritionReport,
  SetNutritionTargetsInput,
  UpdateNutritionFoodInput,
  UpdateNutritionLogEntryInput,
  UpdateNutritionRecipeInput
} from '../../../../shared/contracts/nutrition'
import { cn } from '../../shared/lib/cn'
import { DeleteConfirmationDialog } from '../../shared/ui/DeleteConfirmationDialog'
import { ModuleHeader } from '../../shared/ui/ModuleHeader'
import { StandardModulePage } from '../../shared/ui/StandardModulePage'
import { nutritionClient } from './api/nutrition-client'
import { NutritionDiaryView } from './components/NutritionDiaryView'
import { NutritionFoodDialog } from './components/NutritionFoodDialog'
import { NutritionFoodJsonImportDialog } from './components/NutritionFoodJsonImportDialog'
import { NutritionLibraryView } from './components/NutritionLibraryView'
import { NutritionLogDialog } from './components/NutritionLogDialog'
import { NutritionRecipeDialog } from './components/NutritionRecipeDialog'
import { NutritionReportsView, type NutritionReportPeriod } from './components/NutritionReportsView'
import { NutritionTargetsDialog } from './components/NutritionTargetsDialog'
import {
  nutritionDaysAgoKey,
  nutritionErrorMessage,
  nutritionLocalDateKey
} from './nutrition-utils'

type NutritionTab = 'diary' | 'library' | 'progress'
type DeleteTarget =
  | { kind: 'food'; record: NutritionFoodRecord }
  | { kind: 'recipe'; record: NutritionRecipeRecord }
  | { kind: 'log'; record: NutritionLogEntryRecord }
  | null

const TABS: Array<{ id: NutritionTab; label: string; icon: LucideIcon }> = [
  { id: 'diary', label: 'Дневник', icon: Utensils },
  { id: 'library', label: 'Библиотека', icon: BookOpen },
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

  const [foodDialogOpen, setFoodDialogOpen] = useState(false)
  const [foodJsonDialogOpen, setFoodJsonDialogOpen] = useState(false)
  const [editingFood, setEditingFood] = useState<NutritionFoodRecord | null>(null)
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<NutritionRecipeRecord | null>(null)
  const [logDialogOpen, setLogDialogOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<NutritionLogEntryRecord | null>(null)
  const [initialMeal, setInitialMeal] = useState<NutritionMealType>('breakfast')
  const [targetsDialogOpen, setTargetsDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isBusy, setIsBusy] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importNotice, setImportNotice] = useState<string | null>(null)
  const handledResourceRef = useRef<string | null>(null)

  const [reportPeriod, setReportPeriod] = useState<NutritionReportPeriod>('30')
  const [reportDateFrom, setReportDateFrom] = useState(nutritionDaysAgoKey(29))
  const [reportDateTo, setReportDateTo] = useState(nutritionLocalDateKey())
  const [reportMealType, setReportMealType] = useState<'all' | NutritionMealType>('all')
  const [reportSourceType, setReportSourceType] = useState<'all' | NutritionLogSourceType>('all')
  const [reportSourceId, setReportSourceId] = useState('all')
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
        setInitialMeal(entry.mealType)
        setLogDialogOpen(true)
      }
      onResourceHandled?.()
    }, 0)
    return () => window.clearTimeout(timerId)
  }, [onResourceHandled, overview, resourceId])

  const foods = useMemo(() => overview?.foods ?? [], [overview])
  const recipes = useMemo(() => overview?.recipes ?? [], [overview])

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

  async function saveFood(
    input: CreateNutritionFoodInput | UpdateNutritionFoodInput
  ): Promise<void> {
    await withBusy(() =>
      'id' in input ? nutritionClient.updateFood(input) : nutritionClient.createFood(input)
    )
  }

  async function importFoods(
    foodsToImport: CreateNutritionFoodInput[]
  ): Promise<CreateNutritionFoodsResult> {
    setIsBusy(true)
    setError(null)
    setImportNotice(null)
    try {
      const result = await nutritionClient.createFoods({ foods: foodsToImport })
      await loadOverview()
      setImportNotice(
        result.skippedNames.length > 0
          ? `Добавлено: ${result.created.length}. Пропущено дубликатов: ${result.skippedNames.length}.`
          : `Добавлено продуктов: ${result.created.length}.`
      )
      return result
    } catch (reason) {
      setError(nutritionErrorMessage(reason))
      throw reason
    } finally {
      setIsBusy(false)
    }
  }

  async function saveRecipe(
    input: CreateNutritionRecipeInput | UpdateNutritionRecipeInput
  ): Promise<void> {
    await withBusy(() =>
      'id' in input ? nutritionClient.updateRecipe(input) : nutritionClient.createRecipe(input)
    )
  }

  async function saveLog(
    input: CreateNutritionLogEntryInput | UpdateNutritionLogEntryInput
  ): Promise<void> {
    await withBusy(() =>
      'id' in input ? nutritionClient.updateLogEntry(input) : nutritionClient.createLogEntry(input)
    )
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
      if (deleteTarget.kind === 'food') {
        await nutritionClient.deleteFood({ id: deleteTarget.record.id })
      } else if (deleteTarget.kind === 'recipe') {
        await nutritionClient.deleteRecipe({ id: deleteTarget.record.id })
      } else {
        await nutritionClient.deleteLogEntry({ id: deleteTarget.record.id })
      }
      setDeleteTarget(null)
      await loadOverview()
    } catch (reason) {
      setError(nutritionErrorMessage(reason))
    } finally {
      setIsDeleting(false)
    }
  }

  function openNewLog(mealType: NutritionMealType): void {
    setInitialMeal(mealType)
    setEditingLog(null)
    setLogDialogOpen(true)
  }

  function openSuggestedLog(): void {
    openNewLog(suggestMealForCurrentTime())
  }

  function openNewFood(): void {
    setEditingFood(null)
    setFoodDialogOpen(true)
  }

  function openNewRecipe(): void {
    setEditingRecipe(null)
    setRecipeDialogOpen(true)
  }

  function applyReportPeriod(period: NutritionReportPeriod): void {
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
      const foodId = reportSourceType === 'food' && reportSourceId !== 'all' ? reportSourceId : null
      const recipeId =
        reportSourceType === 'recipe' && reportSourceId !== 'all' ? reportSourceId : null

      const nextReport = await nutritionClient.getReport({
        dateFrom: reportDateFrom,
        dateTo: reportDateTo,
        mealType: reportMealType === 'all' ? null : reportMealType,
        sourceType: reportSourceType === 'all' ? null : reportSourceType,
        foodId,
        recipeId
      })
      setReport(nextReport)
      setError(null)
    } catch (reason) {
      setError(nutritionErrorMessage(reason))
    } finally {
      setReportLoading(false)
    }
  }, [reportDateFrom, reportDateTo, reportMealType, reportSourceId, reportSourceType, tab])

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
      <PrimaryAction onClick={openSuggestedLog}>
        <Plus className="size-4" /> Добавить еду
      </PrimaryAction>
    ) : undefined

  return (
    <StandardModulePage>
      <ModuleHeader
        icon={Utensils}
        title="Питание"
        description="Записывайте еду, следите за дневной нормой и прогрессом без лишних действий."
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
          onAdd={openNewLog}
          onEdit={(entry) => {
            setEditingLog(entry)
            setInitialMeal(entry.mealType)
            setLogDialogOpen(true)
          }}
          onDelete={(entry) => setDeleteTarget({ kind: 'log', record: entry })}
          onWaterChange={(delta) => void changeWater(delta)}
          onEditTargets={() => setTargetsDialogOpen(true)}
        />
      )}

      {tab === 'library' && (
        <NutritionLibraryView
          foods={foods}
          recipes={recipes}
          onAddFood={openNewFood}
          onAddRecipe={openNewRecipe}
          onImportJson={() => setFoodJsonDialogOpen(true)}
          onEditFood={(food) => {
            setEditingFood(food)
            setFoodDialogOpen(true)
          }}
          onDeleteFood={(food) => setDeleteTarget({ kind: 'food', record: food })}
          onEditRecipe={(recipe) => {
            setEditingRecipe(recipe)
            setRecipeDialogOpen(true)
          }}
          onDeleteRecipe={(recipe) => setDeleteTarget({ kind: 'recipe', record: recipe })}
        />
      )}

      {tab === 'progress' && (
        <NutritionReportsView
          report={report}
          loading={reportLoading}
          period={reportPeriod}
          dateFrom={reportDateFrom}
          dateTo={reportDateTo}
          mealType={reportMealType}
          sourceType={reportSourceType}
          sourceId={reportSourceId}
          foods={foods}
          recipes={recipes}
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
          onSourceTypeChange={(sourceType) => {
            setReportSourceType(sourceType)
            setReportSourceId('all')
          }}
          onSourceIdChange={setReportSourceId}
        />
      )}

      <NutritionFoodJsonImportDialog
        open={foodJsonDialogOpen}
        busy={isBusy}
        onOpenChange={setFoodJsonDialogOpen}
        onImport={importFoods}
      />

      <NutritionFoodDialog
        open={foodDialogOpen}
        food={editingFood}
        busy={isBusy}
        onOpenChange={(open) => {
          setFoodDialogOpen(open)
          if (!open) setEditingFood(null)
        }}
        onSave={saveFood}
      />

      <NutritionRecipeDialog
        open={recipeDialogOpen}
        recipe={editingRecipe}
        foods={foods}
        busy={isBusy}
        onOpenChange={(open) => {
          setRecipeDialogOpen(open)
          if (!open) setEditingRecipe(null)
        }}
        onSave={saveRecipe}
      />

      <NutritionLogDialog
        open={logDialogOpen}
        entry={editingLog}
        date={selectedDate}
        initialMeal={initialMeal}
        foods={foods}
        recipes={recipes}
        busy={isBusy}
        onOpenChange={(open) => {
          setLogDialogOpen(open)
          if (!open) setEditingLog(null)
        }}
        onCreateFood={openNewFood}
        onCreateRecipe={openNewRecipe}
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
        title={
          deleteTarget?.kind === 'food'
            ? 'Удалить продукт?'
            : deleteTarget?.kind === 'recipe'
              ? 'Удалить рецепт?'
              : 'Удалить запись питания?'
        }
        subject={deleteSubject(deleteTarget)}
        description={deleteDescription(deleteTarget)}
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

function PrimaryAction({
  children,
  onClick
}: {
  children: React.ReactNode
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-400"
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function suggestMealForCurrentTime(): NutritionMealType {
  const hour = new Date().getHours()
  if (hour < 11) return 'breakfast'
  if (hour < 16) return 'lunch'
  if (hour < 21) return 'dinner'
  return 'snack'
}

function deleteSubject(target: DeleteTarget): string | undefined {
  if (!target) return undefined
  if (target.kind === 'food' || target.kind === 'recipe') return target.record.name
  return target.record.title
}

function deleteDescription(target: DeleteTarget): string {
  if (target?.kind === 'food') {
    return 'История дневника сохранится благодаря снимкам значений. Продукт, используемый в рецепте, удалить нельзя — сначала измените или удалите рецепт.'
  }
  if (target?.kind === 'recipe') {
    return 'Старые записи дневника сохранят название и пищевую ценность рецепта.'
  }
  return 'Запись будет удалена из дневника и перестанет учитываться в прогрессе.'
}
