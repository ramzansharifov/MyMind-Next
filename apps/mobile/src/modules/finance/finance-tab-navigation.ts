export const FINANCE_TAB_IDS = [
  'home',
  'transactions',
  'templates',
  'limits',
  'accounts',
  'tags',
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
