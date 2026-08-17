import { randomUUID } from 'node:crypto'

import type {
  CreateNutritionFoodInput,
  CreateNutritionLogEntryInput,
  CreateNutritionRecipeInput,
  DeleteNutritionFoodInput,
  DeleteNutritionLogEntryInput,
  DeleteNutritionRecipeInput,
  NutritionDaySummary,
  NutritionEntityStatus,
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
  favorite: number
  status: NutritionEntityStatus
  notes: string
  created_at: number
  updated_at: number
}

interface RecipeRow {
  id: string
  name: string
  description: string
  servings_milli: number
  favorite: number
  status: NutritionEntityStatus
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
  sugar_milli_g, sodium_milli_mg, favorite, status, notes, created_at, updated_at
  FROM nutrition_foods`
const RECIPE_SELECT = `SELECT id, name, description, servings_milli, favorite, status, created_at, updated_at FROM nutrition_recipes`
const INGREDIENT_SELECT = `SELECT id, recipe_id, food_id, amount_milli, position FROM nutrition_recipe_ingredients`
const LOG_SELECT = `SELECT id, date, meal_type, custom_meal_name, source_type, source_id,
  title_snapshot, amount_milli, unit_snapshot, calories_milli, protein_milli_g, fat_milli_g,
  carbs_milli_g, fiber_milli_g, sugar_milli_g, sodium_milli_mg, notes, created_at, updated_at
  FROM nutrition_log_entries`
const TARGET_SELECT = `SELECT id, effective_from, effective_to, calories_milli, protein_milli_g,
  fat_milli_g, carbs_milli_g, fiber_milli_g, water_ml, created_at FROM nutrition_targets`

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
  return Math.round((value / 1000) * 1000) / 1000
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function nutrientsFromRow(row: {
  calories_milli: number
  protein_milli_g: number
  fat_milli_g: number
  carbs_milli_g: number
  fiber_milli_g: number
  sugar_milli_g: number
  sodium_milli_mg: number
}): NutritionValues {
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

function mapFood(row: FoodRow): NutritionFoodRecord {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category,
    baseAmount: fromMilli(row.base_amount_milli),
    baseUnit: row.base_unit,
    nutrients: nutrientsFromRow(row),
    favorite: Boolean(row.favorite),
    status: row.status,
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
    favorite: Boolean(row.favorite),
    status: row.status,
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

function getTargetForDate(date: string): NutritionTargetRecord | null {
  const row = getSqlite()
    .prepare(
      `${TARGET_SELECT} WHERE effective_from <= ? AND (effective_to IS NULL OR effective_to >= ?)
       ORDER BY effective_from DESC LIMIT 1`
    )
    .get(date, date) as TargetRow | undefined
  return row ? mapTarget(row) : null
}

function getWater(date: string): number {
  const row = getSqlite().prepare('SELECT water_ml FROM nutrition_water_days WHERE date = ?').get(date) as
    | { water_ml: number }
    | undefined
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
    nutrients: entries.reduce(
      (total, entry) => addNutrients(total, entry.nutrients),
      { ...ZERO_NUTRIENTS }
    ),
    waterMl: getWater(date),
    target: getTargetForDate(date)
  }
}

export function listNutritionOverview(date: string): NutritionOverview {
  const foods = (getSqlite().prepare(`${FOOD_SELECT} ORDER BY favorite DESC, name COLLATE NOCASE ASC`).all() as FoodRow[]).map(mapFood)
  const recipes = (getSqlite().prepare(`${RECIPE_SELECT} ORDER BY favorite DESC, name COLLATE NOCASE ASC`).all() as RecipeRow[]).map(mapRecipe)
  return {
    date,
    foods,
    recipes,
    entries: listEntriesForDate(date),
    day: makeDaySummary(date),
    currentTarget: getTargetForDate(new Date().toISOString().slice(0, 10))
  }
}

export function createNutritionFood(input: CreateNutritionFoodInput): NutritionFoodRecord {
  const id = randomUUID()
  const now = Date.now()
  getSqlite()
    .prepare(
      `INSERT INTO nutrition_foods (
        id, name, brand, category, base_amount_milli, base_unit,
        calories_milli, protein_milli_g, fat_milli_g, carbs_milli_g, fiber_milli_g,
        sugar_milli_g, sodium_milli_mg, favorite, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.name.trim(),
      input.brand.trim(),
      input.category,
      toMilli(input.baseAmount),
      input.baseUnit,
      ...nutrientColumns(input.nutrients),
      input.favorite ? 1 : 0,
      input.status,
      input.notes,
      now,
      now
    )
  return requireFood(id)
}

