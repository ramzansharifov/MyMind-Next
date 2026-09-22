import {
  FINANCE_TAG_COLORS,
  type FinanceTagType,
  type FinanceUserTransactionType
} from '@mymind/contracts/finance'

export function financeOperationTone(
  type: FinanceUserTransactionType,
  accent: string
): string {
  return type === 'income'
    ? FINANCE_TAG_COLORS.income
    : type === 'expense'
      ? FINANCE_TAG_COLORS.expense
      : accent
}

export function financeTagTone(type: FinanceTagType, accent: string): string {
  return type === 'both' ? accent : FINANCE_TAG_COLORS[type]
}
