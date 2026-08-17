import { CookingPot, Search, Star, Utensils } from 'lucide-react'
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
  NUTRITION_SOURCE_OPTIONS,
  NUTRITION_UNIT_OPTIONS,
  nutritionUnitLabel
} from '../nutrition-options'
import {
  EMPTY_NUTRITION_VALUES,
  NUTRITION_INPUT_CLASS_NAME,
  NUTRITION_TEXTAREA_CLASS_NAME,
  nutritionValuesLine,
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

  const activeFoods = useMemo(() => foods.filter((food) => food.status === 'active'), [foods])
  const activeRecipes = useMemo(
    () => recipes.filter((recipe) => recipe.status === 'active'),
    [recipes]
  )

  useEffect(() => {
    if (!open) return
    setSourceQuery('')

    if (entry) {
      setMealType(entry.mealType)
      setCustomMealName(entry.customMealName)
      setSourceType(entry.sourceType)
      setSourceId(entry.sourceId)
      setAmount(entry.amount)
      setCustomTitle(entry.sourceType === 'custom' ? entry.title : '')
      setCustomUnit(entry.unit)
      setCustomNutrients(entry.nutrients)
      setNotes(entry.notes)
      return
    }

    const initialSource: NutritionLogSourceType =
      activeFoods.length > 0 ? 'food' : activeRecipes.length > 0 ? 'recipe' : 'custom'
    setMealType(initialMeal)
    setCustomMealName('')
    setSourceType(initialSource)
    setSourceId(
      initialSource === 'food'
        ? activeFoods[0]?.id ?? null
        : initialSource === 'recipe'
          ? activeRecipes[0]?.id ?? null
          : null
    )
    setAmount(initialSource === 'food' ? activeFoods[0]?.baseAmount ?? 100 : 1)
    setCustomTitle('')
    setCustomUnit('g')
    setCustomNutrients({ ...EMPTY_NUTRITION_VALUES })
    setNotes('')
  }, [activeFoods, activeRecipes, entry, initialMeal, open])

  const selectedFood =
    sourceType === 'food' ? foods.find((food) => food.id === sourceId) ?? null : null
  const selectedRecipe =
    sourceType === 'recipe'
      ? recipes.find((recipe) => recipe.id === sourceId) ?? null
      : null

  const sourceCandidates = useMemo(() => {
    const normalized = sourceQuery.trim().toLocaleLowerCase('ru-RU')
    if (sourceType === 'food') {
      return activeFoods
        .filter((food) =>
          !normalized
            ? true
            : `${food.name} ${food.brand}`.toLocaleLowerCase('ru-RU').includes(normalized)
        )
        .slice(0, 12)
        .map((food) => ({
          id: food.id,
          title: food.name,
          subtitle: food.brand || `${food.baseAmount} ${nutritionUnitLabel(food.baseUnit)}`,
          favorite: food.favorite,
          kind: 'food' as const
        }))
    }

    if (sourceType === 'recipe') {
      return activeRecipes
        .filter((recipe) =>
          !normalized
            ? true
            : `${recipe.name} ${recipe.description}`
                .toLocaleLowerCase('ru-RU')
                .includes(normalized)
        )
        .slice(0, 12)
        .map((recipe) => ({
          id: recipe.id,
          title: recipe.name,
          subtitle: `${recipe.servings} порц. · ${recipe.ingredients.length} ингредиентов`,
          favorite: recipe.favorite,
          kind: 'recipe' as const
        }))
    }

    return []
  }, [activeFoods, activeRecipes, sourceQuery, sourceType])

  const preview = selectedFood
    ? scaleNutritionValues(selectedFood.nutrients, amount / selectedFood.baseAmount)
    : selectedRecipe
      ? scaleNutritionValues(selectedRecipe.perServingNutrients, amount)
      : customNutrients

  function changeSourceType(value: NutritionLogSourceType): void {
    setSourceType(value)
    setSourceQuery('')
    if (value === 'food') {
      const food = activeFoods[0]
      setSourceId(food?.id ?? null)
      setAmount(food?.baseAmount ?? 100)
      return
    }
    if (value === 'recipe') {
      setSourceId(activeRecipes[0]?.id ?? null)
      setAmount(1)
      return
    }
    setSourceId(null)
    setAmount(1)
  }

  function selectSource(id: string): void {
    setSourceId(id)
    if (sourceType === 'food') {
      setAmount(foods.find((food) => food.id === id)?.baseAmount ?? 100)
    } else {
      setAmount(1)
    }
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
    if (busy || amount <= 0) return
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

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={entry ? 'Изменить запись' : 'Добавить в дневник'}
      description="Быстро найдите продукт или рецепт. Если нужного нет — сохраните разовую запись без пополнения каталога."
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
            disabled={busy || amount <= 0}
            className="h-10 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-45"
          >
            Сохранить
          </button>
        </>
      }
    >
      <form
        id="nutrition-log-form"
        className="space-y-4"
        onSubmit={(event) => void submit(event)}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <NutritionFormField label="Приём пищи">
            <AppSelect
              ariaLabel="Приём пищи"
              value={mealType}
              options={NUTRITION_MEAL_OPTIONS}
              onValueChange={(value) => setMealType(value as NutritionMealType)}
            />
          </NutritionFormField>
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
        </div>

        <NutritionFormField label="Что добавляем">
          <AppSelect
            ariaLabel="Тип записи"
            value={sourceType}
            options={NUTRITION_SOURCE_OPTIONS}
            onValueChange={(value) => changeSourceType(value as NutritionLogSourceType)}
          />
        </NutritionFormField>

        {sourceType !== 'custom' && (
          <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-3">
            <label className="flex h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 focus-within:border-violet-500/45">
              <Search className="size-4 text-[var(--app-muted)]" />
              <input
                value={sourceQuery}
                type="search"
                aria-label={sourceType === 'food' ? 'Поиск продукта' : 'Поиск рецепта'}
                placeholder={sourceType === 'food' ? 'Найти продукт…' : 'Найти рецепт…'}
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60"
                onChange={(event) => setSourceQuery(event.target.value)}
              />
            </label>

            <div className="mt-2 max-h-52 space-y-1 overflow-y-auto">
              {sourceCandidates.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-[var(--app-muted)]">
                  Ничего не найдено. Можно выбрать «Своя запись» или добавить элемент в каталог.
                </p>
              ) : (
                sourceCandidates.map((candidate) => {
                  const selected = sourceId === candidate.id
                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      aria-pressed={selected}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                        selected
                          ? 'bg-violet-500/12 text-[var(--app-text)]'
                          : 'text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                      )}
                      onClick={() => selectSource(candidate.id)}
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
                        {candidate.kind === 'food' ? (
                          <Utensils className="size-4" />
                        ) : (
                          <CookingPot className="size-4" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <strong className="truncate text-sm font-medium">{candidate.title}</strong>
                          {candidate.favorite && (
                            <Star className="size-3 fill-amber-300 text-amber-300" />
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] opacity-75">
                          {candidate.subtitle}
                        </span>
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </section>
        )}

        {sourceType === 'custom' && (
          <section className="space-y-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4">
            <div>
              <h3 className="text-xs font-semibold text-[var(--app-text)]">Своя запись</h3>
              <p className="mt-1 text-[11px] leading-5 text-[var(--app-muted)]">
                Пищевая ценность ниже считается итогом всей записи. Она не умножается на количество.
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

        <NutritionFormField
          label={sourceType === 'recipe' ? 'Количество порций' : 'Количество'}
        >
          <div className="relative">
            <input
              type="number"
              min="0.001"
              max="100000"
              step="0.001"
              value={amount}
              className={`${NUTRITION_INPUT_CLASS_NAME} pr-16`}
              onChange={(event) => setAmount(Number(event.target.value))}
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-[var(--app-muted)]">
              {selectedFood
                ? nutritionUnitLabel(selectedFood.baseUnit)
                : sourceType === 'recipe'
                  ? 'порц.'
                  : nutritionUnitLabel(customUnit)}
            </span>
          </div>
        </NutritionFormField>

        <div className="rounded-xl border border-violet-400/15 bg-violet-500/[0.06] p-3">
          <span className="text-xs text-violet-200/70">Итого для записи</span>
          <div className="mt-1 text-sm font-semibold text-violet-100">
            {nutritionValuesLine(preview)}
          </div>
        </div>

        <NutritionFormField label="Комментарий" hint="необязательно">
          <textarea
            rows={2}
            maxLength={4000}
            value={notes}
            className={NUTRITION_TEXTAREA_CLASS_NAME}
            onChange={(event) => setNotes(event.target.value)}
          />
        </NutritionFormField>
      </form>
    </AppDialog>
  )
}
