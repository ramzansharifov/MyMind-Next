export const NUTRITION_FOOD_CATEGORIES = [
  'protein',
  'dairy',
  'grains',
  'vegetables',
  'fruits',
  'fats',
  'drinks',
  'sweets',
  'prepared',
  'other'
] as const
export const NUTRITION_UNITS = ['g', 'ml', 'piece', 'serving'] as const
export const NUTRITION_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'other'] as const
export const NUTRITION_LOG_SOURCE_TYPES = ['food', 'recipe', 'custom'] as const

export type NutritionFoodCategory = (typeof NUTRITION_FOOD_CATEGORIES)[number]
export type NutritionUnit = (typeof NUTRITION_UNITS)[number]
export type NutritionMealType = (typeof NUTRITION_MEAL_TYPES)[number]
export type NutritionLogSourceType = (typeof NUTRITION_LOG_SOURCE_TYPES)[number]

export interface NutritionValues {
  calories: number
  proteinG: number
  fatG: number
  carbsG: number
  fiberG: number
  sugarG: number
  sodiumMg: number
}

export interface NutritionFoodRecord {
  id: string
  name: string
  brand: string
  category: NutritionFoodCategory
  baseAmount: number
  baseUnit: Exclude<NutritionUnit, 'serving'>
  nutrients: NutritionValues
  notes: string
  createdAt: number
  updatedAt: number
}

export interface NutritionRecipeIngredientRecord {
  id: string
  foodId: string
  foodName: string
  amount: number
  unit: Exclude<NutritionUnit, 'serving'>
  position: number
  nutrients: NutritionValues
}

export interface NutritionRecipeRecord {
  id: string
  name: string
  description: string
  servings: number
  ingredients: NutritionRecipeIngredientRecord[]
  totalNutrients: NutritionValues
  perServingNutrients: NutritionValues
  createdAt: number
  updatedAt: number
}

export interface NutritionLogEntryRecord {
  id: string
  date: string
  mealType: NutritionMealType
  customMealName: string
  sourceType: NutritionLogSourceType
  sourceId: string | null
  title: string
  amount: number
  unit: NutritionUnit
  nutrients: NutritionValues
  notes: string
  createdAt: number
  updatedAt: number
}

export interface NutritionTargetRecord {
  id: string
  effectiveFrom: string
  effectiveTo: string | null
  calories: number | null
  proteinG: number | null
  fatG: number | null
  carbsG: number | null
  fiberG: number | null
  waterMl: number | null
  createdAt: number
}

export interface NutritionDaySummary {
  date: string
  nutrients: NutritionValues
  waterMl: number
  target: NutritionTargetRecord | null
}

export interface NutritionOverview {
  date: string
  foods: NutritionFoodRecord[]
  recipes: NutritionRecipeRecord[]
  entries: NutritionLogEntryRecord[]
  day: NutritionDaySummary
  currentTarget: NutritionTargetRecord | null
}

export interface CreateNutritionFoodInput {
  name: string
  brand: string
  category: NutritionFoodCategory
  baseAmount: number
  baseUnit: Exclude<NutritionUnit, 'serving'>
  nutrients: NutritionValues
  notes: string
}

export interface CreateNutritionFoodsInput {
  foods: CreateNutritionFoodInput[]
}

export interface CreateNutritionFoodsResult {
  created: NutritionFoodRecord[]
  skippedNames: string[]
}

export interface UpdateNutritionFoodInput extends CreateNutritionFoodInput {
  id: string
}

export interface DeleteNutritionFoodInput {
  id: string
}

export interface NutritionRecipeIngredientInput {
  foodId: string
  amount: number
}

export interface CreateNutritionRecipeInput {
  name: string
  description: string
  servings: number
  ingredients: NutritionRecipeIngredientInput[]
}

export interface UpdateNutritionRecipeInput extends CreateNutritionRecipeInput {
  id: string
}

export interface DeleteNutritionRecipeInput {
  id: string
}

export interface NutritionLogEntryPayload {
  date: string
  mealType: NutritionMealType
  customMealName: string
  sourceType: NutritionLogSourceType
  sourceId: string | null
  amount: number
  customTitle: string
  customUnit: NutritionUnit
  customNutrients: NutritionValues | null
  notes: string
}

export type CreateNutritionLogEntryInput = NutritionLogEntryPayload
export interface UpdateNutritionLogEntryInput extends NutritionLogEntryPayload {
  id: string
}
export interface DeleteNutritionLogEntryInput {
  id: string
}

export interface NutritionImportItemInput {
  name: string
  amount: number
  unit: NutritionUnit
  nutrients: NutritionValues
  notes: string
}

