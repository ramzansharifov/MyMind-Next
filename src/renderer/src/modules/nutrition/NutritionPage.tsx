import {
  Apple,
  BarChart3,
  Beef,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CookingPot,
  Droplets,
  Flame,
  Heart,
  Leaf,
  Pencil,
  Plus,
  Search,
  Settings2,
  Star,
  Trash2,
  Utensils,
  Wheat,
  X,
  type LucideIcon
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type {
  CreateNutritionFoodInput,
  CreateNutritionLogEntryInput,
  CreateNutritionRecipeInput,
  NutritionEntityStatus,
  NutritionFoodCategory,
  NutritionFoodRecord,
  NutritionLogEntryRecord,
  NutritionLogSourceType,
  NutritionMealType,
  NutritionOverview,
  NutritionRecipeRecord,
  NutritionReport,
  NutritionTargetRecord,
  NutritionUnit,
  NutritionValues,
  SetNutritionTargetsInput,
  UpdateNutritionFoodInput,
  UpdateNutritionLogEntryInput,
  UpdateNutritionRecipeInput
} from '../../../../shared/contracts/nutrition'
import { cn } from '../../shared/lib/cn'
import { AppDialog } from '../../shared/ui/AppDialog'
import { AppSelect } from '../../shared/ui/AppSelect'
import { DeleteConfirmationDialog } from '../../shared/ui/DeleteConfirmationDialog'
import { ModuleHeader } from '../../shared/ui/ModuleHeader'
import { StandardModulePage } from '../../shared/ui/StandardModulePage'
import { nutritionClient } from './api/nutrition-client'

type NutritionTab = 'diary' | 'foods' | 'recipes' | 'reports' | 'goals'
type ReportPeriod = '7' | '30' | '90' | '365' | 'custom'
type DeleteTarget =
  | { kind: 'food'; record: NutritionFoodRecord }
  | { kind: 'recipe'; record: NutritionRecipeRecord }
  | { kind: 'log'; record: NutritionLogEntryRecord }
  | null

const ZERO_NUTRIENTS: NutritionValues = {
  calories: 0,
  proteinG: 0,
  fatG: 0,
  carbsG: 0,
  fiberG: 0,
  sugarG: 0,
  sodiumMg: 0
}

const CATEGORY_OPTIONS: Array<{ value: NutritionFoodCategory; label: string }> = [
  { value: 'protein', label: 'Белковые продукты' },
  { value: 'dairy', label: 'Молочные продукты' },
  { value: 'grains', label: 'Крупы и зерновые' },
  { value: 'vegetables', label: 'Овощи' },
  { value: 'fruits', label: 'Фрукты' },
  { value: 'fats', label: 'Жиры и масла' },
  { value: 'drinks', label: 'Напитки' },
  { value: 'sweets', label: 'Сладкое' },
  { value: 'prepared', label: 'Готовые блюда' },
  { value: 'other', label: 'Другое' }
]

const MEAL_OPTIONS: Array<{ value: NutritionMealType; label: string }> = [
  { value: 'breakfast', label: 'Завтрак' },
  { value: 'lunch', label: 'Обед' },
  { value: 'dinner', label: 'Ужин' },
  { value: 'snack', label: 'Перекус' },
  { value: 'other', label: 'Другой приём пищи' }
]

const SOURCE_OPTIONS: Array<{ value: NutritionLogSourceType; label: string }> = [
  { value: 'food', label: 'Продукт' },
  { value: 'recipe', label: 'Рецепт' },
  { value: 'custom', label: 'Своя запись' }
]

const UNIT_OPTIONS: Array<{ value: NutritionUnit; label: string }> = [
  { value: 'g', label: 'г' },
  { value: 'ml', label: 'мл' },
  { value: 'piece', label: 'шт.' },
  { value: 'serving', label: 'порц.' }
]

const TABS: Array<{ id: NutritionTab; label: string; icon: LucideIcon }> = [
  { id: 'diary', label: 'Дневник', icon: Utensils },
  { id: 'foods', label: 'Продукты', icon: Apple },
  { id: 'recipes', label: 'Рецепты', icon: CookingPot },
  { id: 'reports', label: 'Отчёты', icon: BarChart3 },
  { id: 'goals', label: 'Цели', icon: Settings2 }
]

function localDateKey(date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function shiftDateKey(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() + days)
  return localDateKey(date)
}

function daysAgoKey(days: number): string {
  return shiftDateKey(localDateKey(), -days)
}

function formatDate(value: string): string {
  const date = new Date(`${value}T12:00:00`)
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date)
}

function formatNumber(value: number, maximumFractionDigits = 1): string {
  return value.toLocaleString('ru-RU', { maximumFractionDigits })
}

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'Не удалось выполнить действие'
}

function categoryLabel(category: NutritionFoodCategory): string {
  return CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? category
}

function mealLabel(meal: NutritionMealType, custom = ''): string {
  if (meal === 'other' && custom) return custom
  return MEAL_OPTIONS.find((option) => option.value === meal)?.label ?? meal
}

function unitLabel(unit: NutritionUnit): string {
  return UNIT_OPTIONS.find((option) => option.value === unit)?.label ?? unit
}

function targetProgress(value: number, target: number | null): number {
  if (!target || target <= 0) return 0
  return Math.min(100, (value / target) * 100)
}

function nutrientLine(nutrients: NutritionValues): string {
  return `${formatNumber(nutrients.calories, 0)} ккал · Б ${formatNumber(nutrients.proteinG)} · Ж ${formatNumber(nutrients.fatG)} · У ${formatNumber(nutrients.carbsG)}`
}

