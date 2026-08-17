import {
  Briefcase,
  Code2,
  Database,
  Folder,
  Gamepad2,
  Globe2,
  Home,
  KeyRound,
  Shield,
  ShoppingCart,
  User,
  Wallet,
  type LucideIcon
} from 'lucide-react'

import type {
  PasswordGroupColor,
  PasswordGroupIcon,
  PasswordItemType,
  PasswordSecurityIssue,
  PasswordStrength
} from '../../../../shared/contracts/passwords'

export const PASSWORD_TYPE_OPTIONS: Array<{ value: PasswordItemType; label: string }> = [
  { value: 'login', label: 'Аккаунт' },
  { value: 'password', label: 'Только пароль' }
]

export const PASSWORD_GROUP_ICON_OPTIONS: Array<{
  value: PasswordGroupIcon
  label: string
  icon: LucideIcon
}> = [
  { value: 'folder', label: 'Папка', icon: Folder },
  { value: 'briefcase', label: 'Работа', icon: Briefcase },
  { value: 'home', label: 'Дом', icon: Home },
  { value: 'user', label: 'Личное', icon: User },
  { value: 'globe', label: 'Интернет', icon: Globe2 },
  { value: 'code', label: 'Разработка', icon: Code2 },
  { value: 'database', label: 'Сервисы', icon: Database },
  { value: 'gamepad', label: 'Игры', icon: Gamepad2 },
  { value: 'shopping-cart', label: 'Покупки', icon: ShoppingCart },
  { value: 'wallet', label: 'Финансы', icon: Wallet },
  { value: 'key-round', label: 'Доступы', icon: KeyRound },
  { value: 'shield', label: 'Безопасность', icon: Shield }
]

export const PASSWORD_GROUP_COLOR_OPTIONS: Array<{
  value: PasswordGroupColor
  label: string
}> = [
  { value: 'violet', label: 'Фиолетовый' },
  { value: 'blue', label: 'Синий' },
  { value: 'cyan', label: 'Голубой' },
  { value: 'emerald', label: 'Зелёный' },
  { value: 'amber', label: 'Жёлтый' },
  { value: 'orange', label: 'Оранжевый' },
  { value: 'rose', label: 'Красный' },
  { value: 'pink', label: 'Розовый' }
]

export const passwordGroupColorClasses: Record<
  PasswordGroupColor,
  { soft: string; text: string; border: string; dot: string }
> = {
  violet: {
    soft: 'bg-violet-500/10',
    text: 'text-violet-300',
    border: 'border-violet-400/20',
    dot: 'bg-violet-400'
  },
  blue: {
    soft: 'bg-blue-500/10',
    text: 'text-blue-300',
    border: 'border-blue-400/20',
    dot: 'bg-blue-400'
  },
  cyan: {
    soft: 'bg-cyan-500/10',
    text: 'text-cyan-300',
    border: 'border-cyan-400/20',
    dot: 'bg-cyan-400'
  },
  emerald: {
    soft: 'bg-emerald-500/10',
    text: 'text-emerald-300',
    border: 'border-emerald-400/20',
    dot: 'bg-emerald-400'
  },
  amber: {
    soft: 'bg-amber-500/10',
    text: 'text-amber-300',
    border: 'border-amber-400/20',
    dot: 'bg-amber-400'
  },
  orange: {
    soft: 'bg-orange-500/10',
    text: 'text-orange-300',
    border: 'border-orange-400/20',
    dot: 'bg-orange-400'
  },
  rose: {
    soft: 'bg-rose-500/10',
    text: 'text-rose-300',
    border: 'border-rose-400/20',
    dot: 'bg-rose-400'
  },
  pink: {
    soft: 'bg-pink-500/10',
    text: 'text-pink-300',
    border: 'border-pink-400/20',
    dot: 'bg-pink-400'
  }
}

export function PasswordGroupIconGlyph({
  icon,
  className
}: {
  icon: PasswordGroupIcon
  className?: string
}): React.JSX.Element {
  const Icon = PASSWORD_GROUP_ICON_OPTIONS.find((option) => option.value === icon)?.icon ?? Folder
  return <Icon aria-hidden="true" className={className} />
}

export function passwordTypeLabel(type: PasswordItemType): string {
  return PASSWORD_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? 'Пароль'
}

export function passwordStrengthLabel(strength: PasswordStrength): string {
  if (strength === 'strong') return 'Сильный'
  if (strength === 'fair') return 'Средний'
  return 'Слабый'
}

export function passwordStrengthClassName(strength: PasswordStrength): string {
  if (strength === 'strong') return 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
  if (strength === 'fair') return 'border-amber-400/20 bg-amber-500/10 text-amber-300'
  return 'border-rose-400/20 bg-rose-500/10 text-rose-300'
}

export function passwordIssueLabel(issue: PasswordSecurityIssue): string {
  if (issue === 'reused') return 'Повторяется'
  if (issue === 'old') return 'Старше 180 дней'
  return 'Слабый'
}

export function passwordIssueClassName(issue: PasswordSecurityIssue): string {
  if (issue === 'old') return 'border-amber-400/20 bg-amber-500/10 text-amber-300'
  return 'border-rose-400/20 bg-rose-500/10 text-rose-300'
}
