import { describe, expect, it } from 'vitest'

import {
  MOBILE_CREATE_ACTION_STEP,
  mobileCreateActionSelection,
  wrapCarouselIndex
} from './mobile-create-action-gesture'

describe('mobile create action carousel', () => {
  it('wraps indexes like a carousel', () => {
    expect(wrapCarouselIndex(3, 3)).toBe(0)
    expect(wrapCarouselIndex(-1, 3)).toBe(2)
  })

  it('moves to the next action when the finger moves up', () => {
    expect(mobileCreateActionSelection(-MOBILE_CREATE_ACTION_STEP, 4)).toEqual({
      index: 1,
      offsetY: 0
    })
  })

  it('moves to the previous action when the finger moves down', () => {
    expect(mobileCreateActionSelection(MOBILE_CREATE_ACTION_STEP, 4)).toEqual({
      index: 3,
      offsetY: 0
    })
  })

  it('keeps a bounded residual offset for smooth dragging', () => {
    expect(mobileCreateActionSelection(-40, 4)).toEqual({
      index: 1,
      offsetY: 24
    })
  })

  it('handles empty action lists', () => {
    expect(mobileCreateActionSelection(100, 0)).toEqual({ index: 0, offsetY: 0 })
  })
})
