import { describe, expect, it } from 'vitest'

import { parseNutritionFoodsJson } from './NutritionFoodJsonImportDialog'

describe('parseNutritionFoodsJson', () => {
  it('accepts an array and fills safe defaults', () => {
    const result = parseNutritionFoodsJson(`[
      {
        "name": "Картофель",
        "category": "vegetables",
        "calories": 77,
        "protein": 2,
        "fat": 0.1,
        "carbs": 17.5
      }
    ]`)

    expect(result.error).toBeNull()
    expect(result.foods).toEqual([
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
        favorite: false,
        status: 'active',
        notes: ''
      }
    ])
  })

  it('accepts fenced JSON and nested nutrient values', () => {
    const result = parseNutritionFoodsJson(`\`\`\`json
    {
      "name": "Гречка",
      "category": "grains",
      "nutrients": {
        "calories": 343,
        "proteinG": 13.3,
        "fatG": 3.4,
        "carbsG": 71.5,
        "fiberG": 10,
        "sugarG": 0,
        "sodiumMg": 1
      }
    }
    \`\`\``)

    expect(result.error).toBeNull()
    expect(result.foods[0]?.nutrients).toMatchObject({ calories: 343, proteinG: 13.3 })
  })

  it('reports the invalid product and field', () => {
    const result = parseNutritionFoodsJson('[{"name":"","category":"vegetables"}]')

    expect(result.foods).toHaveLength(0)
    expect(result.error).toMatch(/Продукт 1 · name/)
  })
})
