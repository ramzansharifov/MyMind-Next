import type {
  FinanceAccountType,
  FinanceTagType,
  FinanceTransactionType
} from '../../../../../shared/contracts/finance'

export const financeAccountTypeLabels: Record<FinanceAccountType, string> = {
  cash: 'Наличные',
  card: 'Карта',
  bank: 'Банковский счёт',
  wallet: 'Электронный кошелёк',
  savings: 'Накопительный счёт',
  other: 'Другой'
}

export const financeTagTypeLabels: Record<FinanceTagType, string> = {
  income: 'Доходы',
  expense: 'Расходы',
  both: 'Универсальный'
}

export const financeTransactionTypeLabels: Record<FinanceTransactionType, string> = {
  income: 'Доход',
  expense: 'Расход',
  transfer: 'Перевод',
  adjustment: 'Системная корректировка'
}

export function getFinanceErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Не удалось выполнить операцию'
}

export function toDateTimeLocalValue(timestamp: number): string {
  const date = new Date(timestamp)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(timestamp - offset).toISOString().slice(0, 16)
}

export function fromDateTimeLocalValue(value: string): number {
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) {
    throw new Error('Введите корректную дату и время')
  }
  return timestamp
}

export function toDateInputValue(timestamp: number): string {
  const date = new Date(timestamp)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(timestamp - offset).toISOString().slice(0, 10)
}

export function fromDateInputValue(value: string, endOfDay = false): number {
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`)
  const timestamp = date.getTime()
  if (!Number.isFinite(timestamp)) throw new Error('Введите корректную дату')
  return timestamp
}

export function currentMonthPeriod(now = Date.now()): { from: number; to: number } {
  const date = new Date(now)
  return {
    from: new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
    to: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999).getTime()
  }
}
