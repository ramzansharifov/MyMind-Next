import type {
  ImportNutritionMealsInput,
  ImportNutritionMealsResult,
  NutritionLogEntryRecord
} from '../../shared/contracts/nutrition'
import { getSqlite } from '../database/client'
import { createNutritionLogEntry } from './nutrition.repository'

export function importNutritionMeals(
  input: ImportNutritionMealsInput
): ImportNutritionMealsResult {
  const transaction = getSqlite().transaction((payload: ImportNutritionMealsInput) => {
    const created: NutritionLogEntryRecord[] = []

    for (const meal of payload.meals) {
      for (const item of meal.items) {
        created.push(
          createNutritionLogEntry({
            date: payload.date,
            mealType: meal.mealType,
            customMealName: meal.customMealName,
            sourceType: 'custom',
            sourceId: null,
            amount: item.amount,
            customTitle: item.name,
            customUnit: item.unit,
            customNutrients: item.nutrients,
            notes: item.notes
          })
        )
      }
    }

    return created
  })

  const created = transaction(input)
  return {
    date: input.date,
    mealCount: input.meals.length,
    itemCount: created.length,
    created
  }
}
