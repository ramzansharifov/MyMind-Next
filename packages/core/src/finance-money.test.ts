import { describe, expect, it } from 'vitest'
import {
  FINANCE_RATE_SCALE,
  convertMinorUsingRates,
  formatMinorPlain,
  parseMoneyToMinor
} from './finance-money'

describe('shared Finance money helpers', () => {
  it('parses localized amounts and rounds only at the currency boundary', () => {
    expect(parseMoneyToMinor('1 250,50', 'TJS')).toBe(125_050)
    expect(parseMoneyToMinor('12.3456', 'USD')).toBe(1_235)
    expect(parseMoneyToMinor('1250,5', 'JPY')).toBe(1_251)
    expect(formatMinorPlain(-125_050, 'TJS')).toBe('-1250.50')
  })

  it('rejects invalid and overflowing values', () => {
    expect(() => parseMoneyToMinor('12,3,4', 'TJS')).toThrow('корректную')
    expect(() => parseMoneyToMinor('999999999999999999999', 'USD')).toThrow('диапазон')
  })

  it('converts through scaled manual rates using integer arithmetic', () => {
    expect(
      convertMinorUsingRates({
        amountMinor: 100_00,
        sourceCurrency: 'USD',
        targetCurrency: 'TJS',
        sourceRateScaled: 9_200_000,
        targetRateScaled: FINANCE_RATE_SCALE
      })
    ).toBe(920_00)
  })

  it('rounds cross-currency conversions without floating-point persistence', () => {
    expect(
      convertMinorUsingRates({
        amountMinor: 1,
        sourceCurrency: 'USD',
        targetCurrency: 'JPY',
        sourceRateScaled: 150_000_000,
        targetRateScaled: FINANCE_RATE_SCALE
      })
    ).toBe(2)
  })
})
