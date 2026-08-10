import type { FinanceReport, FinanceTransferFlow } from './finance'

export interface FinanceReportAccountActivity {
  accountId: string
  accountName: string
  currencyCode: string
  incomeMinor: number
  expenseMinor: number
  transferInMinor: number
  transferOutMinor: number
  netMinor: number
  operationCount: number
}

export interface FinanceReportTransferFlow extends FinanceTransferFlow {
  convertedAmountMinor: number | null
}

export type FinanceReportAnalytics = Omit<FinanceReport, 'transferFlows'> & {
  incomeCount: number
  expenseCount: number
  transferCount: number
  averageIncomeMinor: number
  averageDailyExpenseMinor: number
  transferVolumeMinor: number
  savingsRatePercent: number | null
  balanceStartMinor: number | null
  balanceEndMinor: number | null
  balanceChangeMinor: number | null
  comparisonIncomeMinor: number
  comparisonExpenseMinor: number
  comparisonNetMinor: number
  incomeChangePercent: number | null
  expenseChangePercent: number | null
  netChangePercent: number | null
  comparisonMissingRateCurrencies: string[]
  accountActivity: FinanceReportAccountActivity[]
  transferFlows: FinanceReportTransferFlow[]
}
