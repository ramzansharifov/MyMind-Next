import { describe, expect, it } from 'vitest'

import { adjacentTab, tabSwipeDirection } from './tab-swipe'

describe('adjacentTab', () => {
  const tabs = ['first', 'second', 'third'] as const

  it('moves between neighboring tabs', () => {
    expect(adjacentTab(tabs, 'second', 'previous')).toBe('first')
    expect(adjacentTab(tabs, 'second', 'next')).toBe('third')
  })

  it('stays on the edge tab instead of wrapping', () => {
    expect(adjacentTab(tabs, 'first', 'previous')).toBe('first')
    expect(adjacentTab(tabs, 'third', 'next')).toBe('third')
  })
})

describe('tabSwipeDirection', () => {
  it('recognizes deliberate horizontal swipes', () => {
    expect(tabSwipeDirection(-90, 12)).toBe('next')
    expect(tabSwipeDirection(90, 12)).toBe('previous')
  })

  it('recognizes quick horizontal flicks', () => {
    expect(tabSwipeDirection(-40, 6, -0.7)).toBe('next')
    expect(tabSwipeDirection(40, 6, 0.7)).toBe('previous')
  })

  it('ignores vertical or short gestures', () => {
    expect(tabSwipeDirection(30, 40, 1)).toBeNull()
    expect(tabSwipeDirection(30, 4, 0.2)).toBeNull()
  })
})
