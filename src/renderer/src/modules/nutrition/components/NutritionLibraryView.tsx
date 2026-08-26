import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Apple, Braces, CookingPot, MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import type {
  NutritionFoodRecord,
  NutritionRecipeRecord
} from '../../../../../shared/contracts/nutrition'
import { cn } from '../../../shared/lib/cn'
import { nutritionCategoryLabel, nutritionUnitLabel } from '../nutrition-options'
import { formatNutritionNumber } from '../nutrition-utils'

type LibraryMode = 'all' | 'foods' | 'recipes'

interface NutritionLibraryViewProps {
  foods: NutritionFoodRecord[]
  recipes: NutritionRecipeRecord[]
  onAddFood: () => void
  onAddRecipe: () => void
  onImportJson: () => void
  onEditFood: (food: NutritionFoodRecord) => void
  onDeleteFood: (food: NutritionFoodRecord) => void
  onEditRecipe: (recipe: NutritionRecipeRecord) => void
  onDeleteRecipe: (recipe: NutritionRecipeRecord) => void
}

export function NutritionLibraryView({
  foods,
  recipes,
  onAddFood,
  onAddRecipe,
  onImportJson,
  onEditFood,
  onDeleteFood,
  onEditRecipe,
  onDeleteRecipe
}: NutritionLibraryViewProps): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<LibraryMode>('all')

  const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU')
  const visibleFoods = useMemo(
    () =>
      mode === 'recipes'
        ? []
        : foods.filter((food) =>
            !normalizedQuery
              ? true
              : `${food.name} ${food.brand} ${nutritionCategoryLabel(food.category)}`
                  .toLocaleLowerCase('ru-RU')
                  .includes(normalizedQuery)
          ),
    [foods, mode, normalizedQuery]
  )
  const visibleRecipes = useMemo(
    () =>
      mode === 'foods'
        ? []
        : recipes.filter((recipe) =>
            !normalizedQuery
              ? true
              : `${recipe.name} ${recipe.description} ${recipe.ingredients
                  .map((ingredient) => ingredient.foodName)
                  .join(' ')}`
                  .toLocaleLowerCase('ru-RU')
                  .includes(normalizedQuery)
          ),
    [mode, normalizedQuery, recipes]
  )

  const empty = visibleFoods.length === 0 && visibleRecipes.length === 0

  return (
    <section className="mt-5 space-y-4">
      <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-10 min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 focus-within:border-violet-500/45">
            <Search className="size-4 text-[var(--app-muted)]" />
            <input
              value={query}
              type="search"
              aria-label="Поиск в библиотеке питания"
              placeholder="Найти продукт или рецепт…"
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-500 px-3.5 text-sm font-semibold text-white hover:bg-violet-400"
            onClick={onAddFood}
          >
            <Plus className="size-4" /> Продукт
          </button>
          <button
            type="button"
            disabled={foods.length === 0}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm font-medium text-[var(--app-text)] hover:bg-[var(--app-control-hover)] disabled:cursor-not-allowed disabled:opacity-45"
            onClick={onAddRecipe}
          >
            <CookingPot className="size-4" /> Рецепт
          </button>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                aria-label="Ещё действия библиотеки"
                className="flex size-10 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                sideOffset={6}
                align="end"
                className="z-[140] min-w-48 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-1.5 shadow-[var(--app-shadow-floating)]"
              >
                <DropdownMenu.Item
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--app-muted)] outline-none hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] data-[highlighted]:bg-[var(--app-control-hover)] data-[highlighted]:text-[var(--app-text)]"
                  onSelect={onImportJson}
                >
                  <Braces className="size-4" /> Импорт из JSON
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {([
            ['all', 'Все'],
            ['foods', 'Продукты'],
            ['recipes', 'Рецепты']
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              className={cn(
                'h-8 rounded-lg px-3 text-xs font-medium transition-colors',
                mode === value
                  ? 'bg-violet-500/15 text-violet-200'
                  : 'text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
              )}
              onClick={() => setMode(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {empty ? (
        <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] px-6 text-center">
          <Search className="size-8 text-violet-300" />
          <h2 className="mt-3 text-base font-semibold text-[var(--app-text)]">
            {query.trim() ? 'Ничего не найдено' : 'Библиотека пока пуста'}
          </h2>
          <p className="mt-1 max-w-md text-xs leading-5 text-[var(--app-muted)]">
            Добавьте продукт или рецепт — после этого их можно будет быстро находить при записи еды.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleFoods.map((food) => (
            <FoodRow
              key={food.id}
              food={food}
              onEdit={() => onEditFood(food)}
              onDelete={() => onDeleteFood(food)}
            />
          ))}
          {visibleRecipes.map((recipe) => (
            <RecipeRow
              key={recipe.id}
              recipe={recipe}
              onEdit={() => onEditRecipe(recipe)}
              onDelete={() => onDeleteRecipe(recipe)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function FoodRow({
  food,
  onEdit,
  onDelete
}: {
  food: NutritionFoodRecord
  onEdit: () => void
  onDelete: () => void
}): React.JSX.Element {
  return (
    <article className="group flex items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 shadow-[var(--app-shadow-card)]">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
        <Apple className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="truncate text-sm font-semibold text-[var(--app-text)]">{food.name}</h3>
          <span className="text-[10px] text-[var(--app-muted)]">Продукт</span>
        </div>
        <p className="mt-1 truncate text-xs text-[var(--app-muted)]">
          {formatNutritionNumber(food.nutrients.calories, 0)} ккал · Б {formatNutritionNumber(food.nutrients.proteinG)} · Ж {formatNutritionNumber(food.nutrients.fatG)} · У {formatNutritionNumber(food.nutrients.carbsG)} · {formatNutritionNumber(food.baseAmount)} {nutritionUnitLabel(food.baseUnit)}
        </p>
        {(food.brand || food.category !== 'other') && (
          <p className="mt-0.5 truncate text-[10px] text-[var(--app-muted)]/75">
            {food.brand || nutritionCategoryLabel(food.category)}
          </p>
        )}
      </div>
      <RowActions label={food.name} onEdit={onEdit} onDelete={onDelete} />
    </article>
  )
}

function RecipeRow({
  recipe,
  onEdit,
  onDelete
}: {
  recipe: NutritionRecipeRecord
  onEdit: () => void
  onDelete: () => void
}): React.JSX.Element {
  return (
    <article className="group flex items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 shadow-[var(--app-shadow-card)]">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
        <CookingPot className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="truncate text-sm font-semibold text-[var(--app-text)]">{recipe.name}</h3>
          <span className="text-[10px] text-[var(--app-muted)]">Рецепт</span>
        </div>
        <p className="mt-1 truncate text-xs text-[var(--app-muted)]">
          {formatNutritionNumber(recipe.perServingNutrients.calories, 0)} ккал на порцию · Б {formatNutritionNumber(recipe.perServingNutrients.proteinG)} · Ж {formatNutritionNumber(recipe.perServingNutrients.fatG)} · У {formatNutritionNumber(recipe.perServingNutrients.carbsG)}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-[var(--app-muted)]/75">
          {formatNutritionNumber(recipe.servings)} порц. · {recipe.ingredients.length} ингредиентов
        </p>
      </div>
      <RowActions label={recipe.name} onEdit={onEdit} onDelete={onDelete} />
    </article>
  )
}

function RowActions({
  label,
  onEdit,
  onDelete
}: {
  label: string
  onEdit: () => void
  onDelete: () => void
}): React.JSX.Element {
  return (
    <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
      <button
        type="button"
        aria-label={`Изменить «${label}»`}
        className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
        onClick={onEdit}
      >
        <Pencil className="size-3.5" />
      </button>
      <button
        type="button"
        aria-label={`Удалить «${label}»`}
        className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300"
        onClick={onDelete}
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  )
}
