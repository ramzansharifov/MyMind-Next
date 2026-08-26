import { randomUUID } from 'node:crypto'

import type {
  CreateNutritionFoodInput,
  CreateNutritionFoodsInput,
  CreateNutritionFoodsResult,
  CreateNutritionLogEntryInput,
  CreateNutritionRecipeInput,
  DeleteNutritionFoodInput,
  DeleteNutritionLogEntryInput,
  DeleteNutritionRecipeInput,
  NutritionDaySummary,
  NutritionFoodCategory,
  NutritionFoodRecord,
  NutritionLogEntryRecord,
  NutritionLogSourceType,
  NutritionMealType,
  NutritionOverview,
  NutritionRecipeIngredientRecord,
  NutritionRecipeRecord,
  NutritionReport,
  NutritionReportDay,
  NutritionReportInput,
  NutritionReportMeal,
  NutritionReportTopItem,
  NutritionTargetRecord,
  NutritionUnit,
  NutritionValues,
  SetNutritionTargetsInput,
  SetNutritionWaterInput,
  UpdateNutritionFoodInput,
  UpdateNutritionLogEntryInput,
  UpdateNutritionRecipeInput
} from '../../shared/contracts/nutrition'
import { NUTRITION_MEAL_TYPES } from '../../shared/contracts/nutrition'
import { getSqlite } from '../database/client'

interface FoodRow {
  id: string
  name: string
  brand: string
  category: NutritionFoodCategory
  base_amount_milli: number
  base_unit: Exclude<NutritionUnit, 'serving'>
  calories_milli: number
  protein_milli_g: number
  fat_milli_g: number
  carbs_milli_g: number
  fiber_milli_g: number
  sugar_milli_g: number
  sodium_milli_mg: number
  notes: string
  created_at: number
  updated_at: number
}

interface RecipeRow {
  id: string
  name: string
  description: string
  servings_milli: number
  created_at: number
  updated_at: number
}

interface IngredientRow {
  id: string
  recipe_id: string
  food_id: string
  amount_milli: number
  position: number
}

interface LogRow {
  id: string
  date: string
  meal_type: NutritionMealType
  custom_meal_name: string
  source_type: NutritionLogSourceType
  source_id: string | null
  title_snapshot: string
  amount_milli: number
  unit_snapshot: NutritionUnit
  calories_milli: number
  protein_milli_g: number
  fat_milli_g: number
  carbs_milli_g: number
  fiber_milli_g: number
  sugar_milli_g: number
  sodium_milli_mg: number
  notes: string
  created_at: number
  updated_at: number
}

interface TargetRow {
  id: string
  effective_from: string
  effective_to: string | null
  calories_milli: number | null
  protein_milli_g: number | null
  fat_milli_g: number | null
  carbs_milli_g: number | null
  fiber_milli_g: number | null
  water_ml: number | null
  created_at: number
}

interface WaterRow {
  date: string
  water_ml: number
}

const FOOD_SELECT = `SELECT id, name, brand, category, base_amount_milli, base_unit,
  calories_milli, protein_milli_g, fat_milli_g, carbs_milli_g, fiber_milli_g,
  sugar_milli_g, sodium_milli_mg, notes, created_at, updated_at
  FROM nutrition_foods`
const RECIPE_SELECT = `SELECT id, name, description, servings_milli,
  created_at, updated_at FROM nutrition_recipes`
const INGREDIENT_SELECT = `SELECT id, recipe_id, food_id, amount_milli, position
  FROM nutrition_recipe_ingredients`
const LOG_SELECT = `SELECT id, date, meal_type, custom_meal_name, source_type, source_id,
  title_snapshot, amount_milli, unit_snapshot, calories_milli, protein_milli_g, fat_milli_g,
  carbs_milli_g, fiber_milli_g, sugar_milli_g, sodium_milli_mg, notes, created_at, updated_at
  FROM nutrition_log_entries`
const TARGET_SELECT = `SELECT id, effective_from, effective_to, calories_milli, protein_milli_g,
  fat_milli_g, carbs_milli_g, fiber_milli_g, water_ml, created_at FROM nutrition_targets`
const GLOBAL_TARGET_EFFECTIVE_FROM = '0001-01-01'

