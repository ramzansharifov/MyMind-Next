import { useMemo, useState } from 'react'
import { Layers3 } from 'lucide-react-native'
import { Pressable, ScrollView, Text, View } from 'react-native'
import type {
  FinanceAccountSummary,
  FinanceLimitPeriodType,
  FinanceLimitStatus,
  FinanceTagSummary
} from '@mymind/contracts/finance'
import type { FinanceRepository } from '@mymind/persistence/finance'
import { formatMinorPlain, parseMoneyToMinor } from '@mymind/core/finance-money'
import * as validation from '@mymind/core/validation/finance'

import { notifyDataChanged } from '../../app/changes'
import { AppDialog } from '../../shared/ui/AppDialog'
import { AppTextField } from '../../shared/ui/FormControls'
import { VisualIconBadge } from '../../shared/ui/VisualPickers'
import { Button, ErrorState, Label } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import { useToast } from '../../shared/ui/toast-context'
import { MobileFinanceTagPicker } from './MobileFinanceSelectionPickers'

const PERIODS: ReadonlyArray<{ value: FinanceLimitPeriodType; label: string }> = [
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'year', label: 'Год' }
]

function LimitAccountPicker({
  accounts,
  accountIds,
  allAccounts,
  disabled,
  onChange
}: {
  accounts: FinanceAccountSummary[]
  accountIds: string[]
  allAccounts: boolean
  disabled: boolean
  onChange(selection: { accountIds: string[]; allAccounts: boolean }): void
}): React.JSX.Element {
  const theme = useTheme()
  const currencies = [...new Set(accounts.map((account) => account.currencyCode))]
  const canSelectAll = accounts.length > 0 && currencies.length === 1
  const selectedCurrency = allAccounts
    ? canSelectAll
      ? currencies[0]
      : null
    : (accounts.find((account) => account.id === accountIds[0])?.currencyCode ?? null)

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
          Сначала создайте хотя бы один счёт.
        </Text>
      </View>
    )
  }

  const toggleAccount = (account: FinanceAccountSummary): void => {
    if (disabled) return
    if (allAccounts) {
      onChange({ accountIds: [account.id], allAccounts: false })
      return
    }
    if (accountIds.includes(account.id)) {
      onChange({
        accountIds: accountIds.filter((id) => id !== account.id),
        allAccounts: false
      })
      return
    }
    if (selectedCurrency && selectedCurrency !== account.currencyCode) {
      onChange({ accountIds: [account.id], allAccounts: false })
      return
    }
    onChange({ accountIds: [...accountIds, account.id], allAccounts: false })
  }

  return (
    <View style={{ gap: 8 }}>
      {!canSelectAll && currencies.length > 1 ? (
        <Text style={{ color: theme.muted, fontSize: 10.5, lineHeight: 15 }}>
          Можно выбрать несколько счетов одной валюты. Счёт другой валюты переключит выбранную
          группу.
        </Text>
      ) : null}

      <View accessibilityRole="group" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {canSelectAll ? (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={`Все счета, ${currencies[0]}`}
            accessibilityState={{ checked: allAccounts, disabled }}
            disabled={disabled}
            onPress={() => onChange({ accountIds: [], allAccounts: true })}
            style={({ pressed }) => ({
              width: '48.5%',
              minHeight: 98,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 8,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: allAccounts ? theme.accent + '70' : theme.border,
              borderRadius: 14,
              backgroundColor: allAccounts
                ? theme.accent + '14'
                : pressed
                  ? theme.raised
                  : theme.surface,
              opacity: disabled ? 0.45 : pressed ? 0.76 : 1
            })}
          >
            <View
              style={{
                width: 36,
                height: 36,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 11,
                borderWidth: 1,
                borderColor: theme.accent + '38',
                backgroundColor: theme.accent + '14'
              }}
            >
              <Layers3 size={17} color={theme.accent} />
            </View>
            <Text style={{ marginTop: 7, color: theme.text, fontSize: 12, fontWeight: '700' }}>
              Все счета
            </Text>
            <Text style={{ marginTop: 2, color: theme.muted, fontSize: 9.5, fontWeight: '600' }}>
              {currencies[0]}
            </Text>
          </Pressable>
        ) : null}

        {accounts.map((account) => {
          const selected = !allAccounts && accountIds.includes(account.id)
          const differentCurrency =
            !allAccounts && selectedCurrency !== null && selectedCurrency !== account.currencyCode
          return (
            <Pressable
              key={account.id}
              accessibilityRole="checkbox"
              accessibilityLabel={`${account.name}, ${account.currencyCode}`}
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled}
              onPress={() => toggleAccount(account)}
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
                opacity: disabled ? 0.45 : differentCurrency ? 0.62 : pressed ? 0.76 : 1
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
              <Text style={{ marginTop: 2, color: theme.muted, fontSize: 9.5, fontWeight: '600' }}>
                {account.currencyCode}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

export function MobileFinanceLimitSheet({
  api,
  accounts,
  tags,
  limit = null,
  onClose,
  onSaved
}: {
  api: FinanceRepository
  accounts: FinanceAccountSummary[]
  tags: FinanceTagSummary[]
  limit?: FinanceLimitStatus | null
  onClose(): void
  onSaved(): void
}): React.JSX.Element {
  const theme = useTheme()
  const toast = useToast()
  const expenseTags = useMemo(() => tags.filter((tag) => tag.type !== 'income'), [tags])
  const accountCurrencies = useMemo(
    () => [...new Set(accounts.map((account) => account.currencyCode))],
    [accounts]
  )
  const canUseAllAccounts = accounts.length > 0 && accountCurrencies.length === 1
  const existingAccountIds = limit?.accountIds ?? []
  const defaultAllAccounts = limit
    ? existingAccountIds.length === 0 && canUseAllAccounts
    : canUseAllAccounts
  const defaultAccountIds = defaultAllAccounts
    ? []
    : existingAccountIds.length > 0
      ? existingAccountIds
      : limit
        ? accounts
            .filter((account) => account.currencyCode === limit.currencyCode)
            .map((account) => account.id)
        : []

  const [tagId, setTagId] = useState(limit?.tagId ?? expenseTags[0]?.id ?? '')
  const [accountIds, setAccountIds] = useState<string[]>(defaultAccountIds)
  const [allAccounts, setAllAccounts] = useState(defaultAllAccounts)
  const [amount, setAmount] = useState(
    limit ? formatMinorPlain(limit.amountMinor, limit.currencyCode) : ''
  )
  const [periodType, setPeriodType] = useState<FinanceLimitPeriodType>(limit?.periodType ?? 'month')
  const [warningPercent, setWarningPercent] = useState(String(limit?.warningPercent ?? 80))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const selectedAccounts = allAccounts
    ? accounts
    : accounts.filter((account) => accountIds.includes(account.id))
  const selectedCurrencies = [...new Set(selectedAccounts.map((account) => account.currencyCode))]
  const derivedCurrency = selectedCurrencies.length === 1 ? selectedCurrencies[0] : null
  const selectedTag = expenseTags.find((tag) => tag.id === tagId)

  const save = (): void => {
    if (pending) return
    setError('')

    try {
      const selected = allAccounts
        ? accounts
        : accounts.filter((account) => accountIds.includes(account.id))
      const currencies = [...new Set(selected.map((account) => account.currencyCode))]
      const tag = expenseTags.find((item) => item.id === tagId)

      if (!tag) throw new Error('Выберите тег расходов')
      if (!selected.length) throw new Error('Выберите хотя бы один счёт')
      if (currencies.length !== 1) {
        throw new Error('В одном лимите можно выбрать только счета с одинаковой валютой')
      }

      const currencyCode = currencies[0]
      const amountMinor = parseMoneyToMinor(amount, currencyCode)
      if (amountMinor <= 0) throw new Error('Сумма должна быть больше нуля')

      const warning = Number(warningPercent)
      if (!Number.isInteger(warning) || warning < 1 || warning > 100) {
        throw new Error('Предупреждение должно быть от 1 до 100%')
      }

      const common = {
        amountMinor,
        currencyCode,
        accountIds: allAccounts ? [] : accountIds,
        tagId,
        periodType,
        warningPercent: warning
      }

      setPending(true)
      if (limit) {
        api.updateLimit(
          validation.updateFinanceLimitInputSchema.parse({
            id: limit.id,
            state: limit.state,
            ...common
          })
        )
      } else {
        api.createLimit(validation.createFinanceLimitInputSchema.parse(common))
      }

      notifyDataChanged()
      onSaved()
      toast.success(limit ? 'Лимит обновлён' : 'Лимит создан')
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить лимит')
    } finally {
      setPending(false)
    }
  }

  return (
    <AppDialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose()
      }}
      title={limit ? 'Изменить лимит' : 'Новый лимит расходов'}
      description="Лимит относится к выбранному тегу и предупреждает при достижении заданной суммы"
      icon="finance"
      presentation="sheet"
      busy={pending}
      footer={
        <>
          <Button label="Отмена" disabled={pending} onPress={onClose} />
          <Button
            label={pending ? 'Сохранение…' : limit ? 'Сохранить' : 'Создать лимит'}
            icon="check"
            primary
            disabled={pending || !accounts.length || !expenseTags.length}
            onPress={save}
          />
        </>
      }
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 18, padding: 14, paddingBottom: 26 }}
      >
        {error ? <ErrorState message={error} /> : null}

        <View style={{ gap: 8 }}>
          <Label>Тег расходов</Label>
          <MobileFinanceTagPicker
            tags={expenseTags}
            value={tagId}
            disabled={pending}
            onChange={(value) => {
              setTagId(value)
              setError('')
            }}
          />
          {selectedTag ? (
            <Text style={{ color: theme.muted, fontSize: 10.5, lineHeight: 15 }}>
              Лимит будет отображаться как лимит тега «{selectedTag.name}».
            </Text>
          ) : null}
        </View>

        <View style={{ gap: 8 }}>
          <Label>Счета</Label>
          <LimitAccountPicker
            accounts={accounts}
            accountIds={accountIds}
            allAccounts={allAccounts}
            disabled={pending}
            onChange={(selection) => {
              setAccountIds(selection.accountIds)
              setAllAccounts(selection.allAccounts)
              setError('')
            }}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ minWidth: 0, flex: 1, gap: 8 }}>
            <Label>Сумма</Label>
            <AppTextField
              accessibilityLabel="Сумма лимита"
              keyboardType="decimal-pad"
              value={amount}
              placeholder="0.00"
              disabled={pending}
              onChangeText={(value) => {
                setAmount(value)
                setError('')
              }}
            />
          </View>
          <View style={{ width: 92, gap: 8 }}>
            <Label>Валюта</Label>
            <View
              accessibilityLabel="Валюта лимита"
              style={{
                height: 48,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 13,
                backgroundColor: theme.surface
              }}
            >
              <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>
                {derivedCurrency ?? '—'}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Label>Период</Label>
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 6 }}>
            {PERIODS.map((period) => {
              const selected = periodType === period.value
              return (
                <Pressable
                  key={period.value}
                  accessibilityRole="radio"
                  accessibilityLabel={period.label}
                  accessibilityState={{ checked: selected, disabled: pending }}
                  disabled={pending}
                  onPress={() => {
                    setPeriodType(period.value)
                    setError('')
                  }}
                  style={({ pressed }) => ({
                    minWidth: 0,
                    flex: 1,
                    height: 42,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: selected ? theme.accent + '70' : theme.border,
                    borderRadius: 12,
                    backgroundColor: selected
                      ? theme.accent + '16'
                      : pressed
                        ? theme.raised
                        : theme.surface,
                    opacity: pending ? 0.45 : pressed ? 0.75 : 1
                  })}
                >
                  <Text
                    style={{
                      color: selected ? theme.accent : theme.text,
                      fontSize: 10.5,
                      fontWeight: '700'
                    }}
                  >
                    {period.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Label>Предупреждение, %</Label>
          <AppTextField
            accessibilityLabel="Процент предупреждения"
            keyboardType="number-pad"
            value={warningPercent}
            placeholder="80"
            disabled={pending}
            onChangeText={(value) => {
              setWarningPercent(value)
              setError('')
            }}
          />
          <Text style={{ color: theme.muted, fontSize: 10.5, lineHeight: 15 }}>
            MyMind предупредит, когда расходы по лимиту достигнут этого процента.
          </Text>
        </View>
      </ScrollView>
    </AppDialog>
  )
}
