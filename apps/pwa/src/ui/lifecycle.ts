'use client'
import { useSyncExternalStore } from 'react'
const backHandlers = new Set<() => boolean>()
export function subscribeBack(handler: () => boolean): {
  remove(): void
} {
  backHandlers.add(handler)
  return {
    remove: () => {
      backHandlers.delete(handler)
    }
  }
}
export function dispatchBack(): boolean {
  for (const handler of [...backHandlers].reverse()) if (handler()) return true
  return false
}
export function blurActiveElement(): void {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
}
export async function openExternalUrl(value: string): Promise<void> {
  const url = new URL(value)
  if (!['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol))
    throw new Error('Неподдерживаемая ссылка')
  window.open(url.href, '_blank', 'noopener,noreferrer')
}
function subscribeViewport(callback: () => void): () => void {
  window.addEventListener('resize', callback)
  window.visualViewport?.addEventListener('resize', callback)
  return () => {
    window.removeEventListener('resize', callback)
    window.visualViewport?.removeEventListener('resize', callback)
  }
}
const viewportSnapshot = (): string =>
  `${window.innerWidth},${Math.min(window.innerHeight, window.visualViewport?.height ?? window.innerHeight)}`
export function useViewport(): {
  width: number
  height: number
} {
  const value = useSyncExternalStore(subscribeViewport, viewportSnapshot, () => '390,844')
  const [width, height] = value.split(',').map(Number)
  return { width, height }
}
const themeQuery = (): MediaQueryList => window.matchMedia('(prefers-color-scheme: dark)')
const subscribeTheme = (callback: () => void): (() => void) => {
  const query = themeQuery()
  query.addEventListener('change', callback)
  return () => query.removeEventListener('change', callback)
}
export function usePreferredTheme(): 'dark' | 'light' {
  return useSyncExternalStore(
    subscribeTheme,
    () => (themeQuery().matches ? 'dark' : 'light'),
    () => 'dark'
  )
}
/** CSS env() is measured once per viewport update for overlays rendered outside the app shell. */
export function useSafeArea(): {
  top: number
  bottom: number
  left: number
  right: number
} {
  useSyncExternalStore(subscribeViewport, viewportSnapshot, () => '390,844')
  if (typeof document === 'undefined') return { top: 0, bottom: 0, left: 0, right: 0 }
  const style = getComputedStyle(document.documentElement)
  return Object.fromEntries(
    ['top', 'bottom', 'left', 'right'].map((edge) => [
      edge,
      parseFloat(style.getPropertyValue('--safe-' + edge)) || 0
    ])
  ) as {
    top: number
    bottom: number
    left: number
    right: number
  }
}
export function subscribePageHidden(callback: () => void): {
  remove(): void
} {
  const visibility = (): void => {
    if (document.visibilityState === 'hidden') callback()
  }
  document.addEventListener('visibilitychange', visibility)
  window.addEventListener('pagehide', callback)
  return {
    remove: () => {
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('pagehide', callback)
    }
  }
}
