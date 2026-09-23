import { describe, expect, it } from 'vitest'

import { adjacentFinanceTab, financeSwipeDirection } from './finance-tab-navigation'

describe('finance tab swipe navigation', () => {
  it('moves left swipes to the next tab', () => {
    expect(adjacentFinanceTab('home', 'next')).toBe('templates')
    expect(adjacentFinanceTab('accounts', 'next')).toBe('transactions')
  })

  it('moves right swipes to the previous tab', () => {
    expect(adjacentFinanceTab('reports', 'previous')).toBe('limits')
    expect(adjacentFinanceTab('templates', 'previous')).toBe('home')
  })

  it('stays on the first and last tabs at the edges', () => {
    expect(adjacentFinanceTab('home', 'previous')).toBe('home')
    expect(adjacentFinanceTab('reports', 'next')).toBe('reports')
  })

  it('commits clear horizontal swipes and quick flicks', () => {
    expect(financeSwipeDirection(-90, 12)).toBe('next')
    expect(financeSwipeDirection(90, 12)).toBe('previous')
    expect(financeSwipeDirection(-44, 8, -0.8)).toBe('next')
  })

  it('ignores short or mostly vertical gestures', () => {
    expect(financeSwipeDirection(-28, 4)).toBeNull()
    expect(financeSwipeDirection(42, 38, 0.9)).toBeNull()
    expect(financeSwipeDirection(0, 90, 1)).toBeNull()
  })
})
