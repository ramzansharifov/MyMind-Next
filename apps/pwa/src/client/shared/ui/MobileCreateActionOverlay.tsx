import type { PointerEvent } from 'react'
import { motionValue, motion, mapValue } from 'framer-motion'
import { stopMotion, playMotion, motionStep, parallelMotion, Action } from '../../../ui/browser'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
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
  const [overlay, setOverlay] = useState<MobileCreateActionOverlayState | null>(null)
  const [confirmation, setConfirmation] = useState<MobileCreateActionConfirmation | null>(null)
  const [opacity] = useState(() => motionValue(0))
  const [offsetY] = useState(() => motionValue(0))
  const [contentOpacity] = useState(() => motionValue(1))
  const [contentTranslateY] = useState(() => motionValue(0))
  const generationRef = useRef(0)
  const gestureStartYRef = useRef(0)
  const gestureBaseIndexRef = useRef(0)
  const confirmationMotion = useFrameGesture((selection: { index: number; offsetY: number }) => {
    offsetY.set(selection.offsetY)
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
      stopMotion(opacity)
      stopMotion(offsetY)
      stopMotion(contentOpacity)
      stopMotion(contentTranslateY)
      offsetY.set(0)
      contentOpacity.set(1)
      contentTranslateY.set(0)
      setOverlay({
        items,
        index: wrapCarouselIndex(index, items.length)
      })
      requestAnimationFrame(() => {
        playMotion(
          motionStep(opacity, 1, {
            duration: 170 / 1000,
            ease: 'easeOut',
            type: 'tween'
          })
        )
      })
    },
    [confirmationMotion, contentOpacity, contentTranslateY, offsetY, opacity]
  )
  const update = useCallback(
    (index: number, nextOffsetY: number): void => {
      offsetY.set(nextOffsetY)
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
      stopMotion(offsetY)
      playMotion(
        motionStep(offsetY, 0, {
          damping: 25,
          stiffness: 250,
          mass: 0.75,
          type: 'spring'
        })
      )
      setConfirmation({ label, onConfirm })
    },
    [confirmationMotion, offsetY]
  )
  const handoff = useCallback((): void => {
    setConfirmation(null)
    stopMotion(contentOpacity)
    stopMotion(contentTranslateY)
    playMotion(
      parallelMotion([
        motionStep(contentOpacity, 0, {
          duration: 180 / 1000,
          ease: 'easeIn',
          type: 'tween'
        }),
        motionStep(contentTranslateY, 126, {
          duration: 210 / 1000,
          ease: 'easeIn',
          type: 'tween'
        })
      ])
    )
  }, [contentOpacity, contentTranslateY])
  const hide = useCallback((): void => {
    const generation = generationRef.current
    confirmationMotion.cancel()
    setConfirmation(null)
    stopMotion(offsetY)
    playMotion(
      parallelMotion([
        motionStep(opacity, 0, {
          duration: 135 / 1000,
          ease: 'easeIn',
          type: 'tween'
        }),
        motionStep(offsetY, 0, {
          damping: 26,
          stiffness: 240,
          mass: 0.8,
          type: 'spring'
        })
      ]),
      ({ finished }) => {
        if (finished && generation === generationRef.current) setOverlay(null)
      }
    )
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
    stopMotion(offsetY)
    playMotion(
      motionStep(offsetY, 0, {
        damping: 25,
        stiffness: 250,
        mass: 0.75,
        type: 'spring'
      })
    )
  }
  return (
    <MobileCreateActionOverlayContext.Provider value={controller}>
      <div
        className="ui-stack"
        style={{
          flex: '1 1 0%',
          minHeight: 0,
          backgroundColor: theme.background
        }}
      >
        <div
          className="ui-stack"
          style={{ flex: 1, minHeight: 0, backgroundColor: theme.background }}
        >
          {children}
        </div>

        {overlay && current ? (
          <motion.div
            className="ui-stack"
            aria-hidden={!confirmation}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 1000,
              opacity: opacity,
              backgroundColor: darkTheme ? '#050608' : '#E8EDF3',
              pointerEvents: confirmation ? 'auto' : 'none'
            }}
          >
            <div
              aria-hidden
              style={{
                backdropFilter: `blur(${darkTheme ? 2.4 : 3.6}px)`,
                WebkitBackdropFilter: `blur(${darkTheme ? 2.4 : 3.6}px)`,
                pointerEvents: 'none',
                backgroundColor: darkTheme ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.18)',
                position: 'absolute',
                inset: 0,
                opacity: darkTheme ? 0.52 : 0.78
              }}
            />
            <div
              className="ui-stack"
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: darkTheme ? '#000000ED' : '#0F172A70',
                pointerEvents: 'none'
              }}
            ></div>

            <motion.div
              className="ui-stack"
              style={{
                flex: '1 1 0%',
                alignItems: 'center',
                justifyContent: 'center',
                paddingInline: 22,
                opacity: contentOpacity,
                y: contentTranslateY,
                pointerEvents: confirmation ? 'auto' : 'none'
              }}
            >
              <div
                className="ui-stack"
                style={{
                  position: 'absolute',
                  top: 18,
                  minHeight: 38,
                  maxWidth: '92%',
                  paddingInline: 14,
                  paddingBlock: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: darkTheme ? '#FFFFFF12' : theme.border,
                  backgroundColor: darkTheme ? '#0B0D11E8' : '#FFFFFFE6',
                  pointerEvents: 'none'
                }}
              >
                <span
                  className="ui-text"
                  style={{
                    color: darkTheme ? '#D8DCE4' : theme.text,
                    fontSize: 11.5,
                    lineHeight: '17px',
                    fontWeight: 600,
                    textAlign: 'center'
                  }}
                >
                  {confirmation
                    ? 'Проведите вверх или вниз · затем нажмите «Дальше»'
                    : 'Проведите вверх или вниз · выберите действие'}
                </span>
              </div>

              <div
                className="ui-stack"
                onPointerDown={(event) => {
                  if (event.button !== 0 || !event.isPrimary) return
                  event.currentTarget.setPointerCapture(event.pointerId)
                  ;((event: PointerEvent<HTMLElement>) => {
                    if (!confirmation || !overlay.items.length) return
                    gestureStartYRef.current = event.pageY
                    gestureBaseIndexRef.current = overlay.index
                    confirmationMotion.cancel()
                    stopMotion(offsetY)
                    offsetY.set(0)
                  })(event)
                }}
                onPointerMove={(event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId))
                    ((event: PointerEvent<HTMLElement>) => {
                      if (!confirmation || !overlay.items.length) return
                      const selection = mobileCreateActionSelection(
                        event.pageY - gestureStartYRef.current,
                        overlay.items.length,
                        gestureBaseIndexRef.current,
                        MOBILE_CREATE_ACTION_STEP
                      )
                      confirmationMotion.schedule(selection)
                    })(event)
                }}
                onPointerUp={(event) => {
                  if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
                  settleInteractiveCarousel()
                  event.currentTarget.releasePointerCapture(event.pointerId)
                }}
                onPointerCancel={settleInteractiveCarousel}
                style={{
                  width: '100%',
                  maxWidth: 360,
                  height: CAROUSEL_HEIGHT,
                  overflow: 'hidden',
                  touchAction: 'none'
                }}
              >
                {visibleCarouselSlots(overlay.items.length, overlay.index).map(
                  ({ index: itemIndex, slot }) => {
                    const item = overlay.items[itemIndex]
                    const actionColor = item.color ?? theme.accent
                    const scaleRange = slotScaleRange(slot)
                    const opacityRange = slotOpacityRange(slot)
                    const translateY = mapValue(
                      offsetY,
                      [-HALF_STEP, HALF_STEP],
                      [
                        slot * MOBILE_CREATE_ACTION_STEP - HALF_STEP,
                        slot * MOBILE_CREATE_ACTION_STEP + HALF_STEP
                      ],
                      {
                        clamp: true
                      }
                    )
                    const scale = mapValue(offsetY, [-HALF_STEP, 0, HALF_STEP], scaleRange, {
                      clamp: true
                    })
                    const cardOpacity = mapValue(
                      offsetY,
                      [-HALF_STEP, 0, HALF_STEP],
                      opacityRange,
                      {
                        clamp: true
                      }
                    )
                    const active = slot === 0
                    return (
                      <motion.div
                        className="ui-stack"
                        key={overlay.items.length === 2 ? item.key + ':' + slot : item.key}
                        style={{
                          position: 'absolute',
                          top: CARD_CENTER_TOP,
                          right: 0,
                          left: 0,
                          height: CARD_HEIGHT,
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: cardOpacity,
                          y: translateY,
                          scale: scale,
                          pointerEvents: 'none'
                        }}
                      >
                        <div
                          className="ui-stack"
                          style={{
                            width: '88%',
                            maxWidth: 310,
                            height: CARD_HEIGHT,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 14,
                            paddingInline: 16,
                            paddingBlock: 14,
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
                            boxShadow: `0px ${7}px ${14}px color-mix(in srgb, ${'#000000'} calc(${0.22} * 100%), transparent)`
                          }}
                        >
                          <div
                            className="ui-stack"
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
                          </div>

                          <div
                            className="ui-stack"
                            style={{
                              flex: '1 1 0%',
                              minWidth: 0
                            }}
                          >
                            <span
                              className="ui-text"
                              data-lines={1}
                              style={{
                                color: theme.text,
                                fontSize: active ? 20 : 17,
                                lineHeight: active ? '25px' : '22px',
                                fontWeight: 700,
                                letterSpacing: active ? -0.3 : -0.15,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitBoxOrient: 'vertical',
                                WebkitLineClamp: 1
                              }}
                            >
                              {item.label}
                            </span>
                            {item.description ? (
                              <span
                                className="ui-text"
                                data-lines={1}
                                style={{
                                  marginTop: 5,
                                  color: theme.muted,
                                  fontSize: active ? 12 : 11.5,
                                  lineHeight: '16px',
                                  fontWeight: 500,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitBoxOrient: 'vertical',
                                  WebkitLineClamp: 1
                                }}
                              >
                                {item.description}
                              </span>
                            ) : null}
                          </div>

                          {active ? (
                            <div
                              className="ui-stack"
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
                            </div>
                          ) : null}
                        </div>
                      </motion.div>
                    )
                  }
                )}
              </div>
            </motion.div>

            {overlay.items.length > 1 ? (
              <div
                className="ui-stack"
                style={{
                  position: 'absolute',
                  bottom: confirmation ? 87 : 44,
                  left: 0,
                  right: 0,
                  alignItems: 'center',
                  pointerEvents: 'none'
                }}
              >
                <span
                  className="ui-text"
                  style={{
                    color: darkTheme ? '#C5CAD3' : '#4B5563',
                    fontSize: 12,
                    fontWeight: 700,
                    fontVariant: 'tabular-nums'
                  }}
                >
                  {overlay.index + 1} / {overlay.items.length}
                </span>
              </div>
            ) : null}

            {confirmation ? (
              <>
                <Action
                  role={'button'}
                  aria-label={'Закрыть выбор действия'}
                  onClick={hide}
                  style={{
                    position: 'absolute',
                    top: 18,
                    right: 18,
                    width: 38,
                    height: 38,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 12,
                    backgroundColor: darkTheme ? '#111318E8' : '#FFFFFFE8',
                    opacity: 1
                  }}
                  pressedStyle={{
                    opacity: 0.72
                  }}
                >
                  <AppIcon name="close" size={18} color={theme.muted} />
                </Action>

                <div
                  className="ui-stack"
                  data-pass-through="true"
                  style={{
                    position: 'absolute',
                    right: 0,
                    bottom: 18,
                    left: 0,
                    alignItems: 'center',
                    pointerEvents: 'none'
                  }}
                >
                  <Action
                    role={'button'}
                    aria-label={confirmation.label}
                    onClick={() => {
                      const selected = overlay.items[overlay.index]
                      if (!selected) return
                      const callback = confirmation.onConfirm
                      setConfirmation(null)
                      callback(selected.key)
                    }}
                    style={{
                      minWidth: 170,
                      minHeight: 48,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingInline: 24,
                      borderRadius: 15,
                      borderWidth: 1,
                      borderColor: (current.color ?? theme.accent) + '55',
                      backgroundColor: current.color ?? theme.accent,
                      opacity: 1
                    }}
                    pressedStyle={{
                      opacity: 0.8
                    }}
                  >
                    <span
                      className="ui-text"
                      style={{
                        color: '#ffffff',
                        fontSize: 14,
                        fontWeight: 700
                      }}
                    >
                      {confirmation.label}
                    </span>
                  </Action>
                </div>
              </>
            ) : null}
          </motion.div>
        ) : null}
      </div>
    </MobileCreateActionOverlayContext.Provider>
  )
}
