import { z } from 'zod'

import {
  NUTRITION_FOOD_CATEGORIES,
  NUTRITION_LOG_SOURCE_TYPES,
  NUTRITION_MEAL_TYPES,
  NUTRITION_UNITS
} from '../contracts/nutrition'

const idSchema = z.string().uuid('Некорректный идентификатор')
const datePattern = /^\d{4}-\d{2}-\d{2}$/

function isCalendarDate(value: string): boolean {
  if (!datePattern.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

const dateSchema = z
  .string()
  .regex(datePattern, 'Дата должна быть в формате ГГГГ-ММ-ДД')
  .refine(isCalendarDate, 'Укажите существующую календарную дату')
const nonNegativeNumber = z.number().finite().min(0, 'Значение не может быть отрицательным')
const targetSchema = (maximum: number): z.ZodNullable<z.ZodNumber> =>
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
  notes: z.string().max(10_000)
})

export const createNutritionFoodInputSchema = foodPayloadSchema
export const createNutritionFoodsInputSchema = z.object({
  foods: z
    .array(createNutritionFoodInputSchema)
    .min(1, 'Добавьте хотя бы один продукт')
    .max(300, 'За один раз можно добавить до 300 продуктов')
})
export const updateNutritionFoodInputSchema = foodPayloadSchema.extend({ id: idSchema })
export const deleteNutritionFoodInputSchema = z.object({ id: idSchema })

const recipeIngredientSchema = z.object({
  foodId: idSchema,
  amount: z
    .number()
    .finite()
    .positive('Количество ингредиента должно быть больше нуля')
    .max(100_000)
})

const recipePayloadSchema = z
  .object({
    name: z.string().trim().min(1, 'Введите название рецепта').max(180),
    description: z.string().max(10_000),
    servings: z.number().finite().positive('Количество порций должно быть больше нуля').max(1000),
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
      context.addIssue({
        code: 'custom',
        message: 'Укажите название приёма пищи',
        path: ['customMealName']
      })
    }

    if (input.sourceType === 'custom') {
      if (!input.customTitle) {
        context.addIssue({ code: 'custom', message: 'Введите название', path: ['customTitle'] })
      }
      if (!input.customNutrients) {
        context.addIssue({
          code: 'custom',
          message: 'Укажите пищевую ценность',
          path: ['customNutrients']
        })
      }
      if (input.sourceId !== null) {
        context.addIssue({
          code: 'custom',
          message: 'Своя запись не должна ссылаться на каталог',
          path: ['sourceId']
        })
      }
    } else if (input.sourceId === null) {
      context.addIssue({
        code: 'custom',
        message: 'Выберите продукт или рецепт',
        path: ['sourceId']
      })
    }
  })

export const createNutritionLogEntryInputSchema = logPayloadSchema
export const updateNutritionLogEntryInputSchema = logPayloadSchema.safeExtend({ id: idSchema })
export const deleteNutritionLogEntryInputSchema = z.object({ id: idSchema })

const nutritionImportItemSchema = z.object({
  name: z.string().trim().min(1, 'Укажите название позиции').max(180),
  amount: z.number().finite().positive('Количество должно быть больше нуля').max(100_000),
  unit: z.enum(NUTRITION_UNITS),
  nutrients: nutritionValuesSchema,
  notes: z.string().max(4000)
})

const nutritionImportMealSchema = z.object({
  mealType: z.enum(NUTRITION_MEAL_TYPES),
  customMealName: z.string().trim().max(80),
  items: z
    .array(nutritionImportItemSchema)
    .min(1, 'В приёме пищи должна быть хотя бы одна позиция')
    .max(100, 'В одном приёме пищи может быть не более 100 позиций')
})

export const importNutritionMealsInputSchema = z
  .object({
    schemaVersion: z.literal(1),
    date: dateSchema,
    meals: z
      .array(nutritionImportMealSchema)
      .min(1, 'Добавьте хотя бы один приём пищи')
      .max(20, 'За один раз можно импортировать не более 20 приёмов пищи')
  })
  .superRefine((input, context) => {
    const totalItems = input.meals.reduce((sum, meal) => sum + meal.items.length, 0)
    if (totalItems > 300) {
      context.addIssue({
        code: 'custom',
        message: 'За один раз можно импортировать не более 300 позиций',
        path: ['meals']
      })
    }

    input.meals.forEach((meal, index) => {
      if (meal.mealType === 'other' && !meal.customMealName) {
        context.addIssue({
          code: 'custom',
          message: 'Для другого приёма пищи укажите customMealName',
          path: ['meals', index, 'customMealName']
        })
      }
    })
  })

export const nutritionOverviewInputSchema = z.object({ date: dateSchema })

export const setNutritionWaterInputSchema = z.object({
  date: dateSchema,
  waterMl: z.number().int().min(0).max(100_000)
})

export const setNutritionTargetsInputSchema = z.object({
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
  .superRefine((input, context) => {
    if (input.dateFrom > input.dateTo) {
      context.addIssue({
        code: 'custom',
        message: 'Начальная дата не может быть позже конечной',
        path: ['dateTo']
      })
    }
    if (input.foodId && input.recipeId) {
      context.addIssue({
        code: 'custom',
        message: 'Одновременно можно выбрать только продукт или рецепт',
        path: ['recipeId']
      })
    }
    if (input.foodId && input.sourceType !== null && input.sourceType !== 'food') {
      context.addIssue({
        code: 'custom',
        message: 'Фильтр продукта совместим только с источником «Продукт»',
        path: ['foodId']
      })
    }
    if (input.recipeId && input.sourceType !== null && input.sourceType !== 'recipe') {
      context.addIssue({
        code: 'custom',
        message: 'Фильтр рецепта совместим только с источником «Рецепт»',
        path: ['recipeId']
      })
    }
  })
