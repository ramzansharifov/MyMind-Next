from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    if text.count(old) != 1:
        raise SystemExit(f'{path}: expected one effect block, got {text.count(old)}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once(
    'src/renderer/src/modules/nutrition/components/NutritionFoodDialog.tsx',
    """  useEffect(() => {
    if (!open) return
    setName(food?.name ?? '')
    setBrand(food?.brand ?? '')
    setCategory(food?.category ?? 'other')
    setBaseAmount(food?.baseAmount ?? 100)
    setBaseUnit(food?.baseUnit ?? 'g')
    setNutrients(food?.nutrients ?? { ...EMPTY_NUTRITION_VALUES })
    setNotes(food?.notes ?? '')
  }, [food, open])
""",
    """  useEffect(() => {
    if (!open) return
    const timerId = window.setTimeout(() => {
      setName(food?.name ?? '')
      setBrand(food?.brand ?? '')
      setCategory(food?.category ?? 'other')
      setBaseAmount(food?.baseAmount ?? 100)
      setBaseUnit(food?.baseUnit ?? 'g')
      setNutrients(food?.nutrients ?? { ...EMPTY_NUTRITION_VALUES })
      setNotes(food?.notes ?? '')
    }, 0)
    return () => window.clearTimeout(timerId)
  }, [food, open])
""",
)

replace_once(
    'src/renderer/src/modules/nutrition/components/NutritionRecipeDialog.tsx',
    """  useEffect(() => {
    if (!open) return
    setName(recipe?.name ?? '')
    setDescription(recipe?.description ?? '')
    setServings(recipe?.servings ?? 1)

    if (recipe) {
      setIngredients(
        recipe.ingredients.map((ingredient) => ({
          foodId: ingredient.foodId,
          amount: ingredient.amount
        }))
      )
      return
    }

    const firstFood = foods[0]
    setIngredients(firstFood ? [{ foodId: firstFood.id, amount: firstFood.baseAmount }] : [])
  }, [foods, open, recipe])
""",
    """  useEffect(() => {
    if (!open) return
    const timerId = window.setTimeout(() => {
      setName(recipe?.name ?? '')
      setDescription(recipe?.description ?? '')
      setServings(recipe?.servings ?? 1)

      if (recipe) {
        setIngredients(
          recipe.ingredients.map((ingredient) => ({
            foodId: ingredient.foodId,
            amount: ingredient.amount
          }))
        )
        return
      }

      const firstFood = foods[0]
      setIngredients(firstFood ? [{ foodId: firstFood.id, amount: firstFood.baseAmount }] : [])
    }, 0)
    return () => window.clearTimeout(timerId)
  }, [foods, open, recipe])
""",
)

replace_once(
    'src/renderer/src/modules/nutrition/components/NutritionLogDialog.tsx',
    """  useEffect(() => {
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
      foods.length > 0 ? 'food' : recipes.length > 0 ? 'recipe' : 'custom'
    setMealType(initialMeal)
    setCustomMealName('')
    setSourceType(initialSource)
    setSourceId(
      initialSource === 'food'
        ? foods[0]?.id ?? null
        : initialSource === 'recipe'
          ? recipes[0]?.id ?? null
          : null
    )
    setAmount(initialSource === 'food' ? foods[0]?.baseAmount ?? 100 : 1)
    setCustomTitle('')
    setCustomUnit('g')
    setCustomNutrients({ ...EMPTY_NUTRITION_VALUES })
    setNotes('')
  }, [entry, foods, initialMeal, open, recipes])
""",
    """  useEffect(() => {
    if (!open) return
    const timerId = window.setTimeout(() => {
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
        foods.length > 0 ? 'food' : recipes.length > 0 ? 'recipe' : 'custom'
      setMealType(initialMeal)
      setCustomMealName('')
      setSourceType(initialSource)
      setSourceId(
        initialSource === 'food'
          ? foods[0]?.id ?? null
          : initialSource === 'recipe'
            ? recipes[0]?.id ?? null
            : null
      )
      setAmount(initialSource === 'food' ? foods[0]?.baseAmount ?? 100 : 1)
      setCustomTitle('')
      setCustomUnit('g')
      setCustomNutrients({ ...EMPTY_NUTRITION_VALUES })
      setNotes('')
    }, 0)
    return () => window.clearTimeout(timerId)
  }, [entry, foods, initialMeal, open, recipes])
""",
)

print('Fixed Nutrition dialog initialization effects')
