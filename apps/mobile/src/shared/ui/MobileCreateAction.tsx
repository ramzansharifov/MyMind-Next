import { useCallback, useMemo, useRef, useState } from 'react'
import { Pressable, Text, View, type GestureResponderEvent } from 'react-native'

import { AppDialog } from './AppDialog'
import { AppIcon, type AppIconName } from './icons'
import {
  MOBILE_CREATE_ACTION_STEP,
  mobileCreateActionSelection
} from './mobile-create-action-gesture'
import { useMobileCreateActionOverlay } from './MobileCreateActionOverlayContext'
import { useTheme } from './theme'

export interface MobileCreateActionItem {
  key: string
  label: string
  description?: string
  icon?: AppIconName
  color?: string
  disabled?: boolean
  onPress(): void
  onHoldSelect?(): void
}

type IdleGlobal = typeof globalThis & {
  requestIdleCallback?: (callback: () => void) => number
}

function runWhenIdle(callback: () => void): void {
  const requestIdle = (globalThis as IdleGlobal).requestIdleCallback
  if (typeof requestIdle === 'function') {
    requestIdle(callback)
    return
  }
  setTimeout(callback, 0)
}

const HOLD_DELAY_MS = 380
const TAP_MOVE_TOLERANCE = 18

export function MobileCreateAction({
  actions,
  disabled = false,
  label = 'Создать',
  iconOnly = false
}: {
  actions: readonly MobileCreateActionItem[]
  disabled?: boolean
  label?: string
  iconOnly?: boolean
}): React.JSX.Element | null {
  const theme = useTheme()
  const overlay = useMobileCreateActionOverlay()
  const [open, setOpen] = useState(false)
  const [pressed, setPressed] = useState(false)

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchActiveRef = useRef(false)
  const holdActiveRef = useRef(false)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const currentXRef = useRef(0)
  const currentYRef = useRef(0)
  const anchorYRef = useRef(0)
  const selectedIndexRef = useRef(0)

  const enabledActions = useMemo(
    () => actions.filter((action) => !disabled && !action.disabled),
    [actions, disabled]
  )

  const triggerDisabled = disabled || enabledActions.length === 0

  const clearHoldTimer = useCallback((): void => {
    if (!holdTimerRef.current) return
    clearTimeout(holdTimerRef.current)
    holdTimerRef.current = null
  }, [])

  const perform = useCallback(
    (action: MobileCreateActionItem): void => {
      if (disabled || action.disabled) return
      runWhenIdle(() => action.onPress())
    },
    [disabled]
  )

  const launch = (action: MobileCreateActionItem): void => {
    if (disabled || action.disabled) return
    setOpen(false)
    perform(action)
  }

  const launchDefaultAction = useCallback((): void => {
    if (triggerDisabled) return
    if (actions.length === 1) perform(actions[0])
    else setOpen(true)
  }, [actions, perform, triggerDisabled])

  const beginHoldTimer = useCallback((): void => {
    clearHoldTimer()
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null
      if (!touchActiveRef.current || !overlay || !enabledActions.length) return

      holdActiveRef.current = true
      selectedIndexRef.current = 0
      anchorYRef.current = currentYRef.current
      overlay.show(enabledActions, 0)
    }, HOLD_DELAY_MS)
  }, [clearHoldTimer, enabledActions, overlay])

  const updateCarousel = useCallback(
    (moveY: number): void => {
      currentYRef.current = moveY
      if (!holdActiveRef.current || !overlay || !enabledActions.length) return

      const selection = mobileCreateActionSelection(
        currentYRef.current - anchorYRef.current,
        enabledActions.length,
        0,
        MOBILE_CREATE_ACTION_STEP
      )
      selectedIndexRef.current = selection.index
      overlay.update(selection.index, selection.offsetY)
    },
    [enabledActions, overlay]
  )

  const finishGesture = useCallback((): void => {
    touchActiveRef.current = false
    setPressed(false)
    clearHoldTimer()

    if (holdActiveRef.current && overlay && enabledActions.length) {
      holdActiveRef.current = false

      const action = enabledActions[selectedIndexRef.current]
      if (action?.onHoldSelect) {
        overlay.handoff()
        setTimeout(() => action.onHoldSelect?.(), 155)
      } else {
        overlay.hide()
        if (action) setTimeout(() => perform(action), 90)
      }
      return
    }

    const moved = Math.hypot(
      currentXRef.current - startXRef.current,
      currentYRef.current - startYRef.current
    )
    if (moved <= TAP_MOVE_TOLERANCE) launchDefaultAction()
  }, [clearHoldTimer, enabledActions, launchDefaultAction, overlay, perform])

  const cancelGesture = useCallback((): void => {
    touchActiveRef.current = false
    setPressed(false)
    clearHoldTimer()

    if (!holdActiveRef.current || !overlay) return
    holdActiveRef.current = false
    overlay.hide()
  }, [clearHoldTimer, overlay])

  if (!actions.length) return null

  return (
    <>
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          right: 2,
          bottom: 12,
          zIndex: 30
        }}
      >
        <View
          accessible
          accessibilityRole="button"
          accessibilityLabel={actions.length === 1 ? actions[0].label : label}
          accessibilityHint={
            enabledActions.length
              ? 'Удерживайте и проведите вверх или вниз для быстрого выбора действия'
              : undefined
          }
          accessibilityState={{
            disabled: triggerDisabled,
            expanded: actions.length > 1 ? open : undefined
          }}
          onAccessibilityTap={launchDefaultAction}
          onStartShouldSetResponder={() => !triggerDisabled}
          onStartShouldSetResponderCapture={() => !triggerDisabled}
          onMoveShouldSetResponder={() => !triggerDisabled}
          onMoveShouldSetResponderCapture={() => !triggerDisabled}
          onResponderGrant={(event: GestureResponderEvent) => {
            touchActiveRef.current = true
            holdActiveRef.current = false
            selectedIndexRef.current = 0
            setPressed(true)

            startXRef.current = event.nativeEvent.pageX
            startYRef.current = event.nativeEvent.pageY
            currentXRef.current = event.nativeEvent.pageX
            currentYRef.current = event.nativeEvent.pageY
            anchorYRef.current = event.nativeEvent.pageY
            beginHoldTimer()
          }}
          onResponderMove={(event: GestureResponderEvent) => {
            currentXRef.current = event.nativeEvent.pageX
            updateCarousel(event.nativeEvent.pageY)
          }}
          onResponderRelease={(event: GestureResponderEvent) => {
            currentXRef.current = event.nativeEvent.pageX
            currentYRef.current = event.nativeEvent.pageY
            finishGesture()
          }}
          onResponderTerminationRequest={() => false}
          onResponderTerminate={cancelGesture}
          style={{
            width: iconOnly ? 52 : undefined,
            height: iconOnly ? 52 : undefined,
            minHeight: iconOnly ? 52 : 44,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: iconOnly ? 0 : 8,
            paddingHorizontal: iconOnly ? 0 : 16,
            borderRadius: iconOnly ? 26 : 12,
            borderWidth: 1,
            borderColor: theme.accent + '33',
            backgroundColor: theme.accent,
            opacity: triggerDisabled ? 0.4 : pressed ? 0.8 : 1,
            elevation: 8,
            shadowColor: '#000000',
            shadowOpacity: 0.24,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 7 }
          }}
        >
          <AppIcon
            name="add"
            size={iconOnly ? 21 : 17}
            strokeWidth={iconOnly ? 2.4 : 2.2}
            color="#ffffff"
          />
          {!iconOnly ? (
            <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '600' }}>
              {actions.length === 1 ? actions[0].label : label}
            </Text>
          ) : null}
        </View>
      </View>

      {actions.length > 1 ? (
        <AppDialog
          open={open}
          onOpenChange={setOpen}
          title={label}
          description="Выберите, что хотите добавить"
          icon="add"
          presentation="sheet"
        >
          <View style={{ gap: 8, padding: 12, paddingBottom: 18 }}>
            {actions.map((action) => {
              const actionColor = action.color ?? theme.accent
              return (
                <Pressable
                  key={action.key}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                  accessibilityState={{ disabled: disabled || action.disabled }}
                  disabled={disabled || action.disabled}
                  onPress={() => launch(action)}
                  style={({ pressed: actionPressed }) => ({
                    minHeight: 52,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingHorizontal: 13,
                    paddingVertical: 10,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 12,
                    backgroundColor: actionPressed ? theme.raised : theme.surface,
                    opacity: disabled || action.disabled ? 0.42 : actionPressed ? 0.78 : 1
                  })}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: actionColor + '42',
                      backgroundColor: actionColor + '16'
                    }}
                  >
                    <AppIcon name={action.icon ?? 'add'} size={18} color={actionColor} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={{
                        color: theme.text,
                        fontSize: 14.5,
                        lineHeight: 20,
                        fontWeight: '700'
                      }}
                    >
                      {action.label}
                    </Text>
                    {action.description ? (
                      <Text
                        style={{
                          marginTop: 2,
                          color: theme.muted,
                          fontSize: 12,
                          lineHeight: 17
                        }}
                      >
                        {action.description}
                      </Text>
                    ) : null}
                  </View>
                  <AppIcon name="forward" size={17} color={theme.muted} />
                </Pressable>
              )
            })}
          </View>
        </AppDialog>
      ) : null}
    </>
  )
}
