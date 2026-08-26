import { Apple, ArrowLeft, CookingPot, Plus, Search, Utensils } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import type {
  CreateNutritionLogEntryInput,
  NutritionFoodRecord,
  NutritionLogEntryRecord,
  NutritionLogSourceType,
  NutritionMealType,
  NutritionRecipeRecord,
  NutritionUnit,
  NutritionValues,
  UpdateNutritionLogEntryInput
} from '../../../../../shared/contracts/nutrition'
import { cn } from '../../../shared/lib/cn'
import { AppDialog } from '../../../shared/ui/AppDialog'
import { AppSelect } from '../../../shared/ui/AppSelect'
import {
  NUTRITION_MEAL_OPTIONS,
  NUTRITION_UNIT_OPTIONS,
  nutritionUnitLabel
} from '../nutrition-options'
import {
  EMPTY_NUTRITION_VALUES,
  NUTRITION_INPUT_CLASS_NAME,
  NUTRITION_TEXTAREA_CLASS_NAME,
  formatNutritionNumber,
  scaleNutritionValues
} from '../nutrition-utils'
import { NutritionFormField, NutritionSecondaryButton } from './NutritionFormPrimitives'

const CUSTOM_NUTRIENTS: Array<{ key: keyof NutritionValues; label: string }> = [
  { key: 'calories', label: 'Калории, ккал' },
  { key: 'proteinG', label: 'Белки, г' },
  { key: 'fatG', label: 'Жиры, г' },
  { key: 'carbsG', label: 'Углеводы, г' },
  { key: 'fiberG', label: 'Клетчатка, г' },
  { key: 'sugarG', label: 'Сахар, г' },
  { key: 'sodiumMg', label: 'Натрий, мг' }
]

interface NutritionLogDialogProps {
  open: boolean
  entry: NutritionLogEntryRecord | null
  date: string
  initialMeal: NutritionMealType
  foods: NutritionFoodRecord[]
  recipes: NutritionRecipeRecord[]
  busy: boolean
  onOpenChange: (open: boolean) => void
  onCreateFood: () => void
  onCreateRecipe: () => void
  onSave: (input: CreateNutritionLogEntryInput | UpdateNutritionLogEntryInput) => Promise<void>
}

