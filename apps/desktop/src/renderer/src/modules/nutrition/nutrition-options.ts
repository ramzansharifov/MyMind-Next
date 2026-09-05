import type {
  NutritionFoodCategory,
  NutritionLogSourceType,
  NutritionMealType,
  NutritionUnit
} from '../../../../shared/contracts/nutrition'

export const NUTRITION_CATEGORY_OPTIONS: Array<{
  value: NutritionFoodCategory
  label: string
}> = [
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

export const NUTRITION_MEAL_OPTIONS: Array<{
  value: NutritionMealType
  label: string
}> = [
  { value: 'breakfast', label: 'Завтрак' },
  { value: 'lunch', label: 'Обед' },
  { value: 'dinner', label: 'Ужин' },
  { value: 'snack', label: 'Перекус' },
  { value: 'other', label: 'Другой приём пищи' }
]

export const NUTRITION_SOURCE_OPTIONS: Array<{
  value: NutritionLogSourceType
  label: string
}> = [
  { value: 'food', label: 'Продукт' },
  { value: 'recipe', label: 'Рецепт' },
  { value: 'custom', label: 'Своя запись' }
]

export const NUTRITION_UNIT_OPTIONS: Array<{ value: NutritionUnit; label: string }> = [
  { value: 'g', label: 'г' },
  { value: 'ml', label: 'мл' },
  { value: 'piece', label: 'шт.' },
  { value: 'serving', label: 'порц.' }
]

export function nutritionCategoryLabel(category: NutritionFoodCategory): string {
  return NUTRITION_CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? category
}

export function nutritionMealLabel(mealType: NutritionMealType, customName = ''): string {
  if (mealType === 'other' && customName) return customName
  return NUTRITION_MEAL_OPTIONS.find((option) => option.value === mealType)?.label ?? mealType
}

export function nutritionUnitLabel(unit: NutritionUnit): string {
  return NUTRITION_UNIT_OPTIONS.find((option) => option.value === unit)?.label ?? unit
}
