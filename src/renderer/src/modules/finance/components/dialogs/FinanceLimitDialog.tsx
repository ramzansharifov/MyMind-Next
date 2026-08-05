import * as Dialog from '@radix-ui/react-dialog'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, X } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import {
  FINANCE_LIMIT_PERIOD_TYPES,
  FINANCE_LIMIT_SCOPE_TYPES,
  type FinanceAccountSummary,
  type FinanceLimitStatus,
  type FinanceTagSummary
} from '../../../../../../shared/contracts/finance'
import { formatMinorPlain, parseMoneyToMinor } from '../../../../../../shared/finance-money'
import { financeClient } from '../../api/finance-client'
import { fromDateInputValue, getFinanceErrorMessage, toDateInputValue } from '../../lib/finance-ui'
import { FinanceButton, FinanceField, financeInputClassName } from '../FinancePrimitives'

const limitFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Введите название').max(120),
    amount: z.string().trim().min(1, 'Введите сумму лимита'),
    currencyCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, 'Некорректная валюта'),
    scopeType: z.enum(FINANCE_LIMIT_SCOPE_TYPES),
    accountId: z.string(),
    tagId: z.string(),
    periodType: z.enum(FINANCE_LIMIT_PERIOD_TYPES),
    startsAt: z.string().min(1, 'Укажите дату начала'),
    endsAt: z.string(),
    warningPercent: z.coerce.number().int().min(1).max(100)
  })
  .superRefine((values, context) => {
    if (
      (values.scopeType === 'account' || values.scopeType === 'account-tag') &&
      !values.accountId
    ) {
      context.addIssue({ code: 'custom', path: ['accountId'], message: 'Выберите счёт' })
    }
    if ((values.scopeType === 'tag' || values.scopeType === 'account-tag') && !values.tagId) {
      context.addIssue({ code: 'custom', path: ['tagId'], message: 'Выберите тег' })
    }
    if (values.periodType === 'custom' && !values.endsAt) {
      context.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'Укажите дату окончания'
      })
    }
  })

type LimitFormValues = z.infer<typeof limitFormSchema>

interface FinanceLimitDialogProps {
  open: boolean
  limit?: FinanceLimitStatus | null
  accounts: FinanceAccountSummary[]
  tags: FinanceTagSummary[]
  baseCurrencyCode: string
  initialTagId?: string | null
  onOpenChange: (open: boolean) => void
  onSaved: (limit: FinanceLimitStatus) => void | Promise<void>
}

export function FinanceLimitDialog(props: FinanceLimitDialogProps): React.JSX.Element {
  return (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      {props.open && <FinanceLimitDialogContent {...props} />}
    </Dialog.Root>
  )
}