export function NutritionPage({
  resourceId,
  onResourceHandled
}: {
  resourceId?: string | null
  onResourceHandled?: () => void
}): React.JSX.Element {
  const [tab, setTab] = useState<NutritionTab>('diary')
  const [selectedDate, setSelectedDate] = useState(localDateKey())
  const [overview, setOverview] = useState<NutritionOverview | null>(null)
  const [query, setQuery] = useState('')
  const [foodCategory, setFoodCategory] = useState<'all' | NutritionFoodCategory>('all')
  const [entityStatus, setEntityStatus] = useState<'active' | 'archived' | 'all'>('active')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [foodDialogOpen, setFoodDialogOpen] = useState(false)
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
  const handledResourceRef = useRef<string | null>(null)

  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('30')
  const [reportDateFrom, setReportDateFrom] = useState(daysAgoKey(29))
  const [reportDateTo, setReportDateTo] = useState(localDateKey())
  const [reportMealType, setReportMealType] = useState<'all' | NutritionMealType>('all')
  const [reportSourceType, setReportSourceType] = useState<'all' | NutritionLogSourceType>('all')
  const [reportSourceId, setReportSourceId] = useState('all')
  const [report, setReport] = useState<NutritionReport | null>(null)
  const [reportLoading, setReportLoading] = useState(false)

  const loadOverview = useCallback(async (): Promise<void> => {
    try {
      const next = await nutritionClient.listOverview({ date: selectedDate })
      setOverview(next)
      setError(null)
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setIsLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    setIsLoading(true)
    void loadOverview()
  }, [loadOverview])

  useEffect(() => {
    if (!overview || !resourceId || handledResourceRef.current === resourceId) return
    handledResourceRef.current = resourceId
    const entry = overview.entries.find((candidate) => candidate.id === resourceId)
    if (entry) {
      setTab('diary')
      setEditingLog(entry)
      setLogDialogOpen(true)
    }
    onResourceHandled?.()
  }, [onResourceHandled, overview, resourceId])

  const foods = overview?.foods ?? []
  const recipes = overview?.recipes ?? []
  const activeFoods = foods.filter((food) => food.status === 'active')
  const activeRecipes = recipes.filter((recipe) => recipe.status === 'active')

  const filteredFoods = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ru-RU')
    return foods.filter((food) => {
      if (entityStatus !== 'all' && food.status !== entityStatus) return false
      if (foodCategory !== 'all' && food.category !== foodCategory) return false
      if (favoritesOnly && !food.favorite) return false
      if (!normalized) return true
      return `${food.name} ${food.brand} ${categoryLabel(food.category)}`
        .toLocaleLowerCase('ru-RU')
        .includes(normalized)
    })
  }, [entityStatus, favoritesOnly, foodCategory, foods, query])

  const filteredRecipes = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ru-RU')
    return recipes.filter((recipe) => {
      if (entityStatus !== 'all' && recipe.status !== entityStatus) return false
      if (favoritesOnly && !recipe.favorite) return false
      if (!normalized) return true
      return `${recipe.name} ${recipe.description} ${recipe.ingredients.map((item) => item.foodName).join(' ')}`
        .toLocaleLowerCase('ru-RU')
        .includes(normalized)
    })
  }, [entityStatus, favoritesOnly, query, recipes])

  async function withBusy(action: () => Promise<unknown>): Promise<void> {
    setIsBusy(true)
    setError(null)
    try {
      await action()
      await loadOverview()
    } catch (reason) {
      setError(errorMessage(reason))
      throw reason
    } finally {
      setIsBusy(false)
    }
  }

  async function saveFood(input: CreateNutritionFoodInput | UpdateNutritionFoodInput): Promise<void> {
    await withBusy(() =>
      'id' in input ? nutritionClient.updateFood(input) : nutritionClient.createFood(input)
    )
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
      setError(errorMessage(reason))
    } finally {
      setIsBusy(false)
    }
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteTarget) return
    setIsDeleting(true)
    setError(null)
    try {
      if (deleteTarget.kind === 'food') await nutritionClient.deleteFood({ id: deleteTarget.record.id })
      if (deleteTarget.kind === 'recipe') await nutritionClient.deleteRecipe({ id: deleteTarget.record.id })
      if (deleteTarget.kind === 'log') await nutritionClient.deleteLogEntry({ id: deleteTarget.record.id })
      setDeleteTarget(null)
      await loadOverview()
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setIsDeleting(false)
    }
  }

  function openNewLog(mealType: NutritionMealType): void {
    setInitialMeal(mealType)
    setEditingLog(null)
    setLogDialogOpen(true)
  }

  function applyReportPeriod(value: ReportPeriod): void {
    setReportPeriod(value)
    if (value === 'custom') return
    const days = Number(value)
    setReportDateTo(localDateKey())
    setReportDateFrom(daysAgoKey(days - 1))
  }

  const loadReport = useCallback(async (): Promise<void> => {
    if (tab !== 'reports') return
    setReportLoading(true)
    try {
      const foodId = reportSourceType === 'food' && reportSourceId !== 'all' ? reportSourceId : null
      const recipeId =
        reportSourceType === 'recipe' && reportSourceId !== 'all' ? reportSourceId : null
      setReport(
        await nutritionClient.getReport({
          dateFrom: reportDateFrom,
          dateTo: reportDateTo,
          mealType: reportMealType === 'all' ? null : reportMealType,
          sourceType: reportSourceType === 'all' ? null : reportSourceType,
          foodId,
          recipeId
        })
      )
      setError(null)
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setReportLoading(false)
    }
  }, [
    reportDateFrom,
    reportDateTo,
    reportMealType,
    reportSourceId,
    reportSourceType,
    tab
  ])

  useEffect(() => {
    if (tab !== 'reports') return
    const timer = window.setTimeout(() => void loadReport(), 80)
    return () => window.clearTimeout(timer)
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

  const target = overview.day.target
  const headerAction =
    tab === 'foods' ? (
      <PrimaryButton onClick={() => { setEditingFood(null); setFoodDialogOpen(true) }}>
        <Plus className="size-4" /> Добавить продукт
      </PrimaryButton>
    ) : tab === 'recipes' ? (
      <PrimaryButton
        disabled={activeFoods.length === 0}
        onClick={() => { setEditingRecipe(null); setRecipeDialogOpen(true) }}
      >
        <Plus className="size-4" /> Новый рецепт
      </PrimaryButton>
    ) : tab === 'goals' ? (
      <PrimaryButton onClick={() => setTargetsDialogOpen(true)}>
        <Settings2 className="size-4" /> Изменить цели
      </PrimaryButton>
    ) : tab === 'diary' ? (
      <PrimaryButton onClick={() => openNewLog('breakfast')}>
        <Plus className="size-4" /> Добавить еду
      </PrimaryButton>
    ) : undefined

  return (
    <StandardModulePage>
      <ModuleHeader
        icon={Utensils}
        title="Питание"
        description="Дневник рациона, собственная база продуктов и рецептов, вода, цели и подробные отчёты."
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
                onClick={() => {
                  setTab(item.id)
                  setQuery('')
                  setEntityStatus('active')
                  setFavoritesOnly(false)
                  setFoodCategory('all')
                }}
              >
                <Icon className="size-4" /> {item.label}
              </button>
            )
          })}
        </div>
      </ModuleHeader>

      {error && (
        <div role="alert" className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <span>{error}</span>
          <button type="button" aria-label="Закрыть ошибку" onClick={() => setError(null)}><X className="size-4" /></button>
        </div>
      )}

      {tab === 'diary' && (
        <DiaryView
          overview={overview}
          selectedDate={selectedDate}
          target={target}
          busy={isBusy}
          onDateChange={setSelectedDate}
          onAdd={openNewLog}
          onEdit={(entry) => { setEditingLog(entry); setInitialMeal(entry.mealType); setLogDialogOpen(true) }}
          onDelete={(entry) => setDeleteTarget({ kind: 'log', record: entry })}
          onWaterChange={(delta) => void changeWater(delta)}
        />
      )}

      {tab === 'foods' && (
        <CatalogToolbar
          query={query}
          onQueryChange={setQuery}
          category={foodCategory}
          onCategoryChange={setFoodCategory}
          status={entityStatus}
          onStatusChange={setEntityStatus}
          favoritesOnly={favoritesOnly}
          onFavoritesChange={setFavoritesOnly}
        >
          {filteredFoods.length === 0 ? (
            <EmptyPanel icon={Apple} title={foods.length === 0 ? 'Добавьте первый продукт' : 'Ничего не найдено'}>
              База продуктов позволяет быстро собирать рацион и использовать одни и те же значения в рецептах.
            </EmptyPanel>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredFoods.map((food) => (
                <FoodCard
                  key={food.id}
                  food={food}
                  onEdit={() => { setEditingFood(food); setFoodDialogOpen(true) }}
                  onDelete={() => setDeleteTarget({ kind: 'food', record: food })}
                  onToggleFavorite={() => void saveFood({ ...food, favorite: !food.favorite, nutrients: food.nutrients })}
                />
              ))}
            </div>
          )}
        </CatalogToolbar>
      )}

      {tab === 'recipes' && (
        <CatalogToolbar
          query={query}
          onQueryChange={setQuery}
          status={entityStatus}
          onStatusChange={setEntityStatus}
          favoritesOnly={favoritesOnly}
          onFavoritesChange={setFavoritesOnly}
        >
          {filteredRecipes.length === 0 ? (
            <EmptyPanel icon={CookingPot} title={recipes.length === 0 ? 'Создайте первый рецепт' : 'Ничего не найдено'}>
              Рецепт собирается из продуктов, автоматически считает пищевую ценность блюда и позволяет добавлять его по порциям.
            </EmptyPanel>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onEdit={() => { setEditingRecipe(recipe); setRecipeDialogOpen(true) }}
                  onDelete={() => setDeleteTarget({ kind: 'recipe', record: recipe })}
                  onToggleFavorite={() => void saveRecipe({
                    id: recipe.id,
                    name: recipe.name,
                    description: recipe.description,
                    servings: recipe.servings,
                    favorite: !recipe.favorite,
                    status: recipe.status,
                    ingredients: recipe.ingredients.map((ingredient) => ({ foodId: ingredient.foodId, amount: ingredient.amount }))
                  })}
                />
              ))}
            </div>
          )}
        </CatalogToolbar>
      )}

      {tab === 'goals' && (
        <GoalsView target={overview.currentTarget} onEdit={() => setTargetsDialogOpen(true)} />
      )}

      {tab === 'reports' && (
        <ReportsView
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
          onDateFromChange={(value) => { setReportPeriod('custom'); setReportDateFrom(value) }}
          onDateToChange={(value) => { setReportPeriod('custom'); setReportDateTo(value) }}
          onMealTypeChange={setReportMealType}
          onSourceTypeChange={(value) => { setReportSourceType(value); setReportSourceId('all') }}
          onSourceIdChange={setReportSourceId}
        />
      )}

      <NutritionFoodDialog
        open={foodDialogOpen}
        food={editingFood}
        busy={isBusy}
        onOpenChange={(open) => { setFoodDialogOpen(open); if (!open) setEditingFood(null) }}
        onSave={saveFood}
      />
      <NutritionRecipeDialog
        open={recipeDialogOpen}
        recipe={editingRecipe}
        foods={activeFoods}
        busy={isBusy}
        onOpenChange={(open) => { setRecipeDialogOpen(open); if (!open) setEditingRecipe(null) }}
        onSave={saveRecipe}
      />
      <NutritionLogDialog
        open={logDialogOpen}
        entry={editingLog}
        date={selectedDate}
        initialMeal={initialMeal}
        foods={activeFoods}
        recipes={activeRecipes}
        busy={isBusy}
        onOpenChange={(open) => { setLogDialogOpen(open); if (!open) setEditingLog(null) }}
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
        title={deleteTarget?.kind === 'food' ? 'Удалить продукт?' : deleteTarget?.kind === 'recipe' ? 'Удалить рецепт?' : 'Удалить запись питания?'}
        subject={deleteTarget?.record && 'name' in deleteTarget.record ? deleteTarget.record.name : deleteTarget?.record && 'title' in deleteTarget.record ? deleteTarget.record.title : undefined}
        description={deleteTarget?.kind === 'food' ? 'История дневника сохранится благодаря снимкам значений. Продукт, используемый в рецепте, удалить нельзя — его лучше архивировать.' : deleteTarget?.kind === 'recipe' ? 'Старые записи дневника сохранят название и пищевую ценность рецепта.' : 'Запись будет удалена из дневника и перестанет учитываться в отчётах.'}
        isSubmitting={isDeleting}
        error={error}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        onConfirm={confirmDelete}
      />
    </StandardModulePage>
  )
}

