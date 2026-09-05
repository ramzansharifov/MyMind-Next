import {
  Banknote,
  Briefcase,
  Car,
  CircleDollarSign,
  Coins,
  CreditCard,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  PiggyBank,
  Plane,
  Receipt,
  Repeat2,
  ShoppingCart,
  Tag,
  TrendingUp,
  Utensils,
  Wallet,
  type LucideIcon
} from 'lucide-react'

import type { FinanceIconName } from '../../../../../shared/contracts/finance'

const financeIconMap: Record<FinanceIconName, LucideIcon> = {
  wallet: Wallet,
  'credit-card': CreditCard,
  banknote: Banknote,
  landmark: Landmark,
  'piggy-bank': PiggyBank,
  coins: Coins,
  'shopping-cart': ShoppingCart,
  utensils: Utensils,
  car: Car,
  home: Home,
  'heart-pulse': HeartPulse,
  'graduation-cap': GraduationCap,
  briefcase: Briefcase,
  gift: Gift,
  plane: Plane,
  receipt: Receipt,
  'circle-dollar-sign': CircleDollarSign,
  'trending-up': TrendingUp,
  'repeat-2': Repeat2,
  tag: Tag
}

export function FinanceIcon({
  name,
  className
}: {
  name: FinanceIconName
  className?: string
}): React.JSX.Element {
  const Icon = financeIconMap[name]
  return <Icon aria-hidden="true" className={className} />
}
