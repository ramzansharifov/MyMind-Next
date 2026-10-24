'use client'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { subscribeBack } from './lifecycle'
let nextLayer = 0
const layers: number[] = []
let previousBodyOverflow = ''
const focusable =
  'button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex]:not([tabindex="-1"])'
/** Modal portals share a stack for Escape, browser Back, focus trapping and body scroll lock. */
export function DialogLayer({
  open,
  onClose,
  onAfterClose,
  transition = 'fade',
  label,
  children
}: {
  open: boolean
  onClose(): void
  onAfterClose?(): void
  transition?: string
  label?: string
  children: ReactNode
}): React.JSX.Element | null {
  const [present, setPresent] = useState(open)
  const root = useRef<HTMLDivElement>(null)
  const [layer] = useState(() => ++nextLayer)
  const close = useRef(onClose),
    after = useRef(onAfterClose)
  useLayoutEffect(() => {
    close.current = onClose
    after.current = onAfterClose
  }, [onClose, onAfterClose])
  useEffect(() => {
    if (open) {
      queueMicrotask(() => setPresent(true))
      return
    }
    if (!present) return
    const timer = setTimeout(
      () => {
        setPresent(false)
        queueMicrotask(() => after.current?.())
      },
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 250
    )
    return () => clearTimeout(timer)
  }, [open, present])
  useLayoutEffect(() => {
    if (!present || !open) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (layers.length === 0) previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    layers.push(layer)
    const app = document.querySelector<HTMLElement>('.pwa')
    if (app) app.inert = true
    const top = (): boolean => layers.at(-1) === layer
    const focus = (): void => {
      const element = root.current
      if (!element) return
      if (element.contains(document.activeElement) && document.activeElement !== element) return
      const target =
        element.querySelector<HTMLElement>('[autofocus]') ??
        element.querySelector<HTMLElement>(focusable) ??
        element
      target.focus({ preventScroll: true })
    }
    const frame = requestAnimationFrame(focus)
    const key = (event: KeyboardEvent): void => {
      if (!top()) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        close.current()
        return
      }
      if (event.key !== 'Tab') return
      const elements = [...(root.current?.querySelectorAll<HTMLElement>(focusable) ?? [])].filter(
        (e) => e.getClientRects().length > 0 && e.getAttribute('aria-hidden') !== 'true'
      )
      const first = elements[0],
        last = elements.at(-1)
      if (!first) {
        event.preventDefault()
        root.current?.focus()
        return
      }
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === root.current)
      ) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    const contain = (event: FocusEvent): void => {
      if (top() && event.target instanceof Node && !root.current?.contains(event.target)) focus()
    }
    const back = subscribeBack(() => {
      if (!top()) return false
      close.current()
      return true
    })
    document.addEventListener('keydown', key, true)
    document.addEventListener('focusin', contain)
    return () => {
      cancelAnimationFrame(frame)
      back.remove()
      document.removeEventListener('keydown', key, true)
      document.removeEventListener('focusin', contain)
      const index = layers.indexOf(layer)
      if (index >= 0) layers.splice(index, 1)
      if (layers.length === 0) document.body.style.overflow = previousBodyOverflow
      if (layers.length === 0 && app) app.inert = false
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [present, open, layer])
  if (!present || typeof document === 'undefined') return null
  return createPortal(
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      aria-hidden={!open || undefined}
      tabIndex={-1}
      data-state={open ? 'open' : 'closed'}
      data-transition={transition}
      className="ui-dialog-layer"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      style={{ zIndex: 1000 + layer }}
    >
      {children}
    </div>,
    document.body
  )
}