export interface NutritionImportMealInput {
  mealType: NutritionMealType
  customMealName: string
  items: NutritionImportItemInput[]
}

export interface ImportNutritionMealsInput {
  schemaVersion: 1
  date: string
  meals: NutritionImportMealInput[]
}

export interface ImportNutritionMealsResult {
  date: string
  mealCount: number
  itemCount: number
  created: NutritionLogEntryRecord[]
}

export interface NutritionOverviewInput {
  date: string
}

export interface SetNutritionWaterInput {
  date: string
  waterMl: number
}

export interface SetNutritionTargetsInput {
  effectiveFrom: string
  calories: number | null
  proteinG: number | null
  fatG: number | null
  carbsG: number | null
  fiberG: number | null
  waterMl: number | null
}

export interface NutritionReportInput {
  dateFrom: string
  dateTo: string
  mealType: NutritionMealType | null
  sourceType: NutritionLogSourceType | null
  foodId: string | null
  recipeId: string | null
}

export interface NutritionReportSummary {
  calendarDays: number
  loggedDays: number
  entries: number
  averageCalories: number
  averageProteinG: number
  averageFatG: number
  averageCarbsG: number
  averageFiberG: number
  averageSugarG: number
  averageSodiumMg: number
  averageWaterMl: number
  calorieGoalDays: number
  calorieGoalHitDays: number
  calorieGoalHitPercent: number
  daysAboveCalories: number
  daysBelowCalories: number
}

export interface NutritionReportMacroShare {
  macro: 'protein' | 'fat' | 'carbs'
  calories: number
  percent: number
}

export interface NutritionReportMeal {
  mealType: NutritionMealType
  entries: number
  calories: number
  percent: number
  proteinG: number
  fatG: number
  carbsG: number
}

export interface NutritionReportTopItem {
  sourceType: NutritionLogSourceType
  sourceId: string | null
  title: string
  entries: number
  totalAmount: number
  calories: number
}

export interface NutritionReportDay {
  date: string
  nutrients: NutritionValues
  waterMl: number
  targetCalories: number | null
  targetWaterMl: number | null
}

export interface NutritionReport {
  dateFrom: string
  dateTo: string
  summary: NutritionReportSummary
  macroShare: NutritionReportMacroShare[]
  meals: NutritionReportMeal[]
  topItems: NutritionReportTopItem[]
  timeline: NutritionReportDay[]
}

export const NUTRITION_IPC_CHANNELS = {
  listOverview: 'nutrition:list-overview',
  createFood: 'nutrition:create-food',
  createFoods: 'nutrition:create-foods',
  updateFood: 'nutrition:update-food',
  deleteFood: 'nutrition:delete-food',
  createRecipe: 'nutrition:create-recipe',
  updateRecipe: 'nutrition:update-recipe',
  deleteRecipe: 'nutrition:delete-recipe',
  createLogEntry: 'nutrition:create-log-entry',
  importMeals: 'nutrition:import-meals',
  updateLogEntry: 'nutrition:update-log-entry',
  deleteLogEntry: 'nutrition:delete-log-entry',
  setWater: 'nutrition:set-water',
  setTargets: 'nutrition:set-targets',
  getReport: 'nutrition:get-report'
} as const

export interface NutritionApi {
  listOverview(input: NutritionOverviewInput): Promise<NutritionOverview>
  createFood(input: CreateNutritionFoodInput): Promise<NutritionFoodRecord>
  createFoods(input: CreateNutritionFoodsInput): Promise<CreateNutritionFoodsResult>
  updateFood(input: UpdateNutritionFoodInput): Promise<NutritionFoodRecord>
  deleteFood(input: DeleteNutritionFoodInput): Promise<boolean>
  createRecipe(input: CreateNutritionRecipeInput): Promise<NutritionRecipeRecord>
  updateRecipe(input: UpdateNutritionRecipeInput): Promise<NutritionRecipeRecord>
  deleteRecipe(input: DeleteNutritionRecipeInput): Promise<boolean>
  createLogEntry(input: CreateNutritionLogEntryInput): Promise<NutritionLogEntryRecord>
  importMeals(input: ImportNutritionMealsInput): Promise<ImportNutritionMealsResult>
  updateLogEntry(input: UpdateNutritionLogEntryInput): Promise<NutritionLogEntryRecord>
  deleteLogEntry(input: DeleteNutritionLogEntryInput): Promise<boolean>
  setWater(input: SetNutritionWaterInput): Promise<NutritionDaySummary>
  setTargets(input: SetNutritionTargetsInput): Promise<NutritionTargetRecord>
  getReport(input: NutritionReportInput): Promise<NutritionReport>
}
