import type {
  FinanceAccountSummary,
  FinanceTemplate,
  FinanceUserTransactionType
} from '@mymind/contracts/finance'
import { formatMinorPlain } from '@mymind/core/finance-money'

export interface FinanceTemplateTransactionDefaults {
  type: FinanceUserTransactionType
  accountId: string
  destinationAccountId: string
  tagId: string
  amount: string
  date: string
  time: string
  comment: string
}

function localDateKey(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function localTimeKey(timestamp: number): string {
  const date = new Date(timestamp)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function financeTemplateTransactionDefaults(
  template: FinanceTemplate,
  accounts: FinanceAccountSummary[],
  now = Date.now()
): FinanceTemplateTransactionDefaults {
  const sourceCurrency =
    accounts.find((account) => account.id === template.sourceAccountId)?.currencyCode ?? 'TJS'

  return {
    type: template.type,
    accountId: template.sourceAccountId ?? '',
    destinationAccountId: template.destinationAccountId ?? '',
    tagId: template.tagId ?? '',
    amount: template.sourceAccountId
      ? formatMinorPlain(template.sourceAmountMinor, sourceCurrency)
      : '',
    date: localDateKey(now),
    time: localTimeKey(now),
    comment: template.comment
  }
}