function DiaryView({
  overview,
  selectedDate,
  target,
  busy,
  onDateChange,
  onAdd,
  onEdit,
  onDelete,
  onWaterChange
}: {
  overview: NutritionOverview
  selectedDate: string
  target: NutritionTargetRecord | null
  busy: boolean
  onDateChange: (date: string) => void
  onAdd: (meal: NutritionMealType) => void
  onEdit: (entry: NutritionLogEntryRecord) => void
  onDelete: (entry: NutritionLogEntryRecord) => void
  onWaterChange: (delta: number) => void
}): React.JSX.Element {
  const nutrients = overview.day.nutrients
  const meals = MEAL_OPTIONS.map((meal) => ({
    ...meal,
    entries: overview.entries.filter((entry) => entry.mealType === meal.value)
  }))

  return (
    <section className="mt-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-[var(--app-shadow-card)]">
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Предыдущий день" className="flex size-9 items-center justify-center rounded-xl text-[var(--app-muted)] hover:bg-[var(--app-control-hover)]" onClick={() => onDateChange(shiftDateKey(selectedDate, -1))}><ChevronLeft className="size-4" /></button>
          <button type="button" className="min-w-64 rounded-xl px-3 py-2 text-left hover:bg-[var(--app-control-hover)]" onClick={() => onDateChange(localDateKey())}><div className="text-sm font-semibold capitalize text-[var(--app-text)]">{formatDate(selectedDate)}</div><div className="mt-0.5 text-[11px] text-[var(--app-muted)]">{selectedDate === localDateKey() ? 'Сегодня' : 'Нажмите, чтобы вернуться к сегодняшнему дню'}</div></button>
          <button type="button" aria-label="Следующий день" className="flex size-9 items-center justify-center rounded-xl text-[var(--app-muted)] hover:bg-[var(--app-control-hover)]" onClick={() => onDateChange(shiftDateKey(selectedDate, 1))}><ChevronRight className="size-4" /></button>
        </div>
        <input type="date" aria-label="Дата дневника питания" value={selectedDate} className="h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none" onChange={(event) => onDateChange(event.target.value)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <NutrientProgressCard label="Калории" value={nutrients.calories} target={target?.calories ?? null} unit="ккал" icon={Flame} />
        <NutrientProgressCard label="Белки" value={nutrients.proteinG} target={target?.proteinG ?? null} unit="г" icon={Beef} />
        <NutrientProgressCard label="Жиры" value={nutrients.fatG} target={target?.fatG ?? null} unit="г" icon={Leaf} />
        <NutrientProgressCard label="Углеводы" value={nutrients.carbsG} target={target?.carbsG ?? null} unit="г" icon={Wheat} />
        <NutrientProgressCard label="Клетчатка" value={nutrients.fiberG} target={target?.fiberG ?? null} unit="г" icon={Apple} />
      </div>

      <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex size-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300"><Droplets className="size-5" /></span>
          <div className="min-w-40 flex-1"><div className="flex items-baseline gap-2"><span className="text-lg font-semibold text-[var(--app-text)]">{overview.day.waterMl} мл</span>{target?.waterMl && <span className="text-xs text-[var(--app-muted)]">из {target.waterMl} мл</span>}</div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--app-workspace)]"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${targetProgress(overview.day.waterMl, target?.waterMl ?? null)}%` }} /></div></div>
          <div className="flex flex-wrap gap-2"><SecondaryButton disabled={busy || overview.day.waterMl === 0} onClick={() => onWaterChange(-250)}>−250 мл</SecondaryButton><SecondaryButton disabled={busy} onClick={() => onWaterChange(250)}>+250 мл</SecondaryButton><SecondaryButton disabled={busy} onClick={() => onWaterChange(500)}>+500 мл</SecondaryButton></div>
        </div>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        {meals.map((meal) => (
          <section key={meal.value} className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)]">
            <header className="flex items-center gap-3 border-b border-[var(--app-border)] px-4 py-3"><span className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300"><Utensils className="size-4" /></span><div className="min-w-0 flex-1"><h2 className="text-sm font-semibold text-[var(--app-text)]">{meal.label}</h2><p className="mt-0.5 text-[11px] text-[var(--app-muted)]">{formatNumber(meal.entries.reduce((sum, entry) => sum + entry.nutrients.calories, 0), 0)} ккал · {meal.entries.length} поз.</p></div><button type="button" aria-label={`Добавить в ${meal.label.toLowerCase()}`} className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300 hover:bg-violet-500/15" onClick={() => onAdd(meal.value)}><Plus className="size-4" /></button></header>
            {meal.entries.length === 0 ? <div className="px-4 py-8 text-center text-xs text-[var(--app-muted)]">Пока ничего не добавлено</div> : <div className="divide-y divide-[var(--app-border)]">{meal.entries.map((entry) => <div key={entry.id} className="group flex items-center gap-3 px-4 py-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="truncate text-sm font-semibold text-[var(--app-text)]">{entry.title}</span>{entry.mealType === 'other' && entry.customMealName && <span className="rounded-md bg-[var(--app-control)] px-1.5 py-0.5 text-[10px] text-[var(--app-muted)]">{entry.customMealName}</span>}</div><p className="mt-1 text-xs text-[var(--app-muted)]">{formatNumber(entry.amount)} {unitLabel(entry.unit)} · {nutrientLine(entry.nutrients)}</p></div><div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100"><button type="button" aria-label={`Изменить «${entry.title}»`} className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)]" onClick={() => onEdit(entry)}><Pencil className="size-3.5" /></button><button type="button" aria-label={`Удалить «${entry.title}»`} className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300" onClick={() => onDelete(entry)}><Trash2 className="size-3.5" /></button></div></div>)}</div>}
          </section>
        ))}
      </div>
    </section>
  )
}

