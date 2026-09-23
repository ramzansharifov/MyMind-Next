export const FINANCE_TAB_IDS = [
  'home',
  'templates',
  'accounts',
  'transactions',
  'tags',
  'limits',
  'reports'
] as const

export type FinanceTab = (typeof FINANCE_TAB_IDS)[number]
export type FinanceTabSwipeDirection = 'previous' | 'next'

export function adjacentFinanceTab(
  tab: FinanceTab,
  direction: FinanceTabSwipeDirection
): FinanceTab {
  const index = FINANCE_TAB_IDS.indexOf(tab)
  if (index < 0) return tab

  const nextIndex = direction === 'next' ? index + 1 : index - 1
  return FINANCE_TAB_IDS[Math.max(0, Math.min(FINANCE_TAB_IDS.length - 1, nextIndex))]
}

export function financeSwipeDirection(
  dx: number,
  dy: number,
  velocityX = 0
): FinanceTabSwipeDirection | null {
  const horizontal = Math.abs(dx)
  const vertical = Math.abs(dy)

  if (horizontal <= vertical * 1.35) return null

  const enoughDistance = horizontal >= 72
  const quickFlick = horizontal >= 36 && Math.abs(velocityX) >= 0.55
  if (!enoughDistance && !quickFlick) return null

  return dx < 0 ? 'next' : 'previous'
}
