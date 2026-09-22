import type {
  FinanceTagType,
  FinanceUserTransactionType
} from '@mymind/contracts/finance'

export const FINANCE_INCOME_TONE = '#34d399'
export const FINANCE_EXPENSE_TONE = '#f87171'

export function financeOperationTone(
  type: FinanceUserTransactionType,
  accent: string
): string {
  return type === 'income' ? FINANCE_INCOME_TONE : type === 'expense' ? FINANCE_EXPENSE_TONE : accent
}

export function financeTagTone(type: FinanceTagType, accent: string): string {
  return type === 'income' ? FINANCE_INCOME_TONE : type === 'expense' ? FINANCE_EXPENSE_TONE : accent
}