function NutrientProgressCard({ label, value, target, unit, icon: Icon }: { label: string; value: number; target: number | null; unit: string; icon: LucideIcon }): React.JSX.Element {
  return <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-[var(--app-muted)]">{label}</span><Icon className="size-4 text-violet-300" /></div><div className="mt-2 flex items-baseline gap-1.5"><span className="text-xl font-semibold text-[var(--app-text)]">{formatNumber(value, label === 'Калории' ? 0 : 1)}</span><span className="text-xs text-[var(--app-muted)]">{unit}</span></div>{target ? <><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--app-workspace)]"><div className="h-full rounded-full bg-violet-400" style={{ width: `${targetProgress(value, target)}%` }} /></div><div className="mt-1.5 text-[10px] text-[var(--app-muted)]">Цель {formatNumber(target, 0)} {unit}</div></> : <div className="mt-3 text-[10px] text-[var(--app-muted)]">Цель не задана</div>}</div>
}

function CatalogToolbar({ query, onQueryChange, category, onCategoryChange, status, onStatusChange, favoritesOnly, onFavoritesChange, children }: { query: string; onQueryChange: (value: string) => void; category?: 'all' | NutritionFoodCategory; onCategoryChange?: (value: 'all' | NutritionFoodCategory) => void; status: 'active' | 'archived' | 'all'; onStatusChange: (value: 'active' | 'archived' | 'all') => void; favoritesOnly: boolean; onFavoritesChange: (value: boolean) => void; children: React.ReactNode }): React.JSX.Element {
  return <section className="mt-5 space-y-4"><div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]"><div className="flex flex-wrap gap-2"><label className="flex h-10 min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 focus-within:border-violet-500/45"><Search className="size-4 text-[var(--app-muted)]" /><input value={query} type="search" placeholder="Поиск…" className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60" onChange={(event) => onQueryChange(event.target.value)} /></label>{category !== undefined && onCategoryChange && <div className="min-w-[190px]"><AppSelect ariaLabel="Категория продукта" value={category} options={[{ value: 'all', label: 'Все категории' }, ...CATEGORY_OPTIONS]} onValueChange={(value) => onCategoryChange(value as 'all' | NutritionFoodCategory)} /></div>}<div className="min-w-[150px]"><AppSelect ariaLabel="Статус" value={status} options={[{ value: 'active', label: 'Активные' }, { value: 'archived', label: 'Архив' }, { value: 'all', label: 'Все' }]} onValueChange={(value) => onStatusChange(value as 'active' | 'archived' | 'all')} /></div><button type="button" aria-pressed={favoritesOnly} className={cn('inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-medium', favoritesOnly ? 'border-amber-400/25 bg-amber-500/10 text-amber-200' : 'border-[var(--app-border)] bg-[var(--app-workspace)] text-[var(--app-muted)] hover:bg-[var(--app-control-hover)]')} onClick={() => onFavoritesChange(!favoritesOnly)}><Star className={cn('size-3.5', favoritesOnly && 'fill-current')} /> Избранное</button></div></div>{children}</section>
}

function FoodCard({ food, onEdit, onDelete, onToggleFavorite }: { food: NutritionFoodRecord; onEdit: () => void; onDelete: () => void; onToggleFavorite: () => void }): React.JSX.Element {
  return <article className="group rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]"><div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300"><Apple className="size-5" /></span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate font-semibold text-[var(--app-text)]">{food.name}</h3>{food.status === 'archived' && <span className="rounded-md bg-[var(--app-control)] px-1.5 py-0.5 text-[10px] text-[var(--app-muted)]">Архив</span>}</div><p className="mt-0.5 truncate text-xs text-[var(--app-muted)]">{food.brand || categoryLabel(food.category)}</p></div><button type="button" aria-label={food.favorite ? 'Убрать из избранного' : 'В избранное'} className={cn('flex size-8 items-center justify-center rounded-lg', food.favorite ? 'text-amber-300' : 'text-[var(--app-muted)]')} onClick={onToggleFavorite}><Star className={cn('size-4', food.favorite && 'fill-current')} /></button></div><div className="mt-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-3"><div className="text-xs text-[var(--app-muted)]">На {formatNumber(food.baseAmount)} {unitLabel(food.baseUnit)}</div><div className="mt-1.5 text-sm font-semibold text-[var(--app-text)]">{nutrientLine(food.nutrients)}</div><div className="mt-1 text-[11px] text-[var(--app-muted)]">Клетчатка {formatNumber(food.nutrients.fiberG)} г · Сахар {formatNumber(food.nutrients.sugarG)} г · Натрий {formatNumber(food.nutrients.sodiumMg, 0)} мг</div></div><div className="mt-3 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"><button type="button" className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)]" onClick={onEdit}><Pencil className="size-4" /></button><button type="button" className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300" onClick={onDelete}><Trash2 className="size-4" /></button></div></article>
}

function RecipeCard({ recipe, onEdit, onDelete, onToggleFavorite }: { recipe: NutritionRecipeRecord; onEdit: () => void; onDelete: () => void; onToggleFavorite: () => void }): React.JSX.Element {
  return <article className="group rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)]"><div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300"><CookingPot className="size-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-semibold text-[var(--app-text)]">{recipe.name}</h3>{recipe.status === 'archived' && <span className="rounded-md bg-[var(--app-control)] px-1.5 py-0.5 text-[10px] text-[var(--app-muted)]">Архив</span>}</div><p className="mt-1 text-xs text-[var(--app-muted)]">{formatNumber(recipe.servings)} порц. · {recipe.ingredients.length} ингредиентов</p></div><button type="button" aria-label={recipe.favorite ? 'Убрать из избранного' : 'В избранное'} className={cn('flex size-8 items-center justify-center rounded-lg', recipe.favorite ? 'text-amber-300' : 'text-[var(--app-muted)]')} onClick={onToggleFavorite}><Heart className={cn('size-4', recipe.favorite && 'fill-current')} /></button></div>{recipe.description && <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--app-muted)]">{recipe.description}</p>}<div className="mt-4 grid gap-2 sm:grid-cols-2"><div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-3"><div className="text-[11px] text-[var(--app-muted)]">На порцию</div><div className="mt-1 text-sm font-semibold text-[var(--app-text)]">{nutrientLine(recipe.perServingNutrients)}</div></div><div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-3"><div className="text-[11px] text-[var(--app-muted)]">Всё блюдо</div><div className="mt-1 text-sm font-semibold text-[var(--app-text)]">{formatNumber(recipe.totalNutrients.calories, 0)} ккал</div></div></div><div className="mt-4 flex flex-wrap gap-1.5">{recipe.ingredients.slice(0, 6).map((ingredient) => <span key={ingredient.id} className="rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] px-2 py-1 text-[11px] text-[var(--app-muted)]">{ingredient.foodName} · {formatNumber(ingredient.amount)} {unitLabel(ingredient.unit)}</span>)}</div><div className="mt-3 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"><button type="button" className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)]" onClick={onEdit}><Pencil className="size-4" /></button><button type="button" className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300" onClick={onDelete}><Trash2 className="size-4" /></button></div></article>
}

