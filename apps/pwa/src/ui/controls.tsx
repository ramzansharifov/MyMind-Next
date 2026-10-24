'use client'
import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type InputHTMLAttributes,
  type HTMLAttributes,
  type FocusEventHandler,
  type KeyboardEventHandler
} from 'react'
export function Action({
  style,
  pressedStyle,
  onHold,
  holdDelay = 500,
  hitPadding,
  disabled,
  children,
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  pressedStyle?: CSSProperties
  onHold?(): void
  holdDelay?: number
  hitPadding?: number
}): React.JSX.Element {
  const [pressed, setPressed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const start = useRef({ x: 0, y: 0 })
  const held = useRef(false)
  const cancel = (): void => {
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = null
    setPressed(false)
  }
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current)
    },
    []
  )
  return (
    <button
      {...props}
      type={props.type ?? 'button'}
      className={`ui-action ${props.className ?? ''}`}
      disabled={disabled}
      style={
        {
          ...style,
          ...(pressed && !disabled ? pressedStyle : {}),
          '--hit-padding': `${hitPadding ?? 0}px`
        } as CSSProperties
      }
      data-hit-padding={hitPadding || undefined}
      onPointerDown={(event) => {
        props.onPointerDown?.(event)
        if (disabled || event.button !== 0 || !event.isPrimary) return
        held.current = false
        start.current = { x: event.clientX, y: event.clientY }
        setPressed(true)
        if (onHold)
          timer.current = setTimeout(() => {
            held.current = true
            timer.current = null
            onHold()
          }, holdDelay)
      }}
      onPointerMove={(event) => {
        props.onPointerMove?.(event)
        if (Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 10)
          cancel()
      }}
      onPointerUp={(event) => {
        props.onPointerUp?.(event)
        cancel()
      }}
      onPointerCancel={(event) => {
        props.onPointerCancel?.(event)
        cancel()
      }}
      onPointerLeave={(event) => {
        props.onPointerLeave?.(event)
        cancel()
      }}
      onKeyDown={(event) => {
        props.onKeyDown?.(event)
        if (event.key === ' ' || event.key === 'Enter') {
          held.current = false
          setPressed(true)
        }
      }}
      onKeyUp={(event) => {
        props.onKeyUp?.(event)
        setPressed(false)
      }}
      onBlur={(event) => {
        props.onBlur?.(event)
        cancel()
      }}
      onContextMenu={(event) => {
        if (onHold) {
          event.preventDefault()
          if (!held.current) {
            held.current = true
            onHold()
          }
        }
        props.onContextMenu?.(event)
      }}
      onClick={(event) => {
        if (held.current && event.detail !== 0) {
          event.preventDefault()
          held.current = false
          return
        }
        onClick?.(event)
      }}
    >
      {children}
    </button>
  )
}
type ControlElement = HTMLInputElement | HTMLTextAreaElement
export type TextControlProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'onFocus' | 'onBlur' | 'onKeyDown' | 'onKeyUp' | 'children'
> & {
  multiline?: boolean
  onValueChange?(value: string): void
  placeholderColor?: string
  onEnter?(): void
  onFocus?: FocusEventHandler<ControlElement>
  onBlur?: FocusEventHandler<ControlElement>
  onKeyDown?: KeyboardEventHandler<ControlElement>
  onKeyUp?: KeyboardEventHandler<ControlElement>
}
export function TextControl({
  multiline,
  onValueChange,
  placeholderColor,
  onEnter,
  style,
  ...props
}: TextControlProps): React.JSX.Element {
  const common = {
    ...props,
    className: `ui-input ${props.className ?? ''}`,
    style: { ...style, '--placeholder': placeholderColor } as CSSProperties,
    onChange: (event: React.ChangeEvent<ControlElement>) =>
      onValueChange?.(event.currentTarget.value),
    onKeyDown: (event: React.KeyboardEvent<ControlElement>) => {
      props.onKeyDown?.(event)
      if (event.key === 'Enter' && !event.nativeEvent.isComposing && !multiline) {
        onEnter?.()
      }
    }
  }
  return multiline ? (
    <textarea {...(common as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} />
  ) : (
    <input {...common} />
  )
}
export function Toggle({
  checked,
  onValueChange,
  trackColors,
  thumbColor,
  style,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  checked: boolean
  onValueChange(value: boolean): void
  trackColors?: {
    false?: string
    true?: string
  }
  thumbColor?: string
}): React.JSX.Element {
  return (
    <input
      {...props}
      type="checkbox"
      role="switch"
      checked={checked}
      onChange={(event) => onValueChange(event.currentTarget.checked)}
      className="ui-toggle"
      style={
        {
          ...style,
          '--toggle-track': checked ? trackColors?.true : trackColors?.false,
          '--toggle-thumb': thumbColor
        } as CSSProperties
      }
    />
  )
}
export function Spinner({
  color,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  color?: string
}): React.JSX.Element {
  return (
    <span {...props} role="progressbar" className="ui-spinner" style={{ color, ...props.style }} />
  )
}
/** Pull-to-refresh uses the region's own scroll position; vertical scrolling elsewhere remains native. */
export function RefreshRegion({
  onRefresh,
  busy,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  onRefresh(): void
  busy: boolean
}): React.JSX.Element {
  const [pull, setPull] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const refresh = useRef(onRefresh)
  const busyRef = useRef(busy)
  useEffect(() => {
    refresh.current = onRefresh
    busyRef.current = busy
  }, [onRefresh, busy])
  const gesture = useRef<{
    y: number
    x: number
    distance: number
  } | null>(null)
  useEffect(() => {
    const region = root.current
    if (!region) return
    const cancel = (): void => {
      gesture.current = null
      setPull(0)
    }
    const start = (event: TouchEvent): void => {
      if (
        busyRef.current ||
        region.scrollTop > 0 ||
        event.touches.length !== 1 ||
        (event.target instanceof Element &&
          event.target.closest('input,textarea,[contenteditable="true"],[role="slider"]'))
      )
        return
      const touch = event.touches[0]
      gesture.current = { x: touch.clientX, y: touch.clientY, distance: 0 }
    }
    const move = (event: TouchEvent): void => {
      const state = gesture.current
      if (!state) return
      if (event.touches.length !== 1 || busyRef.current) {
        cancel()
        return
      }
      const touch = event.touches[0],
        dy = touch.clientY - state.y,
        dx = touch.clientX - state.x
      if (Math.abs(dx) > 12 || dy < 0 || region.scrollTop > 0) {
        cancel()
        return
      }
      if (dy > 12) {
        if (event.cancelable) event.preventDefault()
        state.distance = Math.min(80, dy / 2)
        setPull(state.distance)
      }
    }
    const end = (): void => {
      const distance = gesture.current?.distance ?? 0
      cancel()
      if (distance >= 56 && !busyRef.current) refresh.current()
    }
    region.addEventListener('touchstart', start, { passive: true })
    region.addEventListener('touchmove', move, { passive: false })
    region.addEventListener('touchend', end)
    region.addEventListener('touchcancel', cancel)
    return () => {
      region.removeEventListener('touchstart', start)
      region.removeEventListener('touchmove', move)
      region.removeEventListener('touchend', end)
      region.removeEventListener('touchcancel', cancel)
    }
  }, [])
  return (
    <div {...props} ref={root} aria-busy={busy}>
      {pull > 0 ? (
        <div className="ui-refresh" style={{ height: pull }} role="status">
          {pull >= 56 ? 'Отпустите для обновления' : 'Потяните для обновления'}
        </div>
      ) : null}
      {children}
    </div>
  )
}
