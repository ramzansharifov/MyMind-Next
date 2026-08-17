import { z } from 'zod'

import {
  NUTRITION_ENTITY_STATUSES,
  NUTRITION_FOOD_CATEGORIES,
  NUTRITION_LOG_SOURCE_TYPES,
  NUTRITION_MEAL_TYPES,
  NUTRITION_UNITS
} from '../contracts/nutrition'

const idSchema = z.string().uuid('Некорректный идентификатор')
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате ГГГГ-ММ-ДД')
const nonNegativeNumber = z.number().finite().min(0, 'Значение не может быть отрицательным')
const targetSchema = (maximum: number) =>
  z.number().finite().positive('Цель должна быть больше нуля').max(maximum).nullable()

export const nutritionValuesSchema = z.object({
  calories: nonNegativeNumber.max(100_000),
  proteinG: nonNegativeNumber.max(10_000),
  fatG: nonNegativeNumber.max(10_000),
  carbsG: nonNegativeNumber.max(10_000),
  fiberG: nonNegativeNumber.max(10_000),
  sugarG: nonNegativeNumber.max(10_000),
  sodiumMg: nonNegativeNumber.max(10_000_000)
})

const foodPayloadSchema = z.object({
  name: z.string().trim().min(1, 'Введите название продукта').max(180),
  brand: z.string().trim().max(160),
  category: z.enum(NUTRITION_FOOD_CATEGORIES),
  baseAmount: z.number().finite().positive('Количество должно быть больше нуля').max(100_000),
  baseUnit: z.enum(['g', 'ml', 'piece']),
  nutrients: nutritionValuesSchema,
  favorite: z.boolean(),
  status: z.enum(NUTRITION_ENTITY_STATUSES),
  notes: z.string().max(10_000)
})

export const createNutritionFoodInputSchema = foodPayloadSchema
export const updateNutritionFoodInputSchema = foodPayloadSchema.extend({ id: idSchema })
export const deleteNutritionFoodInputSchema = z.object({ id: idSchema })

const recipeIngredientSchema = z.object({
  foodId: idSchema,
  amount: z.number().finite().positive('Количество ингредиента должно быть больше нуля').max(100_000)
})

const recipePayloadSchema = z
  .object({
    name: z.string().trim().min(1, 'Введите название рецепта').max(180),
    description: z.string().max(10_000),
    servings: z.number().finite().positive('Количество порций должно быть больше нуля').max(1000),
    favorite: z.boolean(),
    status: z.enum(NUTRITION_ENTITY_STATUSES),
    ingredients: z.array(recipeIngredientSchema).min(1, 'Добавьте хотя бы один ингредиент').max(200)
  })
  .superRefine((input, context) => {
    const ids = input.ingredients.map((ingredient) => ingredient.foodId)
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: 'custom',
        message: 'Один продукт нельзя добавлять в рецепт несколько раз',
        path: ['ingredients']
      })
    }
  })

export const createNutritionRecipeInputSchema = recipePayloadSchema
export const updateNutritionRecipeInputSchema = recipePayloadSchema.safeExtend({ id: idSchema })
export const deleteNutritionRecipeInputSchema = z.object({ id: idSchema })

const logPayloadSchema = z
  .object({
    date: dateSchema,
    mealType: z.enum(NUTRITION_MEAL_TYPES),
    customMealName: z.string().trim().max(80),
    sourceType: z.enum(NUTRITION_LOG_SOURCE_TYPES),
    sourceId: idSchema.nullable(),
    amount: z.number().finite().positive('Количество должно быть больше нуля').max(100_000),
    customTitle: z.string().trim().max(180),
    customUnit: z.enum(NUTRITION_UNITS),
    customNutrients: nutritionValuesSchema.nullable(),
    notes: z.string().max(4000)
  })
  .superRefine((input, context) => {
    if (input.mealType === 'other' && !input.customMealName) {
      context.addIssue({ code: 'custom', message: 'Укажите название приёма пищи', path: ['customMealName'] })
    }
    if (input.sourceType === 'custom') {
      if (!input.customTitle) {
        context.addIssue({ code: 'custom', message: 'Введите название', path: ['customTitle'] })
      }
      if (!input.customNutrients) {
        context.addIssue({ code: 'custom', message: 'Укажите пищевую ценность', path: ['customNutrients'] })
      }
      if (input.sourceId !== null) {
        context.addIssue({ code: 'custom', message: 'Своя запись не должна ссылаться на каталог', path: ['sourceId'] })
      }
    } else if (input.sourceId === null) {
      context.addIssue({ code: 'custom', message: 'Выберите продукт или рецепт', path: ['sourceId'] })
    }
  })

export const createNutritionLogEntryInputSchema = logPayloadSchema
export const updateNutritionLogEntryInputSchema = logPayloadSchema.safeExtend({ id: idSchema })
export const deleteNutritionLogEntryInputSchema = z.object({ id: idSchema })
export const nutritionOverviewInputSchema = z.object({ date: dateSchema })

export const setNutritionWaterInputSchema = z.object({
  date: dateSchema,
  waterMl: z.number().int().min(0).max(100_000)
})

export const setNutritionTargetsInputSchema = z.object({
  effectiveFrom: dateSchema,
  calories: targetSchema(100_000),
  proteinG: targetSchema(10_000),
  fatG: targetSchema(10_000),
  carbsG: targetSchema(10_000),
  fiberG: targetSchema(10_000),
  waterMl: z.number().int().positive().max(100_000).nullable()
})

export const nutritionReportInputSchema = z
  .object({
    dateFrom: dateSchema,
    dateTo: dateSchema,
    mealType: z.enum(NUTRITION_MEAL_TYPES).nullable(),
    sourceType: z.enum(NUTRITION_LOG_SOURCE_TYPES).nullable(),
    foodId: idSchema.nullable(),
    recipeId: idSchema.nullable()
  })
  .refine((input) => input.dateFrom <= input.dateTo, {
    message: 'Начальная дата не может быть позже конечной',
    path: ['dateTo']
  })
