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
  mocks.createLogEntry.mockResolvedValue(undefined)
  mocks.setWater.mockImplementation(async ({ date, waterMl }) => ({
    ...overview().day,
    date,
    waterMl
  }))
})

describe('NutritionPage', () => {
  it('keeps only the three simple top-level workspaces', async () => {
    render(<NutritionPage />)

    expect(await screen.findByRole('heading', { name: 'Питание' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Дневник' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Библиотека' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Прогресс' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Продукты' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Рецепты' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Цели' })).not.toBeInTheDocument()
  })

  it('shows products in one library and keeps JSON import in the overflow menu', async () => {
    const user = userEvent.setup()
    render(<NutritionPage />)

    await screen.findByRole('heading', { name: 'Питание' })
    await user.click(screen.getByRole('button', { name: 'Библиотека' }))

    expect(screen.getByText('Куриная грудка')).toBeInTheDocument()
    expect(screen.getByText(/165 ккал/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ещё действия библиотеки' }))
    await user.click(await screen.findByText('Импорт из JSON'))

    const dialog = screen.getByRole('dialog')
    const textarea = within(dialog).getByRole('textbox', { name: 'JSON продуктов' })
    await user.click(textarea)
    await user.paste(
      '[{"name":"Картофель","category":"vegetables","calories":77,"proteinG":2,"fatG":0.1,"carbsG":17.5}]'
    )
    await user.click(within(dialog).getByRole('button', { name: 'Добавить' }))

    await waitFor(() => {
      expect(mocks.createFoods).toHaveBeenCalledTimes(1)
    })
    expect(screen.getByRole('status')).toHaveTextContent('Добавлено продуктов: 1')
  })

  it('adds food through one unified search without asking for the source type', async () => {
    const user = userEvent.setup()
    render(<NutritionPage />)

    await screen.findByRole('heading', { name: 'Питание' })
    await user.click(screen.getByRole('button', { name: 'Добавить еду' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('textbox', { name: 'Поиск продукта или рецепта' })).toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Тип записи')).not.toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: /Куриная грудка/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Добавить' }))

    await waitFor(() => {
      expect(mocks.createLogEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          date: todayKey(),
          sourceType: 'food',
          sourceId: chicken.id,
          amount: 100
        })
      )
    })
  })

  it('keeps goals available from the compact day summary', async () => {
    const user = userEvent.setup()
    render(<NutritionPage />)

    await screen.findByRole('heading', { name: 'Питание' })
    await user.click(screen.getByRole('button', { name: 'Настроить цели' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('updates water for the currently selected day', async () => {
    const user = userEvent.setup()
    render(<NutritionPage />)

    await screen.findByRole('heading', { name: 'Питание' })
    await user.click(screen.getByRole('button', { name: '+250 мл' }))

    await waitFor(() => {
      expect(mocks.setWater).toHaveBeenCalledWith({ date: todayKey(), waterMl: 750 })
    })
    expect(screen.getByText('750 мл / 2500 мл')).toBeInTheDocument()
  })
})
