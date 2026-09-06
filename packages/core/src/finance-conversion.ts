import type { FinanceExchangeRate } from '@mymind/contracts/finance'
import { FINANCE_RATE_SCALE, convertMinorUsingRates } from './finance-money'

export interface FinanceRateBook {
  baseCurrencyCode: string
  rates: Map<string, number>
}

export function createFinanceRateBook(
  baseCurrencyCode: string,
  rates: FinanceExchangeRate[]
): FinanceRateBook {
  const normalizedBase = baseCurrencyCode.toUpperCase()
  const map = new Map<string, number>([[normalizedBase, FINANCE_RATE_SCALE]])

  for (const rate of rates) {
    if (rate.baseCurrencyCode === normalizedBase) {
      map.set(rate.currencyCode, rate.rateScaled)
    }
  }

  return { baseCurrencyCode: normalizedBase, rates: map }
}

export function convertFinanceMinor(
  rateBook: FinanceRateBook,
  amountMinor: number,
  sourceCurrency: string,
  targetCurrency: string
): number | null {
  const sourceRate = rateBook.rates.get(sourceCurrency)
  const targetRate = rateBook.rates.get(targetCurrency)

  if (sourceRate === undefined || targetRate === undefined) return null

  return convertMinorUsingRates({
    amountMinor,
    sourceCurrency,
    targetCurrency,
    sourceRateScaled: sourceRate,
    targetRateScaled: targetRate
  })
}
