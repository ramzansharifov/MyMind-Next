import { useMemo, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import type {
  FinanceAccountSummary,
  FinanceTagSummary,
  FinanceTemplate,
  FinanceUserTransactionType
} from '@mymind/contracts/finance'
import type { FinanceRepository } from '@mymind/persistence/finance'
import { formatMinorPlain, parseMoneyToMinor } from '@mymind/core/finance-money'
import * as validation from '@mymind/core/validation/finance'

import { notifyDataChanged } from '../../app/changes'
import { AppDialog } from '../../shared/ui/AppDialog'
import { AppTextField } from '../../shared/ui/FormControls'
import { Button, ErrorState, Label } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import { useToast } from '../../shared/ui/toast-context'
import {
  MobileFinanceAccountPicker,
  MobileFinanceOperationTypePicker,
  MobileFinanceTagPicker
} from './MobileFinanceSelectionPickers'

type TemplateValues = {
  name: string
  type: FinanceUserTransactionType
  sourceAccountId: string
  destinationAccountId: string
  tagId: string
  amount: string
  comment: string
}

function initialValues(
  accounts: FinanceAccountSummary[],
  template?: FinanceTemplate | null
): TemplateValues {
  if (!template) {
    return {
      name: '',
      type: 'expense',
      sourceAccountId: accounts[0]?.id ?? '',
      destinationAccountId: '',
      tagId: '',
      amount: '',
      comment: ''
    }
  }

  const source = accounts.find((account) => account.id === template.sourceAccountId)
  return {
    name: template.name,
    type: template.type,
    sourceAccountId: template.sourceAccountId ?? accounts[0]?.id ?? '',
    destinationAccountId: template.destinationAccountId ?? '',
    tagId: template.tagId ?? '',
    amount: source ? formatMinorPlain(template.sourceAmountMinor, source.currencyCode) : '',
    comment: template.comment
  }
}

export function MobileFinanceTemplateSheet({
  api,
  accounts,
  tags,
  template = null,
  onClose,
  onSaved
}: {
  api: FinanceRepository
  accounts: FinanceAccountSummary[]
  tags: FinanceTagSummary[]
  template?: FinanceTemplate | null
  onClose(): void
  onSaved(): void
}): React.JSX.Element {
  const theme = useTheme()
  const toast = useToast()
  const defaults = useMemo(() => initialValues(accounts, template), [accounts, template])

  const [name, setName] = useState(defaults.name)
  const [type, setType] = useState<FinanceUserTransactionType>(defaults.type)
  const [sourceAccountId, setSourceAccountId] = useState(defaults.sourceAccountId)
  const [destinationAccountId, setDestinationAccountId] = useState(defaults.destinationAccountId)
  const [tagId, setTagId] = useState(defaults.tagId)
  const [amount, setAmount] = useState(defaults.amount)
  const [comment, setComment] = useState(defaults.comment)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const selectedSource = accounts.find((account) => account.id === sourceAccountId)
  const selectedDestination = accounts.find((account) => account.id === destinationAccountId)
  const compatibleTags = tags.filter((tag) => tag.type === 'both' || tag.type === type)

  const chooseType = (next: FinanceUserTransactionType): void => {
    if (next === type) return
    setType(next)
    setError('')

    if (next === 'transfer') {
      setTagId('')
      if (!destinationAccountId || destinationAccountId === sourceAccountId) {
        setDestinationAccountId(
          accounts.find((account) => account.id !== sourceAccountId)?.id ?? ''
        )
      }
      return
    }

    setDestinationAccountId('')
    const selectedTag = tags.find((tag) => tag.id === tagId)
    if (selectedTag && selectedTag.type !== 'both' && selectedTag.type !== next) {
      setTagId('')
    }
  }

  const save = (): void => {
    if (pending) return
    setError('')

    try {
      const trimmedName = name.trim()
      if (!trimmedName) throw new Error('Введите название шаблона')

      const source = accounts.find((account) => account.id === sourceAccountId)
      if (!source) throw new Error('Выберите счёт')

      const sourceAmountMinor = parseMoneyToMinor(amount, source.currencyCode)
      if (sourceAmountMinor <= 0) throw new Error('Сумма должна быть больше нуля')

      let destinationAmountMinor: number | null = null
      let destinationId: string | null = null
      let templateTagId: string | null = null

      if (type === 'transfer') {
        const destination = accounts.find((account) => account.id === destinationAccountId)
        if (!destination) throw new Error('Выберите счёт зачисления')
        if (destination.id === source.id) throw new Error('Счета перевода должны отличаться')
        destinationId = destination.id
        destinationAmountMinor = parseMoneyToMinor(amount, destination.currencyCode)
        if (destinationAmountMinor <= 0) throw new Error('Сумма должна быть больше нуля')
      } else {
        if (!tagId) throw new Error('Выберите тег')
        templateTagId = tagId
      }

      const input = {
        name: trimmedName,
        type,
        sourceAccountId: source.id,
        destinationAccountId: destinationId,
        tagId: templateTagId,
        sourceAmountMinor,
        destinationAmountMinor,
        comment
      }

      setPending(true)
      if (template) {
        api.updateTemplate(
          validation.updateFinanceTemplateInputSchema.parse({ id: template.id, ...input })
        )
      } else {
        api.createTemplate(validation.createFinanceTemplateInputSchema.parse(input))
      }

      notifyDataChanged()
      onSaved()
      toast.success(template ? 'Шаблон обновлён' : 'Шаблон создан')
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить шаблон')
    } finally {
      setPending(false)
    }
  }

  const amountHint =
    type === 'transfer' && selectedSource && selectedDestination
      ? `${selectedSource.currencyCode} → ${selectedDestination.currencyCode} · одна и та же сумма`
      : selectedSource
        ? `Валюта: ${selectedSource.currencyCode}`
        : 'Сначала выберите счёт'

  return (
    <AppDialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose()
      }}
      title={template ? 'Изменить шаблон' : 'Новый шаблон операции'}
      description="Шаблон заполняет форму операции и не меняет баланс без подтверждения"
      icon="copy"
      presentation="sheet"
      busy={pending}
      footer={
        <>
          <Button label="Отмена" disabled={pending} onPress={onClose} />
          <Button
            label={pending ? 'Сохранение…' : template ? 'Сохранить' : 'Создать шаблон'}
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

        <View style={{ gap: 8 }}>
          <Label>Название</Label>
          <AppTextField
            accessibilityLabel="Название шаблона"
            value={name}
            placeholder="Например: Обед, Зарплата, Перевод на карту"
            disabled={pending}
            onChangeText={(value) => {
              setName(value)
              setError('')
            }}
          />
        </View>

        <View style={{ gap: 8 }}>
          <Label>Тип операции</Label>
          <MobileFinanceOperationTypePicker value={type} disabled={pending} onChange={chooseType} />
        </View>

        <View style={{ gap: 8 }}>
          <Label>{type === 'transfer' ? 'Счёт списания' : 'Счёт'}</Label>
          <MobileFinanceAccountPicker
            accounts={accounts}
            value={sourceAccountId}
            disabled={pending}
            onChange={(value) => {
              setSourceAccountId(value)
              setError('')
              if (value === destinationAccountId) {
                setDestinationAccountId(accounts.find((account) => account.id !== value)?.id ?? '')
              }
            }}
          />
        </View>

        {type === 'transfer' ? (
          <View style={{ gap: 8 }}>
            <Label>Счёт зачисления</Label>
            <MobileFinanceAccountPicker
              accounts={accounts.filter((account) => account.id !== sourceAccountId)}
              value={destinationAccountId}
              disabled={pending}
              onChange={(value) => {
                setDestinationAccountId(value)
                setError('')
              }}
            />
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            <Label>Тег</Label>
            <MobileFinanceTagPicker
              tags={compatibleTags}
              value={tagId}
              disabled={pending}
              onChange={(value) => {
                setTagId(value)
                setError('')
              }}
            />
          </View>
        )}

        <View style={{ gap: 8 }}>
          <Label>Сумма</Label>
          <AppTextField
            accessibilityLabel="Сумма шаблона"
            keyboardType="decimal-pad"
            value={amount}
            placeholder="0.00"
            disabled={pending}
            onChangeText={(value) => {
              setAmount(value)
              setError('')
            }}
          />
          <Text style={{ color: theme.muted, fontSize: 10.5, lineHeight: 15 }}>{amountHint}</Text>
        </View>

        <View style={{ gap: 8 }}>
          <Label>Комментарий</Label>
          <AppTextField
            accessibilityLabel="Комментарий шаблона"
            value={comment}
            placeholder="Необязательное пояснение"
            multiline
            disabled={pending}
            onChangeText={setComment}
          />
        </View>

        <View
          style={{
            padding: 12,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 13,
            backgroundColor: theme.background
          }}
        >
          <Text style={{ color: theme.muted, fontSize: 10.5, lineHeight: 15 }}>
            При использовании шаблона данные только подставятся в новую операцию. Баланс изменится
            только после отдельного подтверждения операции.
          </Text>
        </View>
      </ScrollView>
    </AppDialog>
  )
}
