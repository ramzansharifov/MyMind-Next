export type TabSwipeDirection = 'previous' | 'next'

export function adjacentTab<T extends string>(
  tabs: readonly T[],
  value: T,
  direction: TabSwipeDirection
): T {
  const index = tabs.indexOf(value)
  if (index < 0) return value

  const nextIndex = direction === 'next' ? index + 1 : index - 1
  return tabs[Math.max(0, Math.min(tabs.length - 1, nextIndex))] ?? value
}

export function tabSwipeDirection(
  dx: number,
  dy: number,
  velocityX = 0
): TabSwipeDirection | null {
  const horizontal = Math.abs(dx)
  const vertical = Math.abs(dy)

  if (horizontal <= vertical * 1.35) return null

  const enoughDistance = horizontal >= 72
  const quickFlick = horizontal >= 36 && Math.abs(velocityX) >= 0.55
  if (!enoughDistance && !quickFlick) return null

  return dx < 0 ? 'next' : 'previous'
}
