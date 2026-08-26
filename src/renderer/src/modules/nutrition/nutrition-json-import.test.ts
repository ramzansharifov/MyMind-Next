import { describe, expect, it } from 'vitest'

import { parseNutritionMealsJson } from './nutrition-json-import'

describe('parseNutritionMealsJson', () => {
  it('normalizes optional values in canonical JSON', () => {
    const result = parseNutritionMealsJson(`{
      "schemaVersion": 1,
      "date": "2026-08-26",
      "meals": [
        {
          "mealType": "lunch",
          "items": [
            {
              "name": "Плов",
              "amount": 250,
              "unit": "g",
              "calories": 575,
              "proteinG": 17,
              "fatG": 24,
              "carbsG": 73
            }
          ]
        }
      ]
    }`)

    expect(result).toEqual({
      schemaVersion: 1,
      date: '2026-08-26',
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

  it('accepts a fenced json block', () => {
    const result = parseNutritionMealsJson(`\`\`\`json
{
  "schemaVersion": 1,
  "date": "2026-08-26",
  "meals": [{
    "mealType": "breakfast",
    "items": [{
      "name": "Яйца",
      "amount": 3,
      "unit": "piece",
      "calories": 234,
      "proteinG": 18.9,
      "fatG": 15.9,
      "carbsG": 1.8
    }]
  }]
}
\`\`\``)

    expect(result.meals[0]?.items[0]?.name).toBe('Яйца')
  })

  it('rejects unsupported schema versions', () => {
    expect(() =>
      parseNutritionMealsJson(
        JSON.stringify({ schemaVersion: 2, date: '2026-08-26', meals: [] })
      )
    ).toThrow()
  })

  it('requires a custom name for other meals', () => {
    expect(() =>
      parseNutritionMealsJson(
        JSON.stringify({
          schemaVersion: 1,
          date: '2026-08-26',
          meals: [
            {
              mealType: 'other',
              items: [
                {
                  name: 'Протеиновый шейк',
                  amount: 1,
                  unit: 'serving',
                  calories: 250,
                  proteinG: 30,
                  fatG: 4,
                  carbsG: 20
                }
              ]
            }
          ]
        })
      )
    ).toThrow(/customMealName/)
  })

  it('rejects malformed JSON', () => {
    expect(() => parseNutritionMealsJson('{"schemaVersion": 1,')).toThrow(/Не удалось разобрать JSON/)
  })
})