function FinanceLimitDialogContent({
  limit,
  accounts,
  tags,
  baseCurrencyCode,
  initialTagId,
  onOpenChange,
  onSaved
}: FinanceLimitDialogProps): React.JSX.Element {
  const [isSaving, setIsSaving] = useState(false)
  const [backendError, setBackendError] = useState<string | null>(null)
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors }
  } = useForm<LimitFormValues>({
    resolver: zodResolver(limitFormSchema),
    defaultValues: {
      name: limit?.name ?? '',
      amount: limit ? formatMinorPlain(limit.amountMinor, limit.currencyCode) : '',
      currencyCode: limit?.currencyCode ?? baseCurrencyCode,
      scopeType: limit?.scopeType ?? (initialTagId ? 'tag' : 'all'),
      accountId: limit?.accountId ?? '',
      tagId: limit?.tagId ?? initialTagId ?? '',
      periodType: limit?.periodType ?? 'month',
      startsAt: toDateInputValue(limit?.startsAt ?? Date.now()),
      endsAt: limit?.endsAt ? toDateInputValue(limit.endsAt) : '',
      warningPercent: limit?.warningPercent ?? 80
    }
  })
  const scopeType = useWatch({ control, name: 'scopeType' })
  const periodType = useWatch({ control, name: 'periodType' })
  const expenseTags = tags.filter((tag) => tag.type !== 'income')

  async function submit(values: LimitFormValues): Promise<void> {
    let amountMinor: number
    try {
      amountMinor = parseMoneyToMinor(values.amount, values.currencyCode)
      if (amountMinor <= 0) throw new Error('Сумма должна быть больше нуля')
    } catch (reason) {
      setError('amount', { message: getFinanceErrorMessage(reason) })
      return
    }

    setIsSaving(true)
    setBackendError(null)
    try {
      const common = {
        name: values.name,
        amountMinor,
        currencyCode: values.currencyCode,
        scopeType: values.scopeType,
        accountId:
          values.scopeType === 'account' || values.scopeType === 'account-tag'
            ? values.accountId
            : null,
        tagId:
          values.scopeType === 'tag' || values.scopeType === 'account-tag' ? values.tagId : null,
        periodType: values.periodType,
        startsAt: fromDateInputValue(values.startsAt),
        endsAt: values.periodType === 'custom' ? fromDateInputValue(values.endsAt, true) : null,
        warningPercent: values.warningPercent
      }
      const saved = limit
        ? await financeClient.updateLimit({ ...common, id: limit.id, state: limit.state })
        : await financeClient.createLimit(common)
      await onSaved(saved)
      onOpenChange(false)
    } catch (reason) {
      setBackendError(getFinanceErrorMessage(reason))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[82] bg-black/65 backdrop-blur-[2px]" />
      <Dialog.Content className="fixed top-1/2 left-1/2 z-[83] max-h-[calc(100vh-32px)] w-[min(94vw,40rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] shadow-2xl outline-none">
        <div className="flex items-start justify-between border-b border-[var(--app-border)] p-5">
          <div>
            <Dialog.Title className="text-lg font-semibold text-[var(--app-text)]">
              {limit ? 'Изменить лимит' : 'Новый лимит расходов'}
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-[var(--app-muted)]">
              Лимит предупреждает о расходах, но никогда не блокирует операцию.
            </Dialog.Description>
          </div>
          <Dialog.Close asChild disabled={isSaving}>
            <button
              type="button"
              aria-label="Закрыть форму лимита"
              className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </Dialog.Close>
        </div>

        <form
          className="space-y-4 p-5"
          onSubmit={(event) => {
            void handleSubmit(submit)(event)
          }}
        >
          <FinanceField label="Название" error={errors.name?.message}>
            <input {...register('name')} autoFocus className={financeInputClassName} />
          </FinanceField>

          <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-4">
            <FinanceField label="Сумма" error={errors.amount?.message}>
              <input
                {...register('amount')}
                inputMode="decimal"
                placeholder="0,00"
                className={financeInputClassName}
              />
            </FinanceField>
            <FinanceField label="Валюта" error={errors.currencyCode?.message}>
              <input
                {...register('currencyCode')}
                maxLength={3}
                className={financeInputClassName}
              />
            </FinanceField>
          </div>

          <FinanceField label="Область действия" error={errors.scopeType?.message}>
            <select {...register('scopeType')} className={financeInputClassName}>
              <option value="all">Все расходы</option>
              <option value="account">Конкретный счёт</option>
              <option value="tag">Конкретный тег</option>
              <option value="account-tag">Счёт и тег</option>
            </select>
          </FinanceField>

          {(scopeType === 'account' || scopeType === 'account-tag') && (
            <FinanceField label="Счёт" error={errors.accountId?.message}>
              <select {...register('accountId')} className={financeInputClassName}>
                <option value="">Выберите счёт</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} · {account.currencyCode}
                  </option>
                ))}
              </select>
            </FinanceField>
          )}

          {(scopeType === 'tag' || scopeType === 'account-tag') && (
            <FinanceField label="Тег расходов" error={errors.tagId?.message}>
              <select {...register('tagId')} className={financeInputClassName}>
                <option value="">Выберите тег</option>
                {expenseTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </FinanceField>
          )}

          <div className="grid grid-cols-2 gap-4 max-[520px]:grid-cols-1">
            <FinanceField label="Период" error={errors.periodType?.message}>
              <select {...register('periodType')} className={financeInputClassName}>
                <option value="day">День</option>
                <option value="week">Неделя</option>
                <option value="month">Месяц</option>
                <option value="year">Год</option>
                <option value="custom">Собственный диапазон</option>
              </select>
            </FinanceField>
            <FinanceField label="Предупреждение, %" error={errors.warningPercent?.message}>
              <input
                {...register('warningPercent')}
                type="number"
                min={1}
                max={100}
                className={financeInputClassName}
              />
            </FinanceField>
          </div>

          <div className="grid grid-cols-2 gap-4 max-[520px]:grid-cols-1">
            <FinanceField label="Дата начала" error={errors.startsAt?.message}>
              <input {...register('startsAt')} type="date" className={financeInputClassName} />
            </FinanceField>
            {periodType === 'custom' && (
              <FinanceField label="Дата окончания" error={errors.endsAt?.message}>
                <input {...register('endsAt')} type="date" className={financeInputClassName} />
              </FinanceField>
            )}
          </div>

          {backendError && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/20 bg-red-500/[0.07] p-3 text-sm text-red-200"
            >
              {backendError}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-[var(--app-border)] pt-4">
            <Dialog.Close asChild disabled={isSaving}>
              <FinanceButton disabled={isSaving}>Отмена</FinanceButton>
            </Dialog.Close>
            <FinanceButton type="submit" tone="primary" disabled={isSaving}>
              {isSaving && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
              {isSaving ? 'Сохраняем…' : limit ? 'Сохранить' : 'Создать лимит'}
            </FinanceButton>
          </div>
        </form>
      </Dialog.Content>
    </Dialog.Portal>
  )
}
