import { describe, expect, it } from 'vitest'

import { adjacentFinanceTab } from './finance-tab-navigation'

describe('finance tab swipe navigation', () => {
  it('moves left swipes to the next tab', () => {
    expect(adjacentFinanceTab('home', 'next')).toBe('transactions')
    expect(adjacentFinanceTab('accounts', 'next')).toBe('tags')
  })

  it('moves right swipes to the previous tab', () => {
    expect(adjacentFinanceTab('reports', 'previous')).toBe('tags')
    expect(adjacentFinanceTab('transactions', 'previous')).toBe('home')
  })

  it('stays on the first and last tabs at the edges', () => {
    expect(adjacentFinanceTab('home', 'previous')).toBe('home')
    expect(adjacentFinanceTab('reports', 'next')).toBe('reports')
  })
})
