from __future__ import annotations

from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    actual = text.count(old)
    if actual != count:
        raise SystemExit(f'{path}: expected {count} occurrences, found {actual}: {old[:100]!r}')
    file.write_text(text.replace(old, new), encoding='utf-8')


# Shared contracts: favorite/archive cease to exist in the application model.
path = 'src/shared/contracts/nutrition.ts'
replace(path, "export const NUTRITION_ENTITY_STATUSES = ['active', 'archived'] as const\n", '')
replace(path, "export type NutritionEntityStatus = (typeof NUTRITION_ENTITY_STATUSES)[number]\n", '')
replace(path, '  favorite: boolean\n  status: NutritionEntityStatus\n', '', 4)

# Validation no longer accepts or requires the removed fields.
path = 'src/shared/validation/nutrition.ts'
replace(path, '  NUTRITION_ENTITY_STATUSES,\n', '')
replace(path, "  favorite: z.boolean(),\n  status: z.enum(NUTRITION_ENTITY_STATUSES),\n", '', 2)

# Repository: physical SQLite columns remain legacy-only for backwards compatibility.
path = 'src/main/repositories/nutrition.repository.ts'
replace(path, '  NutritionEntityStatus,\n', '')
replace(path, '  favorite: number\n  status: NutritionEntityStatus\n', '', 2)
replace(
    path,
    "const FOOD_SELECT = `SELECT id, name, brand, category, base_amount_milli, base_unit,\n  calories_milli, protein_milli_g, fat_milli_g, carbs_milli_g, fiber_milli_g,\n  sugar_milli_g, sodium_milli_mg, favorite, status, notes, created_at, updated_at\n  FROM nutrition_foods`\nconst RECIPE_SELECT = `SELECT id, name, description, servings_milli, favorite, status,\n  created_at, updated_at FROM nutrition_recipes`",
    "const FOOD_SELECT = `SELECT id, name, brand, category, base_amount_milli, base_unit,\n  calories_milli, protein_milli_g, fat_milli_g, carbs_milli_g, fiber_milli_g,\n  sugar_milli_g, sodium_milli_mg, notes, created_at, updated_at\n  FROM nutrition_foods`\nconst RECIPE_SELECT = `SELECT id, name, description, servings_milli,\n  created_at, updated_at FROM nutrition_recipes`"
)
replace(path, '    favorite: Boolean(row.favorite),\n    status: row.status,\n', '', 2)
replace(path, "      .prepare(`${FOOD_SELECT} ORDER BY favorite DESC, name COLLATE NOCASE ASC`)\n", "      .prepare(`${FOOD_SELECT} ORDER BY name COLLATE NOCASE ASC`)\n")
replace(path, "      .prepare(`${RECIPE_SELECT} ORDER BY favorite DESC, name COLLATE NOCASE ASC`)\n", "      .prepare(`${RECIPE_SELECT} ORDER BY name COLLATE NOCASE ASC`)\n")
replace(
    path,
    "        sugar_milli_g, sodium_milli_mg, favorite, status, notes, created_at, updated_at\n      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`",
    "        sugar_milli_g, sodium_milli_mg, notes, created_at, updated_at\n      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`"
)
replace(path, "      input.favorite ? 1 : 0,\n      input.status,\n", '', 1)
replace(
    path,
    "       fiber_milli_g = ?, sugar_milli_g = ?, sodium_milli_mg = ?, favorite = ?, status = ?,\n       notes = ?, updated_at = ? WHERE id = ?`",
    "       fiber_milli_g = ?, sugar_milli_g = ?, sodium_milli_mg = ?,\n       notes = ?, updated_at = ? WHERE id = ?`"
)
replace(path, "      input.favorite ? 1 : 0,\n      input.status,\n", '', 1)
replace(path, "    throw new Error('Продукт используется в рецепте. Архивируйте его или сначала измените рецепты.')", "    throw new Error('Продукт используется в рецепте. Сначала измените или удалите рецепт.')")
replace(
    path,
    "       (id, name, description, servings_milli, favorite, status, created_at, updated_at)\n       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`",
    "       (id, name, description, servings_milli, created_at, updated_at)\n       VALUES (?, ?, ?, ?, ?, ?)`"
)
replace(path, "      input.favorite ? 1 : 0,\n      input.status,\n", '', 1)
replace(
    path,
    "      `UPDATE nutrition_recipes SET name = ?, description = ?, servings_milli = ?, favorite = ?,\n       status = ?, updated_at = ? WHERE id = ?`",
    "      `UPDATE nutrition_recipes SET name = ?, description = ?, servings_milli = ?,\n       updated_at = ? WHERE id = ?`"
)
replace(path, "      input.favorite ? 1 : 0,\n      input.status,\n", '', 1)