export function updateNutritionFood(input: UpdateNutritionFoodInput): NutritionFoodRecord {
  requireFood(input.id)
  getSqlite()
    .prepare(
      `UPDATE nutrition_foods SET name = ?, brand = ?, category = ?, base_amount_milli = ?, base_unit = ?,
       calories_milli = ?, protein_milli_g = ?, fat_milli_g = ?, carbs_milli_g = ?, fiber_milli_g = ?,
       sugar_milli_g = ?, sodium_milli_mg = ?, favorite = ?, status = ?, notes = ?, updated_at = ? WHERE id = ?`
    )
    .run(
      input.name.trim(),
      input.brand.trim(),
      input.category,
      toMilli(input.baseAmount),
      input.baseUnit,
      ...nutrientColumns(input.nutrients),
      input.favorite ? 1 : 0,
      input.status,
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
    throw new Error('Продукт используется в рецепте. Архивируйте его или сначала измените рецепты.')
  }
  const result = getSqlite().prepare('DELETE FROM nutrition_foods WHERE id = ?').run(input.id)
  return result.changes > 0
}

function replaceRecipeIngredients(recipeId: string, ingredients: CreateNutritionRecipeInput['ingredients']): void {
  const db = getSqlite()
  db.prepare('DELETE FROM nutrition_recipe_ingredients WHERE recipe_id = ?').run(recipeId)
  const insert = db.prepare(
    'INSERT INTO nutrition_recipe_ingredients (id, recipe_id, food_id, amount_milli, position) VALUES (?, ?, ?, ?, ?)'
  )
  ingredients.forEach((ingredient, position) => {
    const food = requireFood(ingredient.foodId)
    if (food.status === 'archived') throw new Error(`Продукт «${food.name}» находится в архиве`)
    insert.run(randomUUID(), recipeId, ingredient.foodId, toMilli(ingredient.amount), position)
  })
}

