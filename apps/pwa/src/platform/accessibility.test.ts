import { describe, expect, it } from 'vitest'
import { BackHandler, dispatchHardwareBack, browserAccessibilityProps } from './react-native'

describe('native accessibility semantics in the browser', () => {
  it('routes browser Back to the most recent native screen and removes closed handlers', () => {
    const calls: string[] = []
    const screen = BackHandler.addEventListener('hardwareBackPress', () => {
      calls.push('screen')
      return true
    })
    const nested = BackHandler.addEventListener('hardwareBackPress', () => {
      calls.push('nested')
      return true
    })
    expect(dispatchHardwareBack()).toBe(true)
    nested.remove()
    expect(dispatchHardwareBack()).toBe(true)
    screen.remove()
    expect(dispatchHardwareBack()).toBe(false)
    expect(calls).toEqual(['nested', 'screen'])
  })
  it('maps checked and unchecked, selected and disabled states without forwarding unsupported grouped props', () => {
    expect(
      browserAccessibilityProps({
        accessibilityState: { checked: true, selected: true, disabled: false },
        title: 'Label'
      })
    ).toEqual({
      'aria-checked': true,
      'aria-selected': true,
      'aria-disabled': false,
      title: 'Label'
    })
    expect(
      browserAccessibilityProps({
        accessibilityState: { checked: false, expanded: false, busy: true }
      })
    ).toEqual({ 'aria-checked': false, 'aria-expanded': false, 'aria-busy': true })
  })
  it('maps slider values and preserves explicit ARIA overrides', () => {
    expect(
      browserAccessibilityProps({
        accessibilityValue: { min: 0, max: 100, now: 45, text: '45 процентов' },
        accessibilityState: { checked: true },
        'aria-checked': false
      })
    ).toEqual({
      'aria-valuemin': 0,
      'aria-valuemax': 100,
      'aria-valuenow': 45,
      'aria-valuetext': '45 процентов',
      'aria-checked': false
    })
  })
})
