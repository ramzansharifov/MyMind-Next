import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  type LucideIcon
} from 'lucide-react-native'
import type {
  FinanceAccountSummary,
  FinanceLimitImpact,
  FinanceTagSummary,
  FinanceTransaction,
  FinanceUserTransactionType
} from '@mymind/contracts/finance'
import type { FinanceRepository } from '@mymind/persistence/finance'
import {
  FINANCE_RATE_SCALE,
  formatMinorPlain,
  formatMoneyMinor,
  parseMoneyToMinor
} from '@mymind/core/finance-money'
import * as validation from '@mymind/core/validation/finance'

import { notifyDataChanged } from '../../app/changes'
import { AppDialog } from '../../shared/ui/AppDialog'
import { AppDateField, AppTextField, AppTimeField } from '../../shared/ui/FormControls'
import { VisualIconBadge } from '../../shared/ui/VisualPickers'
import { Button, ErrorState, Label } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import { useToast } from '../../shared/ui/toast-context'

type OperationType = FinanceUserTransactionType

const TYPE_OPTIONS: ReadonlyArray<{
  value: OperationType
  label: string
  icon: LucideIcon
  tone: string
}> = [
  { value: 'income', label: 'Доход', icon: ArrowDownLeft, tone: '#34d399' },
  { value: 'expense', label: 'Расход', icon: ArrowUpRight, tone: '#f87171' },
  { value: 'transfer', label: 'Перевод', icon: ArrowRightLeft, tone: '#38bdf8' }
]

