export const FINANCE_RATE_SCALE = 1_000_000
export const FINANCE_MAX_MINOR = 9_000_000_000_000

const CURRENCY_FRACTION_DIGITS: Readonly<Record<string, number>> = {
  BHD: 3,
  IQD: 3,
  JOD: 3,
  KWD: 3,
  OMR: 3,
  TND: 3,
  CLP: 0,
  JPY: 0,
  KRW: 0,
  PYG: 0,
  VND: 0,
  XAF: 0,
  XOF: 0,
  XPF: 0
}

export function getCurrencyFractionDigits(currencyCode: string): number {
  return CURRENCY_FRACTION_DIGITS[currencyCode.toUpperCase()] ?? 2
}

export function assertSafeMinor(value: number, label = 'Сумма'): number {
  if (!Number.isSafeInteger(value) || Math.abs(value) > FINANCE_MAX_MINOR) {
    throw new Error(`${label} выходит за допустимый диапазон`)
  }

  return value
}

function pow10BigInt(exponent: number): bigint {
  return 10n ** BigInt(exponent)
}

function roundFractionToDigits(fraction: string, digits: number): { value: bigint; carry: bigint } {
  if (digits === 0) {
    const shouldRound = Number(fraction[0] ?? '0') >= 5
    return { value: 0n, carry: shouldRound ? 1n : 0n }
  }

  const retained = fraction.slice(0, digits).padEnd(digits, '0')
  const nextDigit = Number(fraction[digits] ?? '0')
  let value = BigInt(retained || '0')
  let carry = 0n

  if (nextDigit >= 5) {
    value += 1n
    const base = pow10BigInt(digits)
    if (value >= base) {
      value = 0n
      carry = 1n
    }
  }

  return { value, carry }
}

export function parseMoneyToMinor(input: string, currencyCode: string): number {
  const normalized = input
    .trim()
    .replace(/[\s\u00a0\u202f]/g, '')
    .replace(',', '.')

  if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalized)) {
    throw new Error('Введите корректную денежную сумму')
  }

  const negative = normalized.startsWith('-')
  const unsigned = normalized.replace(/^[+-]/, '')
  const [wholePart, fractionPart = ''] = unsigned.split('.')
  const fractionDigits = getCurrencyFractionDigits(currencyCode)
  const roundedFraction = roundFractionToDigits(fractionPart, fractionDigits)
  const scale = pow10BigInt(fractionDigits)
  let result = (BigInt(wholePart) + roundedFraction.carry) * scale + roundedFraction.value

  if (negative) {
    result = -result
  }

  if (result > BigInt(FINANCE_MAX_MINOR) || result < BigInt(-FINANCE_MAX_MINOR)) {
    throw new Error('Сумма выходит за допустимый диапазон')
  }

  return Number(result)
}

export function formatMinorPlain(amountMinor: number, currencyCode: string): string {
  assertSafeMinor(amountMinor)
  const digits = getCurrencyFractionDigits(currencyCode)
  const negative = amountMinor < 0
  const absolute = BigInt(Math.abs(amountMinor))
  const scale = pow10BigInt(digits)
  const whole = absolute / scale
  const fraction = absolute % scale
  const sign = negative ? '-' : ''

  if (digits === 0) {
    return `${sign}${whole}`
  }

  return `${sign}${whole}.${fraction.toString().padStart(digits, '0')}`
}

export function formatMoneyMinor(
  amountMinor: number,
  currencyCode: string,
  locale = 'ru-RU'
): string {
  const normalizedCurrency = currencyCode.toUpperCase()
  const digits = getCurrencyFractionDigits(normalizedCurrency)
  const major = amountMinor / 10 ** digits

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: normalizedCurrency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(major)
  } catch {
    return `${formatMinorPlain(amountMinor, normalizedCurrency)} ${normalizedCurrency}`
  }
}

function divideRounded(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) {
    throw new Error('Курс валюты должен быть положительным')
  }

  const negative = numerator < 0n
  const absolute = negative ? -numerator : numerator
  const quotient = absolute / denominator
  const remainder = absolute % denominator
  const rounded = remainder * 2n >= denominator ? quotient + 1n : quotient

  return negative ? -rounded : rounded
}

export function convertMinorUsingRates(input: {
  amountMinor: number
  sourceCurrency: string
  targetCurrency: string
  sourceRateScaled: number
  targetRateScaled: number
}): number {
  assertSafeMinor(input.amountMinor)

  if (
    !Number.isSafeInteger(input.sourceRateScaled) ||
    !Number.isSafeInteger(input.targetRateScaled) ||
    input.sourceRateScaled <= 0 ||
    input.targetRateScaled <= 0
  ) {
    throw new Error('Курс валюты должен быть положительным целым числом')
  }

  if (input.sourceCurrency === input.targetCurrency) {
    return input.amountMinor
  }

  const sourceDigits = getCurrencyFractionDigits(input.sourceCurrency)
  const targetDigits = getCurrencyFractionDigits(input.targetCurrency)
  const numerator =
    BigInt(input.amountMinor) * BigInt(input.sourceRateScaled) * pow10BigInt(targetDigits)
  const denominator = BigInt(input.targetRateScaled) * pow10BigInt(sourceDigits)
  const converted = divideRounded(numerator, denominator)

  if (converted > BigInt(FINANCE_MAX_MINOR) || converted < BigInt(-FINANCE_MAX_MINOR)) {
    throw new Error('Результат конвертации выходит за допустимый диапазон')
  }

  return Number(converted)
}
