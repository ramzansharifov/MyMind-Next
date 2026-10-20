import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent
} from 'react-native'
import { BlurTargetView, BlurView } from 'expo-blur'

import { AppIcon } from './icons'
import {
  MOBILE_CREATE_ACTION_STEP,
  mobileCreateActionSelection,
  visibleCarouselSlots,
  wrapCarouselIndex
} from './mobile-create-action-gesture'
import {
  MobileCreateActionOverlayContext,
  type MobileCreateActionOverlayItem
} from './MobileCreateActionOverlayContext'
import { useTheme } from './theme'
import { useFrameGesture } from './useFrameGesture'

interface MobileCreateActionOverlayState {
  items: readonly MobileCreateActionOverlayItem[]
  index: number
}

interface MobileCreateActionConfirmation {
  label: string
  onConfirm(key: string): void
}

const CAROUSEL_HEIGHT = 382
const CARD_HEIGHT = 108
const CARD_CENTER_TOP = (CAROUSEL_HEIGHT - CARD_HEIGHT) / 2
const HALF_STEP = MOBILE_CREATE_ACTION_STEP / 2

function slotScaleRange(slot: number): [number, number, number] {
  if (slot === 0) return [0.95, 1, 0.95]
  if (slot === -1) return [0.82, 0.9, 0.95]
  if (slot === 1) return [0.95, 0.9, 0.82]
  if (slot < -1) return [0.74, 0.8, 0.82]
  return [0.82, 0.8, 0.74]
}

function slotOpacityRange(slot: number): [number, number, number] {
  if (slot === 0) return [0.86, 1, 0.86]
  if (slot === -1) return [0.22, 0.58, 0.86]
  if (slot === 1) return [0.86, 0.58, 0.22]
  if (slot < -1) return [0.02, 0.1, 0.22]
  return [0.22, 0.1, 0.02]
}

export function MobileCreateActionOverlayProvider({
  children
}: {
  children: ReactNode
}): React.JSX.Element {
  const theme = useTheme()
  const blurTarget = useRef<View | null>(null)
  const [overlay, setOverlay] = useState<MobileCreateActionOverlayState | null>(null)
  const [confirmation, setConfirmation] = useState<MobileCreateActionConfirmation | null>(null)
  const [opacity] = useState(() => new Animated.Value(0))
  const [offsetY] = useState(() => new Animated.Value(0))
  const [contentOpacity] = useState(() => new Animated.Value(1))
  const [contentTranslateY] = useState(() => new Animated.Value(0))
  const generationRef = useRef(0)
  const gestureStartYRef = useRef(0)
  const gestureBaseIndexRef = useRef(0)
  const confirmationMotion = useFrameGesture((selection: { index: number; offsetY: number }) => {
    offsetY.setValue(selection.offsetY)
    setOverlay((state) =>
      state && state.index !== selection.index ? { ...state, index: selection.index } : state
    )
  })

  const show = useCallback(
    (items: readonly MobileCreateActionOverlayItem[], index: number): void => {
      if (!items.length) return

      generationRef.current += 1
      confirmationMotion.cancel()
      setConfirmation(null)
      opacity.stopAnimation()
      offsetY.stopAnimation()
      contentOpacity.stopAnimation()
      contentTranslateY.stopAnimation()
      offsetY.setValue(0)
      contentOpacity.setValue(1)
      contentTranslateY.setValue(0)
      setOverlay({
        items,
        index: wrapCarouselIndex(index, items.length)
      })

      requestAnimationFrame(() => {
        Animated.timing(opacity, {
          toValue: 1,
          duration: 170,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        }).start()
      })
    },
    [confirmationMotion, contentOpacity, contentTranslateY, offsetY, opacity]
  )

  const update = useCallback(
    (index: number, nextOffsetY: number): void => {
      offsetY.setValue(nextOffsetY)
      setOverlay((current) => {
        if (!current || current.index === index) return current
        return {
          ...current,
          index: wrapCarouselIndex(index, current.items.length)
        }
      })
    },
    [offsetY]
  )

  const awaitConfirmation = useCallback(
    (label: string, onConfirm: (key: string) => void): void => {
      confirmationMotion.flush()
      offsetY.stopAnimation()
      Animated.spring(offsetY, {
        toValue: 0,
        damping: 25,
        stiffness: 250,
        mass: 0.75,
        overshootClamping: true,
        useNativeDriver: true
      }).start()
      setConfirmation({ label, onConfirm })
    },
    [confirmationMotion, offsetY]
  )

  const handoff = useCallback((): void => {
    setConfirmation(null)
    contentOpacity.stopAnimation()
    contentTranslateY.stopAnimation()
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(contentTranslateY, {
        toValue: 126,
        duration: 210,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true
      })
    ]).start()
  }, [contentOpacity, contentTranslateY])

  const hide = useCallback((): void => {
    const generation = generationRef.current
    confirmationMotion.cancel()
    setConfirmation(null)
    offsetY.stopAnimation()
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 135,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.spring(offsetY, {
        toValue: 0,
        damping: 26,
        stiffness: 240,
        mass: 0.8,
        overshootClamping: true,
        useNativeDriver: true
      })
    ]).start(({ finished }) => {
      if (finished && generation === generationRef.current) setOverlay(null)
    })
  }, [confirmationMotion, offsetY, opacity])

  const controller = useMemo(
    () => ({
      show,
      update,
      awaitConfirmation,
      handoff,
      hide
    }),
    [awaitConfirmation, handoff, hide, show, update]
  )

  const current = overlay?.items[overlay.index] ?? null
  const darkTheme = theme.background.toLowerCase() === '#0a0b0d'

  const settleInteractiveCarousel = (): void => {
    confirmationMotion.flush()
    offsetY.stopAnimation()
    Animated.spring(offsetY, {
      toValue: 0,
      damping: 25,
      stiffness: 250,
      mass: 0.75,
      overshootClamping: true,
      useNativeDriver: true
    }).start()
  }

  return (
    <MobileCreateActionOverlayContext.Provider value={controller}>
      <View style={{ flex: 1, minHei