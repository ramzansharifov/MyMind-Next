import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, LoaderCircle, Plus } from 'lucide-react'
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
import {
  FinanceButton,
  FinanceField,
  financeInputClassName,
  financeTextareaClassName
} from '../FinancePrimitives'

const transactionFormSchema = z
  .object({
    type: z.enum(['income', 'expense', 'transfer']),
    accountId: z.string().min(1, 'Выберите счёт'),
    destinationAccountId: z.string(),
    amount: z.string().trim().min(1, 'Введите сумму'),
    destinationAmount: z.string().trim(),
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
      if (!values.destinationAmount) {
        context.addIssue({
          code: 'custom',
          path: ['destinationAmount'],
          message: 'Введите сумму зачисления'
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
  onCreateTagRequested?: (type: 'income' | 'expense') => void
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
      destinationAmount:
        transaction.type === 'transfer' && destination
          ? formatMinorPlain(
              Math.abs(destination.signedAmountMinor),
              destination.accountCurrencyCode
            )
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
      destinationAmount:
        template.destinationAmountMinor === null
          ? ''
          : formatMinorPlain(
              template.destinationAmountMinor,
              accounts.find((account) => account.id === template.destinationAccountId)
                ?.currencyCode ?? 'TJS'
            ),
      tagId: template.tagId ?? '',
      occurredAt: toDateTimeLocalValue(template.nextOccurrenceAt ?? Date.now()),
      comment: template.comment
    }
  }

  return {
    type,
    accountId: accounts[0]?.id ?? '',
    destinationAccountId: '',
    amount: '',
    destinationAmount: '',
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
  onSaved,
  onCreateTagRequested
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
  const destinationAccount = accounts.find((account) => account.id === values.destinationAccountId)
  const compatibleTags = tags.filter((tag) => tag.type === 'both' || tag.type === values.type)

  useEffect(() => {
    setImpactConfirmed(false)
    setImpact(null)
  }, [values.accountId, values.amount, values.occurredAt, values.tagId, values.type])

  const exchangeRateLabel = useMemo(() => {
    if (
      values.type !== 'transfer' ||
      !selectedAccount ||
      !destinationAccount ||
      !values.amount ||
      !values.destinationAmount
    ) {
      return null
    }

    try {
      const sourceMinor = parseMoneyToMinor(values.amount, selectedAccount.currencyCode)
      const destinationMinor = parseMoneyToMinor(
        values.destinationAmount,
        destinationAccount.currencyCode
      )
      if (sourceMinor <= 0 || destinationMinor <= 0) return null
      const scaled = Math.round((destinationMinor / sourceMinor) * FINANCE_RATE_SCALE)
      return `Расчётный курс: ${(scaled / FINANCE_RATE_SCALE).toLocaleString('ru-RU', {
        maximumFractionDigits: 6
      })}`
    } catch {
      return null
    }
  }, [destinationAccount, selectedAccount, values.amount, values.destinationAmount, values.type])

  function chooseType(type: FinanceUserTransactionType): void {
    setValue('type', type, { shouldValidate: true })
    if (type !== 'transfer') {
      setValue('destinationAccountId', '')
      setValue('destinationAmount', '')
    } else {
      setValue('tagId', '')
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
          destinationAmountMinor = parseMoneyToMinor(
            formValues.destinationAmount,
            destination.currencyCode
          )
          if (destinationAmountMinor <= 0) throw new Error('Сумма должна быть больше нуля')
        } catch (reason) {
          setError('destinationAmount', { message: getFinanceErrorMessage(reason) })
          return
        }
        if (
          account.currencyCode === destination.currencyCode &&
          amountMinor !== destinationAmountMinor
        ) {
          setError('destinationAmount', {
            message: 'Для одной валюты суммы списания и зачисления должны совпадать'
          })
          return
        }
        input = {
          type: 'transfer' as const,
          sourceAccountId: account.id,
          destinationAccountId: destination.id,
          sourceAmountMinor: amountMinor,
          destinationAmountMinor,
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
        : template
          ? await financeClient.useTemplate({ templateId: template.id, transaction: input })
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
          <div className="grid grid-cols-3 gap-2" aria-label="Тип операции">
            <FinanceButton
              tone={values.type === 'income' ? 'positive' : 'neutral'}
              onClick={() => chooseType('income')}
            >
              <ArrowDownLeft aria-hidden="true" className="size-4" />
              Доход
            </FinanceButton>
            <FinanceButton
              tone={values.type === 'expense' ? 'danger' : 'neutral'}
              onClick={() => chooseType('expense')}
            >
              <ArrowUpRight aria-hidden="true" className="size-4" />
              Расход
            </FinanceButton>
            <FinanceButton
              tone={values.type === 'transfer' ? 'primary' : 'neutral'}
              onClick={() => chooseType('transfer')}
            >
              <ArrowRightLeft aria-hidden="true" className="size-4" />
              Перевод
            </FinanceButton>
          </div>
        )}

        {accounts.length === 0 ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-sm text-amber-100">
            Сначала создайте хотя бы один счёт. Для перевода нужны два счёта.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 max-[560px]:grid-cols-1">
            <FinanceField
              label={values.type === 'transfer' ? 'Счёт списания' : 'Счёт'}
              error={errors.accountId?.message}
            >
              <select {...register('accountId')} className={financeInputClassName}>
                <option value="">Выберите счёт</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} · {account.currencyCode}
                  </option>
                ))}
              </select>
            </FinanceField>

            {values.type === 'transfer' ? (
              <FinanceField label="Счёт зачисления" error={errors.destinationAccountId?.message}>
                <select {...register('destinationAccountId')} className={financeInputClassName}>
                  <option value="">Выберите счёт</option>
                  {accounts
                    .filter((account) => account.id !== values.accountId)
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} · {account.currencyCode}
                      </option>
                    ))}
                </select>
              </FinanceField>
            ) : (
              <FinanceField label="Тег" error={errors.tagId?.message}>
                <div className="flex gap-2">
                  <select {...register('tagId')} className={financeInputClassName}>
                    <option value="">Выберите тег</option>
                    {compatibleTags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                  {onCreateTagRequested && (
                    <button
                      type="button"
                      aria-label={`Создать тег для ${values.type === 'income' ? 'дохода' : 'расхода'}`}
                      className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] text-[var(--app-muted)] hover:text-[var(--app-accent-300)]"
                      onClick={() =>
                        onCreateTagRequested(values.type === 'income' ? 'income' : 'expense')
                      }
                    >
                      <Plus aria-hidden="true" className="size-4" />
                    </button>
                  )}
                </div>
                {compatibleTags.length === 0 && (
                  <span className="mt-2 block text-xs text-amber-300">
                    Подходящих тегов пока нет. Введённые данные останутся в форме.
                  </span>
                )}
              </FinanceField>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 max-[560px]:grid-cols-1">
          <FinanceField
            label={values.type === 'transfer' ? 'Сумма списания' : 'Сумма'}
            error={errors.amount?.message}
            hint={selectedAccount ? `Валюта: ${selectedAccount.currencyCode}` : undefined}
          >
            <input
              {...register('amount')}
              inputMode="decimal"
              placeholder="0,00"
              className={financeInputClassName}
            />
          </FinanceField>

          {values.type === 'transfer' ? (
            <FinanceField
              label="Сумма зачисления"
              error={errors.destinationAmount?.message}
              hint={
                destinationAccount
                  ? `${destinationAccount.currencyCode}${exchangeRateLabel ? ` · ${exchangeRateLabel}` : ''}`
                  : (exchangeRateLabel ?? undefined)
              }
            >
              <input
                {...register('destinationAmount')}
                inputMode="decimal"
                placeholder="0,00"
                className={financeInputClassName}
              />
            </FinanceField>
          ) : (
            <FinanceField label="Дата и время" error={errors.occurredAt?.message}>
              <input
                {...register('occurredAt')}
                type="datetime-local"
                className={financeInputClassName}
              />
            </FinanceField>
          )}
        </div>

        {values.type === 'transfer' && (
          <FinanceField label="Дата и время" error={errors.occurredAt?.message}>
            <input
              {...register('occurredAt')}
              type="datetime-local"
              className={financeInputClassName}
            />
          </FinanceField>
        )}

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
            {impact.items.map((item) => (
              <div key={item.limit.id} className="text-xs leading-5 text-amber-100/85">
                <span className="font-medium">{item.limit.name}:</span>{' '}
                {item.convertedExpenseMinor === null
                  ? 'невозможно рассчитать без курса валюты'
                  : `${item.limit.usagePercent.toFixed(0)}% → ${(
                      (item.spentAfterMinor / item.limit.amountMinor) *
                      100
                    ).toFixed(0)}%`}
                {item.exceededAfterMinor > 0 && ' · лимит будет превышен'}
              </div>
            ))}
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