export function NutritionLogDialog({
  open,
  entry,
  date,
  initialMeal,
  foods,
  recipes,
  busy,
  onOpenChange,
  onCreateFood,
  onCreateRecipe,
  onSave
}: NutritionLogDialogProps): React.JSX.Element {
  const [mealType, setMealType] = useState<NutritionMealType>('breakfast')
  const [customMealName, setCustomMealName] = useState('')
  const [sourceType, setSourceType] = useState<NutritionLogSourceType>('food')
  const [sourceId, setSourceId] = useState<string | null>(null)
  const [sourceQuery, setSourceQuery] = useState('')
  const [amount, setAmount] = useState(100)
  const [customTitle, setCustomTitle] = useState('')
  const [customUnit, setCustomUnit] = useState<NutritionUnit>('g')
  const [customNutrients, setCustomNutrients] = useState<NutritionValues>({
    ...EMPTY_NUTRITION_VALUES
  })
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) return
    const timerId = window.setTimeout(() => {
      setSourceQuery('')

      if (entry) {
        const sourceStillExists =
          entry.sourceType === 'food'
            ? foods.some((food) => food.id === entry.sourceId)
            : entry.sourceType === 'recipe'
              ? recipes.some((recipe) => recipe.id === entry.sourceId)
              : true

        setMealType(entry.mealType)
        setCustomMealName(entry.customMealName)
        setSourceType(sourceStillExists ? entry.sourceType : 'custom')
        setSourceId(sourceStillExists && entry.sourceType !== 'custom' ? entry.sourceId : null)
        setAmount(entry.amount)
        setCustomTitle(entry.sourceType === 'custom' || !sourceStillExists ? entry.title : '')
        setCustomUnit(entry.unit)
        setCustomNutrients(entry.nutrients)
        setNotes(entry.notes)
        return
      }

      setMealType(initialMeal)
      setCustomMealName('')
      setSourceType(foods.length > 0 ? 'food' : recipes.length > 0 ? 'recipe' : 'custom')
      setSourceId(null)
      setAmount(100)
      setCustomTitle('')
      setCustomUnit('g')
      setCustomNutrients({ ...EMPTY_NUTRITION_VALUES })
      setNotes('')
    }, 0)
    return () => window.clearTimeout(timerId)
  }, [entry, foods, initialMeal, open, recipes])

  const selectedFood =
    sourceType === 'food' ? (foods.find((food) => food.id === sourceId) ?? null) : null
  const selectedRecipe =
    sourceType === 'recipe' ? (recipes.find((recipe) => recipe.id === sourceId) ?? null) : null

  const sourceCandidates = useMemo(() => {
    const normalized = sourceQuery.trim().toLocaleLowerCase('ru-RU')
    const candidates = [
      ...foods.map((food) => ({
        id: food.id,
        kind: 'food' as const,
        title: food.name,
        subtitle: `${formatNutritionNumber(food.nutrients.calories, 0)} ккал · ${formatNutritionNumber(food.baseAmount)} ${nutritionUnitLabel(food.baseUnit)}`,
        search: `${food.name} ${food.brand}`.toLocaleLowerCase('ru-RU')
      })),
      ...recipes.map((recipe) => ({
        id: recipe.id,
        kind: 'recipe' as const,
        title: recipe.name,
        subtitle: `${formatNutritionNumber(recipe.perServingNutrients.calories, 0)} ккал · 1 порц.`,
        search: `${recipe.name} ${recipe.description}`.toLocaleLowerCase('ru-RU')
      }))
    ].filter((candidate) => !normalized || candidate.search.includes(normalized))

    return candidates
      .sort((a, b) => Number(b.id === sourceId) - Number(a.id === sourceId))
      .slice(0, 16)
  }, [foods, recipes, sourceId, sourceQuery])

  const preview = selectedFood
    ? scaleNutritionValues(selectedFood.nutrients, amount / selectedFood.baseAmount)
    : selectedRecipe
      ? scaleNutritionValues(selectedRecipe.perServingNutrients, amount)
      : customNutrients

  const quickAmounts = useMemo(() => {
    if (selectedRecipe) return [0.5, 1, 1.5, 2]
    if (!selectedFood) return []
    if (selectedFood.baseUnit === 'piece') return [1, 2, 3]
    const base = selectedFood.baseAmount
    return Array.from(new Set([base, base * 1.5, base * 2].map((value) => Number(value.toFixed(3)))))
  }, [selectedFood, selectedRecipe])

  function selectSource(kind: 'food' | 'recipe', id: string): void {
    setSourceType(kind)
    setSourceId(id)
    if (kind === 'food') {
      setAmount(foods.find((food) => food.id === id)?.baseAmount ?? 100)
    } else {
      setAmount(1)
    }
  }

  function enableCustomEntry(): void {
    setSourceType('custom')
    setSourceId(null)
    setAmount(1)
  }

  function returnToSearch(): void {
    setSourceType(foods.length > 0 ? 'food' : recipes.length > 0 ? 'recipe' : 'custom')
    setSourceId(null)
    setSourceQuery('')
    setAmount(100)
  }

  function updateCustomNutrient(key: keyof NutritionValues, rawValue: string): void {
    const value = Number(rawValue)
    setCustomNutrients((current) => ({
      ...current,
      [key]: Number.isFinite(value) ? Math.max(0, value) : 0
    }))
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (busy || !Number.isFinite(amount) || amount <= 0) return
    if (mealType === 'other' && !customMealName.trim()) return
    if (sourceType !== 'custom' && !sourceId) return
    if (sourceType === 'custom' && !customTitle.trim()) return

    const payload: CreateNutritionLogEntryInput = {
      date: entry?.date ?? date,
      mealType,
      customMealName: customMealName.trim(),
      sourceType,
      sourceId: sourceType === 'custom' ? null : sourceId,
      amount,
      customTitle: customTitle.trim(),
      customUnit,
      customNutrients: sourceType === 'custom' ? customNutrients : null,
      notes
    }
    await onSave(entry ? { ...payload, id: entry.id } : payload)
    onOpenChange(false)
  }

  const hasSelectedSource = Boolean(selectedFood || selectedRecipe)
  const amountUnit = selectedRecipe
    ? 'порц.'
    : selectedFood
      ? nutritionUnitLabel(selectedFood.baseUnit)
      : nutritionUnitLabel(customUnit)

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={entry ? 'Изменить запись' : 'Добавить еду'}
      description="Найдите продукт или рецепт, укажите количество и сохраните."
      icon={<Utensils />}
      size="lg"
      busy={busy}
      footer={
        <>
          <NutritionSecondaryButton disabled={busy} onClick={() => onOpenChange(false)}>
            Отмена
          </NutritionSecondaryButton>
          <button
            type="submit"
            form="nutrition-log-form"
            disabled={
              busy ||
              !Number.isFinite(amount) ||
              amount <= 0 ||
              (sourceType !== 'custom' && !sourceId) ||
              (sourceType === 'custom' && !customTitle.trim())
            }
            className="h-10 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-45"
          >
            {entry ? 'Сохранить' : 'Добавить'}
          </button>
        </>
      }
    >
      <form
        id="nutrition-log-form"
        className="space-y-4"
        onSubmit={(event) => void submit(event).catch(() => undefined)}
      >
        <div>
          <div className="mb-2 text-xs font-medium text-[var(--app-muted)]">Приём пищи</div>
          <div className="flex flex-wrap gap-1.5">
            {NUTRITION_MEAL_OPTIONS.map((meal) => (
              <button
                key={meal.value}
                type="button"
                aria-pressed={mealType === meal.value}
                className={cn(
                  'h-9 rounded-xl px-3 text-xs font-medium transition-colors',
                  mealType === meal.value
                    ? 'bg-violet-500/15 text-violet-200'
                    : 'bg-[var(--app-workspace)] text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                )}
                onClick={() => setMealType(meal.value)}
              >
                {meal.label}
              </button>
            ))}
          </div>
        </div>

        {mealType === 'other' && (
          <NutritionFormField label="Название приёма">
            <input
              value={customMealName}
              maxLength={80}
              placeholder="Например, после тренировки"
              className={NUTRITION_INPUT_CLASS_NAME}
              onChange={(event) => setCustomMealName(event.target.value)}
            />
          </NutritionFormField>
        )}

        {sourceType !== 'custom' ? (
          <>
            <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-3">
              <label className="flex h-11 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 focus-within:border-violet-500/45">
                <Search className="size-4 text-[var(--app-muted)]" />
                <input
                  autoFocus={!entry}
                  value={sourceQuery}
                  type="search"
                  aria-label="Поиск продукта или рецепта"
                  placeholder="Что вы съели?"
                  className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60"
                  onChange={(event) => setSourceQuery(event.target.value)}
                />
              </label>

              <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                {sourceCandidates.length === 0 ? (
                  <p className="px-3 py-7 text-center text-xs text-[var(--app-muted)]">
                    Ничего не найдено
                  </p>
                ) : (
                  sourceCandidates.map((candidate) => {
                    const selected = sourceId === candidate.id && sourceType === candidate.kind
                    return (
                      <button
                        key={`${candidate.kind}-${candidate.id}`}
                        type="button"
                        aria-pressed={selected}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                          selected
                            ? 'bg-violet-500/12 text-[var(--app-text)]'
                            : 'text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                        )}
                        onClick={() => selectSource(candidate.kind, candidate.id)}
                      >
                        <span
                          className={cn(
                            'flex size-8 shrink-0 items-center justify-center rounded-lg',
                            candidate.kind === 'food'
                              ? 'bg-emerald-500/10 text-emerald-300'
                              : 'bg-violet-500/10 text-violet-300'
                          )}
                        >
                          {candidate.kind === 'food' ? (
                            <Apple className="size-4" />
                          ) : (
                            <CookingPot className="size-4" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <strong className="block truncate text-sm font-medium">{candidate.title}</strong>
                          <span className="mt-0.5 block truncate text-[11px] opacity-75">
                            {candidate.subtitle}
                          </span>
                        </span>
                        <span className="text-[10px] opacity-60">
                          {candidate.kind === 'food' ? 'Продукт' : 'Рецепт'}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </section>

            {hasSelectedSource && (
              <section className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px] sm:items-end">
                  <NutritionFormField label={selectedRecipe ? 'Порций' : 'Количество'}>
                    <input
                      type="number"
                      min="0.001"
                      max="100000"
                      step="0.001"
                      value={amount}
                      className={NUTRITION_INPUT_CLASS_NAME}
                      onChange={(event) => setAmount(Number(event.target.value))}
                    />
                  </NutritionFormField>
                  <div className="h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 py-2.5 text-sm text-[var(--app-muted)]">
                    {amountUnit}
                  </div>
                </div>

                {quickAmounts.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {quickAmounts.map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={cn(
                          'h-8 rounded-lg px-2.5 text-xs transition-colors',
                          amount === value
                            ? 'bg-violet-500/15 text-violet-200'
                            : 'bg-[var(--app-workspace)] text-[var(--app-muted)] hover:text-[var(--app-text)]'
                        )}
                        onClick={() => setAmount(value)}
                      >
                        {formatNutritionNumber(value)} {amountUnit}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-3 text-xs text-[var(--app-muted)]">
                  <strong className="font-semibold text-[var(--app-text)]">
                    {formatNutritionNumber(preview.calories, 0)} ккал
                  </strong>{' '}
                  · Б {formatNutritionNumber(preview.proteinG)} · Ж {formatNutritionNumber(preview.fatG)} · У {formatNutritionNumber(preview.carbsG)}
                </div>
              </section>
            )}

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[var(--app-muted)]">Не нашли?</span>
              <button
                type="button"
                className="font-medium text-violet-300 hover:text-violet-200"
                onClick={() => {
                  onOpenChange(false)
                  onCreateFood()
                }}
              >
                Создать продукт
              </button>
              <span className="text-[var(--app-muted)]/50">·</span>
              <button
                type="button"
                disabled={foods.length === 0}
                className="font-medium text-violet-300 hover:text-violet-200 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => {
                  onOpenChange(false)
                  onCreateRecipe()
                }}
              >
                Создать рецепт
              </button>
              <span className="text-[var(--app-muted)]/50">·</span>
              <button
                type="button"
                className="font-medium text-violet-300 hover:text-violet-200"
                onClick={enableCustomEntry}
              >
                Своя запись
              </button>
            </div>
          </>
        ) : (
          <section className="space-y-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4">
            {(foods.length > 0 || recipes.length > 0) && (
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                onClick={returnToSearch}
              >
                <ArrowLeft className="size-3.5" /> Найти продукт или рецепт
              </button>
            )}
            <div>
              <h3 className="text-sm font-semibold text-[var(--app-text)]">Своя запись</h3>
              <p className="mt-1 text-[11px] leading-5 text-[var(--app-muted)]">
                Для блюда, которого нет в библиотеке. Укажите итоговую пищевую ценность всей записи.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
              <NutritionFormField label="Название">
                <input
                  value={customTitle}
                  maxLength={180}
                  placeholder="Например, блюдо в кафе"
                  className={NUTRITION_INPUT_CLASS_NAME}
                  onChange={(event) => setCustomTitle(event.target.value)}
                />
              </NutritionFormField>
              <NutritionFormField label="Единица">
                <AppSelect
                  ariaLabel="Единица своей записи"
                  value={customUnit}
                  options={NUTRITION_UNIT_OPTIONS}
                  onValueChange={(value) => setCustomUnit(value as NutritionUnit)}
                />
              </NutritionFormField>
            </div>
            <NutritionFormField label="Количество">
              <input
                type="number"
                min="0.001"
                max="100000"
                step="0.001"
                value={amount}
                className={NUTRITION_INPUT_CLASS_NAME}
                onChange={(event) => setAmount(Number(event.target.value))}
              />
            </NutritionFormField>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {CUSTOM_NUTRIENTS.map((field) => (
                <NutritionFormField key={field.key} label={field.label}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={customNutrients[field.key]}
                    className={NUTRITION_INPUT_CLASS_NAME}
                    onChange={(event) => updateCustomNutrient(field.key, event.target.value)}
                  />
                </NutritionFormField>
              ))}
            </div>
          </section>
        )}

        <NutritionFormField label="Комментарий" hint="необязательно">
          <textarea
            value={notes}
            rows={2}
            maxLength={10000}
            className={NUTRITION_TEXTAREA_CLASS_NAME}
            onChange={(event) => setNotes(event.target.value)}
          />
        </NutritionFormField>
      </form>
    </AppDialog>
  )
}
