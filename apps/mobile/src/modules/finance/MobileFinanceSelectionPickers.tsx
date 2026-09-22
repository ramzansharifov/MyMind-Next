import { Pressable, Text, View } from 'react-native'
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
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 7 }}>
      {FINANCE_OPERATION_OPTIONS.map((option) => {
        const selected = value === option.value
        const tone = financeOperationTone(option.value, theme.accent)
        const Icon = option.icon
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => ({
              minWidth: 0,
              flex: 1,
              height: 46,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              borderWidth: 1,
              borderColor: selected ? tone + '80' : theme.border,
              borderRadius: 13,
              backgroundColor: selected ? tone + '1F' : pressed ? theme.surface : theme.background,
              opacity: disabled ? 0.45 : pressed ? 0.75 : 1
            })}
          >
            <Icon size={16} color={selected ? tone : theme.muted} />
            <Text
              style={{
                color: selected ? tone : theme.text,
                fontSize: 12.5,
                fontWeight: '700'
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
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
      <View
        style={{
          padding: 14,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: '#f59e0b55',
          borderRadius: 14,
          backgroundColor: '#f59e0b0A'
        }}
      >
        <Text style={{ color: '#fbbf24', fontSize: 12.5, textAlign: 'center' }}>
          Нет доступных счетов.
        </Text>
      </View>
    )
  }

  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {accounts.map((account) => {
        const selected = account.id === value
        return (
          <Pressable
            key={account.id}
            accessibilityRole="radio"
            accessibilityLabel={`${account.name}, ${account.currencyCode}`}
            accessibilityState={{ checked: selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(account.id)}
            style={({ pressed }) => ({
              width: '48.5%',
              minHeight: 98,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 8,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: selected ? theme.accent + '70' : theme.border,
              borderRadius: 14,
              backgroundColor: selected
                ? theme.accent + '14'
                : pressed
                  ? theme.raised
                  : theme.surface,
              opacity: disabled ? 0.45 : pressed ? 0.76 : 1
            })}
          >
            <VisualIconBadge value={account.icon} size={36} />
            <Text
              numberOfLines={1}
              style={{
                maxWidth: '100%',
                marginTop: 7,
                color: theme.text,
                fontSize: 12,
                fontWeight: '700'
              }}
            >
              {account.name}
            </Text>
            <Text
              numberOfLines={1}
              style={{ marginTop: 2, color: theme.muted, fontSize: 9.5, fontWeight: '600' }}
            >
              {formatMoneyMinor(account.balanceMinor, account.currencyCode)}
            </Text>
          </Pressable>
        )
      })}
    </View>
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
      <View
        style={{
          padding: 14,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: '#f59e0b55',
          borderRadius: 14,
          backgroundColor: '#f59e0b0A'
        }}
      >
        <Text style={{ color: '#fbbf24', fontSize: 12.5, textAlign: 'center' }}>
          Для этого типа операции пока нет подходящих тегов.
        </Text>
      </View>
    )
  }

  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
      {tags.map((tag) => {
        const selected = tag.id === value
        const tone = financeTagTone(tag.type, theme.accent)
        return (
          <Pressable
            key={tag.id}
            accessibilityRole="radio"
            accessibilityLabel={tag.name}
            accessibilityState={{ checked: selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(tag.id)}
            style={({ pressed }) => ({
              width: '31.7%',
              minHeight: 78,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 6,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: selected ? tone + '99' : tone + '35',
              borderRadius: 13,
              backgroundColor: selected ? tone + '1F' : pressed ? tone + '13' : tone + '0A',
              opacity: disabled ? 0.45 : pressed ? 0.76 : 1
            })}
          >
            <View
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
            </View>
            <Text
              numberOfLines={1}
              style={{
                maxWidth: '100%',
                marginTop: 5,
                color: theme.text,
                fontSize: 10.5,
                fontWeight: selected ? '700' : '600'
              }}
            >
              {tag.name}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
