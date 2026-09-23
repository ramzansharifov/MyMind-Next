import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Animated, Easing, Pressable, Text, View } from 'react-native'

import { useTheme } from './theme'
import type { SwipeTabFeedback } from './useSwipeTabFeedback'

export interface SwipeTabBarItem<T extends string = string> {
  id: T
  label: string
  disabled?: boolean
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
  const [progress] = useState(() => new Animated.Value(0))

  useEffect(() => {
    if (!feedback) return

    progress.stopAnimation()
    progress.setValue(0)

    Animated.sequence([
      Animated.timing(progress, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.delay(620),
      Animated.timing(progress, {
        toValue: 2,
        duration: 280,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true
      })
    ]).start()

    return () => {
      progress.stopAnimation()
    }
  }, [feedback, progress])

  const shownItem = useMemo(
    () => (feedback ? (items.find((item) => item.id === feedback.value) ?? null) : null),
    [feedback, items]
  )

  const directionSign = feedback?.direction === 'previous' ? 1 : -1
  const normalExit = 52 * directionSign
  const normalEnter = -52 * directionSign
  const feedbackEnter = -56 * directionSign
  const feedbackExit = 56 * directionSign

  const normalOpacity = progress.interpolate({
    inputRange: [0, 0.42, 0.58, 1.42, 1.58, 2],
    outputRange: [1, 0, 0, 0, 0, 1],
    extrapolate: 'clamp'
  })
  const normalTranslateX = progress.interpolate({
    inputRange: [0, 0.48, 0.52, 1.48, 1.52, 2],
    outputRange: [0, normalExit, normalEnter, normalEnter, normalEnter, 0],
    extrapolate: 'clamp'
  })
  const feedbackOpacity = progress.interpolate({
    inputRange: [0, 0.38, 1.5, 2],
    outputRange: [0, 1, 1, 0],
    extrapolate: 'clamp'
  })
  const feedbackTranslateX = progress.interpolate({
    inputRange: [0, 0.5, 1.5, 2],
    outputRange: [feedbackEnter, 0, 0, feedbackExit],
    extrapolate: 'clamp'
  })
  const feedbackScale = progress.interpolate({
    inputRange: [0, 0.5, 1.5, 2],
    outputRange: [0.985, 1, 1, 0.985],
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
          opacity: normalOpacity,
          transform: [{ translateX: normalTranslateX }]
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
            opacity: feedbackOpacity,
            transform: [{ translateX: feedbackTranslateX }, { scale: feedbackScale }]
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              backgroundColor: theme.accent + '18'
            }}
          >
            {renderIcon(shownItem, true)}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
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
          </View>
        </Animated.View>
      ) : null}
    </View>
  )
}
