import { describe, expect, it } from 'vitest'
import { subscribeBack, dispatchBack } from './lifecycle'
describe('browser Back stack', () => {
  it('closes the most recent screen and removes closed handlers', () => {
    const calls: string[] = []
    const screen = subscribeBack(() => {
      calls.push('screen')
      return true
    })
    const dialog = subscribeBack(() => {
      calls.push('dialog')
      return true
    })
    expect(dispatchBack()).toBe(true)
    dialog.remove()
    expect(dispatchBack()).toBe(true)
    screen.remove()
    expect(dispatchBack()).toBe(false)
    expect(calls).toEqual(['dialog', 'screen'])
  })
  it('lets an inactive overlay defer to the underlying screen', () => {
    let handled = 0
    const screen = subscribeBack(() => {
      handled++
      return true
    })
    const dialog = subscribeBack(() => false)
    expect(dispatchBack()).toBe(true)
    expect(handled).toBe(1)
    dialog.remove()
    screen.remove()
  })
  it('keeps an open modal ahead of a background screen that resubscribes after saving', () => {
    const calls: string[] = []
    const modal = subscribeBack(() => {
      calls.push('modal')
      return true
    }, 1)
    const screen = subscribeBack(() => {
      calls.push('screen')
      return true
    })
    expect(dispatchBack()).toBe(true)
    expect(calls).toEqual(['modal'])
    modal.remove()
    expect(dispatchBack()).toBe(true)
    expect(calls).toEqual(['modal', 'screen'])
    screen.remove()
  })
})
