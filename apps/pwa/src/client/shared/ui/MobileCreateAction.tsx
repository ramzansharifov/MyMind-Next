import type { PointerEvent } from 'react'
import { Action } from '../../../ui/browser'
import { runAfterInteraction } from './run-after-interaction'
import { useCallback, useMemo, useRef, useState } from 'react'
import { AppDialog } from './AppDialog'
import { AppIcon, type AppIconName } from './icons'
import {
  MOBILE_CREATE_ACTION_STEP,
  mobileCreateActionSelection
} from './mobile-create-action-gesture'
import { useMobileCreateActionOverlay } from './MobileCreateActionOverlayContext'
import { useFrameGesture } from './useFrameGesture'
import { useTheme } from './theme'
export interface MobileCreateActionItem {
  key: string
  label: string
  description?: string
  icon?: AppIconName
  color?: string
  disabled?: boolean
  onClick(): void
  onHoldSelect?(): void
}
const HOLD_DELAY_MS = 380
const TAP_MOVE_TOLERANCE = 18
export function MobileCreateAction({
  actions,
  disabled = false,
  label = 'Создать',
  iconOnly = false,
  confirmHoldSelection = false
}: {
  actions: readonly MobileCreateActionItem[]
  disabled?: boolean
  label?: string
  iconOnly?: boolean
  confirmHoldSelection?: boolean
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
  const carouselMotion = useFrameGesture((selection: { index: number; offsetY: number }) => {
    overlay?.update(selection.index, selection.offsetY)
  })
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
      runAfterInteraction(() => action.onClick())
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
      carouselMotion.cancel()
      overlay.show(enabledActions, 0)
    }, HOLD_DELAY_MS)
  }, [carouselMotion, clearHoldTimer, enabledActions, overlay])
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
      carouselMotion.schedule(selection)
    },
    [carouselMotion, enabledActions, overlay]
  )
  const finishGesture = useCallback((): void => {
    touchActiveRef.current = false
    setPressed(false)
    clearHoldTimer()
    carouselMotion.flush()
    if (holdActiveRef.current && overlay && enabledActions.length) {
      holdActiveRef.current = false
      const action = enabledActions[selectedIndexRef.current]
      if (confirmHoldSelection) {
        overlay.awaitConfirmation('Дальше', (key) => {
          const confirmedAction = enabledActions.find((item) => item.key === key)
          if (!confirmedAction) {
            overlay.hide()
            return
          }
          if (confirmedAction.onHoldSelect) {
            overlay.handoff()
            setTimeout(() => confirmedAction.onHoldSelect?.(), 155)
          } else {
            overlay.hide()
            setTimeout(() => perform(confirmedAction), 90)
          }
        })
      } else if (action?.onHoldSelect) {
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
  }, [
    carouselMotion,
    clearHoldTimer,
    confirmHoldSelection,
    enabledActions,
    launchDefaultAction,
    overlay,
    perform
  ])
  const cancelGesture = useCallback((): void => {
    touchActiveRef.current = false
    setPressed(false)
    clearHoldTimer()
    carouselMotion.cancel()
    if (!holdActiveRef.current || !overlay) return
    holdActiveRef.current = false
    overlay.hide()
  }, [carouselMotion, clearHoldTimer, overlay])
  if (!actions.length) return null
  return (
    <>
      <div
        className="ui-stack"
        data-pass-through="true"
        style={{
          position: 'absolute',
          right: 2,
          bottom: 12,
          zIndex: 30,
          pointerEvents: 'none'
        }}
      >
        <button
          className="ui-stack"
          role={'button'}
          aria-label={actions.length === 1 ? actions[0].label : label}
          title={
            enabledActions.length
              ? confirmHoldSelection
                ? 'Удерживайте и проведите вверх или вниз, затем подтвердите выбор кнопкой Дальше'
                : 'Удерживайте и проведите вверх или вниз для быстрого выбора действия'
              : undefined
          }
          aria-disabled={triggerDisabled}
          disabled={triggerDisabled}
          aria-expanded={actions.length > 1 ? open : undefined}
          type="button"
          onClick={(event) => {
            if (event.detail === 0) launchDefaultAction()
          }}
          onPointerDown={(event) => {
            if (event.button !== 0 || !event.isPrimary) return
            event.currentTarget.setPointerCapture(event.pointerId)
            ;((event: PointerEvent<HTMLElement>) => {
              touchActiveRef.current = true
              holdActiveRef.current = false
              selectedIndexRef.current = 0
              setPressed(true)
              startXRef.current = event.pageX
              startYRef.current = event.pageY
              currentXRef.current = event.pageX
              currentYRef.current = event.pageY
              anchorYRef.current = event.pageY
              beginHoldTimer()
            })(event)
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              ((event: PointerEvent<HTMLElement>) => {
                currentXRef.current = event.pageX
                updateCarousel(event.pageY)
              })(event)
          }}
          onPointerUp={(event) => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
            ;((event: PointerEvent<HTMLElement>) => {
              currentXRef.current = event.pageX
              currentYRef.current = event.pageY
              finishGesture()
            })(event)
            event.currentTarget.releasePointerCapture(event.pointerId)
          }}
          onPointerCancel={cancelGesture}
          style={{
            width: iconOnly ? 52 : undefined,
            height: iconOnly ? 52 : undefined,
            minHeight: iconOnly ? 52 : 44,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: iconOnly ? 0 : 8,
            paddingInline: iconOnly ? 0 : 16,
            borderRadius: iconOnly ? 26 : 12,
            borderWidth: 1,
            borderColor: theme.accent + '33',
            backgroundColor: theme.accent,
            opacity: triggerDisabled ? 0.4 : pressed ? 0.8 : 1,
            boxShadow: `0px ${7}px ${12}px color-mix(in srgb, ${'#000000'} calc(${0.24} * 100%), transparent)`,
            touchAction: 'none'
          }}
        >
          <AppIcon
            name="add"
            size={iconOnly ? 21 : 17}
            strokeWidth={iconOnly ? 2.4 : 2.2}
            color="#ffffff"
          />
          {!iconOnly ? (
            <span
              className="ui-text"
              style={{
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 600
              }}
            >
              {actions.length === 1 ? actions[0].label : label}
            </span>
          ) : null}
        </button>
      </div>

      {actions.length > 1 ? (
        <AppDialog
          open={open}
          onOpenChange={setOpen}
          title={label}
          description="Выберите, что хотите добавить"
          icon="add"
          presentation="sheet"
        >
          <div
            className="ui-stack"
            style={{
              gap: 8,
              padding: 12,
              paddingBottom: 18
            }}
          >
            {actions.map((action) => {
              const actionColor = action.color ?? theme.accent
              return (
                <Action
                  key={action.key}
                  role={'button'}
                  aria-label={action.label}
                  aria-disabled={disabled || action.disabled}
                  disabled={disabled || action.disabled}
                  onClick={() => launch(action)}
                  style={{
                    minHeight: 52,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingInline: 13,
                    paddingBlock: 10,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 12,
                    backgroundColor: theme.surface,
                    opacity: disabled || action.disabled ? 0.42 : 1
                  }}
                  pressedStyle={{
                    backgroundColor: theme.raised,
                    opacity: disabled || action.disabled ? 0.42 : 0.78
                  }}
                >
                  <div
                    className="ui-stack"
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
                      style={{
                        color: theme.text,
                        fontSize: 14.5,
                        lineHeight: '20px',
                        fontWeight: 700
                      }}
                    >
                      {action.label}
                    </span>
                    {action.description ? (
                      <span
                        className="ui-text"
                        style={{
                          marginTop: 2,
                          color: theme.muted,
                          fontSize: 12,
                          lineHeight: '17px'
                        }}
                      >
                        {action.description}
                      </span>
                    ) : null}
                  </div>
                  <AppIcon name="forward" size={17} color={theme.muted} />
                </Action>
              )
            })}
          </div>
        </AppDialog>
      ) : null}
    </>
  )
}
