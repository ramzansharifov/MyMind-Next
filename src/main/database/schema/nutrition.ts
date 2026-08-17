import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import type {
  NutritionEntityStatus,
  NutritionFoodCategory,
  NutritionLogSourceType,
  NutritionMealType,
  NutritionUnit
} from '../../../shared/contracts/nutrition'

export const nutritionFoods = sqliteTable(
  'nutrition_foods',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    brand: text('brand').notNull().default(''),
    category: text('category').$type<NutritionFoodCategory>().notNull(),
    baseAmountMilli: integer('base_amount_milli').notNull(),
    baseUnit: text('base_unit').$type<Exclude<NutritionUnit, 'serving'>>().notNull(),
    caloriesMilli: integer('calories_milli').notNull().default(0),
    proteinMilliG: integer('protein_milli_g').notNull().default(0),
    fatMilliG: integer('fat_milli_g').notNull().default(0),
    carbsMilliG: integer('carbs_milli_g').notNull().default(0),
    fiberMilliG: integer('fiber_milli_g').notNull().default(0),
    sugarMilliG: integer('sugar_milli_g').notNull().default(0),
    sodiumMilliMg: integer('sodium_milli_mg').notNull().default(0),
    favorite: integer('favorite', { mode: 'boolean' }).notNull().default(false),
    status: text('status').$type<NutritionEntityStatus>().notNull().default('active'),
    notes: text('notes').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [
    index('nutrition_foods_category_idx').on(table.category),
    index('nutrition_foods_status_idx').on(table.status),
    index('nutrition_foods_name_idx').on(table.name)
  ]
)

export const nutritionRecipes = sqliteTable(
  'nutrition_recipes',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    servingsMilli: integer('servings_milli').notNull(),
    favorite: integer('favorite', { mode: 'boolean' }).notNull().default(false),
    status: text('status').$type<NutritionEntityStatus>().notNull().default('active'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [
    index('nutrition_recipes_status_idx').on(table.status),
    index('nutrition_recipes_name_idx').on(table.name)
  ]
)

export const nutritionRecipeIngredients = sqliteTable(
  'nutrition_recipe_ingredients',
  {
    id: text('id').primaryKey(),
    recipeId: text('recipe_id')
      .notNull()
      .references(() => nutritionRecipes.id, { onDelete: 'cascade' }),
    foodId: text('food_id')
      .notNull()
      .references(() => nutritionFoods.id, { onDelete: 'restrict' }),
    amountMilli: integer('amount_milli').notNull(),
    position: integer('position').notNull()
  },
  (table) => [
    index('nutrition_recipe_ingredients_recipe_idx').on(table.recipeId, table.position),
    index('nutrition_recipe_ingredients_food_idx').on(table.foodId)
  ]
)

export const nutritionLogEntries = sqliteTable(
  'nutrition_log_entries',
  {
    id: text('id').primaryKey(),
    date: text('date').notNull(),
    mealType: text('meal_type').$type<NutritionMealType>().notNull(),
    customMealName: text('custom_meal_name').notNull().default(''),
    sourceType: text('source_type').$type<NutritionLogSourceType>().notNull(),
    sourceId: text('source_id'),
    titleSnapshot: text('title_snapshot').notNull(),
    amountMilli: integer('amount_milli').notNull(),
    unitSnapshot: text('unit_snapshot').$type<NutritionUnit>().notNull(),
    caloriesMilli: integer('calories_milli').notNull().default(0),
    proteinMilliG: integer('protein_milli_g').notNull().default(0),
    fatMilliG: integer('fat_milli_g').notNull().default(0),
    carbsMilliG: integer('carbs_milli_g').notNull().default(0),
    fiberMilliG: integer('fiber_milli_g').notNull().default(0),
    sugarMilliG: integer('sugar_milli_g').notNull().default(0),
    sodiumMilliMg: integer('sodium_milli_mg').notNull().default(0),
    notes: text('notes').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [
    index('nutrition_log_entries_date_idx').on(table.date),
    index('nutrition_log_entries_meal_idx').on(table.date, table.mealType),
    index('nutrition_log_entries_source_idx').on(table.sourceType, table.sourceId)
  ]
)

export const nutritionWaterDays = sqliteTable('nutrition_water_days', {
  date: text('date').primaryKey(),
  waterMl: integer('water_ml').notNull().default(0),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
})

export const nutritionTargets = sqliteTable(
  'nutrition_targets',
  {
    id: text('id').primaryKey(),
    effectiveFrom: text('effective_from').notNull(),
    effectiveTo: text('effective_to'),
    caloriesMilli: integer('calories_milli'),
    proteinMilliG: integer('protein_milli_g'),
    fatMilliG: integer('fat_milli_g'),
    carbsMilliG: integer('carbs_milli_g'),
    fiberMilliG: integer('fiber_milli_g'),
    waterMl: integer('water_ml'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [index('nutrition_targets_period_idx').on(table.effectiveFrom, table.effectiveTo)]
)
