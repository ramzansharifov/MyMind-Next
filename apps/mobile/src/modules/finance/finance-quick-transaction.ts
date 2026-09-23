import type {
  FinanceTagSummary,
  FinanceUserTransactionType
} from '@mymind/contracts/finance'

export type FinanceQuickTransactionStage =
  | 'source-account'
  | 'destination-account'
  | 'tag'
  | 'amount'

export function financeQuickTransactionStages(
  type: FinanceUserTransactionType
): readonly FinanceQuickTransactionStage[] {
  return type === 'transfer'
    ? ['source-account', 'destination-account', 'amount']
    : ['source-account', 'tag', 'amount']
}

export function financeQuickCompatibleTags(
  tags: readonly FinanceTagSummary[],
  type: FinanceUserTransactionType
): FinanceTagSummary[] {
  if (type === 'transfer') return []
  return tags.filter((tag) => tag.type === 'both' || tag.type === type)
}
