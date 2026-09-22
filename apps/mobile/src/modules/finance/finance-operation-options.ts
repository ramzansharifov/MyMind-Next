import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  type LucideIcon
} from 'lucide-react-native'
import type { FinanceUserTransactionType } from '@mymind/contracts/finance'

export const FINANCE_OPERATION_OPTIONS: ReadonlyArray<{
  value: FinanceUserTransactionType
  label: string
  icon: LucideIcon
}> = [
  { value: 'income', label: 'Доход', icon: ArrowDownLeft },
  { value: 'expense', label: 'Расход', icon: ArrowUpRight },
  { value: 'transfer', label: 'Перевод', icon: ArrowRightLeft }
]
