import { describe, expect, it } from 'vitest'

import { financeOperationTone, financeTagTone } from './finance-semantic-colors'

describe('finance semantic colors', () => {
  it('uses red for expenses and green for income', () => {
    expect(financeOperationTone('expense', '#00ff00')).toBe('#f87171')
    expect(financeOperationTone('income', '#00ff00')).toBe('#34d399')
  })

  it('keeps transfers and both-type tags on the app accent', () => {
    expect(financeOperationTone('transfer', '#12ab34')).toBe('#12ab34')
    expect(financeTagTone('both', '#12ab34')).toBe('#12ab34')
  })

  it('uses semantic colors for expense and income tags', () => {
    expect(financeTagTone('expense', '#12ab34')).toBe('#f87171')
    expect(financeTagTone('income', '#12ab34')).toBe('#34d399')
  })
})
