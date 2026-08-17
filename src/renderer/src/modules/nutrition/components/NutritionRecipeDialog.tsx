import { CookingPot, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import type {
  CreateNutritionRecipeInput,
  NutritionEntityStatus,
  NutritionFoodRecord,
  NutritionRecipeRecord,
  UpdateNutritionRecipeInput
} from '../../../../../shared/contracts/nutrition'
import { AppDialog } from '../../../shared/ui/AppDialog'
import { AppSelect } from '../../../shared/ui/AppSelect'
import { nutritionUnitLabel } from '../nutrition-options'
import {
  NUTRITION_INPUT_CLASS_NAME,
  NUTRITION_TEXTAREA_CLASS_NAME
} from '../nutrition-utils'
import {
  NutritionCheckField,
  NutritionFormField,
  NutritionSecondaryButton
} from './NutritionFormPrimitives'

interface RecipeIngredientDraft {
  foodId: string
  amount: number
}

interface NutritionRecipeDialogProps {
  open: boolean
  recipe: NutritionRecipeRecord | null
  foods: NutritionFoodRecord[]
  busy: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: CreateNutritionRecipeInput | UpdateNutritionRecipeInput) => Promise<void>
}

export function NutritionRecipeDialog({
  open,
  recipe,
  foods,
  busy,
  onOpenChange,
  onSave
}: NutritionRecipeDialogProps): React.JSX.Element {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [servings, setServings] = useState(1)
  const [favorite, setFavorite] = useState(false)
  const [status, setStatus] = useState<NutritionEntityStatus>('active')
  const [ingredients, setIngredients] = useState<RecipeIngredientDraft[]>([])

  const foodsById = useMemo(() => new Map(foods.map((food) => [food.id, food])), [foods])
  const activeFoods = useMemo(() => foods.filter((food) => food.status === 'active'), [foods])

  useEffect(() => {
    if (!open) return
    setName(recipe?.name ?? '')
    setDescription(recipe?.description ?? '')
    setServings(recipe?.servings ?? 1)
    setFavorite(recipe?.favorite ?? false)
    setStatus(recipe?.status ?? 'active')

    if (recipe) {
      setIngredients(
        recipe.ingredients.map((ingredient) => ({
          foodId: ingredient.foodId,
          amount: ingredient.amount
        }))
      )
      return
    }

    const firstFood = activeFoods[0]
    setIngredients(firstFood ? [{ foodId: firstFood.id, amount: firstFood.baseAmount }] : [])
  }, [activeFoods, open, recipe])

  const usedFoodIds = useMemo(
    () => new Set(ingredients.map((ingredient) => ingredient.foodId)),
    [ingredients]
  )
  const addableFoods = activeFoods.filter((food) => !usedFoodIds.has(food.id))

  function optionsForIngredient(index: number): Array<{ value: string; label: string }> {
    const currentId = ingredients[index]?.foodId
    return foods
      .filter(
        (food) =>
          food.id === currentId || (food.status === 'active' && !usedFoodIds.has(food.id))
      )
      .map((food) => ({
        value: food.id,
        label: food.status === 'archived' ? `${food.name} · архив` : food.name
      }))
  }

  function addIngredient(): void {
    const food = addableFoods[0]
    if (!food) return
    setIngredients((current) => [...current, { foodId: food.id, amount: food.baseAmount }])
  }

  function changeIngredientFood(index: number, foodId: string): void {
    const food = foodsById.get(foodId)
    if (!food) return
    setIngredients((current) =>
      current.map((ingredient, itemIndex) =>
        itemIndex === index ? { foodId, amount: food.baseAmount } : ingredient
      )
    )
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (
      busy ||
      !name.trim() ||
      !Number.isFinite(servings) ||
      servings <= 0 ||
      ingredients.length === 0 ||
      ingredients.some(
        (ingredient) => !Number.isFinite(ingredient.amount) || ingredient.amount <= 0
      )
    ) {
      return
    }

    const payload: CreateNutritionRecipeInput = {
      name: name.trim(),
      description,
      servings,
      favorite,
      status,
      ingredients
    }
    await onSave(recipe ? { ...payload, id: recipe.id } : payload)
    onOpenChange(false)
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={recipe ? 'Изменить рецепт' : 'Новый рецепт'}
      description="Соберите блюдо из своей базы продуктов — пищевая ценность рассчитается автоматически."
      icon={<CookingPot />}
      size="xl"
      busy={busy}
      footer={
        <>
          <NutritionSecondaryButton disabled={busy} onClick={() => onOpenChange(false)}>
            Отмена
          </NutritionSecondaryButton>
          <button
            type="submit"
            form="nutrition-recipe-form"
            disabled={busy || !name.trim() || ingredients.length === 0}
            className="h-10 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-45"
          >
            Сохранить
          </button>
        </>
      }
    >
      <form
        id="nutrition-recipe-form"
        className="space-y-4"
        onSubmit={(event) => void submit(event).catch(() => undefined)}
      >
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
          <NutritionFormField label="Название">
            <input
              autoFocus
              value={name}
              maxLength={180}
              placeholder="Например, курица с рисом"
              className={NUTRITION_INPUT_CLASS_NAME}
              onChange={(event) => setName(event.target.value)}
            />
          </NutritionFormField>
          <NutritionFormField label="Порций в блюде">
            <input
              type="number"
              min="0.1"
              max="1000"
              step="0.1"
              value={servings}
              className={NUTRITION_INPUT_CLASS_NAME}
              onChange={(event) => setServings(Number(event.target.value))}
            />
          </NutritionFormField>
        </div>

        <NutritionFormField label="Описание" hint="необязательно">
          <textarea
            rows={3}
            value={description}
            maxLength={10000}
            className={NUTRITION_TEXTAREA_CLASS_NAME}
            onChange={(event) => setDescription(event.target.value)}
          />
        </NutritionFormField>

        <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--app-text)]">Ингредиенты</h3>
              <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
                Количество указывается в базовой единице продукта. Архивный продукт остаётся доступен в уже существующем рецепте, но его нельзя добавить заново.
              </p>
            </div>
            <NutritionSecondaryButton
              disabled={busy || addableFoods.length === 0}
              onClick={addIngredient}
            >
              <Plus className="size-3.5" /> Добавить
            </NutritionSecondaryButton>
          </div>

          {ingredients.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-[var(--app-border)] px-4 py-8 text-center text-sm text-[var(--app-muted)]">
              Сначала добавьте хотя бы один активный продукт в каталог.
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {ingredients.map((ingredient, index) => {
                const food = foodsById.get(ingredient.foodId)
                return (
                  <div
                    key={`${ingredient.foodId}-${index}`}
                    className="grid grid-cols-[minmax(0,1fr)_140px_36px] gap-2 max-[560px]:grid-cols-[minmax(0,1fr)_36px]"
                  >
                    <div className="max-[560px]:col-span-1">
                      <AppSelect
                        ariaLabel={`Ингредиент ${index + 1}`}
                        value={ingredient.foodId}
                        options={optionsForIngredient(index)}
                        onValueChange={(value) => changeIngredientFood(index, value)}
                      />
                    </div>
                    <div className="relative max-[560px]:col-start-1 max-[560px]:row-start-2">
                      <input
                        type="number"
                        min="0.001"
                        max="100000"
                        step="0.001"
                        value={ingredient.amount}
                        aria-label={`Количество ингредиента ${index + 1}`}
                        className={`${NUTRITION_INPUT_CLASS_NAME} pr-12`}
                        onChange={(event) =>
                          setIngredients((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, amount: Number(event.target.value) }
                                : item
                            )
                          )
                        }
                      />
                      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-[var(--app-muted)]">
                        {food ? nutritionUnitLabel(food.baseUnit) : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label={`Удалить ингредиент ${index + 1}`}
                      className="flex size-10 items-center justify-center rounded-xl text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300 max-[560px]:col-start-2 max-[560px]:row-span-2 max-[560px]:row-start-1 max-[560px]:self-center"
                      onClick={() =>
                        setIngredients((current) =>
                          current.filter((_item, itemIndex) => itemIndex !== index)
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <div className="flex flex-wrap gap-5">
          <NutritionCheckField label="Избранное" checked={favorite} onChange={setFavorite} />
          <NutritionCheckField
            label="В архиве"
            checked={status === 'archived'}
            onChange={(checked) => setStatus(checked ? 'archived' : 'active')}
          />
        </div>
      </form>
    </AppDialog>
  )
}