# Catalog UI: only search + product category remain.
path = 'src/renderer/src/modules/nutrition/components/NutritionCatalogViews.tsx'
replace(path, "import { Apple, CookingPot, Heart, Pencil, Search, Star, Trash2 } from 'lucide-react'", "import { Apple, CookingPot, Pencil, Search, Trash2 } from 'lucide-react'")
replace(path, "import { cn } from '../../../shared/lib/cn'\n", '')
replace(path, "export type NutritionEntityFilter = 'active' | 'archived' | 'all'\n\n", '')
replace(path, '  status: NutritionEntityFilter\n  onStatusChange: (status: NutritionEntityFilter) => void\n  favoritesOnly: boolean\n  onFavoritesChange: (favoritesOnly: boolean) => void\n', '')
replace(path, '  status,\n  onStatusChange,\n  favoritesOnly,\n  onFavoritesChange,\n', '')
text = Path(path).read_text(encoding='utf-8')
start = "\n          <div className=\"min-w-[150px]\">\n            <AppSelect\n              ariaLabel=\"Статус каталога\""
end = "\n          </button>"
idx = text.find(start)
if idx == -1:
    raise SystemExit(f'{path}: status filter block start not found')
end_idx = text.find(end, idx)
if end_idx == -1:
    raise SystemExit(f'{path}: favorites filter block end not found')
text = text[:idx] + text[end_idx + len(end):]
Path(path).write_text(text, encoding='utf-8')
replace(path, ',\n  onToggleFavorite\n', '\n', 2)
replace(path, '  onToggleFavorite: (food: NutritionFoodRecord) => void\n', '')
replace(path, '  onToggleFavorite: (recipe: NutritionRecipeRecord) => void\n', '')
text = Path(path).read_text(encoding='utf-8')
for entity in ('food', 'recipe'):
    archive = f"                {{{entity}.status === 'archived' && (\n                  <span className=\"rounded-md bg-[var(--app-control)] px-1.5 py-0.5 text-[10px] text-[var(--app-muted)]\">\n                    Архив\n                  </span>\n                )}}\n"
    if archive not in text:
        raise SystemExit(f'{path}: archive badge for {entity} not found')
    text = text.replace(archive, '')
Path(path).write_text(text, encoding='utf-8')
text = Path(path).read_text(encoding='utf-8')
for marker in ("            <button\n              type=\"button\"\n              aria-label={food.favorite", "            <button\n              type=\"button\"\n              aria-label={recipe.favorite"):
    idx = text.find(marker)
    if idx == -1:
        raise SystemExit(f'{path}: favorite button marker not found')
    end_idx = text.find('            </button>\n', idx)
    if end_idx == -1:
        raise SystemExit(f'{path}: favorite button end not found')
    text = text[:idx] + text[end_idx + len('            </button>\n'):]
Path(path).write_text(text, encoding='utf-8')

# Food dialog.
path = 'src/renderer/src/modules/nutrition/components/NutritionFoodDialog.tsx'
replace(path, '  NutritionEntityStatus,\n', '')
replace(path, '  NutritionCheckField,\n', '')
replace(path, "  const [favorite, setFavorite] = useState(false)\n  const [status, setStatus] = useState<NutritionEntityStatus>('active')\n", '')
replace(path, "    setFavorite(food?.favorite ?? false)\n    setStatus(food?.status ?? 'active')\n", '')
replace(path, '      favorite,\n      status,\n', '')
text = Path(path).read_text(encoding='utf-8')
block = "\n        <div className=\"flex flex-wrap gap-5\">\n          <NutritionCheckField label=\"Избранное\" checked={favorite} onChange={setFavorite} />\n          <NutritionCheckField\n            label=\"В архиве\"\n            checked={status === 'archived'}\n            onChange={(checked) => setStatus(checked ? 'archived' : 'active')}\n          />\n        </div>"
if block not in text:
    raise SystemExit(f'{path}: favorite/archive form block not found')
Path(path).write_text(text.replace(block, ''), encoding='utf-8')

