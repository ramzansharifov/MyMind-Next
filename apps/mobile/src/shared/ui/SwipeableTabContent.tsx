import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  Animated,
  Easing,
  PanResponder,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type PanResponderGestureState
} from 'react-native'

import { adjacentTab, tabSwipeDirection, type TabSwipeDirection } from './tab-swipe'

export function SwipeableTabContent<T extends string>({
  tabs,
  value,
  onChange,
  onSwipeChange,
  disabled = false,
  children
}: {
  tabs: readonly T[]
  value: T
  onChange(value: T): void
  onSwipeChange?(value: T): void
  disabled?: boolean
  children: ReactNode
}): React.JSX.Element {
  const { width: screenWidth } = useWindowDimensions()
  const [translateX] = useState(() => new Animated.Value(0))
  const [animating, setAnimating] = useState(false)
  const pageWidth = Math.max(screenWidth - 28, 280)

  const resetPosition = useCallback((): void => {
    Animated.spring(translateX, {
      toValue: 0,
      damping: 24,
      stiffness: 260,
      mass: 0.72,
      overshootClamping: true,
      useNativeDriver: true
    }).start()
  }, [translateX])

  const completeSwipe = useCallback(
    (nextValue: T, direction: TabSwipeDirection): void => {
      if (nextValue === value || animating || disabled) {
        resetPosition()
        return
      }

      setAnimating(true)
      const exitX = direction === 'next' ? -pageWidth : pageWidth
      const enterX = direction === 'next' ? pageWidth : -pageWidth

      Animated.timing(translateX, {
        toValue: exitX,
        duration: 135,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }).start(({ finished }) => {
        if (!finished) {
          setAnimating(false)
          resetPosition()
          return
        }

        onChange(nextValue)
        onSwipeChange?.(nextValue)
        translateX.setValue(enterX)

        requestAnimationFrame(() => {
          Animated.timing(translateX, {
            toValue: 0,
            duration: 190,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
          }).start(() => {
            setAnimating(false)
          })
        })
      })
    },
    [animating, disabled, onChange, onSwipeChange, pageWidth, resetPosition, translateX, value]
  )

  const responder = useMemo(() => {
    const shouldClaimHorizontalSwipe = (
      _event: GestureResponderEvent,
      gesture: PanResponderGestureState
    ): boolean => {
      if (disabled || animating || gesture.numberActiveTouches !== 1) return false
      const horizontal = Math.abs(gesture.dx)
      const vertical = Math.abs(gesture.dy)
      return horizontal >= 10 && horizontal > vertical * 1.35
    }

    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: shouldClaimHorizontalSwipe,
      onMoveShouldSetPanResponderCapture: shouldClaimHorizontalSwipe,
      onPanResponderGrant: () => {
        translateX.stopAnimation()
      },
      onPanResponderMove: (_event, gesture) => {
        if (disabled || animating) return

        const direction: TabSwipeDirection = gesture.dx < 0 ? 'next' : 'previous'
        const nextValue = adjacentTab(tabs, value, direction)
        const atEdge = nextValue === value
        const raw = atEdge ? gesture.dx * 0.18 : gesture.dx
        translateX.setValue(Math.max(-pageWidth, Math.min(pageWidth, raw)))
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_event, gesture) => {
        if (disabled || animating) return

        const direction = tabSwipeDirection(gesture.dx, gesture.dy, gesture.vx)
        if (!direction) {
          resetPosition()
          return
        }

        const nextValue = adjacentTab(tabs, value, direction)
        if (nextValue === value) {
          resetPosition()
          return
        }

        completeSwipe(nextValue, direction)
      },
      onPanResponderTerminate: () => {
        if (!animating) resetPosition()
      }
    })
  }, [animating, completeSwipe, disabled, pageWidth, resetPosition, tabs, translateX, value])

  const opacity = translateX.interpolate({
    inputRange: [-pageWidth, 0, pageWidth],
    outputRange: [0.9, 1, 0.9],
    extrapolate: 'clamp'
  })

  return (
    <View style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Animated.View
        style={{
          flex: 1,
          minHeight: 0,
          opacity,
          transform: [{ translateX }]
        }}
        {...responder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  )
}
