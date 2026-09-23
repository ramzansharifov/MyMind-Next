import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'
import { Animated, Easing, Pressable, Text, View } from 'react-native'

import { useTheme } from './theme'

export interface SwipeTabBarItem<T extends string = string> {
  id: T
  label: string
  disabled?: boolean
}

export interface SwipeTabFeedback<T extends string> {
  value: T
  sequence: number
}

export function useSwipeTabFeedback<T extends string>(): [
  SwipeTabFeedback<T> | null,
  (value: T) => void
] {
  const sequenceRef = useRef(0)
  const [feedback, setFeedback] = useState<SwipeTabFeedback<T> | null>(null)

  const show = useCallback((value: T): void => {
    sequenceRef.current += 1
    setFeedback({ value, sequence: sequenceRef.current })
  }, [])

  return [feedback, show]
}

export function SwipeTabBar<T extends string, I extends SwipeTabBarItem<T>>({
  items,
  value,
  onChange,
  feedback,
  renderIcon,
  trailing
}: {
  items: readonly I[]
  value: T
  onChange(value: T): void
  feedback?: SwipeTabFeedback<T> | null
  renderIcon(item: I, selected: boolean): ReactNode
  trailing?: ReactNode
}): React.JSX.Element {
  const theme = useTheme()
  const [shown, setShown] = useState<SwipeTabFeedback<T> | null>(null)
  const [reveal] = useState(() => new Animated.Value(0))
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!feedback) return

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    reveal.stopAnimation()
    reveal.setValue(0)
    setShown(feedback)

    Animated.timing(reveal, {
      toValue: 1,
      duration: 170,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start()

    timeoutRef.current = setTimeout(() => {
      Animated.timing(reveal, {
        toValue: 0,
        duration: 190,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true
      }).start(({ finished }) => {
        if (finished) setShown(null)
      })
      timeoutRef.current = null
    }, 900)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [feedback, reveal])

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      reveal.stopAnimation()
    },
    [reveal]
  )

  const shownItem = useMemo(
    () => (shown ? (items.find((item) => item.id === shown.value) ?? null) : null),
    [items, shown]
  )

  const normalOpacity = reveal.interpolate({
    inputRange: [0, 0.72, 1],
    outputRange: [1, 0, 0],
    extrapolate: 'clamp'
  })
  const feedbackOpacity = reveal.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.82, 1],
    extrapolate: 'clamp'
  })
  const iconTranslateX = reveal.interpolate({
    inputRange: [0, 1],
    outputRange: [28, 0],
    extrapolate: 'clamp'
  })
  const labelTranslateX = reveal.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 0],
    extrapolate: 'clamp'
  })

  return (
    <View
      accessibilityRole="tablist"
      style={{
        position: 'relative',
        minHeight: 50,
        overflow: 'hidden',
        padding: 4,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        backgroundColor: theme.surface
      }}
    >
      <Animated.View
        pointerEvents={shownItem ? 'none' : 'auto'}
        style={{
          minHeight: 40,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          opacity: normalOpacity
        }}
      >
        {items.map((item) => {
          const selected = item.id === value
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected, disabled: item.disabled }}
              disabled={item.disabled}
              onPress={() => onChange(item.id)}
              style={({ pressed }) => ({
                flex: 1,
                minWidth: 0,
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                backgroundColor: selected
                  ? theme.accent + '18'
                  : pressed
                    ? theme.raised
                    : 'transparent',
                opacity: item.disabled ? 0.38 : pressed ? 0.72 : 1
              })}
            >
              {renderIcon(item, selected)}
            </Pressable>
          )
        })}
        {trailing}
      </Animated.View>

      {shownItem ? (
        <Animated.View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            bottom: 4,
            left: 4,
            minHeight: 40,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 11,
            opacity: feedbackOpacity
          }}
        >
          <Animated.View
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              backgroundColor: theme.accent + '18',
              transform: [{ translateX: iconTranslateX }]
            }}
          >
            {renderIcon(shownItem, true)}
          </Animated.View>
          <Animated.View
            style={{
              flex: 1,
              minWidth: 0,
              transform: [{ translateX: labelTranslateX }]
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                color: theme.text,
                fontSize: 13.5,
                lineHeight: 19,
                fontWeight: '700'
              }}
            >
              {shownItem.label}
            </Text>
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  )
}