# Recipe dialog.
path = 'src/renderer/src/modules/nutrition/components/NutritionRecipeDialog.tsx'
replace(path, '  NutritionEntityStatus,\n', '')
replace(path, '  NutritionCheckField,\n', '')
replace(path, "  const [favorite, setFavorite] = useState(false)\n  const [status, setStatus] = useState<NutritionEntityStatus>('active')\n", '')
replace(path, "  const activeFoods = useMemo(() => foods.filter((food) => food.status === 'active'), [foods])\n", '')
replace(path, "    setFavorite(recipe?.favorite ?? false)\n    setStatus(recipe?.status ?? 'active')\n", '')
replace(path, '    const firstFood = activeFoods[0]\n', '    const firstFood = foods[0]\n')
replace(path, '  }, [activeFoods, open, recipe])\n', '  }, [foods, open, recipe])\n')
replace(path, '  const addableFoods = activeFoods.filter((food) => !usedFoodIds.has(food.id))\n', '  const addableFoods = foods.filter((food) => !usedFoodIds.has(food.id))\n')
replace(path, "    return foods\n      .filter(\n        (food) =>\n          food.id === currentId || (food.status === 'active' && !usedFoodIds.has(food.id))\n      )\n      .map((food) => ({\n        value: food.id,\n        label: food.status === 'archived' ? `${food.name} · архив` : food.name\n      }))", "    return foods\n      .filter((food) => food.id === currentId || !usedFoodIds.has(food.id))\n      .map((food) => ({ value: food.id, label: food.name }))")
replace(path, '      favorite,\n      status,\n', '')
replace(path, '                Количество указывается в базовой единице продукта. Архивный продукт остаётся доступен в уже существующем рецепте, но его нельзя добавить заново.\n', '                Количество указывается в базовой единице продукта.\n')
replace(path, '              Сначала добавьте хотя бы один активный продукт в каталог.\n', '              Сначала добавьте хотя бы один продукт в каталог.\n')
text = Path(path).read_text(encoding='utf-8')
block = "\n        <div className=\"flex flex-wrap gap-5\">\n          <NutritionCheckField label=\"Избранное\" checked={favorite} onChange={setFavorite} />\n          <NutritionCheckField\n            label=\"В архиве\"\n            checked={status === 'archived'}\n            onChange={(checked) => setStatus(checked ? 'archived' : 'active')}\n          />\n        </div>"
if block not in text:
    raise SystemExit(f'{path}: favorite/archive form block not found')
Path(path).write_text(text.replace(block, ''), encoding='utf-8')

# Log dialog.
path = 'src/renderer/src/modules/nutrition/components/NutritionLogDialog.tsx'
replace(path, "import { CookingPot, Search, Star, Utensils } from 'lucide-react'", "import { CookingPot, Search, Utensils } from 'lucide-react'")
replace(path, "  const activeFoods = useMemo(() => foods.filter((food) => food.status === 'active'), [foods])\n  const activeRecipes = useMemo(\n    () => recipes.filter((recipe) => recipe.status === 'active'),\n    [recipes]\n  )\n\n", '')
replace(path, "      activeFoods.length > 0 ? 'food' : activeRecipes.length > 0 ? 'recipe' : 'custom'", "      foods.length > 0 ? 'food' : recipes.length > 0 ? 'recipe' : 'custom'")
replace(path, "        ? activeFoods[0]?.id ?? null\n        : initialSource === 'recipe'\n          ? activeRecipes[0]?.id ?? null\n", "        ? foods[0]?.id ?? null\n        : initialSource === 'recipe'\n          ? recipes[0]?.id ?? null\n")
replace(path, "    setAmount(initialSource === 'food' ? activeFoods[0]?.baseAmount ?? 100 : 1)\n", "    setAmount(initialSource === 'food' ? foods[0]?.baseAmount ?? 100 : 1)\n")
replace(path, '  }, [activeFoods, activeRecipes, entry, initialMeal, open])\n', '  }, [entry, foods, initialMeal, open, recipes])\n')
replace(path, '      return activeFoods\n', '      return foods\n')
replace(path, '          favorite: food.favorite,\n', '')
replace(path, '      return activeRecipes\n', '      return recipes\n')
replace(path, '          favorite: recipe.favorite,\n', '')
replace(path, '  }, [activeFoods, activeRecipes, sourceQuery, sourceType])\n', '  }, [foods, recipes, sourceQuery, sourceType])\n')
replace(path, '      const food = activeFoods[0]\n', '      const food = foods[0]\n')
replace(path, '      setSourceId(activeRecipes[0]?.id ?? null)\n', '      setSourceId(recipes[0]?.id ?? null)\n')
text = Path(path).read_text(encoding='utf-8')
star = "                          {candidate.favorite && (\n                            <Star className=\"size-3 fill-amber-300 text-amber-300\" />\n                          )}\n"
if star not in text:
    raise SystemExit(f'{path}: favorite star not found')
