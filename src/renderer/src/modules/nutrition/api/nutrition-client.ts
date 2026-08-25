import type {
  CreateNutritionFoodInput,
  CreateNutritionFoodsInput,
  CreateNutritionLogEntryInput,
  CreateNutritionRecipeInput,
  DeleteNutritionFoodInput,
  DeleteNutritionLogEntryInput,
  DeleteNutritionRecipeInput,
  NutritionOverviewInput,
  NutritionReportInput,
  SetNutritionTargetsInput,
  SetNutritionWaterInput,
  UpdateNutritionFoodInput,
  UpdateNutritionLogEntryInput,
  UpdateNutritionRecipeInput
} from '../../../../../shared/contracts/nutrition'

export const nutritionClient = {
  listOverview: (input: NutritionOverviewInput) => window.api.nutrition.listOverview(input),
  createFood: (input: CreateNutritionFoodInput) => window.api.nutrition.createFood(input),
  createFoods: (input: CreateNutritionFoodsInput) => window.api.nutrition.createFoods(input),
  updateFood: (input: UpdateNutritionFoodInput) => window.api.nutrition.updateFood(input),
  deleteFood: (input: DeleteNutritionFoodInput) => window.api.nutrition.deleteFood(input),
  createRecipe: (input: CreateNutritionRecipeInput) => window.api.nutrition.createRecipe(input),
  updateRecipe: (input: UpdateNutritionRecipeInput) => window.api.nutrition.updateRecipe(input),
  deleteRecipe: (input: DeleteNutritionRecipeInput) => window.api.nutrition.deleteRecipe(input),
  createLogEntry: (input: CreateNutritionLogEntryInput) =>
    window.api.nutrition.createLogEntry(input),
  updateLogEntry: (input: UpdateNutritionLogEntryInput) =>
    window.api.nutrition.updateLogEntry(input),
  deleteLogEntry: (input: DeleteNutritionLogEntryInput) =>
    window.api.nutrition.deleteLogEntry(input),
  setWater: (input: SetNutritionWaterInput) => window.api.nutrition.setWater(input),
  setTargets: (input: SetNutritionTargetsInput) => window.api.nutrition.setTargets(input),
  getReport: (input: NutritionReportInput) => window.api.nutrition.getReport(input)
}
