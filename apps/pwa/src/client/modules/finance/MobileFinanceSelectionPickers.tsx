import { Action } from '../../../ui/browser'
import type {
  FinanceAccountSummary,
  FinanceTagSummary,
  FinanceUserTransactionType
} from '@mymind/contracts/finance'
import { formatMoneyMinor } from '@mymind/core/finance-money'
import { VisualIconBadge, VisualIconGlyph } from '../../shared/ui/VisualPickers'
import { useTheme } from '../../shared/ui/theme'
import { financeOperationTone, financeTagTone } from './finance-semantic-colors'
import { FINANCE_OPERATION_OPTIONS } from './finance-operation-options'
export function MobileFinanceOperationTypePicker({
  value,
  disabled,
  onChange
}: {
  value: FinanceUserTransactionType
  disabled: boolean
  onChange(value: FinanceUserTransactionType): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <div
      className="ui-stack"
      role={'radiogroup'}
      style={{
        flexDirection: 'row',
        gap: 7
      }}
    >
      {FINANCE_OPERATION_OPTIONS.map((option) => {
        const selected = value === option.value
        const tone = financeOperationTone(option.value, theme.accent)
        const Icon = option.icon
        return (
          <Action
            key={option.value}
            role={'radio'}
            aria-label={option.label}
            aria-checked={selected}
            aria-disabled={disabled}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            style={{
              minWidth: 0,
              flex: '1 1 0%',
              height: 46,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              borderWidth: 1,
              borderColor: selected ? tone + '80' : theme.border,
              borderRadius: 13,
              backgroundColor: selected ? tone + '1F' : theme.background,
              opacity: disabled ? 0.45 : 1
            }}
            pressedStyle={{
              backgroundColor: selected ? tone + '1F' : theme.surface,
              opacity: disabled ? 0.45 : 0.75
            }}
          >
            <Icon size={16} color={selected ? tone : theme.muted} />
            <span
              className="ui-text"
              style={{
                color: selected ? tone : theme.text,
                fontSize: 12.5,
                fontWeight: 700
              }}
            >
              {option.label}
            </span>
          </Action>
        )
      })}
    </div>
  )
}
export function MobileFinanceAccountPicker({
  accounts,
  value,
  disabled,
  onChange
}: {
  accounts: FinanceAccountSummary[]
  value: string
  disabled: boolean
  onChange(value: string): void
}): React.JSX.Element {
  const theme = useTheme()
  if (!accounts.length) {
    return (
      <div
        className="ui-stack"
        style={{
          padding: 14,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: '#f59e0b55',
          borderRadius: 14,
          backgroundColor: '#f59e0b0A'
        }}
      >
        <span
          className="ui-text"
          style={{
            color: '#fbbf24',
            fontSize: 12.5,
            textAlign: 'center'
          }}
        >
          Нет доступных счетов.
        </span>
      </div>
    )
  }
  return (
    <div
      className="ui-stack"
      role={'radiogroup'}
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
      }}
    >
      {accounts.map((account) => {
        const selected = account.id === value
        return (
          <Action
            key={account.id}
            role={'radio'}
            aria-label={`${account.name}, ${account.currencyCode}`}
            aria-checked={selected}
            aria-disabled={disabled}
            disabled={disabled}
            onClick={() => onChange(account.id)}
            style={{
              width: '48.5%',
              minHeight: 98,
              alignItems: 'center',
              justifyContent: 'center',
              paddingInline: 8,
              paddingBlock: 10,
              borderWidth: 1,
              borderColor: selected ? theme.accent + '70' : theme.border,
              borderRadius: 14,
              backgroundColor: selected ? theme.accent + '14' : theme.surface,
              opacity: disabled ? 0.45 : 1
            }}
            pressedStyle={{
              backgroundColor: selected ? theme.accent + '14' : theme.raised,
              opacity: disabled ? 0.45 : 0.76
            }}
          >
            <VisualIconBadge value={account.icon} size={36} />
            <span
              className="ui-text"
              data-lines={1}
              style={{
                maxWidth: '100%',
                marginTop: 7,
                color: theme.text,
                fontSize: 12,
                fontWeight: 700,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 1
              }}
            >
              {account.name}
            </span>
            <span
              className="ui-text"
              data-lines={1}
              style={{
                marginTop: 2,
                color: theme.muted,
                fontSize: 9.5,
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 1
              }}
            >
              {formatMoneyMinor(account.balanceMinor, account.currencyCode)}
            </span>
          </Action>
        )
      })}
    </div>
  )
}
export function MobileFinanceTagPicker({
  tags,
  value,
  disabled,
  onChange
}: {
  tags: FinanceTagSummary[]
  value: string
  disabled: boolean
  onChange(value: string): void
}): React.JSX.Element {
  const theme = useTheme()
  if (!tags.length) {
    return (
      <div
        className="ui-stack"
        style={{
          padding: 14,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: '#f59e0b55',
          borderRadius: 14,
          backgroundColor: '#f59e0b0A'
        }}
      >
        <span
          className="ui-text"
          style={{
            color: '#fbbf24',
            fontSize: 12.5,
            textAlign: 'center'
          }}
        >
          Для этого типа операции пока нет подходящих тегов.
        </span>
      </div>
    )
  }
  return (
    <div
      className="ui-stack"
      role={'radiogroup'}
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 7
      }}
    >
      {tags.map((tag) => {
        const selected = tag.id === value
        const tone = financeTagTone(tag.type, theme.accent)
        return (
          <Action
            key={tag.id}
            role={'radio'}
            aria-label={tag.name}
            aria-checked={selected}
            aria-disabled={disabled}
            disabled={disabled}
            onClick={() => onChange(tag.id)}
            style={{
              width: '31.7%',
              minHeight: 78,
              alignItems: 'center',
              justifyContent: 'center',
              paddingInline: 6,
              paddingBlock: 8,
              borderWidth: 1,
              borderColor: selected ? tone + '99' : theme.border,
              borderRadius: 13,
              backgroundColor: selected ? tone + '1F' : theme.surface,
              opacity: disabled ? 0.45 : 1
            }}
            pressedStyle={{
              backgroundColor: selected ? tone + '1F' : theme.raised,
              opacity: disabled ? 0.45 : 0.76
            }}
          >
            <div
              className="ui-stack"
              style={{
                width: 32,
                height: 32,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: tone + '45',
                backgroundColor: tone + '16'
              }}
            >
              <VisualIconGlyph value={tag.icon} size={16} color={tone} />
            </div>
            <span
              className="ui-text"
              data-lines={1}
              style={{
                maxWidth: '100%',
                marginTop: 5,
                color: theme.text,
                fontSize: 10.5,
                fontWeight: selected ? '700' : '600',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 1
              }}
            >
              {tag.name}
            </span>
          </Action>
        )
      })}
    </div>
  )
}
