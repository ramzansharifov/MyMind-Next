import { useSafeArea, Action } from '../../../ui/browser'
import { type PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react'
import { AppIcon } from './icons'
import {
  ToastContext,
  type ToastApi,
  type ToastInput,
  type ToastKind,
  type ToastPlacement
} from './toast-context'
import { useTheme } from './theme'
type ToastRecord = ToastInput & {
  id: string
}
function toastId(input: ToastInput): string {
  if (input.kind === 'info' && input.key) return `${input.kind}:${input.key}`
  return `${input.kind}:${input.key ?? 'app'}:${input.message}`
}
function defaultDuration(kind: ToastKind): number {
  if (kind === 'error') return 5200
  if (kind === 'info') return 1000
  return 2600
}
function defaultPlacement(kind: ToastKind): ToastPlacement {
  return kind === 'info' ? 'top' : 'bottom'
}
export function ToastProvider({ children }: PropsWithChildren): React.JSX.Element {
  const theme = useTheme()
  const insets = useSafeArea()
  const [toasts, setToasts] = useState<ToastRecord[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const dismiss = useCallback((id: string): void => {
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])
  const show = useCallback((input: ToastInput): void => {
    const id = toastId(input)
    const previousTimer = timers.current.get(id)
    if (previousTimer) clearTimeout(previousTimer)
    const record: ToastRecord = {
      ...input,
      id,
      placement: input.placement ?? defaultPlacement(input.kind)
    }
    setToasts((current) => {
      const withoutDuplicate = current.filter((toast) => toast.id !== id)
      return [record, ...withoutDuplicate].slice(0, 4)
    })
    timers.current.set(
      id,
      setTimeout(
        () => {
          timers.current.delete(id)
          setToasts((current) => current.filter((toast) => toast.id !== id))
        },
        input.durationMs ?? defaultDuration(input.kind)
      )
    )
  }, [])
  useEffect(
    () => () => {
      for (const timer of timers.current.values()) clearTimeout(timer)
      timers.current.clear()
    },
    []
  )
  const api: ToastApi = {
    show,
    success: (message, key) => show({ kind: 'success', message, key }),
    error: (message, key) => show({ kind: 'error', message, key }),
    info: (message, key, durationMs) =>
      show({ kind: 'info', message, key, durationMs, placement: 'top' })
  }
  const renderToast = (toast: ToastRecord): React.JSX.Element => {
    const color =
      toast.kind === 'error' ? theme.error : toast.kind === 'info' ? theme.accent : '#22c55e'
    return (
      <Action
        key={toast.id}
        role={'alert'}
        aria-label={toast.message}
        onClick={() => dismiss(toast.id)}
        style={{
          width: '100%',
          maxWidth: 420,
          minHeight: toast.kind === 'info' ? 44 : 52,
          flexDirection: 'row',
          alignItems: 'center',
          gap: toast.kind === 'info' ? 8 : 10,
          paddingInline: toast.kind === 'info' ? 12 : 14,
          paddingBlock: toast.kind === 'info' ? 9 : 11,
          borderWidth: 1,
          borderColor: color + '35',
          borderRadius: 16,
          backgroundColor: theme.raised,
          opacity: 1,
          boxShadow: `0px ${5}px ${10}px color-mix(in srgb, ${'#000000'} calc(${0.2} * 100%), transparent)`
        }}
        pressedStyle={{
          opacity: 0.76
        }}
      >
        <div
          className="ui-stack"
          style={{
            width: toast.kind === 'info' ? 26 : 30,
            height: toast.kind === 'info' ? 26 : 30,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: toast.kind === 'info' ? 9 : 10,
            backgroundColor: color + '16'
          }}
        >
          <AppIcon
            name={toast.kind === 'success' ? 'check' : 'info'}
            size={toast.kind === 'info' ? 14 : 16}
            color={color}
          />
        </div>

        <span
          className="ui-text"
          data-lines={2}
          style={{
            flex: '1 1 0%',
            color: theme.text,
            fontSize: toast.kind === 'info' ? 13 : 13.5,
            lineHeight: toast.kind === 'info' ? '18px' : '19px',
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2
          }}
        >
          {toast.message}
        </span>
      </Action>
    )
  }
  const topToasts = toasts.filter((toast) => toast.placement === 'top')
  const bottomToasts = toasts.filter((toast) => toast.placement !== 'top')
  return (
    <ToastContext.Provider value={api}>
      <div
        className="ui-stack"
        style={{
          flex: '1 1 0%'
        }}
      >
        {children}

        <div
          className="ui-stack"
          data-pass-through="true"
          style={{
            position: 'absolute',
            top: insets.top + 10,
            left: 12,
            right: 12,
            alignItems: 'center',
            gap: 8,
            zIndex: 100,
            pointerEvents: 'none'
          }}
        >
          {topToasts.map(renderToast)}
        </div>

        <div
          className="ui-stack"
          data-pass-through="true"
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            bottom: 82,
            alignItems: 'flex-end',
            gap: 8,
            zIndex: 100,
            pointerEvents: 'none'
          }}
        >
          {bottomToasts.map(renderToast)}
        </div>
      </div>
    </ToastContext.Provider>
  )
}
