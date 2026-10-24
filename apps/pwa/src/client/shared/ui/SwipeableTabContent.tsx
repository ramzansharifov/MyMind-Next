import type { PointerEvent } from 'react'
import { motionValue, mapValue, motion } from 'framer-motion'
import {
  useViewport,
  playMotion,
  motionStep,
  DragState,
  horizontalDrag,
  stopMotion
} from '../../../ui/browser'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
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
  onSwipeChange?(value: T, direction: TabSwipeDirection): void
  disabled?: boolean
  children: ReactNode
}): React.JSX.Element {
  const { width: screenWidth } = useViewport()
  const [translateX] = useState(() => motionValue(0))
  const [animating, setAnimating] = useState(false)
  const pageWidth = Math.max(screenWidth - 28, 280)
  const resetPosition = useCallback((): void => {
    playMotion(
      motionStep(translateX, 0, {
        damping: 24,
        stiffness: 260,
        mass: 0.72,
        type: 'spring'
      })
    )
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
      playMotion(
        motionStep(translateX, exitX, {
          duration: 135 / 1000,
          ease: 'easeOut',
          type: 'tween'
        }),
        ({ finished }) => {
          if (!finished) {
            setAnimating(false)
            resetPosition()
            return
          }
          onChange(nextValue)
          onSwipeChange?.(nextValue, direction)
          translateX.set(enterX)
          requestAnimationFrame(() => {
            playMotion(
              motionStep(translateX, 0, {
                duration: 190 / 1000,
                ease: 'easeOut',
                type: 'tween'
              }),
              () => {
                setAnimating(false)
              }
            )
          })
        }
      )
    },
    [animating, disabled, onChange, onSwipeChange, pageWidth, resetPosition, translateX, value]
  )
  const responder = useMemo(() => {
    const shouldClaimHorizontalSwipe = (
      _event: PointerEvent<HTMLElement>,
      gesture: DragState
    ): boolean => {
      if (disabled || animating || gesture.numberActiveTouches !== 1) return false
      const horizontal = Math.abs(gesture.dx)
      const vertical = Math.abs(gesture.dy)
      return horizontal >= 10 && horizontal > vertical * 1.35
    }
    return horizontalDrag({
      shouldStart: shouldClaimHorizontalSwipe,
      onStart: () => {
        stopMotion(translateX)
      },
      onMove: (_event, gesture) => {
        if (disabled || animating) return
        const direction: TabSwipeDirection = gesture.dx < 0 ? 'next' : 'previous'
        const nextValue = adjacentTab(tabs, value, direction)
        const atEdge = nextValue === value
        const raw = atEdge ? gesture.dx * 0.18 : gesture.dx
        translateX.set(Math.max(-pageWidth, Math.min(pageWidth, raw)))
      },
      onEnd: (_event, gesture) => {
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
      onCancel: () => {
        if (!animating) resetPosition()
      }
    })
  }, [animating, completeSwipe, disabled, pageWidth, resetPosition, tabs, translateX, value])
  const opacity = mapValue(translateX, [-pageWidth, 0, pageWidth], [0.9, 1, 0.9], {
    clamp: true
  })
  return (
    <div
      className="ui-stack"
      style={{
        flex: '1 1 0%',
        minHeight: 0,
        overflow: 'hidden'
      }}
    >
      <motion.div
        className="ui-stack"
        style={{
          touchAction: 'pan-y' as const,
          flex: '1 1 0%',
          minHeight: 0,
          opacity: opacity,
          x: translateX
        }}
        {...responder.pointerHandlers}
      >
        {children}
      </motion.div>
    </div>
  )
}
