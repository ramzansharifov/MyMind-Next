import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, LoaderCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import type {
  FinanceAccountSummary,
  FinanceLimitImpact,
  FinanceTagSummary,
  FinanceTemplate,
  FinanceTransaction,
  FinanceUserTransactionType
} from '../../../../../../shared/contracts/finance'
import {
  FINANCE_RATE_SCALE,
  formatMinorPlain,
  parseMoneyToMinor
} from '../../../../../../shared/finance-money'
import { AppDialog } from '../../../../shared/ui/AppDialog'
import { financeClient } from '../../api/finance-client'
import {
  fromDateTimeLocalValue,
  getFinanceErrorMessage,
  toDateTimeLocalValue
} from '../../lib/finance-ui'
import { FinanceOperationTypePicker } from '../FinanceOperationTypePicker'
import {
  FinanceButton,
  FinanceField,
  financeInputClassName,
  financeTextareaClassName
} from '../FinancePrimitives'
import {
  FinanceAccountCardPicker,
  FinanceTagCardPicker
} from '../FinanceSelectionCards'

const transactionFormSchema = z
  .object({
    type: z.enum(['income', 'expense', 'transfer']),
    accountId: z.string().min(1, 'Выберите счёт'),
    destinationAccountId: z.string(),
    amount: z.string().trim().min(1, 'Введите сумму'),
    tagId: z.string(),
    occurredAt: z.string().min(1, 'Укажите дату и время'),
    comment: z.string().trim().max(1_000, 'Комментарий слишком длинный')
  })
  .superRefine((values, context) => {
    if (values.type === 'transfer') {
      if (!values.destinationAccountId) {
        context.addIssue({
          code: 'custom',
          path: ['destinationAccountId'],
          message: 'Выберите счёт зачисления'
        })
      }
      if (values.accountId === values.destinationAccountId) {
        context.addIssue({
          code: 'custom',
          path: ['destinationAccountId'],
          message: 'Счета перевода должны отличаться'
        })
      }
    } else if (!values.tagId) {
      context.addIssue({
        code: 'custom',
        path: ['tagId'],
        message: 'Выберите тег'
      })
    }
  })

type TransactionFormValues = z.infer<typeof transactionFormSchema>

interface FinanceTransactionDialogProps {
  open: boolean
  initialType: FinanceUserTransactionType
  accounts: FinanceAccountSummary[]
  tags: FinanceTagSummary[]
  transaction?: FinanceTransaction | null
  template?: FinanceTemplate | null
  onOpenChange: (open: boolean) => void
  onSaved: (transaction: FinanceTransaction) => void | Promise<void>
}

function getDefaultValues(
  type: FinanceUserTransactionType,
  accounts: FinanceAccountSummary[],
  transaction?: FinanceTransaction | null,
  template?: FinanceTemplate | null
): TransactionFormValues {
  if (transaction) {
    const source =
      transaction.entries.find((entry) => entry.signedAmountMinor < 0) ?? transaction.entries[0]
    const destination = transaction.entries.find((entry) => entry.signedAmountMinor > 0)
    return {
      type: transaction.type === 'adjustment' ? type : transaction.type,
      accountId: source?.accountId ?? '',
      destinationAccountId: transaction.type === 'transfer' ? (destination?.accountId ?? '') : '',
      amount: source
        ? formatMinorPlain(Math.abs(source.signedAmountMinor), source.accountCurrencyCode)
        : '',
      tagId: transaction.tagId ?? '',
      occurredAt: toDateTimeLocalValue(transaction.occurredAt),
      comment: transaction.comment
    }
  }

  if (template) {
    return {
      type: template.type,
      accountId: template.sourceAccountId ?? '',
      destinationAccountId: template.destinationAccountId ?? '',
      amount: template.sourceAccountId
        ? formatMinorPlain(
            template.sourceAmountMinor,
            accounts.find((account) => account.id === template.sourceAccountId)?.currencyCode ??
              'TJS'
          )
        : '',
      tagId: template.tagId ?? '',
      occurredAt: toDateTimeLocalValue(Date.now()),
      comment: template.comment
    }
  }

  return {
    type,
    accountId: accounts[0]?.id ?? '',
    destinationAccountId: '',
    amount: '',
    tagId: '',
    occurredAt: toDateTimeLocalValue(Date.now()),
    comment: ''
  }
}

