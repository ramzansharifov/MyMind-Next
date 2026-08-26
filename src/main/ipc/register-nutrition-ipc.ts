import { ipcMain } from 'electron'

import { NUTRITION_IPC_CHANNELS } from '../../shared/contracts/nutrition'
import {
  createNutritionFoodInputSchema,
  createNutritionFoodsInputSchema,
  createNutritionLogEntryInputSchema,
  createNutritionRecipeInputSchema,
  deleteNutritionFoodInputSchema,
  deleteNutritionLogEntryInputSchema,
  deleteNutritionRecipeInputSchema,
  importNutritionMealsInputSchema,
  nutritionOverviewInputSchema,
  nutritionReportInputSchema,
  setNutritionTargetsInputSchema,
  setNutritionWaterInputSchema,
  updateNutritionFoodInputSchema,
  updateNutritionLogEntryInputSchema,
  updateNutritionRecipeInputSchema
} from '../../shared/validation/nutrition'
import {
  createNutritionFood,
  createNutritionFoods,
  createNutritionLogEntry,
  createNutritionRecipe,
  deleteNutritionFood,
  deleteNutritionLogEntry,
  deleteNutritionRecipe,
  getNutritionReport,
  importNutritionMeals,
  listNutritionOverview,
  setNutritionTargets,
  setNutritionWater,
  updateNutritionFood,
  updateNutritionLogEntry,
  updateNutritionRecipe
} from '../repositories/nutrition.repository'
import { mainOperationTracker } from '../services/main-operation-tracker'

export function registerNutritionIpcHandlers(): void {
  Object.values(NUTRITION_IPC_CHANNELS).forEach((channel) => ipcMain.removeHandler(channel))

  ipcMain.handle(NUTRITION_IPC_CHANNELS.listOverview, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => {
      const input = nutritionOverviewInputSchema.parse(rawInput)
      return listNutritionOverview(input.date)
    })
  )
  ipcMain.handle(NUTRITION_IPC_CHANNELS.createFood, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      createNutritionFood(createNutritionFoodInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(NUTRITION_IPC_CHANNELS.createFoods, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      createNutritionFoods(createNutritionFoodsInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(NUTRITION_IPC_CHANNELS.updateFood, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      updateNutritionFood(updateNutritionFoodInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(NUTRITION_IPC_CHANNELS.deleteFood, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      deleteNutritionFood(deleteNutritionFoodInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(NUTRITION_IPC_CHANNELS.createRecipe, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      createNutritionRecipe(createNutritionRecipeInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(NUTRITION_IPC_CHANNELS.updateRecipe, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      updateNutritionRecipe(updateNutritionRecipeInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(NUTRITION_IPC_CHANNELS.deleteRecipe, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      deleteNutritionRecipe(deleteNutritionRecipeInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(NUTRITION_IPC_CHANNELS.createLogEntry, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      createNutritionLogEntry(createNutritionLogEntryInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(NUTRITION_IPC_CHANNELS.importMeals, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      importNutritionMeals(importNutritionMealsInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(NUTRITION_IPC_CHANNELS.updateLogEntry, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      updateNutritionLogEntry(updateNutritionLogEntryInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(NUTRITION_IPC_CHANNELS.deleteLogEntry, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      deleteNutritionLogEntry(deleteNutritionLogEntryInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(NUTRITION_IPC_CHANNELS.setWater, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => setNutritionWater(setNutritionWaterInputSchema.parse(rawInput)))
  )
  ipcMain.handle(NUTRITION_IPC_CHANNELS.setTargets, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      setNutritionTargets(setNutritionTargetsInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(NUTRITION_IPC_CHANNELS.getReport, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => getNutritionReport(nutritionReportInputSchema.parse(rawInput)))
  )
}