Path(path).write_text(text.replace(star, ''), encoding='utf-8')

# Page.
path = 'src/renderer/src/modules/nutrition/NutritionPage.tsx'
replace(path, "import {\n  NutritionCatalogToolbar,\n  NutritionFoodsGrid,\n  NutritionRecipesGrid,\n  type NutritionEntityFilter\n} from './components/NutritionCatalogViews'", "import {\n  NutritionCatalogToolbar,\n  NutritionFoodsGrid,\n  NutritionRecipesGrid\n} from './components/NutritionCatalogViews'")
replace(path, "  const [entityStatus, setEntityStatus] = useState<NutritionEntityFilter>('active')\n  const [favoritesOnly, setFavoritesOnly] = useState(false)\n", '')
replace(path, "      if (entityStatus !== 'all' && food.status !== entityStatus) return false\n", '')
replace(path, "      if (favoritesOnly && !food.favorite) return false\n", '')
replace(path, '  }, [entityStatus, favoritesOnly, foodCategory, foods, query])\n', '  }, [foodCategory, foods, query])\n')
replace(path, "      if (entityStatus !== 'all' && recipe.status !== entityStatus) return false\n", '')
replace(path, "      if (favoritesOnly && !recipe.favorite) return false\n", '')
replace(path, '  }, [entityStatus, favoritesOnly, query, recipes])\n', '  }, [query, recipes])\n')
replace(path, "    setEntityStatus('active')\n    setFavoritesOnly(false)\n", '')
replace(path, "        disabled={foods.every((food) => food.status !== 'active')}\n", '        disabled={foods.length === 0}\n')
replace(path, '          status={entityStatus}\n          onStatusChange={setEntityStatus}\n          favoritesOnly={favoritesOnly}\n          onFavoritesChange={setFavoritesOnly}\n', '', 2)
text = Path(path).read_text(encoding='utf-8')
for entity in ('food', 'recipe'):
    marker = f"            onToggleFavorite={{({entity}) => {{\n"
    idx = text.find(marker)
    if idx == -1:
        raise SystemExit(f'{path}: {entity} toggle callback not found')
    end_marker = "              }).catch(() => undefined)\n            }}\n"
    end_idx = text.find(end_marker, idx)
    if end_idx == -1:
        raise SystemExit(f'{path}: {entity} toggle callback end not found')
    text = text[:idx] + text[end_idx + len(end_marker):]
Path(path).write_text(text, encoding='utf-8')
replace(path, "    return 'История дневника сохранится благодаря снимкам значений. Продукт, используемый в рецепте, удалить нельзя — его лучше архивировать.'", "    return 'История дневника сохранится благодаря снимкам значений. Продукт, используемый в рецепте, удалить нельзя — сначала измените или удалите рецепт.'")

# JSON import.
path = 'src/renderer/src/modules/nutrition/nutrition-food-json.ts'
replace(path, "    favorite: source.favorite ?? false,\n    status: source.status ?? 'active',\n", '')

# Tests/fixtures.
path = 'src/renderer/src/modules/nutrition/NutritionPage.test.tsx'
replace(path, "  favorite: true,\n  status: 'active',\n", '')
replace(path, "            favorite: false,\n            status: 'active',\n", '')

path = 'src/renderer/src/modules/nutrition/components/NutritionFoodJsonImportDialog.test.tsx'
text = Path(path).read_text(encoding='utf-8')
text = text.replace("          favorite: false,\n          status: 'active',\n", '')
Path(path).write_text(text, encoding='utf-8')

path = 'src/main/repositories/nutrition.repository.test.ts'
text = Path(path).read_text(encoding='utf-8')
text = text.replace("    favorite: true,\n    status: 'active',\n", '')
text = text.replace("      favorite: false,\n      status: 'active',\n", '')
text = text.replace("      favorite: true,\n      status: 'active',\n", '')
Path(path).write_text(text, encoding='utf-8')

print('Removed nutrition favorites/archive from application model and UI')
