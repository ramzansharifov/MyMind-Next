import { ChevronDown } from 'lucide-react'

import { FINANCE_ICON_NAMES, type FinanceIconName } from '../../../../../shared/contracts/finance'
import { IconPicker, type IconPickerOption } from '../../../shared/ui/IconPicker'
import { FinanceIcon } from '../lib/FinanceIcon'
import { financeInputClassName } from './FinancePrimitives'

const financeIconLabels: Record<FinanceIconName, string> = {
  wallet: 'Кошелёк',
  'credit-card': 'Карта',
  banknote: 'Наличные',
  landmark: 'Банк',
  'piggy-bank': 'Копилка',
  coins: 'Монеты',
  'shopping-cart': 'Покупки',
  utensils: 'Еда',
  car: 'Автомобиль',
  home: 'Дом',
  'heart-pulse': 'Здоровье',
  'graduation-cap': 'Обучение',
  briefcase: 'Работа',
  gift: 'Подарок',
  plane: 'Путешествия',
  receipt: 'Чек',
  'circle-dollar-sign': 'Деньги',
  'trending-up': 'Рост',
  'repeat-2': 'Переводы',
  tag: 'Другое'
}

const financeIconOptions = FINANCE_ICON_NAMES.map((value): IconPickerOption<FinanceIconName> => ({
  value,
  label: financeIconLabels[value]
}))

export function FinanceIconPicker({
  value,
  disabled = false,
  pickerLabel = 'Иконка счёта',
  ariaLabel = 'Выбрать иконку счёта',
  onChange
}: {
  value: FinanceIconName
  disabled?: boolean
  pickerLabel?: string
  ariaLabel?: string
  onChange: (value: FinanceIconName) => void
}): React.JSX.Element {
  return (
    <IconPicker
      value={value}
      onChange={onChange}
      options={financeIconOptions}
      align="start"
      label={pickerLabel}
      optionDataAttribute="data-finance-icon-option"
      renderIcon={(icon) => <FinanceIcon name={icon} className="size-5" />}
      trigger={
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          className={`${financeInputClassName} flex items-center gap-3 text-left`}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-control)] text-[var(--app-accent-500)]">
            <FinanceIcon name={value} className="size-4" />
          </span>
          <span className="min-w-0 flex-1 truncate">{financeIconLabels[value]}</span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-[var(--app-muted)]" />
        </button>
      }
    />
  )
}