function GoalsView({ target, onEdit }: { target: NutritionTargetRecord | null; onEdit: () => void }): React.JSX.Element {
  const rows = target ? [
    ['Калории', target.calories, 'ккал'],
    ['Белки', target.proteinG, 'г'],
    ['Жиры', target.fatG, 'г'],
    ['Углеводы', target.carbsG, 'г'],
    ['Клетчатка', target.fiberG, 'г'],
    ['Вода', target.waterMl, 'мл']
  ] as Array<[string, number | null, string]> : []
  return <section className="mt-5 grid items-start gap-4 xl:grid-cols-[1.15fr_0.85fr]"><div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)]"><div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-semibold text-[var(--app-text)]">Дневные ориентиры</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--app-muted)]">Цели задаются вручную и используются только для личного отслеживания. При изменении создаётся новый период, поэтому старые отчёты сравниваются с целями, которые действовали в тот день.</p></div><SecondaryButton onClick={onEdit}><Pencil className="size-3.5" /> Изменить</SecondaryButton></div>{target ? <><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rows.map(([label, value, unit]) => <div key={label} className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4"><div className="text-xs text-[var(--app-muted)]">{label}</div><div className="mt-1 text-xl font-semibold text-[var(--app-text)]">{value === null ? '—' : `${formatNumber(value, 0)} ${unit}`}</div></div>)}</div><p className="mt-4 text-xs text-[var(--app-muted)]">Действует с {target.effectiveFrom}{target.effectiveTo ? ` по ${target.effectiveTo}` : ''}</p></> : <div className="mt-6 rounded-xl border border-dashed border-[var(--app-border)] px-6 py-10 text-center"><Settings2 className="mx-auto size-8 text-violet-300" /><h3 className="mt-3 font-semibold text-[var(--app-text)]">Цели пока не заданы</h3><p className="mt-1 text-sm text-[var(--app-muted)]">Можно отслеживать рацион и без целей, а добавить их позже.</p></div>}</div><div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)]"><h2 className="text-sm font-semibold text-[var(--app-text)]">Как устроена история целей</h2><div className="mt-4 space-y-3 text-sm leading-6 text-[var(--app-muted)]"><p>Новое значение начинает действовать с выбранной даты, а предыдущий период автоматически закрывается днём раньше.</p><p>Это позволяет корректно смотреть отчёт за месяц или год даже после изменения рациона.</p><p>Ни одна цель не рассчитывается приложением автоматически — значения определяет пользователь.</p></div></div></section>
}

function ReportsView({ report, loading, period, dateFrom, dateTo, mealType, sourceType, sourceId, foods, recipes, onPeriodChange, onDateFromChange, onDateToChange, onMealTypeChange, onSourceTypeChange, onSourceIdChange }: { report: NutritionReport | null; loading: boolean; period: ReportPeriod; dateFrom: string; dateTo: string; mealType: 'all' | NutritionMealType; sourceType: 'all' | NutritionLogSourceType; sourceId: string; foods: NutritionFoodRecord[]; recipes: NutritionRecipeRecord[]; onPeriodChange: (value: ReportPeriod) => void; onDateFromChange: (value: string) => void; onDateToChange: (value: string) => void; onMealTypeChange: (value: 'all' | NutritionMealType) => void; onSourceTypeChange: (value: 'all' | NutritionLogSourceType) => void; onSourceIdChange: (value: string) => void }): React.JSX.Element {
  const sourceOptions = sourceType === 'food' ? foods.map((food) => ({ value: food.id, label: food.name })) : sourceType === 'recipe' ? recipes.map((recipe) => ({ value: recipe.id, label: recipe.name })) : []
  return <section className="mt-5 space-y-4"><div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]"><div className="flex flex-wrap gap-2"><div className="min-w-[150px]"><AppSelect ariaLabel="Период отчёта" value={period} options={[{ value: '7', label: '7 дней' }, { value: '30', label: '30 дней' }, { value: '90', label: '90 дней' }, { value: '365', label: '365 дней' }, { value: 'custom', label: 'Свой период' }]} onValueChange={(value) => onPeriodChange(value as ReportPeriod)} /></div><input type="date" value={dateFrom} aria-label="Начало отчёта" className="h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)]" onChange={(event) => onDateFromChange(event.target.value)} /><input type="date" value={dateTo} aria-label="Конец отчёта" className="h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)]" onChange={(event) => onDateToChange(event.target.value)} /><div className="min-w-[170px]"><AppSelect ariaLabel="Приём пищи в отчёте" value={mealType} options={[{ value: 'all', label: 'Все приёмы пищи' }, ...MEAL_OPTIONS]} onValueChange={(value) => onMealTypeChange(value as 'all' | NutritionMealType)} /></div><div className="min-w-[160px]"><AppSelect ariaLabel="Источник в отчёте" value={sourceType} options={[{ value: 'all', label: 'Все источники' }, ...SOURCE_OPTIONS]} onValueChange={(value) => onSourceTypeChange(value as 'all' | NutritionLogSourceType)} /></div>{sourceType !== 'all' && sourceType !== 'custom' && <div className="min-w-[190px] flex-1"><AppSelect ariaLabel="Конкретный источник" value={sourceId} options={[{ value: 'all', label: sourceType === 'food' ? 'Все продукты' : 'Все рецепты' }, ...sourceOptions]} onValueChange={onSourceIdChange} /></div>}</div></div>{loading && !report ? <div className="flex min-h-64 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] text-sm text-[var(--app-muted)]">Считаем отчёт…</div> : report && <><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">{[
    ['Дней с записями', report.summary.loggedDays], ['Позиций', report.summary.entries], ['Средние ккал', formatNumber(report.summary.averageCalories, 0)], ['Белки / день', `${formatNumber(report.summary.averageProteinG)} г`], ['Жиры / день', `${formatNumber(report.summary.averageFatG)} г`], ['Углеводы / день', `${formatNumber(report.summary.averageCarbsG)} г`], ['Вода / день', `${formatNumber(report.summary.averageWaterMl, 0)} мл`], ['Попадание в цель', `${formatNumber(report.summary.calorieGoalHitPercent, 0)}%`]
  ].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]"><div className="text-[11px] text-[var(--app-muted)]">{label}</div><div className="mt-2 text-xl font-semibold text-[var(--app-text)]">{value}</div></div>)}</div><div className="grid gap-4 xl:grid-cols-2"><ReportPanel title="Распределение БЖУ" icon={BarChart3}>{report.macroShare.map((item) => <ReportBar key={item.macro} label={item.macro === 'protein' ? 'Белки' : item.macro === 'fat' ? 'Жиры' : 'Углеводы'} percent={item.percent} caption={`${formatNumber(item.percent)}% · ${formatNumber(item.calories, 0)} ккал`} />)}</ReportPanel><ReportPanel title="По приёмам пищи" icon={Utensils}>{report.meals.map((meal) => <ReportBar key={meal.mealType} label={mealLabel(meal.mealType)} percent={meal.percent} caption={`${formatNumber(meal.percent)}% · ${formatNumber(meal.calories, 0)} ккал · ${meal.entries} поз.`} />)}</ReportPanel></div><div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]"><ReportPanel title="Динамика по дням" icon={CalendarDays}>{report.timeline.length === 0 ? <p className="py-12 text-center text-sm text-[var(--app-muted)]">Нет данных</p> : <div className="space-y-2">{report.timeline.slice(-31).map((day) => { const max = Math.max(1, ...report.timeline.map((item) => item.nutrients.calories)); return <div key={day.date} className="grid grid-cols-[82px_minmax(0,1fr)_90px] items-center gap-3"><span className="text-xs text-[var(--app-muted)]">{day.date.slice(5)}</span><div className="h-7 overflow-hidden rounded-lg bg-[var(--app-workspace)]"><div className="flex h-full items-center rounded-lg bg-violet-500/20 px-2 text-[10px] text-violet-200" style={{ width: `${Math.max(day.nutrients.calories > 0 ? 6 : 0, (day.nutrients.calories / max) * 100)}%` }}>{day.nutrients.calories > 0 ? `${formatNumber(day.nutrients.proteinG)} г белка` : ''}</div></div><span className="text-right text-xs text-[var(--app-muted)]">{formatNumber(day.nutrients.calories, 0)} ккал</span></div>})}</div>}</ReportPanel><ReportPanel title="Чаще всего" icon={Star}>{report.topItems.length === 0 ? <p className="py-12 text-center text-sm text-[var(--app-muted)]">Нет данных</p> : <div className="space-y-2">{report.topItems.slice(0, 10).map((item, index) => <div key={`${item.sourceType}-${item.sourceId ?? item.title}`} className="flex items-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-3"><span className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-xs font-semibold text-violet-300">{index + 1}</span><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-[var(--app-text)]">{item.title}</div><div className="mt-0.5 text-[11px] text-[var(--app-muted)]">{item.entries} раз · {formatNumber(item.calories, 0)} ккал</div></div></div>)}</div>}</ReportPanel></div><div className="grid gap-4 xl:grid-cols-2"><ReportPanel title="Дополнительные показатели" icon={Leaf}><div className="grid grid-cols-2 gap-3"><MetricBox label="Клетчатка / день" value={`${formatNumber(report.summary.averageFiberG)} г`} /><MetricBox label="Сахар / день" value={`${formatNumber(report.summary.averageSugarG)} г`} /><MetricBox label="Натрий / день" value={`${formatNumber(report.summary.averageSodiumMg, 0)} мг`} /><MetricBox label="Дней с целью" value={String(report.summary.calorieGoalDays)} /></div></ReportPanel><ReportPanel title="Сравнение с калорийной целью" icon={Flame}><div className="grid grid-cols-3 gap-3"><MetricBox label="В пределах ±10%" value={String(report.summary.calorieGoalHitDays)} /><MetricBox label="Выше" value={String(report.summary.daysAboveCalories)} /><MetricBox label="Ниже" value={String(report.summary.daysBelowCalories)} /></div><p className="mt-3 text-[11px] leading-5 text-[var(--app-muted)]">Сравнение выполняется с целью, которая исторически действовала в конкретный день.</p></ReportPanel></div></>}</section>
}

