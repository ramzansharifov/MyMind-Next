import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Animated,
  Easing,
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
  wrapCarouselIndex
} from './mobile-create-action-gesture'
import {
  MobileCreateActionOverlayContext,
  type MobileCreateActionOverlayItem
} from './MobileCreateActionOverlayContext'
import { useTheme } from './theme'

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

function relativeCarouselSlot(itemIndex: number, currentIndex: number, length: number): number {
  if (length <= 1) return 0

  let slot = wrapCarouselIndex(itemIndex - currentIndex, length)
  if (slot > length / 2) slot -= length
  return slot
}

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

  const show = useCallback(
    (items: readonly MobileCreateActionOverlayItem[], index: number): void => {
      if (!items.length) return

      generationRef.current += 1
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
    [contentOpacity, contentTranslateY, offsetY, opacity]
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
    [offsetY]
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
  }, [offsetY, opacity])

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
      <View style={{ flex: 1, minHeight: 0, backgroundColor: theme.background }}>
        <BlurTargetView
          ref={blurTarget}
          style={{ flex: 1, minHeight: 0, backgroundColor: theme.background }}
        >
          {children}
        </BlurTargetView>

        {overlay && current ? (
          <Animated.View
            pointerEvents={confirmation ? 'box-none' : 'none'}
            accessibilityElementsHidden={!confirmation}
            importantForAccessibility={confirmation ? 'yes' : 'no-hide-descendants'}
            style={[
              StyleSheet.absoluteFill,
              {
                zIndex: 1000,
                opacity,
                backgroundColor: darkTheme ? '#050608' : '#E8EDF3'
              }
            ]}
          >
            <BlurView
              pointerEvents="none"
              blurTarget={blurTarget}
              blurMethod="dimezisBlurView"
              intensity={darkTheme ? 12 : 18}
              tint={darkTheme ? 'dark' : 'light'}
              style={[
                StyleSheet.absoluteFill,
                {
                  opacity: darkTheme ? 0.52 : 0.78
                }
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: darkTheme ? '#000000ED' : '#0F172A70'
                }
              ]}
            />

            <Animated.View
              pointerEvents={confirmation ? 'box-none' : 'none'}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 22,
                opacity: contentOpacity,
                transform: [{ translateY: contentTranslateY }]
              }}
            >
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 18,
                  minHeight: 38,
                  maxWidth: '92%',
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: darkTheme ? '#FFFFFF12' : theme.border,
                  backgroundColor: darkTheme ? '#0B0D11E8' : '#FFFFFFE6'
                }}
              >
                <Text
                  style={{
                    color: darkTheme ? '#D8DCE4' : theme.text,
                    fontSize: 11.5,
                    lineHeight: 17,
                    fontWeight: '600',
                    textAlign: 'center'
                  }}
                >
                  {confirmation
                    ? 'Проведите вверх или вниз · затем нажмите «Дальше»'
                    : 'Проведите вверх или вниз · выберите действие'}
                </Text>
              </View>

              <View
                onStartShouldSetResponder={() => Boolean(confirmation)}
                onMoveShouldSetResponder={() => Boolean(confirmation)}
                onResponderGrant={(event: GestureResponderEvent) => {
                  if (!confirmation || !overlay.items.length) return
                  gestureStartYRef.current = event.nativeEvent.pageY
                  gestureBaseIndexRef.current = overlay.index
                  offsetY.stopAnimation()
                  offsetY.setValue(0)
                }}
                onResponderMove={(event: GestureResponderEvent) => {
                  if (!confirmation || !overlay.items.length) return
                  const selection = mobileCreateActionSelection(
                    event.nativeEvent.pageY - gestureStartYRef.current,
                    overlay.items.length,
                    gestureBaseIndexRef.current,
                    MOBILE_CREATE_ACTION_STEP
                  )
                  offsetY.setValue(selection.offsetY)
                  setOverlay((state) =>
                    state && state.index !== selection.index
                      ? { ...state, index: selection.index }
                      : state
                  )
                }}
                onResponderRelease={settleInteractiveCarousel}
                onResponderTerminationRequest={() => false}
                onResponderTerminate={settleInteractiveCarousel}
                style={{
                  width: '100%',
                  maxWidth: 360,
                  height: CAROUSEL_HEIGHT,
                  overflow: 'hidden'
                }}
              >
                {overlay.items.map((item, itemIndex) => {
                  const slot = relativeCarouselSlot(itemIndex, overlay.index, overlay.items.length)
                  if (Math.abs(slot) > 2) return null

                  const actionColor = item.color ?? theme.accent
                  const scaleRange = slotScaleRange(slot)
                  const opacityRange = slotOpacityRange(slot)
                  const translateY = offsetY.interpolate({
                    inputRange: [-HALF_STEP, HALF_STEP],
                    outputRange: [
                      slot * MOBILE_CREATE_ACTION_STEP - HALF_STEP,
                      slot * MOBILE_CREATE_ACTION_STEP + HALF_STEP
                    ],
                    extrapolate: 'clamp'
                  })
                  const scale = offsetY.interpolate({
                    inputRange: [-HALF_STEP, 0, HALF_STEP],
                    outputRange: scaleRange,
                    extrapolate: 'clamp'
                  })
                  const cardOpacity = offsetY.interpolate({
                    inputRange: [-HALF_STEP, 0, HALF_STEP],
                    outputRange: opacityRange,
                    extrapolate: 'clamp'
                  })
                  const active = slot === 0

                  return (
                    <Animated.View
                      key={item.key}
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        top: CARD_CENTER_TOP,
                        right: 0,
                        left: 0,
                        height: CARD_HEIGHT,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: cardOpacity,
                        transform: [{ translateY }, { scale }]
                      }}
                    >
                      <View
                        style={{
                          width: '88%',
                          maxWidth: 310,
                          height: CARD_HEIGHT,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 14,
                          paddingHorizontal: 16,
                          paddingVertical: 14,
                          borderWidth: 1,
                          borderColor: active
                            ? actionColor + '78'
                            : actionColor + (darkTheme ? '2E' : '38'),
                          borderRadius: 22,
                          backgroundColor: darkTheme
                            ? active
                              ? '#111318FA'
                              : '#111318F2'
                            : active
                              ? '#FFFFFFFA'
                              : '#F8FAFCF2',
                          elevation: active ? 16 : 5,
                          shadowColor: '#000000',
                          shadowOpacity: active ? 0.34 : 0.16,
                          shadowRadius: active ? 22 : 10,
                          shadowOffset: { width: 0, height: active ? 12 : 5 }
                        }}
                      >
                        <View
                          style={{
                            width: 48,
                            height: 48,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: actionColor + (active ? '5C' : '36'),
                            borderRadius: 15,
                            backgroundColor: actionColor + (active ? '1D' : '12')
                          }}
                        >
                          <AppIcon
                            name={item.icon ?? 'add'}
                            size={active ? 23 : 21}
                            strokeWidth={2.3}
                            color={actionColor}
                          />
                        </View>

                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            numberOfLines={1}
                            style={{
                              color: theme.text,
                              fontSize: active ? 20 : 17,
                              lineHeight: active ? 25 : 22,
                              fontWeight: '700',
                              letterSpacing: active ? -0.3 : -0.15
                            }}
                          >
                            {item.label}
                          </Text>
                          {item.description ? (
                            <Text
                              numberOfLines={1}
                              style={{
                                marginTop: 5,
                                color: theme.muted,
                                fontSize: active ? 12 : 11.5,
                                lineHeight: 16,
                                fontWeight: '500'
                              }}
                            >
                              {item.description}
                            </Text>
                          ) : null}
                        </View>

                        {active ? (
                          <View
                            style={{
                              width: 28,
                              height: 28,
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: 9,
                              backgroundColor: actionColor + '12'
                            }}
                          >
                            <AppIcon name="check" size={15} color={actionColor} />
                          </View>
                        ) : null}
                      </View>
                    </Animated.View>
                  )
                })}
              </View>
            </Animated.View>

            {confirmation ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Закрыть выбор действия"
                  onPress={hide}
                  style={({ pressed }) => ({
                    position: 'absolute',
                    top: 18,
                    right: 18,
                    width: 38,
                    height: 38,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 12,
                    backgroundColor: darkTheme ? '#111318E8' : '#FFFFFFE8',
                    opacity: pressed ? 0.72 : 1
                  })}
                >
                  <AppIcon name="close" size={18} color={theme.muted} />
                </Pressable>

                <View
                  pointerEvents="box-none"
                  style={{
                    position: 'absolute',
                    right: 0,
                    bottom: 18,
                    left: 0,
                    alignItems: 'center'
                  }}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={confirmation.label}
                    onPress={() => {
                      const selected = overlay.items[overlay.index]
                      if (!selected) return
                      const callback = confirmation.onConfirm
                      setConfirmation(null)
                      callback(selected.key)
                    }}
                    style={({ pressed }) => ({
                      minWidth: 170,
                      minHeight: 48,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 24,
                      borderRadius: 15,
                      borderWidth: 1,
                      borderColor: (current.color ?? theme.accent) + '55',
                      backgroundColor: current.color ?? theme.accent,
                      opacity: pressed ? 0.8 : 1
                    })}
                  >
                    <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '700' }}>
                      {confirmation.label}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </Animated.View>
        ) : null}
      </View>
    </MobileCreateActionOverlayContext.Provider>
  )
}
