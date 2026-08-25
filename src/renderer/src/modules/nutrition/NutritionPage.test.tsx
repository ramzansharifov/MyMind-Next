import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  NutritionFoodRecord,
  NutritionOverview,
  NutritionTargetRecord
} from '../../../../shared/contracts/nutrition'

const mocks = vi.hoisted(() => ({
  listOverview: vi.fn(),
  createFood: vi.fn(),
  createFoods: vi.fn(),
  updateFood: vi.fn(),
  deleteFood: vi.fn(),
  createRecipe: vi.fn(),
  updateRecipe: vi.fn(),
  deleteRecipe: vi.fn(),
  createLogEntry: vi.fn(),
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

const chicken: NutritionFoodRecord = {
  id: 'food-1',
  name: 'Куриная грудка',
  brand: '',
  category: 'protein',
  baseAmount: 100,
  baseUnit: 'g',
  nutrients: {
    calories: 165,
    proteinG: 31,
    fatG: 3.6,
    carbsG: 0,
    fiberG: 0,
    sugarG: 0,
    sodiumMg: 74
  },
  notes: '',
  createdAt: 1,
  updatedAt: 1
}

function overview(): NutritionOverview {
  const date = todayKey()
  return {
    date,
    foods: [chicken],
    recipes: [],
    entries: [],
    day: {
      date,
      nutrients: {
        calories: 0,
        proteinG: 0,
        fatG: 0,
        carbsG: 0,
        fiberG: 0,
        sugarG: 0,
        sodiumMg: 0
      },
      waterMl: 500,
      target
    },
    currentTarget: target
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.listOverview.mockResolvedValue(overview())
  mocks.createFoods.mockResolvedValue({ created: [chicken], skippedNames: [] })
  mocks.setWater.mockImplementation(async ({ date, waterMl }) => ({
    ...overview().day,
    date,
    waterMl
  }))
})

describe('NutritionPage', () => {
  it('shows the diary and exposes the food catalog as a separate workspace', async () => {
    const user = userEvent.setup()
    render(<NutritionPage />)

    expect(await screen.findByRole('heading', { name: 'Питание' })).toBeInTheDocument()
    expect(screen.getByText('500 мл')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Продукты' }))
    expect(screen.getByText('Куриная грудка')).toBeInTheDocument()
    expect(screen.getByText(/165 ккал/)).toBeInTheDocument()
  })

  it('imports a list of foods from JSON', async () => {
    const user = userEvent.setup()
    render(<NutritionPage />)

    await screen.findByRole('heading', { name: 'Питание' })
    await user.click(screen.getByRole('button', { name: 'Продукты' }))
    await user.click(screen.getByRole('button', { name: 'Из JSON' }))

    const dialog = screen.getByRole('dialog')
    const textarea = within(dialog).getByRole('textbox', { name: 'JSON продуктов' })
    await user.click(textarea)
    await user.paste(
      '[{"name":"Картофель","category":"vegetables","calories":77,"proteinG":2,"fatG":0.1,"carbsG":17.5}]'
    )
    await user.click(within(dialog).getByRole('button', { name: 'Добавить' }))

    await waitFor(() => {
      expect(mocks.createFoods).toHaveBeenCalledWith({
        foods: [
          {
            name: 'Картофель',
            brand: '',
            category: 'vegetables',
            baseAmount: 100,
            baseUnit: 'g',
            nutrients: {
              calories: 77,
              proteinG: 2,
              fatG: 0.1,
              carbsG: 17.5,
              fiberG: 0,
              sugarG: 0,
              sodiumMg: 0
            },
            notes: ''
          }
        ]
      })
    })
    expect(screen.getByRole('status')).toHaveTextContent('Добавлено продуктов: 1')
  })

  it('does not expose favorites or archive controls in the food catalog', async () => {
    const user = userEvent.setup()
    render(<NutritionPage />)

    await screen.findByRole('heading', { name: 'Питание' })
    await user.click(screen.getByRole('button', { name: 'Продукты' }))

    expect(screen.queryByRole('button', { name: 'Избранное' })).not.toBeInTheDocument()
    expect(screen.queryByText('Архив')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Статус каталога')).not.toBeInTheDocument()
  })

  it('updates water for the currently selected day', async () => {
    const user = userEvent.setup()
    render(<NutritionPage />)

    await screen.findByRole('heading', { name: 'Питание' })
    await user.click(screen.getByRole('button', { name: '+250 мл' }))

    await waitFor(() => {
      expect(mocks.setWater).toHaveBeenCalledWith({ date: todayKey(), waterMl: 750 })
    })
    expect(screen.getByText('750 мл')).toBeInTheDocument()
  })
})
