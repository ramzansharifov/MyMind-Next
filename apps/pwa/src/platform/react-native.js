import { createElement, forwardRef, useEffect, useRef } from 'react'
import * as web from 'react-native-web'
export * from 'react-native-web'

/** RN's grouped accessibility props are not supported by React Native Web 0.21. */
export function browserAccessibilityProps(props) {
  const { accessibilityState, accessibilityValue, ...result } = props
  // Native responder controls (the hold-to-create button) also need browser keyboard activation.
  if (props.accessibilityRole === 'button' && props.onAccessibilityTap) {
    result.tabIndex ??= accessibilityState?.disabled ? -1 : 0
    result.onKeyDown ??= (event) => {
      if (!accessibilityState?.disabled && !event.repeat && ['Enter', ' '].includes(event.key)) {
        event.preventDefault()
        props.onAccessibilityTap()
      }
    }
    result.onClick ??= (event) => {
      if (!accessibilityState?.disabled && event.detail === 0) props.onAccessibilityTap()
    }
  }
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

export const Modal = forwardRef(function PwaModal(
  // eslint-disable-next-line react/prop-types -- The native Modal contract is forwarded unchanged.
  { visible = true, onRequestClose, ...props },
  ref
) {
  const close = useRef(onRequestClose)
  useEffect(() => {
    close.current = onRequestClose
  }, [onRequestClose])
  useEffect(() => {
    if (!visible) return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close.current?.()
      return true
    })
    return () => subscription.remove()
  }, [visible])
  return createElement(web.Modal, { ...props, visible, onRequestClose, ref })
})

const backHandlers = new Set()
export function dispatchHardwareBack() {
  for (const handler of [...backHandlers].reverse()) {
    if (handler()) return true
  }
  return false
}
export const BackHandler = {
  addEventListener(_event, handler) {
    backHandlers.add(handler)
    return { remove: () => backHandlers.delete(handler) }
  },
  exitApp() {
    return undefined
  }
}
