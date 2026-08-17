import { Apple, CookingPot, Heart, Pencil, Search, Star, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'

import type {
  NutritionFoodCategory,
  NutritionFoodRecord,
  NutritionRecipeRecord
} from '../../../../../shared/contracts/nutrition'
import { cn } from '../../../shared/lib/cn'
import { AppSelect } from '../../../shared/ui/AppSelect'
import {
  NUTRITION_CATEGORY_OPTIONS,
  nutritionCategoryLabel,
  nutritionUnitLabel
} from '../nutrition-options'
import { formatNutritionNumber, nutritionValuesLine } from '../nutrition-utils'

export type NutritionEntityFilter = 'active' | 'archived' | 'all'

interface CatalogToolbarProps {
  query: string
  onQueryChange: (query: string) => void
  category?: 'all' | NutritionFoodCategory
  onCategoryChange?: (category: 'all' | NutritionFoodCategory) => void
  status: NutritionEntityFilter
  onStatusChange: (status: NutritionEntityFilter) => void
  favoritesOnly: boolean
  onFavoritesChange: (favoritesOnly: boolean) => void
  children: ReactNode
}

export function NutritionCatalogToolbar({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  status,
  onStatusChange,
  favoritesOnly,
  onFavoritesChange,
  children
}: CatalogToolbarProps): React.JSX.Element {
  return (
    <section className="mt-5 space-y-4">
      <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]">
        <div className="flex flex-wrap gap-2">
          <label className="flex h-10 min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 focus-within:border-violet-500/45">
            <Search className="size-4 text-[var(--app-muted)]" />
            <input
              value={query}
              type="search"
              aria-label="Поиск в каталоге питания"
              placeholder="Поиск…"
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60"
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </label>

          {category !== undefined && onCategoryChange && (
            <div className="min-w-[190px]">
              <AppSelect
                ariaLabel="Категория продукта"
                value={category}
                options={[{ value: 'all', label: 'Все категории' }, ...NUTRITION_CATEGORY_OPTIONS]}
                onValueChange={(value) =>
                  onCategoryChange(value as 'all' | NutritionFoodCategory)
                }
              />
            </div>
          )}

          <div className="min-w-[150px]">
            <AppSelect
              ariaLabel="Статус каталога"
              value={status}
              options={[
                { value: 'active', label: 'Активные' },
                { value: 'archived', label: 'Архив' },
                { value: 'all', label: 'Все' }
              ]}
              onValueChange={(value) => onStatusChange(value as NutritionEntityFilter)}
            />
          </div>

          <button
            type="button"
            aria-pressed={favoritesOnly}
            className={cn(
              'inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-medium',
              favoritesOnly
                ? 'border-amber-400/25 bg-amber-500/10 text-amber-200'
                : 'border-[var(--app-border)] bg-[var(--app-workspace)] text-[var(--app-muted)] hover:bg-[var(--app-control-hover)]'
            )}
            onClick={() => onFavoritesChange(!favoritesOnly)}
          >
            <Star className={cn('size-3.5', favoritesOnly && 'fill-current')} />
            Избранное
          </button>
        </div>
      </div>
      {children}
    </section>
  )
}