const ZERO_NUTRIENTS: NutritionValues = {
  calories: 0,
  proteinG: 0,
  fatG: 0,
  carbsG: 0,
  fiberG: 0,
  sugarG: 0,
  sodiumMg: 0
}

function toMilli(value: number): number {
  return Math.round(value * 1000)
}

function fromMilli(value: number): number {
  return Math.round(value) / 1000
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function localDateKey(date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function nutrientsFromRow(
  row: Pick<
    LogRow,
    | 'calories_milli'
    | 'protein_milli_g'
    | 'fat_milli_g'
    | 'carbs_milli_g'
    | 'fiber_milli_g'
    | 'sugar_milli_g'
    | 'sodium_milli_mg'
  >
): NutritionValues {
  return {
    calories: fromMilli(row.calories_milli),
    proteinG: fromMilli(row.protein_milli_g),
    fatG: fromMilli(row.fat_milli_g),
    carbsG: fromMilli(row.carbs_milli_g),
    fiberG: fromMilli(row.fiber_milli_g),
    sugarG: fromMilli(row.sugar_milli_g),
    sodiumMg: fromMilli(row.sodium_milli_mg)
  }
}

function nutrientColumns(nutrients: NutritionValues): number[] {
  return [
    toMilli(nutrients.calories),
    toMilli(nutrients.proteinG),
    toMilli(nutrients.fatG),
    toMilli(nutrients.carbsG),
    toMilli(nutrients.fiberG),
    toMilli(nutrients.sugarG),
    toMilli(nutrients.sodiumMg)
  ]
}

function addNutrients(left: NutritionValues, right: NutritionValues): NutritionValues {
  return {
    calories: round2(left.calories + right.calories),
    proteinG: round2(left.proteinG + right.proteinG),
    fatG: round2(left.fatG + right.fatG),
    carbsG: round2(left.carbsG + right.carbsG),
    fiberG: round2(left.fiberG + right.fiberG),
    sugarG: round2(left.sugarG + right.sugarG),
    sodiumMg: round2(left.sodiumMg + right.sodiumMg)
  }
}

function scaleNutrients(value: NutritionValues, factor: number): NutritionValues {
  return {
    calories: round2(value.calories * factor),
    proteinG: round2(value.proteinG * factor),
    fatG: round2(value.fatG * factor),
    carbsG: round2(value.carbsG * factor),
    fiberG: round2(value.fiberG * factor),
    sugarG: round2(value.sugarG * factor),
    sodiumMg: round2(value.sodiumMg * factor)
  }
}

function sumNutrients(entries: NutritionLogEntryRecord[]): NutritionValues {
  return entries.reduce((total, entry) => addNutrients(total, entry.nutrients), {
    ...ZERO_NUTRIENTS
  })
}

function mapFood(row: FoodRow): NutritionFoodRecord {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category,
    baseAmount: fromMilli(row.base_amount_milli),
    baseUnit: row.base_unit,
    nutrients: nutrientsFromRow(row),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapLog(row: LogRow): NutritionLogEntryRecord {
  return {
    id: row.id,
    date: row.date,
    mealType: row.meal_type,
    customMealName: row.custom_meal_name,
    sourceType: row.source_type,
    sourceId: row.source_id,
    title: row.title_snapshot,
    amount: fromMilli(row.amount_milli),
    unit: row.unit_snapshot,
    nutrients: nutrientsFromRow(row),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapTarget(row: TargetRow): NutritionTargetRecord {
  return {
    id: row.id,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    calories: row.calories_milli === null ? null : fromMilli(row.calories_milli),
    proteinG: row.protein_milli_g === null ? null : fromMilli(row.protein_milli_g),
    fatG: row.fat_milli_g === null ? null : fromMilli(row.fat_milli_g),
    carbsG: row.carbs_milli_g === null ? null : fromMilli(row.carbs_milli_g),
    fiberG: row.fiber_milli_g === null ? null : fromMilli(row.fiber_milli_g),
    waterMl: row.water_ml,
    createdAt: row.created_at
  }
}

function requireFood(id: string): NutritionFoodRecord {
  const row = getSqlite().prepare(`${FOOD_SELECT} WHERE id = ?`).get(id) as FoodRow | undefined
  if (!row) throw new Error('Продукт не найден')
  return mapFood(row)
}

function requireRecipeRow(id: string): RecipeRow {
  const row = getSqlite().prepare(`${RECIPE_SELECT} WHERE id = ?`).get(id) as RecipeRow | undefined
  if (!row) throw new Error('Рецепт не найден')
  return row
}

function listRecipeIngredients(recipeId: string): NutritionRecipeIngredientRecord[] {
  const rows = getSqlite()
    .prepare(`${INGREDIENT_SELECT} WHERE recipe_id = ? ORDER BY position ASC`)
    .all(recipeId) as IngredientRow[]

  return rows.map((row) => {
    const food = requireFood(row.food_id)
    const amount = fromMilli(row.amount_milli)
    return {
      id: row.id,
      foodId: food.id,
      foodName: food.name,
      amount,
      unit: food.baseUnit,
      position: row.position,
      nutrients: scaleNutrients(food.nutrients, amount / food.baseAmount)
    }
  })
}

function mapRecipe(row: RecipeRow): NutritionRecipeRecord {
  const ingredients = listRecipeIngredients(row.id)
  const totalNutrients = ingredients.reduce(
    (total, ingredient) => addNutrients(total, ingredient.nutrients),
    { ...ZERO_NUTRIENTS }
  )
  const servings = fromMilli(row.servings_milli)

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    servings,
    ingredients,
    totalNutrients,
    perServingNutrients: scaleNutrients(totalNutrients, 1 / servings),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function requireRecipe(id: string): NutritionRecipeRecord {
  return mapRecipe(requireRecipeRow(id))
}

function requireLog(id: string): NutritionLogEntryRecord {
  const row = getSqlite().prepare(`${LOG_SELECT} WHERE id = ?`).get(id) as LogRow | undefined
  if (!row) throw new Error('Запись питания не найдена')
  return mapLog(row)
}

function getGlobalTarget(): NutritionTargetRecord | null {
  const db = getSqlite()
  const today = localDateKey()
  const activeRow = db
    .prepare(
      `${TARGET_SELECT} WHERE effective_from <= ?
       AND (effective_to IS NULL OR effective_to >= ?)
       ORDER BY effective_from DESC, created_at DESC LIMIT 1`
    )
    .get(today, today) as TargetRow | undefined

  if (activeRow) return mapTarget(activeRow)

  const latestRow = db
    .prepare(`${TARGET_SELECT} ORDER BY effective_from DESC, created_at DESC LIMIT 1`)
    .get() as TargetRow | undefined
  return latestRow ? mapTarget(latestRow) : null
}

function getWater(date: string): number {
  const row = getSqlite()
    .prepare('SELECT water_ml FROM nutrition_water_days WHERE date = ?')
    .get(date) as { water_ml: number } | undefined
  return row?.water_ml ?? 0
}

function listEntriesForDate(date: string): NutritionLogEntryRecord[] {
  return (
    getSqlite()
      .prepare(`${LOG_SELECT} WHERE date = ? ORDER BY created_at ASC`)
      .all(date) as LogRow[]
  ).map(mapLog)
}

function makeDaySummary(date: string): NutritionDaySummary {
  const entries = listEntriesForDate(date)
  return {
    date,
    nutrients: sumNutrients(entries),
    waterMl: getWater(date),
    target: getGlobalTarget()
  }
}

export function listNutritionOverview(date: string): NutritionOverview {
  const foods = (
    getSqlite().prepare(`${FOOD_SELECT} ORDER BY name COLLATE NOCASE ASC`).all() as FoodRow[]
  ).map(mapFood)
  const recipes = (
    getSqlite().prepare(`${RECIPE_SELECT} ORDER BY name COLLATE NOCASE ASC`).all() as RecipeRow[]
  ).map(mapRecipe)
  const currentTarget = getGlobalTarget()

  return {
    date,
    foods,
    recipes,
    entries: listEntriesForDate(date),
    day: {
      ...makeDaySummary(date),
      target: currentTarget
    },
    currentTarget
  }
}

function insertNutritionFood(input: CreateNutritionFoodInput): NutritionFoodRecord {
  const id = randomUUID()
  const now = Date.now()
  getSqlite()
    .prepare(
      `INSERT INTO nutrition_foods (
        id, name, brand, category, base_amount_milli, base_unit,
        calories_milli, protein_milli_g, fat_milli_g, carbs_milli_g, fiber_milli_g,
        sugar_milli_g, sodium_milli_mg, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.name.trim(),
      input.brand.trim(),
      input.category,
      toMilli(input.baseAmount),
      input.baseUnit,
      ...nutrientColumns(input.nutrients),
      input.notes,
      now,
      now
    )
  return requireFood(id)
}

function normalizeFoodIdentity(value: string): string {
  return value.trim().toLocaleLowerCase('ru-RU')
}

function foodIdentityKey(input: Pick<CreateNutritionFoodInput, 'name' | 'brand'>): string {
  return `${normalizeFoodIdentity(input.name)} ${normalizeFoodIdentity(input.brand)}`
}

export function createNutritionFood(input: CreateNutritionFoodInput): NutritionFoodRecord {
  return insertNutritionFood(input)
}

export function createNutritionFoods(input: CreateNutritionFoodsInput): CreateNutritionFoodsResult {
  const existingRows = getSqlite()
    .prepare('SELECT name, brand FROM nutrition_foods')
    .all() as Array<{ name: string; brand: string }>
  const seen = new Set(existingRows.map(foodIdentityKey))
  const pending: CreateNutritionFoodInput[] = []
  const skippedNames: string[] = []

  for (const food of input.foods) {
    const key = foodIdentityKey(food)
    if (seen.has(key)) {
      skippedNames.push(food.name.trim())
      continue
    }
    seen.add(key)
    pending.push(food)
  }

  const transaction = getSqlite().transaction((foods: CreateNutritionFoodInput[]) =>
    foods.map(insertNutritionFood)
  )

  return {
    created: transaction(pending),
    skippedNames
  }
}

export function updateNutritionFood(input: UpdateNutritionFoodInput): NutritionFoodRecord {
  requireFood(input.id)
  getSqlite()
    .prepare(
      `UPDATE nutrition_foods SET name = ?, brand = ?, category = ?, base_amount_milli = ?,
       base_unit = ?, calories_milli = ?, protein_milli_g = ?, fat_milli_g = ?, carbs_milli_g = ?,
       fiber_milli_g = ?, sugar_milli_g = ?, sodium_milli_mg = ?,
       notes = ?, updated_at = ? WHERE id = ?`
    )
    .run(
      input.name.trim(),
      input.brand.trim(),
      input.category,
      toMilli(input.baseAmount),
      input.baseUnit,
      ...nutrientColumns(input.nutrients),
      input.notes,
      Date.now(),
      input.id
    )
  return requireFood(input.id)
}

export function deleteNutritionFood(input: DeleteNutritionFoodInput): boolean {
  const referenced = getSqlite()
    .prepare('SELECT 1 AS found FROM nutrition_recipe_ingredients WHERE food_id = ? LIMIT 1')
    .get(input.id)
  if (referenced) {
    throw new Error('Продукт используется в рецепте. Сначала измените или удалите рецепт.')
  }
  return getSqlite().prepare('DELETE FROM nutrition_foods WHERE id = ?').run(input.id).changes > 0
}

function replaceRecipeIngredients(
  recipeId: string,
  ingredients: CreateNutritionRecipeInput['ingredients']
): void {
  const db = getSqlite()
  db.prepare('DELETE FROM nutrition_recipe_ingredients WHERE recipe_id = ?').run(recipeId)
  const insert = db.prepare(
    `INSERT INTO nutrition_recipe_ingredients
     (id, recipe_id, food_id, amount_milli, position) VALUES (?, ?, ?, ?, ?)`
  )

  ingredients.forEach((ingredient, position) => {
    requireFood(ingredient.foodId)
    insert.run(randomUUID(), recipeId, ingredient.foodId, toMilli(ingredient.amount), position)
  })
}

export function createNutritionRecipe(input: CreateNutritionRecipeInput): NutritionRecipeRecord {
  const db = getSqlite()
  const id = randomUUID()
  const now = Date.now()
  db.transaction(() => {
    db.prepare(
      `INSERT INTO nutrition_recipes
       (id, name, description, servings_milli, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, input.name.trim(), input.description, toMilli(input.servings), now, now)
    replaceRecipeIngredients(id, input.ingredients)
  })()
  return requireRecipe(id)
}

export function updateNutritionRecipe(input: UpdateNutritionRecipeInput): NutritionRecipeRecord {
  requireRecipeRow(input.id)
  const db = getSqlite()
  db.transaction(() => {
    db.prepare(
      `UPDATE nutrition_recipes SET name = ?, description = ?, servings_milli = ?,
       updated_at = ? WHERE id = ?`
    ).run(input.name.trim(), input.description, toMilli(input.servings), Date.now(), input.id)
    replaceRecipeIngredients(input.id, input.ingredients)
  })()
  return requireRecipe(input.id)
}

export function deleteNutritionRecipe(input: DeleteNutritionRecipeInput): boolean {
  return getSqlite().prepare('DELETE FROM nutrition_recipes WHERE id = ?').run(input.id).changes > 0
}

function resolveLogSnapshot(input: CreateNutritionLogEntryInput | UpdateNutritionLogEntryInput): {
  sourceId: string | null
  title: string
  unit: NutritionUnit
  nutrients: NutritionValues
} {
  if (input.sourceType === 'food') {
    if (!input.sourceId) throw new Error('Выберите продукт')
    const food = requireFood(input.sourceId)
    return {
      sourceId: food.id,
      title: food.name,
      unit: food.baseUnit,
      nutrients: scaleNutrients(food.nutrients, input.amount / food.baseAmount)
    }
  }

  if (input.sourceType === 'recipe') {
    if (!input.sourceId) throw new Error('Выберите рецепт')
    const recipe = requireRecipe(input.sourceId)
    return {
      sourceId: recipe.id,
      title: recipe.name,
      unit: 'serving',
      nutrients: scaleNutrients(recipe.perServingNutrients, input.amount)
    }
  }

  if (!input.customNutrients) throw new Error('Укажите пищевую ценность')
  return {
    sourceId: null,
    title: input.customTitle.trim(),
    unit: input.customUnit,
    nutrients: input.customNutrients
  }
}

function writeLogEntry(
  id: string,
  input: CreateNutritionLogEntryInput | UpdateNutritionLogEntryInput,
  updating: boolean
): void {
  const snapshot = resolveLogSnapshot(input)
  const now = Date.now()
  const values = nutrientColumns(snapshot.nutrients)
  const db = getSqlite()

  if (!updating) {
    db.prepare(
      `INSERT INTO nutrition_log_entries (
        id, date, meal_type, custom_meal_name, source_type, source_id, title_snapshot,
        amount_milli, unit_snapshot, calories_milli, protein_milli_g, fat_milli_g,
        carbs_milli_g, fiber_milli_g, sugar_milli_g, sodium_milli_mg, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      input.date,
      input.mealType,
      input.customMealName.trim(),
      input.sourceType,
      snapshot.sourceId,
      snapshot.title,
      toMilli(input.amount),
      snapshot.unit,
      ...values,
      input.notes,
      now,
      now
    )
    return
  }

  db.prepare(
    `UPDATE nutrition_log_entries SET date = ?, meal_type = ?, custom_meal_name = ?,
     source_type = ?, source_id = ?, title_snapshot = ?, amount_milli = ?, unit_snapshot = ?,
     calories_milli = ?, protein_milli_g = ?, fat_milli_g = ?, carbs_milli_g = ?, fiber_milli_g = ?,
     sugar_milli_g = ?, sodium_milli_mg = ?, notes = ?, updated_at = ? WHERE id = ?`
  ).run(
    input.date,
    input.mealType,
    input.customMealName.trim(),
    input.sourceType,
    snapshot.sourceId,
    snapshot.title,
    toMilli(input.amount),
    snapshot.unit,
    ...values,
    input.notes,
    now,
    id
  )
}

export function createNutritionLogEntry(
  input: CreateNutritionLogEntryInput
): NutritionLogEntryRecord {
  const id = randomUUID()
  writeLogEntry(id, input, false)
  return requireLog(id)
}

export function updateNutritionLogEntry(
  input: UpdateNutritionLogEntryInput
): NutritionLogEntryRecord {
  requireLog(input.id)
  writeLogEntry(input.id, input, true)
  return requireLog(input.id)
}

export function deleteNutritionLogEntry(input: DeleteNutritionLogEntryInput): boolean {
  return (
    getSqlite().prepare('DELETE FROM nutrition_log_entries WHERE id = ?').run(input.id).changes > 0
  )
}

export function setNutritionWater(input: SetNutritionWaterInput): NutritionDaySummary {
  getSqlite()
    .prepare(
      `INSERT INTO nutrition_water_days (date, water_ml, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET
       water_ml = excluded.water_ml, updated_at = excluded.updated_at`
    )
    .run(input.date, input.waterMl, Date.now())
  return makeDaySummary(input.date)
}

export function setNutritionTargets(input: SetNutritionTargetsInput): NutritionTargetRecord {
  const db = getSqlite()
  const id = randomUUID()
  const now = Date.now()

  db.transaction(() => {
    // `nutrition_targets` historically stored dated periods. Keep the table shape for
    // local-database compatibility, but collapse writes to one row that applies globally.
    db.prepare('DELETE FROM nutrition_targets').run()
    db.prepare(
      `INSERT INTO nutrition_targets (
        id, effective_from, effective_to, calories_milli, protein_milli_g, fat_milli_g,
        carbs_milli_g, fiber_milli_g, water_ml, created_at
      ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      GLOBAL_TARGET_EFFECTIVE_FROM,
      input.calories === null ? null : toMilli(input.calories),
      input.proteinG === null ? null : toMilli(input.proteinG),
      input.fatG === null ? null : toMilli(input.fatG),
      input.carbsG === null ? null : toMilli(input.carbsG),
      input.fiberG === null ? null : toMilli(input.fiberG),
      input.waterMl,
      now
    )
  })()

  const row = db.prepare(`${TARGET_SELECT} WHERE id = ?`).get(id) as TargetRow
  return mapTarget(row)
}

function enumerateDates(dateFrom: string, dateTo: string): string[] {
  const result: string[] = []
  const cursor = new Date(`${dateFrom}T12:00:00Z`)
  const end = new Date(`${dateTo}T12:00:00Z`)

  while (cursor <= end) {
    result.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return result
}

function groupEntriesByDate(
  entries: NutritionLogEntryRecord[]
): Map<string, NutritionLogEntryRecord[]> {
  const result = new Map<string, NutritionLogEntryRecord[]>()
  for (const entry of entries) {
    result.set(entry.date, [...(result.get(entry.date) ?? []), entry])
  }
  return result
}

export function getNutritionReport(input: NutritionReportInput): NutritionReport {
  const conditions = ['date >= ?', 'date <= ?']
  const params: string[] = [input.dateFrom, input.dateTo]

  if (input.mealType) {
    conditions.push('meal_type = ?')
    params.push(input.mealType)
  }
  if (input.sourceType) {
    conditions.push('source_type = ?')
    params.push(input.sourceType)
  }
  if (input.foodId) {
    conditions.push("source_type = 'food'", 'source_id = ?')
    params.push(input.foodId)
  }
  if (input.recipeId) {
    conditions.push("source_type = 'recipe'", 'source_id = ?')
    params.push(input.recipeId)
  }

  const filteredEntries = (
    getSqlite()
      .prepare(`${LOG_SELECT} WHERE ${conditions.join(' AND ')} ORDER BY date ASC, created_at ASC`)
      .all(...params) as LogRow[]
  ).map(mapLog)

  const allEntries = (
    getSqlite()
      .prepare(`${LOG_SELECT} WHERE date >= ? AND date <= ? ORDER BY date ASC, created_at ASC`)
      .all(input.dateFrom, input.dateTo) as LogRow[]
  ).map(mapLog)

  const dates = enumerateDates(input.dateFrom, input.dateTo)
  const filteredByDate = groupEntriesByDate(filteredEntries)
  const allByDate = groupEntriesByDate(allEntries)
  const waterRows = getSqlite()
    .prepare('SELECT date, water_ml FROM nutrition_water_days WHERE date >= ? AND date <= ?')
    .all(input.dateFrom, input.dateTo) as WaterRow[]
  const waterByDate = new Map(waterRows.map((row) => [row.date, row.water_ml]))
  const target = getGlobalTarget()

  const timeline: NutritionReportDay[] = dates.map((date) => ({
    date,
    nutrients: sumNutrients(filteredByDate.get(date) ?? []),
    waterMl: waterByDate.get(date) ?? 0,
    targetCalories: target?.calories ?? null,
    targetWaterMl: target?.waterMl ?? null
  }))

  const loggedDays = timeline.filter((day) => (filteredByDate.get(day.date)?.length ?? 0) > 0)
  const totalNutrients = loggedDays.reduce((total, day) => addNutrients(total, day.nutrients), {
    ...ZERO_NUTRIENTS
  })
  const nutrientDivisor = Math.max(1, loggedDays.length)

  // Goal adherence intentionally uses complete daily intake, even when the visible report is filtered.
  const goalDays = dates.flatMap((date) => {
    const entries = allByDate.get(date) ?? []
    if (entries.length === 0 || target?.calories === null || target?.calories === undefined) {
      return []
    }
    return [{ calories: sumNutrients(entries).calories, target: target.calories }]
  })
  const hitDays = goalDays.filter(
    ({ calories, target }) => calories >= target * 0.9 && calories <= target * 1.1
  )
  const aboveDays = goalDays.filter(({ calories, target }) => calories > target * 1.1)
  const belowDays = goalDays.filter(({ calories, target }) => calories < target * 0.9)

  const proteinCalories = totalNutrients.proteinG * 4
  const fatCalories = totalNutrients.fatG * 9
  const carbCalories = totalNutrients.carbsG * 4
  const macroCalories = proteinCalories + fatCalories + carbCalories
  const macroShare = [
    {
      macro: 'protein' as const,
      calories: round2(proteinCalories),
      percent: macroCalories ? round2((proteinCalories / macroCalories) * 100) : 0
    },
    {
      macro: 'fat' as const,
      calories: round2(fatCalories),
      percent: macroCalories ? round2((fatCalories / macroCalories) * 100) : 0
    },
    {
      macro: 'carbs' as const,
      calories: round2(carbCalories),
      percent: macroCalories ? round2((carbCalories / macroCalories) * 100) : 0
    }
  ]

  const filteredCalories = filteredEntries.reduce((sum, entry) => sum + entry.nutrients.calories, 0)
  const meals: NutritionReportMeal[] = NUTRITION_MEAL_TYPES.map((mealType) => {
    const entries = filteredEntries.filter((entry) => entry.mealType === mealType)
    const nutrients = sumNutrients(entries)
    return {
      mealType,
      entries: entries.length,
      calories: round2(nutrients.calories),
      percent: filteredCalories ? round2((nutrients.calories / filteredCalories) * 100) : 0,
      proteinG: nutrients.proteinG,
      fatG: nutrients.fatG,
      carbsG: nutrients.carbsG
    }
  })

  const topItemsMap = new Map<string, NutritionReportTopItem>()
  for (const entry of filteredEntries) {
    const key = `${entry.sourceType}:${entry.sourceId ?? entry.title}`
    const current = topItemsMap.get(key) ?? {
      sourceType: entry.sourceType,
      sourceId: entry.sourceId,
      title: entry.title,
      entries: 0,
      totalAmount: 0,
      calories: 0
    }
    current.entries += 1
    current.totalAmount = round2(current.totalAmount + entry.amount)
    current.calories = round2(current.calories + entry.nutrients.calories)
    topItemsMap.set(key, current)
  }

  const topItems = [...topItemsMap.values()]
    .sort((left, right) => right.entries - left.entries || right.calories - left.calories)
    .slice(0, 20)

  return {
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    summary: {
      calendarDays: dates.length,
      loggedDays: loggedDays.length,
      entries: filteredEntries.length,
      averageCalories: round2(totalNutrients.calories / nutrientDivisor),
      averageProteinG: round2(totalNutrients.proteinG / nutrientDivisor),
      averageFatG: round2(totalNutrients.fatG / nutrientDivisor),
      averageCarbsG: round2(totalNutrients.carbsG / nutrientDivisor),
      averageFiberG: round2(totalNutrients.fiberG / nutrientDivisor),
      averageSugarG: round2(totalNutrients.sugarG / nutrientDivisor),
      averageSodiumMg: round2(totalNutrients.sodiumMg / nutrientDivisor),
      averageWaterMl: round2(
        dates.reduce((sum, date) => sum + (waterByDate.get(date) ?? 0), 0) /
          Math.max(1, dates.length)
      ),
      calorieGoalDays: goalDays.length,
      calorieGoalHitDays: hitDays.length,
      calorieGoalHitPercent: goalDays.length ? round2((hitDays.length / goalDays.length) * 100) : 0,
      daysAboveCalories: aboveDays.length,
      daysBelowCalories: belowDays.length
    },
    macroShare,
    meals,
    topItems,
    timeline
  }
}
