'use client'

import { useLayoutEffect, useRef, type HTMLAttributes } from 'react'

/** Single-line labels shrink to their declared lower bound when their container gets narrower. */
export function FittedText({
  minScale,
  children,
  style,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { minScale?: number }): React.JSX.Element {
  const ref = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const base =
      typeof style?.fontSize === 'number'
        ? style.fontSize
        : parseFloat(String(style?.fontSize ?? getComputedStyle(element).fontSize))
    const context = document.createElement('canvas').getContext('2d')
    if (!context || !Number.isFinite(base) || base <= 0) return
    const fit = (): void => {
      element.style.fontSize = `${base}px`
      const available = element.clientWidth
      if (!available) return
      const computed = getComputedStyle(element)
      context.font = `${computed.fontStyle} ${computed.fontWeight} ${base}px ${computed.fontFamily}`
      const text = element.textContent ?? ''
      const spacing = parseFloat(computed.letterSpacing) || 0
      const width = context.measureText(text).width + Math.max(0, text.length - 1) * spacing
      const lower = Math.max(0.01, Math.min(1, minScale ?? 4 / base))
      const size = base * Math.max(lower, Math.min(1, available / Math.max(1, width)))
      element.style.fontSize = `${size}px`
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(element)
    if (element.parentElement) observer.observe(element.parentElement)
    return () => observer.disconnect()
  }, [
    children,
    minScale,
    style?.fontSize,
    style?.fontFamily,
    style?.fontWeight,
    style?.letterSpacing
  ])
  return (
    <span
      {...props}
      ref={ref}
      data-fit-text
      className={`ui-text ui-fitted-text ${props.className ?? ''}`}
      style={style}
    >
      {children}
    </span>
  )
}
