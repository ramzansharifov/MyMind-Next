import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'
import { Animated, Easing, StyleSheet, Text, View } from 'react-native'
import { BlurTargetView, BlurView } from 'expo-blur'

import { AppIcon, type AppIconName } from './icons'
import { wrapCarouselIndex } from './mobile-create-action-gesture'
import { useTheme } from './theme'

export interface MobileCreateActionOverlayItem {
  key: string
  label: string
  description?: string
  icon?: AppIconName
  color?: string
}

interface MobileCreateActionOverlayState {
  items: readonly MobileCreateActionOverlayItem[]
  index: number
}

interface MobileCreateActionOverlayController {
  show(items: readonly MobileCreateActionOverlayItem[], index: number): void
  update(index: number, offsetY: number): void
  hide(): void
}

const MobileCreateActionOverlayContext =
  createContext<MobileCreateActionOverlayController | null>(null)

export function useMobileCreateActionOverlay(): MobileCreateActionOverlayController | null {
  return useContext(MobileCreateActionOverlayContext)
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
          duration: 150,
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
        duration: 120,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.spring(offsetY, {
        toValue: 0,
        damping: 24,
        stiffness: 260,
        mass: 0.75,
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
  const previous =
    overlay && overlay.items.length > 1
      ? overlay.items[wrapCarouselIndex(overlay.index - 1, overlay.items.length)]
      : null
  const next =
    overlay && overlay.items.length > 1
      ? overlay.items[wrapCarouselIndex(overlay.index + 1, overlay.items.length)]
      : null
  const currentColor = current?.color ?? theme.accent

  return (
    <MobileCreateActionOverlayContext.Provider value={controller}>
      <View style={{ flex: 1, minHeight: 0 }}>
        <BlurTargetView ref={blurTarget} style={{ flex: 1, minHeight: 0 }}>
          {children}
        </BlurTargetView>

        {overlay && current ? (
          <Animated.View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              StyleSheet.absoluteFillObject,
              {
                zIndex: 1000,
                opacity
              }
            ]}
          >
            <BlurView
              blurTarget={blurTarget}
              blurMethod="dimezisBlurView"
              intensity={58}
              tint="default"
              style={StyleSheet.absoluteFillObject}
            />
            <View
              style={[
                StyleSheet.absoluteFillObject,
                {
                  backgroundColor: theme.background + '72'
                }
              ]}
            />

            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 32
              }}
            >
              <Animated.View
                style={{
                  width: '100%',
                  alignItems: 'center',
                  transform: [{ translateY: offsetY }]
                }}
              >
                {previous ? (
                  <Text
                    numberOfLines={1}
                    style={{
                      maxWidth: '88%',
                      marginBottom: 20,
                      color: theme.muted,
                      fontSize: 15,
                      lineHeight: 20,
                      fontWeight: '600',
                      opacity: 0.48
                    }}
                  >
                    {previous.label}
                  </Text>
                ) : null}

                <View
                  style={{
                    minWidth: 220,
                    maxWidth: '94%',
                    alignItems: 'center',
                    gap: 12,
                    paddingHorizontal: 24,
                    paddingVertical: 20,
                    borderWidth: 1,
                    borderColor: currentColor + '4A',
                    borderRadius: 24,
                    backgroundColor: theme.surface + 'E8',
                    elevation: 14,
                    shadowColor: '#000000',
                    shadowOpacity: 0.28,
                    shadowRadius: 24,
                    shadowOffset: { width: 0, height: 12 }
                  }}
                >
                  <View
                    style={{
                      width: 50,
                      height: 50,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: currentColor + '44',
                      borderRadius: 16,
                      backgroundColor: currentColor + '18'
                    }}
                  >
                    <AppIcon
                      name={current.icon ?? 'add'}
                      size={24}
                      strokeWidth={2.35}
                      color={currentColor}
                    />
                  </View>

                  <Text
                    numberOfLines={2}
                    style={{
                      color: theme.text,
                      fontSize: 25,
                      lineHeight: 31,
                      fontWeight: '700',
                      textAlign: 'center',
                      letterSpacing: -0.55
                    }}
                  >
                    {current.label}
                  </Text>

                  {current.description ? (
                    <Text
                      numberOfLines={2}
                      style={{
                        maxWidth: 280,
                        color: theme.muted,
                        fontSize: 12.5,
                        lineHeight: 18,
                        fontWeight: '500',
                        textAlign: 'center'
                      }}
                    >
                      {current.description}
                    </Text>
                  ) : null}
                </View>

                {next ? (
                  <Text
                    numberOfLines={1}
                    style={{
                      maxWidth: '88%',
                      marginTop: 20,
                      color: theme.muted,
                      fontSize: 15,
                      lineHeight: 20,
                      fontWeight: '600',
                      opacity: 0.48
                    }}
                  >
                    {next.label}
                  </Text>
                ) : null}
              </Animated.View>

              {overlay.items.length > 1 ? (
                <Text
                  style={{
                    position: 'absolute',
                    bottom: 38,
                    color: theme.muted,
                    fontSize: 11.5,
                    lineHeight: 17,
                    fontWeight: '600',
                    textAlign: 'center',
                    opacity: 0.7
                  }}
                >
                  Проведите вверх или вниз · отпустите, чтобы выбрать
                </Text>
              ) : null}
            </View>
          </Animated.View>
        ) : null}
      </View>
    </MobileCreateActionOverlayContext.Provider>
  )
}
