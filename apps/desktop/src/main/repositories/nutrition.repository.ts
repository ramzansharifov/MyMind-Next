import { randomUUID } from 'node:crypto'
import type { NutritionOverview } from '../../shared/contracts/nutrition'
import { createNutritionRepository } from '@mymind/persistence/nutrition'
import { getSqlite } from '../database/client'

export const nutritionRepository = createNutritionRepository({
  database: getSqlite,
  createId: randomUUID,
  now: Date.now
})

export const listNutritionOverview = (date: string): NutritionOverview =>
  nutritionRepository.listOverview({ date })
export const createNutritionFood = nutritionRepository.createFood
export const createNutritionFoods = nutritionRepository.createFoods
export const updateNutritionFood = nutritionRepository.updateFood
export const deleteNutritionFood = nutritionRepository.deleteFood
export const createNutritionRecipe = nutritionRepository.createRecipe
export const updateNutritionRecipe = nutritionRepository.updateRecipe
export const deleteNutritionRecipe = nutritionRepository.deleteRecipe
export const createNutritionLogEntry = nutritionRepository.createLogEntry
export const updateNutritionLogEntry = nutritionRepository.updateLogEntry
export const deleteNutritionLogEntry = nutritionRepository.deleteLogEntry
export const setNutritionWater = nutritionRepository.setWater
export const setNutritionTargets = nutritionRepository.setTargets
export const getNutritionReport = nutritionRepository.getReport
