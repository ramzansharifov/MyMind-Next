import type { FinanceExchangeRate } from '../../shared/contracts/finance'
import { FINANCE_RATE_SCALE, convertMinorUsingRates } from '../../shared/finance-money'

export interface FinanceRateBook {
  baseCurrencyCode: string
  rates: Map<string, number>
}

export function createFinanceRateBook(
  baseCurrencyCode: string,
  rates: FinanceExchangeRate[]
): FinanceRateBook {
  const map = new Map<string, number>([[baseCurrencyCode, FINANCE_RATE_SCALE]])

  for (const rate of rates) {
    if (rate.baseCurrencyCode === baseCurrencyCode) {
      map.set(rate.currencyCode, rate.rateScaled)
    }
  }

  return { baseCurrencyCode, rates: map }
}

export function convertFinanceMinor(
  rateBook: FinanceRateBook,
  amountMinor: number,
  sourceCurrency: string,
  targetCurrency: string
): number | null {
  const sourceRate = rateBook.rates.get(sourceCurrency)
  const targetRate = rateBook.rates.get(targetCurrency)

  if (sourceRate === undefined || targetRate === undefined) {
    return null
  }

  return convertMinorUsingRates({
    amountMinor,
    sourceCurrency,
    targetCurrency,
    sourceRateScaled: sourceRate,
    targetRateScaled: targetRate
  })
}
