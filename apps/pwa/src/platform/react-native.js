import { createElement, forwardRef } from 'react'
import * as web from 'react-native-web'
export * from 'react-native-web'

/** RN's grouped accessibility props are not supported by React Native Web 0.21. */
export function browserAccessibilityProps(props) {
  const { accessibilityState, accessibilityValue, ...result } = props
  for (const key of ['busy', 'checked', 'disabled', 'expanded', 'selected']) {
    if (accessibilityState?.[key] !== undefined && result[`aria-${key}`] === undefined)
      result[`aria-${key}`] = accessibilityState[key]
  }
  for (const [nativeKey, webKey] of [
    ['min', 'valuemin'],
    ['max', 'valuemax'],
    ['now', 'valuenow'],
    ['text', 'valuetext']
  ]) {
    if (accessibilityValue?.[nativeKey] !== undefined && result[`aria-${webKey}`] === undefined)
      result[`aria-${webKey}`] = accessibilityValue[nativeKey]
  }
  return result
}
function accessible(Component) {
  return forwardRef(function PwaNativeElement(props, ref) {
    return createElement(Component, { ...browserAccessibilityProps(props), ref })
  })
}
export const View = accessible(web.View)
export const Text = accessible(web.Text)
export const Pressable = accessible(web.Pressable)
export const TextInput = accessible(web.TextInput)
export const ScrollView = accessible(web.ScrollView)
export const TouchableOpacity = accessible(web.TouchableOpacity)
export const TouchableWithoutFeedback = accessible(web.TouchableWithoutFeedback)