export function NutritionFoodsGrid({
  foods,
  hasAnyFoods,
  onEdit,
  onDelete,
  onToggleFavorite
}: {
  foods: NutritionFoodRecord[]
  hasAnyFoods: boolean
  onEdit: (food: NutritionFoodRecord) => void
  onDelete: (food: NutritionFoodRecord) => void
  onToggleFavorite: (food: NutritionFoodRecord) => void
}): React.JSX.Element {
  if (foods.length === 0) {
    return (
      <NutritionEmptyPanel
        icon={Apple}
        title={hasAnyFoods ? 'Ничего не найдено' : 'Добавьте первый продукт'}
      />
    )
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {foods.map((food) => (
        <article
          key={food.id}
          className="group rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]"
        >
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
              <Apple className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-semibold text-[var(--app-text)]">{food.name}</h3>
                {food.status === 'archived' && (
                  <span className="rounded-md bg-[var(--app-control)] px-1.5 py-0.5 text-[10px] text-[var(--app-muted)]">
                    Архив
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-[var(--app-muted)]">
                {food.brand || nutritionCategoryLabel(food.category)}
              </p>
            </div>
            <button
              type="button"
              aria-label={food.favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
              className={cn(
                'flex size-8 items-center justify-center rounded-lg',
                food.favorite ? 'text-amber-300' : 'text-[var(--app-muted)]'
              )}
              onClick={() => onToggleFavorite(food)}
            >
              <Star className={cn('size-4', food.favorite && 'fill-current')} />
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-3">
            <div className="text-xs text-[var(--app-muted)]">
              На {formatNutritionNumber(food.baseAmount)} {nutritionUnitLabel(food.baseUnit)}
            </div>
            <div className="mt-1.5 text-sm font-semibold text-[var(--app-text)]">
              {nutritionValuesLine(food.nutrients)}
            </div>
            <div className="mt-1 text-[11px] text-[var(--app-muted)]">
              Клетчатка {formatNutritionNumber(food.nutrients.fiberG)} г · Сахар{' '}
              {formatNutritionNumber(food.nutrients.sugarG)} г · Натрий{' '}
              {formatNutritionNumber(food.nutrients.sodiumMg, 0)} мг
            </div>
          </div>

          <div className="mt-3 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <button
              type="button"
              aria-label={`Изменить «${food.name}»`}
              className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)]"
              onClick={() => onEdit(food)}
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              aria-label={`Удалить «${food.name}»`}
              className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300"
              onClick={() => onDelete(food)}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}

export function NutritionRecipesGrid({
  recipes,
  hasAnyRecipes,
  onEdit,
  onDelete,
  onToggleFavorite
}: {
  recipes: NutritionRecipeRecord[]
  hasAnyRecipes: boolean
  onEdit: (recipe: NutritionRecipeRecord) => void
  onDelete: (recipe: NutritionRecipeRecord) => void
  onToggleFavorite: (recipe: NutritionRecipeRecord) => void
}): React.JSX.Element {
  if (recipes.length === 0) {
    return (
      <NutritionEmptyPanel
        icon={CookingPot}
        title={hasAnyRecipes ? 'Ничего не найдено' : 'Создайте первый рецепт'}
      />
    )
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {recipes.map((recipe) => (
        <article
          key={recipe.id}
          className="group rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)]"
        >
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
              <CookingPot className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-[var(--app-text)]">{recipe.name}</h3>
                {recipe.status === 'archived' && (
                  <span className="rounded-md bg-[var(--app-control)] px-1.5 py-0.5 text-[10px] text-[var(--app-muted)]">
                    Архив
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-[var(--app-muted)]">
                {formatNutritionNumber(recipe.servings)} порц. · {recipe.ingredients.length}{' '}
                ингредиентов
              </p>
            </div>
            <button
              type="button"
              aria-label={recipe.favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
              className={cn(
                'flex size-8 items-center justify-center rounded-lg',
                recipe.favorite ? 'text-amber-300' : 'text-[var(--app-muted)]'
              )}
              onClick={() => onToggleFavorite(recipe)}
            >
              <Heart className={cn('size-4', recipe.favorite && 'fill-current')} />
            </button>
          </div>

          {recipe.description && (
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--app-muted)]">
              {recipe.description}
            </p>
          )}

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-3">
              <div className="text-[11px] text-[var(--app-muted)]">На порцию</div>
              <div className="mt-1 text-sm font-semibold text-[var(--app-text)]">
                {nutritionValuesLine(recipe.perServingNutrients)}
              </div>
            </div>
            <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-3">
              <div className="text-[11px] text-[var(--app-muted)]">Всё блюдо</div>
              <div className="mt-1 text-sm font-semibold text-[var(--app-text)]">
                {formatNutritionNumber(recipe.totalNutrients.calories, 0)} ккал
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {recipe.ingredients.slice(0, 8).map((ingredient) => (
              <span
                key={ingredient.id}
                className="rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] px-2 py-1 text-[11px] text-[var(--app-muted)]"
              >
                {ingredient.foodName} · {formatNutritionNumber(ingredient.amount)}{' '}
                {nutritionUnitLabel(ingredient.unit)}
              </span>
            ))}
          </div>

          <div className="mt-3 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <button
              type="button"
              aria-label={`Изменить рецепт «${recipe.name}»`}
              className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)]"
              onClick={() => onEdit(recipe)}
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              aria-label={`Удалить рецепт «${recipe.name}»`}
              className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300"
              onClick={() => onDelete(recipe)}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}

function NutritionEmptyPanel({
  icon: Icon,
  title
}: {
  icon: typeof Apple
  title: string
}): React.JSX.Element {
  return (
    <div className="flex min-h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] px-6 text-center">
      <Icon className="size-9 text-violet-300" />
      <h2 className="mt-4 text-lg font-semibold text-[var(--app-text)]">{title}</h2>
    </div>
  )
}
