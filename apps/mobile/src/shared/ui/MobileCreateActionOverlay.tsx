import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { Animated, Easing, StyleSheet, Text, View } from 'react-native'
import { BlurTargetView, BlurView } from 'expo-blur'

import { AppIcon } from './icons'
import { MOBILE_CREATE_ACTION_STEP, wrapCarouselIndex } from './mobile-create-action-gesture'
import {
  MobileCreateActionOverlayContext,
  type MobileCreateActionOverlayItem
} from './MobileCreateActionOverlayContext'
import { useTheme } from './theme'

interface MobileCreateActionOverlayState {
  items: readonly MobileCreateActionOverlayItem[]
  index: number
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
  const [opacity] = useState(() => new Animated.Value(0))
  const [offsetY] = useState(() => new Animated.Value(0))
  const generationRef = useRef(0)

  const show = useCallback(
    (items: readonly MobileCreateActionOverlayItem[], index: number): void => {
      if (!items.length) return

      generationRef.current += 1
      opacity.stopAnimation()
      offsetY.stopAnimation()
      offsetY.setValue(0)
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
    [offsetY, opacity]
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

  const hide = useCallback((): void => {
    const generation = generationRef.current
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
      hide
    }),
    [hide, show, update]
  )

  const current = overlay?.items[overlay.index] ?? null
  const darkTheme = theme.background.toLowerCase() === '#0a0b0d'

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
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
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
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: darkTheme ? '#000000ED' : '#0F172A70'
                }
              ]}
            />

            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 22
              }}
            >
              <View
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
                  Проведите вверх или вниз · отпустите, чтобы выбрать
                </Text>
              </View>
              <View
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
            </View>
          </Animated.View>
        ) : null}
      </View>
    </MobileCreateActionOverlayContext.Provider>
  )
}