export function createNutritionRecipe(input: CreateNutritionRecipeInput): NutritionRecipeRecord {
  const db = getSqlite()
  const id = randomUUID()
  const now = Date.now()
  const transaction = db.transaction(() => {
    db.prepare(
      `INSERT INTO nutrition_recipes (id, name, description, servings_milli, favorite, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, input.name.trim(), input.description, toMilli(input.servings), input.favorite ? 1 : 0, input.status, now, now)
    replaceRecipeIngredients(id, input.ingredients)
  })
  transaction()
  return requireRecipe(id)
}

export function updateNutritionRecipe(input: UpdateNutritionRecipeInput): NutritionRecipeRecord {
  requireRecipeRow(input.id)
  const db = getSqlite()
  const transaction = db.transaction(() => {
    db.prepare(
      `UPDATE nutrition_recipes SET name = ?, description = ?, servings_milli = ?, favorite = ?, status = ?, updated_at = ? WHERE id = ?`
    ).run(input.name.trim(), input.description, toMilli(input.servings), input.favorite ? 1 : 0, input.status, Date.now(), input.id)
    replaceRecipeIngredients(input.id, input.ingredients)
  })
  transaction()
  return requireRecipe(input.id)
}

export function deleteNutritionRecipe(input: DeleteNutritionRecipeInput): boolean {
  const result = getSqlite().prepare('DELETE FROM nutrition_recipes WHERE id = ?').run(input.id)
  return result.changes > 0
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

function writeLogEntry(id: string, input: CreateNutritionLogEntryInput | UpdateNutritionLogEntryInput, createdAt?: number): void {
  const snapshot = resolveLogSnapshot(input)
  const db = getSqlite()
  const now = Date.now()
  if (createdAt === undefined) {
    db.prepare(
      `INSERT INTO nutrition_log_entries (
        id, date, meal_type, custom_meal_name, source_type, source_id, title_snapshot, amount_milli,
        unit_snapshot, calories_milli, protein_milli_g, fat_milli_g, carbs_milli_g, fiber_milli_g,
        sugar_milli_g, sodium_milli_mg, notes, created_at, updated_at
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
      ...nutrientColumns(snapshot.nutrients),
      input.notes,
      now,
      now
    )
    return
  }
  db.prepare(
    `UPDATE nutrition_log_entries SET date = ?, meal_type = ?, custom_meal_name = ?, source_type = ?, source_id = ?,
     title_snapshot = ?, amount_milli = ?, unit_snapshot = ?, calories_milli = ?, protein_milli_g = ?, fat_milli_g = ?,
     carbs_milli_g = ?, fiber_milli_g = ?, sugar_milli_g = ?, sodium_milli_mg = ?, notes = ?, updated_at = ? WHERE id = ?`
  ).run(
    input.date,
    input.mealType,
    input.customMealName.trim(),
    input.sourceType,
    snapshot.sourceId,
    snapshot.title,
    toMilli(input.amount),
    snapshot.unit,
    ...nutrientColumns(snapshot.nutrients),
    input.notes,
    now,
    id
  )
}

function requireLog(id: string): NutritionLogEntryRecord {
  const row = getSqlite().prepare(`${LOG_SELECT} WHERE id = ?`).get(id) as LogRow | undefined
  if (!row) throw new Error('Запись питания не найдена')
  return mapLog(row)
}

export function createNutritionLogEntry(input: CreateNutritionLogEntryInput): NutritionLogEntryRecord {
  const id = randomUUID()
  writeLogEntry(id, input)
  return requireLog(id)
}

export function updateNutritionLogEntry(input: UpdateNutritionLogEntryInput): NutritionLogEntryRecord {
  const existing = requireLog(input.id)
  writeLogEntry(input.id, input, existing.createdAt)
  return requireLog(input.id)
}

export function deleteNutritionLogEntry(input: DeleteNutritionLogEntryInput): boolean {
  return getSqlite().prepare('DELETE FROM nutrition_log_entries WHERE id = ?').run(input.id).changes > 0
}

export function setNutritionWater(input: SetNutritionWaterInput): NutritionDaySummary {
  getSqlite()
    .prepare(
      `INSERT INTO nutrition_water_days (date, water_ml, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET water_ml = excluded.water_ml, updated_at = excluded.updated_at`
    )
    .run(input.date, input.waterMl, Date.now())
  return makeDaySummary(input.date)
}

function previousDate(date: string): string {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() - 1)
  return value.toISOString().slice(0, 10)
}

export function setNutritionTargets(input: SetNutritionTargetsInput): NutritionTargetRecord {
  const db = getSqlite()
  const id = randomUUID()
  const now = Date.now()
  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM nutrition_targets WHERE effective_from >= ?').run(input.effectiveFrom)
    const previous = db
      .prepare(`${TARGET_SELECT} WHERE effective_from < ? ORDER BY effective_from DESC LIMIT 1`)
      .get(input.effectiveFrom) as TargetRow | undefined
    if (previous) {
      db.prepare('UPDATE nutrition_targets SET effective_to = ? WHERE id = ?').run(
        previousDate(input.effectiveFrom),
        previous.id
      )
    }
    db.prepare(
      `INSERT INTO nutrition_targets (
        id, effective_from, effective_to, calories_milli, protein_milli_g, fat_milli_g,
        carbs_milli_g, fiber_milli_g, water_ml, created_at
      ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      input.effectiveFrom,
      input.calories === null ? null : toMilli(input.calories),
      input.proteinG === null ? null : toMilli(input.proteinG),
      input.fatG === null ? null : toMilli(input.fatG),
      input.carbsG === null ? null : toMilli(input.carbsG),
      input.fiberG === null ? null : toMilli(input.fiberG),
      input.waterMl,
      now
    )
  })
  transaction()
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

export function getNutritionReport(input: NutritionReportInput): NutritionReport {
  const conditions = ['date >= ?', 'date <= ?']
  const params: Array<string> = [input.dateFrom, input.dateTo]
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

  const rows = getSqlite()
    .prepare(`${LOG_SELECT} WHERE ${conditions.join(' AND ')} ORDER BY date ASC, created_at ASC`)
    .all(...params) as LogRow[]
  const entries = rows.map(mapLog)
  const dates = enumerateDates(input.dateFrom, input.dateTo)
  const waterRows = getSqlite()
    .prepare('SELECT date, water_ml FROM nutrition_water_days WHERE date >= ? AND date <= ?')
    .all(input.dateFrom, input.dateTo) as WaterRow[]
  const waterByDate = new Map(waterRows.map((row) => [row.date, row.water_ml]))
  const entriesByDate = new Map<string, NutritionLogEntryRecord[]>()
  entries.forEach((entry) => entriesByDate.set(entry.date, [...(entriesByDate.get(entry.date) ?? []), entry]))

  const timeline: NutritionReportDay[] = dates.map((date) => {
    const nutrients = (entriesByDate.get(date) ?? []).reduce(
      (total, entry) => addNutrients(total, entry.nutrients),
      { ...ZERO_NUTRIENTS }
    )
    const target = getTargetForDate(date)
    return {
      date,
      nutrients,
      waterMl: waterByDate.get(date) ?? 0,
      targetCalories: target?.calories ?? null,
      targetWaterMl: target?.waterMl ?? null
    }
  })

  const loggedDays = timeline.filter((day) => day.nutrients.calories > 0 || (entriesByDate.get(day.date)?.length ?? 0) > 0)
  const nutrientDivisor = Math.max(1, loggedDays.length)
  const totalNutrients = loggedDays.reduce((total, day) => addNutrients(total, day.nutrients), { ...ZERO_NUTRIENTS })
  const goalDays = loggedDays.filter((day) => day.targetCalories !== null)
  const hitDays = goalDays.filter((day) => {
    const target = day.targetCalories ?? 0
    return target > 0 && day.nutrients.calories >= target * 0.9 && day.nutrients.calories <= target * 1.1
  })
  const aboveDays = goalDays.filter((day) => day.nutrients.calories > (day.targetCalories ?? 0) * 1.1)
  const belowDays = goalDays.filter((day) => day.nutrients.calories < (day.targetCalories ?? 0) * 0.9)

  const proteinCalories = totalNutrients.proteinG * 4
  const fatCalories = totalNutrients.fatG * 9
  const carbCalories = totalNutrients.carbsG * 4
  const macroCalories = proteinCalories + fatCalories + carbCalories
  const macroShare = [
    { macro: 'protein' as const, calories: round2(proteinCalories), percent: macroCalories ? round2((proteinCalories / macroCalories) * 100) : 0 },
    { macro: 'fat' as const, calories: round2(fatCalories), percent: macroCalories ? round2((fatCalories / macroCalories) * 100) : 0 },
    { macro: 'carbs' as const, calories: round2(carbCalories), percent: macroCalories ? round2((carbCalories / macroCalories) * 100) : 0 }
  ]

  const totalCalories = entries.reduce((sum, entry) => sum + entry.nutrients.calories, 0)
  const meals: NutritionReportMeal[] = NUTRITION_MEAL_TYPES.map((mealType) => {
    const mealEntries = entries.filter((entry) => entry.mealType === mealType)
    const nutrients = mealEntries.reduce((total, entry) => addNutrients(total, entry.nutrients), { ...ZERO_NUTRIENTS })
    return {
      mealType,
      entries: mealEntries.length,
      calories: round2(nutrients.calories),
      percent: totalCalories ? round2((nutrients.calories / totalCalories) * 100) : 0,
      proteinG: nutrients.proteinG,
      fatG: nutrients.fatG,
      carbsG: nutrients.carbsG
    }
  })

  const itemMap = new Map<string, NutritionReportTopItem>()
  entries.forEach((entry) => {
    const key = `${entry.sourceType}:${entry.sourceId ?? entry.title}`
    const current = itemMap.get(key) ?? {
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
    itemMap.set(key, current)
  })
  const topItems = [...itemMap.values()]
    .sort((left, right) => right.entries - left.entries || right.calories - left.calories)
    .slice(0, 20)

  return {
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    summary: {
      calendarDays: dates.length,
      loggedDays: loggedDays.length,
      entries: entries.length,
      averageCalories: round2(totalNutrients.calories / nutrientDivisor),
      averageProteinG: round2(totalNutrients.proteinG / nutrientDivisor),
      averageFatG: round2(totalNutrients.fatG / nutrientDivisor),
      averageCarbsG: round2(totalNutrients.carbsG / nutrientDivisor),
      averageFiberG: round2(totalNutrients.fiberG / nutrientDivisor),
      averageSugarG: round2(totalNutrients.sugarG / nutrientDivisor),
      averageSodiumMg: round2(totalNutrients.sodiumMg / nutrientDivisor),
      averageWaterMl: round2(timeline.reduce((sum, day) => sum + day.waterMl, 0) / Math.max(1, dates.length)),
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
