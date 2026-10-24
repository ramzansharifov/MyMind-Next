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
})
