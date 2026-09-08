import type {
  ImportNutritionMealsInput,
  ImportNutritionMealsResult
} from '../../shared/contracts/nutrition'
import { nutritionRepository } from './nutrition.repository'

export function importNutritionMeals(input: ImportNutritionMealsInput): ImportNutritionMealsResult {
  return nutritionRepository.importMeals(input)
}
