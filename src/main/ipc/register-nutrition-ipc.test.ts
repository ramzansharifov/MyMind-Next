import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NUTRITION_IPC_CHANNELS } from '../../shared/contracts/nutrition'

const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  removeHandler: vi.fn(),
  run: vi.fn((operation: () => unknown) => Promise.resolve().then(operation))
}))

vi.mock('electron', () => ({
  ipcMain: { handle: mocks.handle, removeHandler: mocks.removeHandler }
}))
vi.mock('../services/main-operation-tracker', () => ({
  mainOperationTracker: { run: mocks.run }
}))
vi.mock('../repositories/nutrition.repository', () => ({
  listNutritionOverview: vi.fn(),
  createNutritionFood: vi.fn(),
  createNutritionFoods: vi.fn(),
  updateNutritionFood: vi.fn(),
  deleteNutritionFood: vi.fn(),
  createNutritionRecipe: vi.fn(),
  updateNutritionRecipe: vi.fn(),
  deleteNutritionRecipe: vi.fn(),
  createNutritionLogEntry: vi.fn(),
  importNutritionMeals: vi.fn(),
  updateNutritionLogEntry: vi.fn(),
  deleteNutritionLogEntry: vi.fn(),
  setNutritionWater: vi.fn(),
  setNutritionTargets: vi.fn(),
  getNutritionReport: vi.fn()
}))

import { registerNutritionIpcHandlers } from './register-nutrition-ipc'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('registerNutritionIpcHandlers', () => {
  it('registers every nutrition channel', () => {
    registerNutritionIpcHandlers()

    expect(mocks.removeHandler.mock.calls.map(([channel]) => channel)).toEqual(
      Object.values(NUTRITION_IPC_CHANNELS)
    )
    expect(mocks.handle.mock.calls.map(([channel]) => channel)).toEqual(
      Object.values(NUTRITION_IPC_CHANNELS)
    )
  })

  it('validates a log entry before it reaches the repository', async () => {
    registerNutritionIpcHandlers()
    const handler = mocks.handle.mock.calls.find(
      ([channel]) => channel === NUTRITION_IPC_CHANNELS.createLogEntry
    )?.[1]

    await expect(
      handler(
        {},
        {
          date: '2026-08-17',
          mealType: 'lunch',
          customMealName: '',
          sourceType: 'custom',
          sourceId: null,
          amount: 0,
          customTitle: '',
          customUnit: 'serving',
          customNutrients: null,
          notes: ''
        }
      )
    ).rejects.toThrow()
  })

  it('validates imported meals before they reach the repository', async () => {
    registerNutritionIpcHandlers()
    const handler = mocks.handle.mock.calls.find(
      ([channel]) => channel === NUTRITION_IPC_CHANNELS.importMeals
    )?.[1]

    await expect(
      handler(
        {},
        {
          schemaVersion: 1,
          date: '2026-08-17',
          meals: [{ mealType: 'lunch', customMealName: '', items: [] }]
        }
      )
    ).rejects.toThrow()
  })

  it('rejects an invalid report range before calculating a report', async () => {
    registerNutritionIpcHandlers()
    const handler = mocks.handle.mock.calls.find(
      ([channel]) => channel === NUTRITION_IPC_CHANNELS.getReport
    )?.[1]

    await expect(
      handler(
        {},
        {
          dateFrom: '2026-08-18',
          dateTo: '2026-08-17',
          mealType: null,
          sourceType: null,
          foodId: null,
          recipeId: null
        }
      )
    ).rejects.toThrow()
  })
})