function localDateKey(timestamp = Date.now()): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function localTimeKey(timestamp = Date.now()): string {
  const date = new Date(timestamp)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function timestampFrom(date: string, time: string): number {
  const value = new Date(`${date}T${time || '12:00'}:00`)
  if (Number.isNaN(value.getTime())) throw new Error('Укажите корректные дату и время')
  return value.getTime()
}

function initialValues(
  type: OperationType,
  accounts: FinanceAccountSummary[],
  transaction?: FinanceTransaction | null
): {
  type: OperationType
  accountId: string
  destinationAccountId: string
  tagId: string
  amount: string
  date: string
  time: string
  comment: string
} {
  if (transaction) {
    const source =
      transaction.entries.find((entry) => entry.signedAmountMinor < 0) ?? transaction.entries[0]
    const destination = transaction.entries.find((entry) => entry.signedAmountMinor > 0)
    return {
      type: transaction.type === 'adjustment' ? type : transaction.type,
      accountId: source?.accountId ?? '',
      destinationAccountId: transaction.type === 'transfer' ? (destination?.accountId ?? '') : '',
      tagId: transaction.tagId ?? '',
      amount: source
        ? formatMinorPlain(Math.abs(source.signedAmountMinor), source.accountCurrencyCode)
        : '',
      date: localDateKey(transaction.occurredAt),
      time: localTimeKey(transaction.occurredAt),
      comment: transaction.comment
    }
  }

  return {
    type,
    accountId: accounts[0]?.id ?? '',
    destinationAccountId: '',
    tagId: '',
    amount: '',
    date: localDateKey(),
    time: localTimeKey(),
    comment: ''
  }
}

function FinanceOperationTypePicker({
  value,
  disabled,
  onChange
}: {
  value: OperationType
  disabled: boolean
  onChange(value: OperationType): void
}): React.JSX.Element {
  const theme = useTheme()

  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 7 }}>
      {TYPE_OPTIONS.map((option) => {
        const selected = value === option.value
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
              borderColor: selected ? option.tone + '80' : theme.border,
              borderRadius: 13,
              backgroundColor: selected
                ? option.tone + '1F'
                : pressed
                  ? theme.surface
                  : theme.background,
              opacity: disabled ? 0.45 : pressed ? 0.75 : 1
            })}
          >
            <Icon size={16} color={selected ? option.tone : theme.muted} />
            <Text
              style={{
                color: selected ? option.tone : theme.text,
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

function AccountPicker({
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

function TagPicker({
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
              borderColor: selected ? tag.color + '88' : theme.border,
              borderRadius: 13,
              backgroundColor: selected
                ? tag.color + '1F'
                : pressed
                  ? theme.raised
                  : theme.surface,
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
                borderColor: tag.color + '32',
                backgroundColor: tag.color + '18'
              }}
            >
              <VisualIconBadge value={tag.icon} size={30} />
            </View>
            <Text
              numberOfLines={1}
              style={{
                maxWidth: '100%',
                marginTop: 5,
                color: selected ? tag.color : theme.text,
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

function ImpactNotice({
  impact,
  tags
}: {
  impact: FinanceLimitImpact
  tags: FinanceTagSummary[]
}): React.JSX.Element | null {
  const theme = useTheme()
  if (!impact.items.length) return null

  return (
    <View
      style={{
        gap: 5,
        padding: 12,
        borderWidth: 1,
        borderColor: '#f59e0b44',
        borderRadius: 13,
        backgroundColor: '#f59e0b0C'
      }}
    >
      <Text style={{ color: '#fbbf24', fontSize: 12.5, fontWeight: '700' }}>
        Влияние на лимиты
      </Text>
      {impact.items.map((item) => {
        const label = tags.find((tag) => tag.id === item.limit.tagId)?.name ?? 'Лимит'
        const after =
          item.convertedExpenseMinor === null
            ? 'нельзя рассчитать без курса'
            : `${Math.round(item.limit.usagePercent)}% → ${Math.round(
                (item.spentAfterMinor / item.limit.amountMinor) * 100
              )}%`
        return (
          <Text key={item.limit.id} style={{ color: theme.text, fontSize: 11, lineHeight: 16 }}>
            {label}: {after}
            {item.exceededAfterMinor > 0 ? ' · будет превышен' : ''}
          </Text>
        )
      })}
      <Text style={{ color: theme.muted, fontSize: 10.5, lineHeight: 15 }}>
        Повторное нажатие «Подтвердить расход» сохранит операцию.
      </Text>
    </View>
  )
}

export function MobileFinanceTransactionSheet({
  api,
  accounts,
  tags,
  initialType,
  transaction = null,
  onClose,
  onSaved
}: {
  api: FinanceRepository
  accounts: FinanceAccountSummary[]
  tags: FinanceTagSummary[]
  initialType: OperationType
  transaction?: FinanceTransaction | null
  onClose(): void
  onSaved(): void
}): React.JSX.Element {
  const theme = useTheme()
  const toast = useToast()
  const defaults = useMemo(
    () => initialValues(initialType, accounts, transaction),
    [accounts, initialType, transaction]
  )
  const [type, setType] = useState<OperationType>(defaults.type)
  const [accountId, setAccountId] = useState(defaults.accountId)
  const [destinationAccountId, setDestinationAccountId] = useState(defaults.destinationAccountId)
  const [tagId, setTagId] = useState(defaults.tagId)
  const [amount, setAmount] = useState(defaults.amount)
  const [date, setDate] = useState(defaults.date)
  const [time, setTime] = useState(defaults.time)
  const [comment, setComment] = useState(defaults.comment)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [impact, setImpact] = useState<FinanceLimitImpact | null>(null)
  const [impactConfirmed, setImpactConfirmed] = useState(false)

  const selectedAccount = accounts.find((account) => account.id === accountId)
  const selectedDestination = accounts.find((account) => account.id === destinationAccountId)
  const compatibleTags = tags.filter((tag) => tag.type === 'both' || tag.type === type)
  const currentOption = TYPE_OPTIONS.find((option) => option.value === type) ?? TYPE_OPTIONS[0]
  const CurrentIcon = currentOption.icon

  const clearImpact = (): void => {
    setImpact(null)
    setImpactConfirmed(false)
  }

  const chooseType = (next: OperationType): void => {
    if (transaction || next === type) return
    setType(next)
    clearImpact()
    if (next === 'transfer') {
      setTagId('')
      if (!destinationAccountId || destinationAccountId === accountId) {
        setDestinationAccountId(accounts.find((account) => account.id !== accountId)?.id ?? '')
      }
      return
    }
    setDestinationAccountId('')
    const selectedTag = tags.find((tag) => tag.id === tagId)
    if (selectedTag && selectedTag.type !== 'both' && selectedTag.type !== next) setTagId('')
  }

  const save = (): void => {
    if (pending) return
    setError('')

    try {
      const account = accounts.find((item) => item.id === accountId)
      if (!account) throw new Error('Выберите счёт')
      const amountMinor = parseMoneyToMinor(amount, account.currencyCode)
      if (amountMinor <= 0) throw new Error('Сумма должна быть больше нуля')
      const occurredAt = timestampFrom(date, time)

      if (type === 'expense' && !impactConfirmed) {
        if (!tagId) throw new Error('Выберите тег')
        const nextImpact = api.previewExpenseImpact({
          accountId: account.id,
          tagId,
          amountMinor,
          occurredAt,
          excludeTransactionId: transaction?.id ?? null
        })
        if (nextImpact.items.length) {
          setImpact(nextImpact)
          setImpactConfirmed(true)
          return
        }
      }

      setPending(true)

      if (type === 'transfer') {
        const destination = accounts.find((item) => item.id === destinationAccountId)
        if (!destination) throw new Error('Выберите счёт зачисления')
        const destinationAmountMinor = parseMoneyToMinor(amount, destination.currencyCode)
        const payload = validation.createFinanceTransactionInputSchema.parse({
          type: 'transfer',
          sourceAccountId: account.id,
          destinationAccountId: destination.id,
          sourceAmountMinor: amountMinor,
          destinationAmountMinor,
          exchangeRateScaled: FINANCE_RATE_SCALE,
          occurredAt,
          comment,
          templateId: transaction?.templateId ?? null
        })
        if (transaction) api.updateTransaction({ id: transaction.id, transaction: payload })
        else api.createTransaction(payload)
      } else {
        if (!tagId) throw new Error('Выберите тег')
        const payload = validation.createFinanceTransactionInputSchema.parse({
          type,
          accountId: account.id,
          amountMinor,
          tagId,
          occurredAt,
          comment,
          templateId: transaction?.templateId ?? null
        })
        if (transaction) api.updateTransaction({ id: transaction.id, transaction: payload })
        else api.createTransaction(payload)
      }

      notifyDataChanged()
      onSaved()
      toast.success(transaction ? 'Операция обновлена' : 'Операция создана')
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить операцию')
    } finally {
      setPending(false)
    }
  }

  const title = transaction
    ? 'Изменить операцию'
    : type === 'income'
      ? 'Новый доход'
      : type === 'expense'
        ? 'Новый расход'
        : 'Новый перевод'

  return (
    <AppDialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose()
      }}
      title={title}
      description="Выберите счёт, сумму и остальные данные операции"
      icon="finance"
      presentation="sheet"
      busy={pending}
      footer={
        <>
          <Button label="Отмена" disabled={pending} onPress={onClose} />
          <Button
            label={
              pending
                ? 'Сохранение…'
                : impactConfirmed && type === 'expense'
                  ? 'Подтвердить расход'
                  : transaction
                    ? 'Сохранить'
                    : 'Создать'
            }
            icon="check"
            primary
            disabled={pending || !accounts.length}
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

        {!transaction ? (
          <FinanceOperationTypePicker value={type} disabled={pending} onChange={chooseType} />
        ) : (
          <View
            style={{
              minHeight: 42,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 11,
              borderWidth: 1,
              borderColor: currentOption.tone + '55',
              borderRadius: 12,
              backgroundColor: currentOption.tone + '12'
            }}
          >
            <CurrentIcon size={16} color={currentOption.tone} />
            <Text style={{ color: currentOption.tone, fontSize: 12.5, fontWeight: '700' }}>
              {currentOption.label}
            </Text>
          </View>
        )}

        <View style={{ gap: 8 }}>
          <Label>{type === 'transfer' ? 'Счёт списания' : 'Счёт'}</Label>
          <AccountPicker
            accounts={accounts}
            value={accountId}
            disabled={pending}
            onChange={(value) => {
              setAccountId(value)
              clearImpact()
              if (value === destinationAccountId) {
                setDestinationAccountId(accounts.find((account) => account.id !== value)?.id ?? '')
              }
            }}
          />
        </View>

        {type === 'transfer' ? (
          <View style={{ gap: 8 }}>
            <Label>Счёт зачисления</Label>
            <AccountPicker
              accounts={accounts.filter((account) => account.id !== accountId)}
              value={destinationAccountId}
              disabled={pending}
              onChange={(value) => {
                setDestinationAccountId(value)
                clearImpact()
              }}
            />
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            <Label>Тег</Label>
            <TagPicker
              tags={compatibleTags}
              value={tagId}
              disabled={pending}
              onChange={(value) => {
                setTagId(value)
                clearImpact()
              }}
            />
          </View>
        )}

        <View style={{ gap: 8 }}>
          <Label>Сумма</Label>
          <AppTextField
            accessibilityLabel="Сумма"
            keyboardType="decimal-pad"
            value={amount}
            placeholder="0.00"
            disabled={pending}
            onChangeText={(value) => {
              setAmount(value)
              clearImpact()
            }}
          />
          <Text style={{ color: theme.muted, fontSize: 10.5, lineHeight: 15 }}>
            {type === 'transfer' && selectedAccount && selectedDestination
              ? `${selectedAccount.currencyCode} → ${selectedDestination.currencyCode} · одна и та же сумма`
              : selectedAccount
                ? `Валюта: ${selectedAccount.currencyCode}`
                : 'Сначала выберите счёт'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ minWidth: 0, flex: 1, gap: 8 }}>
            <Label>Дата</Label>
            <AppDateField
              label="Дата операции"
              value={date}
              disabled={pending}
              onChangeText={(value) => {
                setDate(value)
                clearImpact()
              }}
            />
          </View>
          <View style={{ minWidth: 0, flex: 1, gap: 8 }}>
            <Label>Время</Label>
            <AppTimeField
              label="Время операции"
              value={time}
              disabled={pending}
              onChangeText={(value) => {
                setTime(value)
                clearImpact()
              }}
            />
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Label>Комментарий</Label>
          <AppTextField
            accessibilityLabel="Комментарий"
            value={comment}
            placeholder="Необязательное пояснение"
            multiline
            disabled={pending}
            onChangeText={setComment}
          />
        </View>

        {impact ? <ImpactNotice impact={impact} tags={tags} /> : null}
      </ScrollView>
    </AppDialog>
  )
}
