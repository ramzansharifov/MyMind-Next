import { describe, expect, it } from 'vitest'
import { groupColorValue } from './visual-colors'

describe('mobile visual group colors', () => {
  it('keeps legacy violet groups tied to the current app accent like desktop', () => {
    expect(groupColorValue('violet', '#10b981')).toBe('#10b981')
    expect(groupColorValue('accent', '#3b82f6')).toBe('#3b82f6')
    expect(groupColorValue(undefined, '#f43f5e')).toBe('#f43f5e')
  })

  it('keeps explicit non-accent group colors stable', () => {
    expect(groupColorValue('blue', '#10b981')).toBe('#60a5fa')
    expect(groupColorValue('emerald', '#8b5cf6')).toBe('#34d399')
  })
})
