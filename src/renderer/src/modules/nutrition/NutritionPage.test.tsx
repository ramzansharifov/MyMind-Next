import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  ImportNutritionMealsInput,
  NutritionLogEntryRecord,
  NutritionOverview,
  NutritionTargetRecord
} from '../../../../shared/contracts/nutrition'

const mocks = vi.hoisted(() => ({
  listOverview: vi.fn(),
  importMeals: vi.fn(),
  updateLogEntry: vi.fn(),
  deleteLogEntry: vi.fn(),
  setWater: vi.fn(),
  setTargets: vi.fn(),
  getReport: vi.fn()
}))

vi.mock('./api/nutrition-client', () => ({ nutritionClient: mocks }))

import { NutritionPage } from './NutritionPage'

function todayKey(): string {
  const date = new Date()
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

const target: NutritionTargetRecord = {
  id: 'target-1',
  effectiveFrom: '2026-08-01',
  effectiveTo: null,
  calories: 2200,
  proteinG: 150,
  fatG: 70,
  carbsG: 250,
  fiberG: 30,
  waterMl: 2500,
  createdAt: 1
}

const chickenEntry: NutritionLogEntryRecord = {
  id: 'entry-1',
  date: todayKey(),
  mealType: 'lunch',
  customMealName: '',
  sourceType: 'custom',
  sourceId: null,
  title: 'Куриная грудка',
  amount: 200,
  unit: 'g',
  nutrients: {
    calories: 330,
    proteinG: 62,
    fatG: 7.2,
    carbsG: 0,
    fiberG: 0,
    sugarG: 0,
    sodiumMg: 148
  },
  notes: '',
  createdAt: 1,
  updatedAt: 1
}

function overview(entries: NutritionLogEntryRecord[] = []): NutritionOverview {
  const date = todayKey()
  return {
    date,
    foods: [],
    recipes: [],
    entries,
    day: {
      date,
      nutrients: entries.reduce(
        (sum, entry) => ({
          calories: sum.calories + entry.nutrients.calories,
          proteinG: sum.proteinG + entry.nutrients.proteinG,
          fatG: sum.fatG + entry.nutrients.fatG,
          carbsG: sum.carbsG + entry.nutrients.carbsG,
          fiberG: sum.fiberG + entry.nutrients.fiberG,
          sugarG: sum.sugarG + entry.nutrients.sugarG,
          sodiumMg: sum.sodiumMg + entry.nutrients.sodiumMg
        }),
        { calories: 0, proteinG: 0, fatG: 0, carbsG: 0, fiberG: 0, sugarG: 0, sodiumMg: 0 }
      ),
      waterMl: 500,
      target
    },
    currentTarget: target
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.listOverview.mockResolvedValue(overview())
  mocks.importMeals.mockImplementation(async (input: ImportNutritionMealsInput) => ({
    date: input.date,
    mealCount: input.meals.length,
    itemCount: input.meals.reduce((sum, meal) => sum + meal.items.length, 0),
    created: []
  }))
  mocks.setWater.mockImplementation(async ({ date, waterMl }) => ({
    ...overview().day,
    date,
    waterMl
  }))
  mocks.updateLogEntry.mockResolvedValue(chickenEntry)
})

describe('NutritionPage JSON-only flow', () => {
  it('exposes only diary and progress workspaces', async () => {
    render(<NutritionPage />)

    expect(await screen.findByRole('heading', { name: 'Питание' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Дневник' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Прогресс' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Библиотека' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Продукты' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Рецепты' })).not.toBeInTheDocument()
  })

  it('previews JSON before importing the whole meal transaction', async () => {
    const user = userEvent.setup()
    render(<NutritionPage />)

    await screen.findByRole('heading', { name: 'Питание' })
    await user.click(screen.getByRole('button', { name: 'Добавить из JSON' }))

    const dialog = screen.getByRole('dialog')
    const json = JSON.stringify({
      schemaVersion: 1,
      date: todayKey(),
      meals: [
        {
          mealType: 'lunch',
          items: [
            {
              name: 'Плов',
              amount: 250,
              unit: 'g',
              calories: 575,
              proteinG: 17,
              fatG: 24,
              carbsG: 73
            }
          ]
        }
      ]
    })

    fireEvent.change(within(dialog).getByRole('textbox', { name: 'JSON питания' }), {
      target: { value: json }
    })
    expect(mocks.importMeals).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Проверить' }))
    expect(within(dialog).getByText('Плов')).toBeInTheDocument()
    expect(within(dialog).getAllByText(/575 ккал/).length).toBeGreaterThan(0)
    expect(mocks.importMeals).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Добавить (1)' }))

    await waitFor(() => {
      expect(mocks.importMeals).toHaveBeenCalledWith({
        schemaVersion: 1,
        date: todayKey(),
        meals: [
          {
            mealType: 'lunch',
            customMealName: '',
            items: [
              {
                name: 'Плов',
                amount: 250,
                unit: 'g',
                nutrients: {
                  calories: 575,
                  proteinG: 17,
                  fatG: 24,
                  carbsG: 73,
                  fiberG: 0,
                  sugarG: 0,
                  sodiumMg: 0
                },
                notes: ''
              }
            ]
          }
        ]
      })
    })
  })

  it('keeps water as a direct mechanical action', async () => {
    const user = userEvent.setup()
    render(<NutritionPage />)

    await screen.findByRole('heading', { name: 'Питание' })
    await user.click(screen.getByRole('button', { name: '+250 мл' }))

    await waitFor(() => {
      expect(mocks.setWater).toHaveBeenCalledWith({ date: todayKey(), waterMl: 750 })
    })
    expect(screen.getByText('750 мл / 2500 мл')).toBeInTheDocument()
  })

  it('allows correcting an imported snapshot manually but has no manual create flow', async () => {
    const user = userEvent.setup()
    mocks.listOverview.mockResolvedValue(overview([chickenEntry]))
    render(<NutritionPage />)

    await screen.findByText('Куриная грудка')
    expect(screen.queryByRole('button', { name: /Добавить в/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Изменить «Куриная грудка»' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Изменить запись' })).toBeInTheDocument()
    expect(within(dialog).getByDisplayValue('Куриная грудка')).toBeInTheDocument()
  })
})