function ReportPanel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }): React.JSX.Element { return <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)]"><div className="mb-4 flex items-center gap-2"><Icon className="size-4 text-violet-300" /><h2 className="text-sm font-semibold text-[var(--app-text)]">{title}</h2></div>{children}</section> }
function ReportBar({ label, percent, caption }: { label: string; percent: number; caption: string }): React.JSX.Element { return <div className="mb-3 last:mb-0"><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="font-medium text-[var(--app-text)]">{label}</span><span className="text-[var(--app-muted)]">{caption}</span></div><div className="h-2 overflow-hidden rounded-full bg-[var(--app-workspace)]"><div className="h-full rounded-full bg-violet-400" style={{ width: `${Math.min(100, percent)}%` }} /></div></div> }
function MetricBox({ label, value }: { label: string; value: string }): React.JSX.Element { return <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-3"><div className="text-[11px] text-[var(--app-muted)]">{label}</div><div className="mt-1 text-lg font-semibold text-[var(--app-text)]">{value}</div></div> }

function NutritionFoodDialog({ open, food, busy, onOpenChange, onSave }: { open: boolean; food: NutritionFoodRecord | null; busy: boolean; onOpenChange: (open: boolean) => void; onSave: (input: CreateNutritionFoodInput | UpdateNutritionFoodInput) => Promise<void> }): React.JSX.Element {
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState<NutritionFoodCategory>('other')
  const [baseAmount, setBaseAmount] = useState(100)
  const [baseUnit, setBaseUnit] = useState<Exclude<NutritionUnit, 'serving'>>('g')
  const [nutrients, setNutrients] = useState<NutritionValues>({ ...ZERO_NUTRIENTS })
  const [favorite, setFavorite] = useState(false)
  const [status, setStatus] = useState<NutritionEntityStatus>('active')
  const [notes, setNotes] = useState('')

  useEffect(() => { if (!open) return; setName(food?.name ?? ''); setBrand(food?.brand ?? ''); setCategory(food?.category ?? 'other'); setBaseAmount(food?.baseAmount ?? 100); setBaseUnit(food?.baseUnit ?? 'g'); setNutrients(food?.nutrients ?? { ...ZERO_NUTRIENTS }); setFavorite(food?.favorite ?? false); setStatus(food?.status ?? 'active'); setNotes(food?.notes ?? '') }, [food, open])
  const updateNutrient = (key: keyof NutritionValues, value: string): void => setNutrients((current) => ({ ...current, [key]: Number(value) || 0 }))
  async function submit(event: React.FormEvent): Promise<void> { event.preventDefault(); if (!name.trim() || baseAmount <= 0) return; await onSave({ ...(food ? { id: food.id } : {}), name: name.trim(), brand: brand.trim(), category, baseAmount, baseUnit, nutrients, favorite, status, notes } as CreateNutritionFoodInput | UpdateNutritionFoodInput); onOpenChange(false) }
  return <AppDialog open={open} onOpenChange={onOpenChange} title={food ? 'Изменить продукт' : 'Новый продукт'} description="Пищевая ценность продукта" icon={<Apple />} size="lg" busy={busy} footer={<><SecondaryButton disabled={busy} onClick={() => onOpenChange(false)}>Отмена</SecondaryButton><button type="submit" form="nutrition-food-form" disabled={busy || !name.trim()} className="h-10 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white disabled:opacity-45">{food ? 'Сохранить' : 'Добавить'}</button></>}><form id="nutrition-food-form" className="space-y-4" onSubmit={(event) => void submit(event)}><FormField label="Название"><input autoFocus value={name} className={INPUT_CLASS} onChange={(event) => setName(event.target.value)} /></FormField><div className="grid gap-3 sm:grid-cols-2"><FormField label="Бренд / производитель"><input value={brand} className={INPUT_CLASS} onChange={(event) => setBrand(event.target.value)} /></FormField><FormField label="Категория"><AppSelect ariaLabel="Категория продукта" value={category} options={CATEGORY_OPTIONS} onValueChange={(value) => setCategory(value as NutritionFoodCategory)} /></FormField></div><div className="grid grid-cols-[1fr_160px] gap-3"><FormField label="Значения указаны на"><input type="number" min="0.001" step="0.001" value={baseAmount} className={INPUT_CLASS} onChange={(event) => setBaseAmount(Number(event.target.value))} /></FormField><FormField label="Единица"><AppSelect ariaLabel="Единица продукта" value={baseUnit} options={UNIT_OPTIONS.filter((option) => option.value !== 'serving')} onValueChange={(value) => setBaseUnit(value as Exclude<NutritionUnit, 'serving'>)} /></FormField></div><div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4"><div className="text-xs font-semibold text-[var(--app-text)]">Пищевая ценность</div><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{([['calories', 'Калории', 'ккал'], ['proteinG', 'Белки', 'г'], ['fatG', 'Жиры', 'г'], ['carbsG', 'Углеводы', 'г'], ['fiberG', 'Клетчатка', 'г'], ['sugarG', 'Сахар', 'г'], ['sodiumMg', 'Натрий', 'мг']] as Array<[keyof NutritionValues, string, string]>).map(([key, label, unit]) => <FormField key={key} label={`${label}, ${unit}`}><input type="number" min="0" step="0.01" value={nutrients[key]} className={INPUT_CLASS} onChange={(event) => updateNutrient(key, event.target.value)} /></FormField>)}</div></div><FormField label="Заметка"><textarea value={notes} rows={3} className={TEXTAREA_CLASS} onChange={(event) => setNotes(event.target.value)} /></FormField><div className="flex flex-wrap gap-4"><CheckField label="Избранное" checked={favorite} onChange={setFavorite} /><CheckField label="В архиве" checked={status === 'archived'} onChange={(checked) => setStatus(checked ? 'archived' : 'active')} /></div></form></AppDialog>
}

function NutritionRecipeDialog({ open, recipe, foods, busy, onOpenChange, onSave }: { open: boolean; recipe: NutritionRecipeRecord | null; foods: NutritionFoodRecord[]; busy: boolean; onOpenChange: (open: boolean) => void; onSave: (input: CreateNutritionRecipeInput | UpdateNutritionRecipeInput) => Promise<void> }): React.JSX.Element {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [servings, setServings] = useState(1)
  const [favorite, setFavorite] = useState(false)
  const [status, setStatus] = useState<NutritionEntityStatus>('active')
  const [ingredients, setIngredients] = useState<Array<{ foodId: string; amount: number }>>([])
  useEffect(() => { if (!open) return; setName(recipe?.name ?? ''); setDescription(recipe?.description ?? ''); setServings(recipe?.servings ?? 1); setFavorite(recipe?.favorite ?? false); setStatus(recipe?.status ?? 'active'); setIngredients(recipe ? recipe.ingredients.map((item) => ({ foodId: item.foodId, amount: item.amount })) : foods[0] ? [{ foodId: foods[0].id, amount: foods[0].baseAmount }] : []) }, [foods, open, recipe])
  const used = new Set(ingredients.map((item) => item.foodId))
  async function submit(event: React.FormEvent): Promise<void> { event.preventDefault(); if (!name.trim() || ingredients.length === 0 || servings <= 0) return; await onSave({ ...(recipe ? { id: recipe.id } : {}), name: name.trim(), description, servings, favorite, status, ingredients } as CreateNutritionRecipeInput | UpdateNutritionRecipeInput); onOpenChange(false) }
  return <AppDialog open={open} onOpenChange={onOpenChange} title={recipe ? 'Изменить рецепт' : 'Новый рецепт'} description="Состав и пищевая ценность блюда" icon={<CookingPot />} size="xl" busy={busy} footer={<><SecondaryButton disabled={busy} onClick={() => onOpenChange(false)}>Отмена</SecondaryButton><button type="submit" form="nutrition-recipe-form" disabled={busy || !name.trim() || ingredients.length === 0} className="h-10 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white disabled:opacity-45">Сохранить</button></>}><form id="nutrition-recipe-form" className="space-y-4" onSubmit={(event) => void submit(event)}><div className="grid gap-3 sm:grid-cols-[1fr_160px]"><FormField label="Название"><input autoFocus value={name} className={INPUT_CLASS} onChange={(event) => setName(event.target.value)} /></FormField><FormField label="Порций в блюде"><input type="number" min="0.1" step="0.1" value={servings} className={INPUT_CLASS} onChange={(event) => setServings(Number(event.target.value))} /></FormField></div><FormField label="Описание"><textarea rows={3} value={description} className={TEXTAREA_CLASS} onChange={(event) => setDescription(event.target.value)} /></FormField><div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4"><div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-[var(--app-text)]">Ингредиенты</h3><p className="mt-0.5 text-xs text-[var(--app-muted)]">Количество указывается в единице самого продукта.</p></div><SecondaryButton disabled={ingredients.length >= foods.length} onClick={() => { const next = foods.find((food) => !used.has(food.id)); if (next) setIngredients((current) => [...current, { foodId: next.id, amount: next.baseAmount }]) }}><Plus className="size-3.5" /> Добавить</SecondaryButton></div><div className="mt-3 space-y-2">{ingredients.map((ingredient, index) => { const food = foods.find((candidate) => candidate.id === ingredient.foodId); return <div key={`${ingredient.foodId}-${index}`} className="grid grid-cols-[minmax(0,1fr)_130px_36px] gap-2"><AppSelect ariaLabel={`Ингредиент ${index + 1}`} value={ingredient.foodId} options={foods.filter((candidate) => candidate.id === ingredient.foodId || !used.has(candidate.id)).map((candidate) => ({ value: candidate.id, label: candidate.name }))} onValueChange={(value) => setIngredients((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, foodId: value, amount: foods.find((candidate) => candidate.id === value)?.baseAmount ?? item.amount } : item))} /><div className="relative"><input type="number" min="0.001" step="0.001" value={ingredient.amount} className={`${INPUT_CLASS} pr-11`} onChange={(event) => setIngredients((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, amount: Number(event.target.value) } : item))} /><span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-[var(--app-muted)]">{food ? unitLabel(food.baseUnit) : ''}</span></div><button type="button" aria-label="Удалить ингредиент" className="flex size-10 items-center justify-center rounded-xl text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300" onClick={() => setIngredients((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="size-4" /></button></div> })}</div></div><div className="flex flex-wrap gap-4"><CheckField label="Избранное" checked={favorite} onChange={setFavorite} /><CheckField label="В архиве" checked={status === 'archived'} onChange={(checked) => setStatus(checked ? 'archived' : 'active')} /></div></form></AppDialog>
}

function NutritionLogDialog({ open, entry, date, initialMeal, foods, recipes, busy, onOpenChange, onSave }: { open: boolean; entry: NutritionLogEntryRecord | null; date: string; initialMeal: NutritionMealType; foods: NutritionFoodRecord[]; recipes: NutritionRecipeRecord[]; busy: boolean; onOpenChange: (open: boolean) => void; onSave: (input: CreateNutritionLogEntryInput | UpdateNutritionLogEntryInput) => Promise<void> }): React.JSX.Element {
  const [mealType, setMealType] = useState<NutritionMealType>('breakfast')
  const [customMealName, setCustomMealName] = useState('')
  const [sourceType, setSourceType] = useState<NutritionLogSourceType>('food')
  const [sourceId, setSourceId] = useState<string | null>(null)
  const [amount, setAmount] = useState(100)
  const [customTitle, setCustomTitle] = useState('')
  const [customUnit, setCustomUnit] = useState<NutritionUnit>('g')
  const [customNutrients, setCustomNutrients] = useState<NutritionValues>({ ...ZERO_NUTRIENTS })
  const [notes, setNotes] = useState('')
  useEffect(() => { if (!open) return; if (entry) { setMealType(entry.mealType); setCustomMealName(entry.customMealName); setSourceType(entry.sourceType); setSourceId(entry.sourceId); setAmount(entry.amount); setCustomTitle(entry.sourceType === 'custom' ? entry.title : ''); setCustomUnit(entry.unit); setCustomNutrients(entry.nutrients); setNotes(entry.notes); return } const initialType: NutritionLogSourceType = foods.length > 0 ? 'food' : recipes.length > 0 ? 'recipe' : 'custom'; setMealType(initialMeal); setCustomMealName(''); setSourceType(initialType); setSourceId(initialType === 'food' ? foods[0]?.id ?? null : initialType === 'recipe' ? recipes[0]?.id ?? null : null); setAmount(initialType === 'food' ? foods[0]?.baseAmount ?? 100 : 1); setCustomTitle(''); setCustomUnit('g'); setCustomNutrients({ ...ZERO_NUTRIENTS }); setNotes('') }, [entry, foods, initialMeal, open, recipes])
  const selectedFood = sourceType === 'food' ? foods.find((food) => food.id === sourceId) : null
  const selectedRecipe = sourceType === 'recipe' ? recipes.find((recipe) => recipe.id === sourceId) : null
  const preview = selectedFood ? Object.fromEntries(Object.entries(selectedFood.nutrients).map(([key, value]) => [key, Number(value) * (amount / selectedFood.baseAmount)])) as unknown as NutritionValues : selectedRecipe ? Object.fromEntries(Object.entries(selectedRecipe.perServingNutrients).map(([key, value]) => [key, Number(value) * amount])) as unknown as NutritionValues : customNutrients
  function switchSource(value: NutritionLogSourceType): void { setSourceType(value); if (value === 'food') { setSourceId(foods[0]?.id ?? null); setAmount(foods[0]?.baseAmount ?? 100) } else if (value === 'recipe') { setSourceId(recipes[0]?.id ?? null); setAmount(1) } else { setSourceId(null); setAmount(1) } }
  async function submit(event: React.FormEvent): Promise<void> { event.preventDefault(); if (mealType === 'other' && !customMealName.trim()) return; if (sourceType !== 'custom' && !sourceId) return; if (sourceType === 'custom' && !customTitle.trim()) return; const payload: CreateNutritionLogEntryInput = { date: entry?.date ?? date, mealType, customMealName, sourceType, sourceId: sourceType === 'custom' ? null : sourceId, amount, customTitle, customUnit, customNutrients: sourceType === 'custom' ? customNutrients : null, notes }; await onSave(entry ? { ...payload, id: entry.id } : payload); onOpenChange(false) }
  const updateCustom = (key: keyof NutritionValues, value: string): void => setCustomNutrients((current) => ({ ...current, [key]: Number(value) || 0 }))
  return <AppDialog open={open} onOpenChange={onOpenChange} title={entry ? 'Изменить запись' : 'Добавить в дневник'} description="Продукт, рецепт или своя запись" icon={<Utensils />} size="lg" busy={busy} footer={<><SecondaryButton disabled={busy} onClick={() => onOpenChange(false)}>Отмена</SecondaryButton><button type="submit" form="nutrition-log-form" disabled={busy} className="h-10 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white disabled:opacity-45">Сохранить</button></>}><form id="nutrition-log-form" className="space-y-4" onSubmit={(event) => void submit(event)}><div className="grid gap-3 sm:grid-cols-2"><FormField label="Приём пищи"><AppSelect ariaLabel="Приём пищи" value={mealType} options={MEAL_OPTIONS} onValueChange={(value) => setMealType(value as NutritionMealType)} /></FormField>{mealType === 'other' && <FormField label="Название приёма"><input value={customMealName} className={INPUT_CLASS} placeholder="Например, после тренировки" onChange={(event) => setCustomMealName(event.target.value)} /></FormField>}</div><FormField label="Что добавляем"><AppSelect ariaLabel="Тип записи" value={sourceType} options={SOURCE_OPTIONS} onValueChange={(value) => switchSource(value as NutritionLogSourceType)} /></FormField>{sourceType === 'food' && <FormField label="Продукт"><AppSelect ariaLabel="Продукт" value={sourceId ?? ''} options={foods.map((food) => ({ value: food.id, label: food.brand ? `${food.name} · ${food.brand}` : food.name }))} onValueChange={(value) => { setSourceId(value); setAmount(foods.find((food) => food.id === value)?.baseAmount ?? amount) }} /></FormField>}{sourceType === 'recipe' && <FormField label="Рецепт"><AppSelect ariaLabel="Рецепт" value={sourceId ?? ''} options={recipes.map((recipe) => ({ value: recipe.id, label: recipe.name }))} onValueChange={setSourceId} /></FormField>}{sourceType === 'custom' && <><div className="grid gap-3 sm:grid-cols-[1fr_150px]"><FormField label="Название"><input value={customTitle} className={INPUT_CLASS} onChange={(event) => setCustomTitle(event.target.value)} /></FormField><FormField label="Единица"><AppSelect ariaLabel="Единица своей записи" value={customUnit} options={UNIT_OPTIONS} onValueChange={(value) => setCustomUnit(value as NutritionUnit)} /></FormField></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{([['calories', 'Калории'], ['proteinG', 'Белки, г'], ['fatG', 'Жиры, г'], ['carbsG', 'Углеводы, г'], ['fiberG', 'Клетчатка, г'], ['sugarG', 'Сахар, г'], ['sodiumMg', 'Натрий, мг']] as Array<[keyof NutritionValues, string]>).map(([key, label]) => <FormField key={key} label={label}><input type="number" min="0" step="0.01" value={customNutrients[key]} className={INPUT_CLASS} onChange={(event) => updateCustom(key, event.target.value)} /></FormField>)}</div></>}<FormField label={sourceType === 'recipe' ? 'Количество порций' : 'Количество'}><div className="relative"><input type="number" min="0.001" step="0.001" value={amount} className={`${INPUT_CLASS} pr-16`} onChange={(event) => setAmount(Number(event.target.value))} /><span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-[var(--app-muted)]">{sourceType === 'food' && selectedFood ? unitLabel(selectedFood.baseUnit) : sourceType === 'recipe' ? 'порц.' : unitLabel(customUnit)}</span></div></FormField><div className="rounded-xl border border-violet-400/15 bg-violet-500/[0.06] p-3 text-sm text-violet-100"><span className="text-xs text-violet-200/70">Итого для записи</span><div className="mt-1 font-semibold">{nutrientLine(preview)}</div></div><FormField label="Комментарий"><textarea rows={2} value={notes} className={TEXTAREA_CLASS} onChange={(event) => setNotes(event.target.value)} /></FormField></form></AppDialog>
}

function NutritionTargetsDialog({ open, target, busy, onOpenChange, onSave }: { open: boolean; target: NutritionTargetRecord | null; busy: boolean; onOpenChange: (open: boolean) => void; onSave: (input: SetNutritionTargetsInput) => Promise<void> }): React.JSX.Element {
  const [effectiveFrom, setEffectiveFrom] = useState(localDateKey())
  const [values, setValues] = useState<Record<'calories' | 'proteinG' | 'fatG' | 'carbsG' | 'fiberG' | 'waterMl', string>>({ calories: '', proteinG: '', fatG: '', carbsG: '', fiberG: '', waterMl: '' })
  useEffect(() => { if (!open) return; setEffectiveFrom(localDateKey()); setValues({ calories: target?.calories?.toString() ?? '', proteinG: target?.proteinG?.toString() ?? '', fatG: target?.fatG?.toString() ?? '', carbsG: target?.carbsG?.toString() ?? '', fiberG: target?.fiberG?.toString() ?? '', waterMl: target?.waterMl?.toString() ?? '' }) }, [open, target])
  const optional = (value: string): number | null => value.trim() ? Number(value) : null
  async function submit(event: React.FormEvent): Promise<void> { event.preventDefault(); await onSave({ effectiveFrom, calories: optional(values.calories), proteinG: optional(values.proteinG), fatG: optional(values.fatG), carbsG: optional(values.carbsG), fiberG: optional(values.fiberG), waterMl: optional(values.waterMl) }); onOpenChange(false) }
  return <AppDialog open={open} onOpenChange={onOpenChange} title="Цели питания" description="Дневные ориентиры с историей" icon={<Settings2 />} size="md" busy={busy} footer={<><SecondaryButton disabled={busy} onClick={() => onOpenChange(false)}>Отмена</SecondaryButton><button type="submit" form="nutrition-targets-form" disabled={busy} className="h-10 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white disabled:opacity-45">Сохранить новый период</button></>}><form id="nutrition-targets-form" className="space-y-4" onSubmit={(event) => void submit(event)}><FormField label="Действует с"><input type="date" value={effectiveFrom} className={INPUT_CLASS} onChange={(event) => setEffectiveFrom(event.target.value)} /></FormField><div className="grid gap-3 sm:grid-cols-2">{([['calories', 'Калории, ккал'], ['proteinG', 'Белки, г'], ['fatG', 'Жиры, г'], ['carbsG', 'Углеводы, г'], ['fiberG', 'Клетчатка, г'], ['waterMl', 'Вода, мл']] as Array<[keyof typeof values, string]>).map(([key, label]) => <FormField key={key} label={label}><input type="number" min="0" step={key === 'waterMl' ? '1' : '0.1'} value={values[key]} placeholder="Не задано" className={INPUT_CLASS} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} /></FormField>)}</div><p className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-3 text-xs leading-5 text-[var(--app-muted)]">Пустое поле означает, что показатель не используется как цель. Сохранение не переписывает прошлые периоды.</p></form></AppDialog>
}

function EmptyPanel({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }): React.JSX.Element { return <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] px-6 text-center"><Icon className="size-9 text-violet-300" /><h2 className="mt-4 text-lg font-semibold text-[var(--app-text)]">{title}</h2><p className="mt-2 max-w-lg text-sm leading-6 text-[var(--app-muted)]">{children}</p></div> }
function FormField({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element { return <label className="block space-y-1.5"><span className="text-xs font-medium text-[var(--app-muted)]">{label}</span>{children}</label> }
function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }): React.JSX.Element { return <label className="inline-flex items-center gap-2 text-sm text-[var(--app-muted)]"><input type="checkbox" checked={checked} className="accent-violet-500" onChange={(event) => onChange(event.target.checked)} />{label}</label> }
function PrimaryButton({ children, disabled = false, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }): React.JSX.Element { return <button type="button" disabled={disabled} className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-45" onClick={onClick}>{children}</button> }
function SecondaryButton({ children, disabled = false, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }): React.JSX.Element { return <button type="button" disabled={disabled} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-xs font-medium text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-45" onClick={onClick}>{children}</button> }

const INPUT_CLASS = 'h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/10'
const TEXTAREA_CLASS = 'w-full resize-y rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 py-2.5 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/10'