export function FinanceTransactionDialog(props: FinanceTransactionDialogProps): React.JSX.Element {
  return props.open ? <FinanceTransactionDialogContent {...props} /> : <></>
}

function FinanceTransactionDialogContent({
  open,
  initialType,
  accounts,
  tags,
  transaction,
  template,
  onOpenChange,
  onSaved
}: FinanceTransactionDialogProps): React.JSX.Element {
  const [isSaving, setIsSaving] = useState(false)
  const [backendError, setBackendError] = useState<string | null>(null)
  const [impact, setImpact] = useState<FinanceLimitImpact | null>(null)
  const [impactLoading, setImpactLoading] = useState(false)
  const [impactConfirmed, setImpactConfirmed] = useState(false)
  const defaults = useMemo(
    () => getDefaultValues(initialType, accounts, transaction, template),
    [accounts, initialType, template, transaction]
  )
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors }
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: defaults
  })
  const values = useWatch({ control })
  const selectedAccount = accounts.find((account) => account.id === values.accountId)
  const selectedDestination = accounts.find(
    (account) => account.id === values.destinationAccountId
  )
  const compatibleTags = tags.filter((tag) => tag.type === 'both' || tag.type === values.type)

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setImpactConfirmed(false)
      setImpact(null)
    })
    return () => {
      cancelled = true
    }
  }, [values.accountId, values.amount, values.occurredAt, values.tagId, values.type])

  function chooseType(type: FinanceUserTransactionType): void {
    setValue('type', type, { shouldValidate: true, shouldDirty: true })
    if (type === 'transfer') {
      setValue('tagId', '', { shouldValidate: true })
      return
    }

    setValue('destinationAccountId', '')
    const selectedTag = tags.find((tag) => tag.id === values.tagId)
    if (selectedTag && selectedTag.type !== 'both' && selectedTag.type !== type) {
      setValue('tagId', '', { shouldValidate: true })
    }
  }

  async function submit(formValues: TransactionFormValues): Promise<void> {
    const account = accounts.find((item) => item.id === formValues.accountId)
    if (!account) {
      setError('accountId', { message: 'Счёт не найден' })
      return
    }

    let amountMinor: number
    try {
      amountMinor = parseMoneyToMinor(formValues.amount, account.currencyCode)
      if (amountMinor <= 0) throw new Error('Сумма должна быть больше нуля')
    } catch (reason) {
      setError('amount', { message: getFinanceErrorMessage(reason) })
      return
    }

    const occurredAt = fromDateTimeLocalValue(formValues.occurredAt)

    if (formValues.type === 'expense' && !impactConfirmed) {
      setImpactLoading(true)
      setBackendError(null)
      try {
        const nextImpact = await financeClient.previewExpenseImpact({
          accountId: account.id,
          tagId: formValues.tagId,
          amountMinor,
          occurredAt,
          excludeTransactionId: transaction?.id ?? null
        })
        if (nextImpact.items.length > 0) {
          setImpact(nextImpact)
          setImpactConfirmed(true)
          return
        }
      } catch (reason) {
        setBackendError(getFinanceErrorMessage(reason))
        return
      } finally {
        setImpactLoading(false)
      }
    }

    setIsSaving(true)
    setBackendError(null)

    try {
      let input
      if (formValues.type === 'transfer') {
        const destination = accounts.find((item) => item.id === formValues.destinationAccountId)
        if (!destination) {
          setError('destinationAccountId', { message: 'Счёт зачисления не найден' })
          return
        }

        let destinationAmountMinor: number
        try {
          destinationAmountMinor = parseMoneyToMinor(formValues.amount, destination.currencyCode)
          if (destinationAmountMinor <= 0) throw new Error('Сумма должна быть больше нуля')
        } catch (reason) {
          setError('amount', { message: getFinanceErrorMessage(reason) })
          return
        }

        input = {
          type: 'transfer' as const,
          sourceAccountId: account.id,
          destinationAccountId: destination.id,
          sourceAmountMinor: amountMinor,
          destinationAmountMinor,
          exchangeRateScaled: FINANCE_RATE_SCALE,
          occurredAt,
          comment: formValues.comment,
          templateId: template?.id ?? transaction?.templateId ?? null
        }
      } else {
        input = {
          type: formValues.type,
          accountId: account.id,
          amountMinor,
          tagId: formValues.tagId,
          occurredAt,
          comment: formValues.comment,
          templateId: template?.id ?? transaction?.templateId ?? null
        }
      }

      const saved = transaction
        ? await financeClient.updateTransaction({ id: transaction.id, transaction: input })
        : await financeClient.createTransaction(input)
      await onSaved(saved)
      onOpenChange(false)
    } catch (reason) {
      setBackendError(getFinanceErrorMessage(reason))
    } finally {
      setIsSaving(false)
    }
  }

  const dialogTitle = transaction
    ? 'Изменить операцию'
    : template
      ? `Операция по шаблону «${template.name}»`
      : values.type === 'income'
        ? 'Новый доход'
        : values.type === 'expense'
          ? 'Новый расход'
          : 'Новый перевод'

  const amountHint =
    values.type === 'transfer' && selectedAccount && selectedDestination
      ? `${selectedAccount.currencyCode} → ${selectedDestination.currencyCode} · одна и та же сумма`
      : selectedAccount
        ? `Валюта: ${selectedAccount.currencyCode}`
        : undefined

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={dialogTitle}
      description="Все суммы сохраняются точно в минимальных единицах выбранной валюты."
      size="lg"
      busy={isSaving}
      closeLabel="Закрыть форму операции"
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          void handleSubmit(submit)(event)
        }}
      >
        {!transaction && !template && (
          <FinanceOperationTypePicker
            value={values.type ?? initialType}
            disabled={isSaving}
            onChange={chooseType}
          />
        )}

        {accounts.length === 0 ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-sm text-amber-100">
            Сначала создайте хотя бы один счёт. Для перевода нужны два счёта.
          </div>
        ) : (
          <div className="space-y-4">
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-[var(--app-text)]">
                {values.type === 'transfer' ? 'Счёт списания' : 'Счёт'}
              </legend>
              <FinanceAccountCardPicker
                accounts={accounts}
                value={values.accountId ?? ''}
                ariaLabel={values.type === 'transfer' ? 'Счёт списания' : 'Счёт операции'}
                disabled={isSaving}
                onChange={(accountId) => {
                  setValue('accountId', accountId, { shouldValidate: true, shouldDirty: true })
                  if (values.destinationAccountId === accountId) {
                    setValue('destinationAccountId', '', { shouldValidate: true })
                  }
                }}
              />
              {errors.accountId?.message && (
                <span className="mt-1.5 block text-xs text-red-300">
                  {errors.accountId.message}
                </span>
              )}
            </fieldset>

            {values.type === 'transfer' ? (
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium text-[var(--app-text)]">
                  Счёт зачисления
                </legend>
                <FinanceAccountCardPicker
                  accounts={accounts.filter((account) => account.id !== values.accountId)}
                  value={values.destinationAccountId ?? ''}
                  ariaLabel="Счёт зачисления"
                  disabled={isSaving}
                  onChange={(accountId) =>
                    setValue('destinationAccountId', accountId, {
                      shouldValidate: true,
                      shouldDirty: true
                    })
                  }
                />
                {errors.destinationAccountId?.message && (
                  <span className="mt-1.5 block text-xs text-red-300">
                    {errors.destinationAccountId.message}
                  </span>
                )}
              </fieldset>
            ) : (
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium text-[var(--app-text)]">Тег</legend>
                <FinanceTagCardPicker
                  tags={compatibleTags}
                  value={values.tagId ?? ''}
                  ariaLabel="Тег операции"
                  disabled={isSaving}
                  onChange={(tagId) =>
                    setValue('tagId', tagId, { shouldValidate: true, shouldDirty: true })
                  }
                />
                {errors.tagId?.message && (
                  <span className="mt-1.5 block text-xs text-red-300">{errors.tagId.message}</span>
                )}
              </fieldset>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 max-[560px]:grid-cols-1">
          <FinanceField label="Сумма" error={errors.amount?.message} hint={amountHint}>
            <input
              {...register('amount')}
              type="number"
              step="any"
              min={0}
              inputMode="decimal"
              placeholder="0.00"
              className={financeInputClassName}
            />
          </FinanceField>

          <FinanceField label="Дата и время" error={errors.occurredAt?.message}>
            <input
              {...register('occurredAt')}
              type="datetime-local"
              className={financeInputClassName}
            />
          </FinanceField>
        </div>

        <FinanceField label="Комментарий" error={errors.comment?.message}>
          <textarea
            {...register('comment')}
            placeholder="Необязательное пояснение"
            className={financeTextareaClassName}
          />
        </FinanceField>

        {impact && impact.items.length > 0 && (
          <div className="space-y-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
            <p className="text-sm font-semibold text-amber-100">Влияние на лимиты</p>
            {impact.items.map((item) => {
              const limitTag = tags.find((tag) => tag.id === item.limit.tagId)
              return (
                <div key={item.limit.id} className="text-xs leading-5 text-amber-100/85">
                  <span className="font-medium">{limitTag?.name ?? 'Лимит'}:</span>{' '}
                  {item.convertedExpenseMinor === null
                    ? 'невозможно рассчитать без курса валюты'
                    : `${item.limit.usagePercent.toFixed(0)}% → ${(
                        (item.spentAfterMinor / item.limit.amountMinor) *
                        100
                      ).toFixed(0)}%`}
                  {item.exceededAfterMinor > 0 && ' · лимит будет превышен'}
                </div>
              )
            })}
            <p className="text-xs text-amber-200/75">
              Превышение не блокирует расход. Повторное подтверждение сохранит операцию.
            </p>
          </div>
        )}

        {backendError && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/[0.07] p-3 text-sm text-red-200"
          >
            {backendError}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-[var(--app-border)] pt-4">
          <FinanceButton type="button" disabled={isSaving} onClick={() => onOpenChange(false)}>
            Отмена
          </FinanceButton>
          <FinanceButton
            type="submit"
            tone={
              values.type === 'expense'
                ? 'danger'
                : values.type === 'income'
                  ? 'positive'
                  : 'primary'
            }
            disabled={isSaving || impactLoading || accounts.length === 0}
          >
            {isSaving || impactLoading ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : values.type === 'income' ? (
              <ArrowDownLeft aria-hidden="true" className="size-4" />
            ) : values.type === 'expense' ? (
              <ArrowUpRight aria-hidden="true" className="size-4" />
            ) : (
              <ArrowRightLeft aria-hidden="true" className="size-4" />
            )}
            {impactLoading
              ? 'Проверяем лимиты…'
              : isSaving
                ? 'Сохраняем…'
                : impactConfirmed && values.type === 'expense'
                  ? 'Подтвердить расход'
                  : transaction
                    ? 'Сохранить изменения'
                    : 'Создать операцию'}
          </FinanceButton>
        </div>
      </form>
    </AppDialog>
  )
}
