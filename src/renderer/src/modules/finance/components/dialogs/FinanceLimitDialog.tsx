import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import type {
  FinanceAccountSummary,
  FinanceLimitStatus,
  FinanceTagSummary
} from '../../../../../../shared/contracts/finance'
import { formatMinorPlain, parseMoneyToMinor } from '../../../../../../shared/finance-money'
import { AppDialog } from '../../../../shared/ui/AppDialog'
import { financeClient } from '../../api/finance-client'
import { getFinanceErrorMessage } from '../../lib/finance-ui'
import { FinanceLimitAccountPicker } from '../FinanceLimitAccountPicker'
import { FinanceButton, FinanceField, financeInputClassName } from '../FinancePrimitives'
import { FinanceTagCardPicker } from '../FinanceSelectionCards'

const limitPeriodTypes = ['day', 'week', 'month', 'year'] as const

const limitFormSchema = z
  .object({
    amount: z.string().trim().min(1, 'Введите сумму лимита'),
    accountIds: z.array(z.string()),
    allAccounts: z.boolean(),
    tagId: z.string().min(1, 'Выберите тег расходов'),
    periodType: z.enum(limitPeriodTypes),
    warningPercent: z.coerce.number().int().min(1).max(100)
  })
  .superRefine((values, context) => {
    if (!values.allAccounts && values.accountIds.length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['accountIds'],
        message: 'Выберите хотя бы один счёт'
      })
    }
  })

type LimitFormInput = z.input<typeof limitFormSchema>
type LimitFormValues = z.output<typeof limitFormSchema>

interface FinanceLimitDialogProps {
  open: boolean
  limit?: FinanceLimitStatus | null
  accounts: FinanceAccountSummary[]
  tags: FinanceTagSummary[]
  initialTagId?: string | null
  onOpenChange: (open: boolean) => void
  onSaved: (limit: FinanceLimitStatus) => void | Promise<void>
}

export function FinanceLimitDialog(props: FinanceLimitDialogProps): React.JSX.Element {
  return props.open ? <FinanceLimitDialogContent {...props} /> : <></>
}

function FinanceLimitDialogContent({
  open,
  limit,
  accounts,
  tags,
  initialTagId,
  onOpenChange,
  onSaved
}: FinanceLimitDialogProps): React.JSX.Element {
  const [isSaving, setIsSaving] = useState(false)
  const [backendError, setBackendError] = useState<string | null>(null)
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

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors }
  } = useForm<LimitFormInput, unknown, LimitFormValues>({
    resolver: zodResolver(limitFormSchema),
    defaultValues: {
      amount: limit ? formatMinorPlain(limit.amountMinor, limit.currencyCode) : '',
      accountIds: defaultAccountIds,
      allAccounts: defaultAllAccounts,
      tagId: limit?.tagId ?? initialTagId ?? '',
      periodType: limit?.periodType ?? 'month',
      warningPercent: limit?.warningPercent ?? 80
    }
  })

  const selectedAccountIds = useWatch({ control, name: 'accountIds' }) ?? []
  const allAccounts = useWatch({ control, name: 'allAccounts' }) ?? false
  const selectedTagId = useWatch({ control, name: 'tagId' }) ?? ''
  const expenseTags = tags.filter((tag) => tag.type !== 'income')
  const selectedAccounts = allAccounts
    ? accounts
    : accounts.filter((account) => selectedAccountIds.includes(account.id))
  const selectedCurrencies = [...new Set(selectedAccounts.map((account) => account.currencyCode))]
  const derivedCurrency = selectedCurrencies.length === 1 ? selectedCurrencies[0] : null
  const selectedTag = expenseTags.find((tag) => tag.id === selectedTagId)

  async function submit(values: LimitFormValues): Promise<void> {
    const selected = values.allAccounts
      ? accounts
      : accounts.filter((account) => values.accountIds.includes(account.id))
    const currencies = [...new Set(selected.map((account) => account.currencyCode))]
    const tag = expenseTags.find((item) => item.id === values.tagId)

    if (!tag) {
      setError('tagId', { message: 'Выберите тег расходов' })
      return
    }
    if (selected.length === 0) {
      setError('accountIds', { message: 'Выберите хотя бы один счёт' })
      return
    }
    if (currencies.length !== 1) {
      setError('accountIds', {
        message: 'В одном лимите можно выбрать только счета с одинаковой валютой'
      })
      return
    }

    const currencyCode = currencies[0]
    let amountMinor: number
    try {
      amountMinor = parseMoneyToMinor(values.amount, currencyCode)
      if (amountMinor <= 0) throw new Error('Сумма должна быть больше нуля')
    } catch (reason) {
      setError('amount', { message: getFinanceErrorMessage(reason) })
      return
    }

    setIsSaving(true)
    setBackendError(null)
    try {
      const common = {
        amountMinor,
        currencyCode,
        accountIds: values.allAccounts ? [] : values.accountIds,
        tagId: values.tagId,
        periodType: values.periodType,
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
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={limit ? 'Изменить лимит' : 'Новый лимит расходов'}
      description="Лимит относится к выбранному тегу и предупреждает при достижении заданной суммы."
      size="lg"
      busy={isSaving}
      closeLabel="Закрыть форму лимита"
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          void handleSubmit(submit)(event)
        }}
      >
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-[var(--app-text)]">
            Тег расходов
          </legend>
          <Controller
            control={control}
            name="tagId"
            render={({ field }) => (
              <FinanceTagCardPicker
                tags={expenseTags}
                value={field.value}
                ariaLabel="Тег лимита"
                disabled={isSaving}
                onChange={field.onChange}
              />
            )}
          />
          {errors.tagId?.message && (
            <span className="mt-1.5 block text-xs text-red-300">{errors.tagId.message}</span>
          )}
          {selectedTag && (
            <p className="mt-2 text-xs text-[var(--app-muted)]">
              Лимит будет отображаться как лимит тега «{selectedTag.name}».
            </p>
          )}
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-[var(--app-text)]">Счета</legend>
          <FinanceLimitAccountPicker
            accounts={accounts}
            accountIds={selectedAccountIds}
            allAccounts={allAccounts}
            disabled={isSaving}
            onChange={(selection) => {
              setValue('accountIds', selection.accountIds, {
                shouldValidate: true,
                shouldDirty: true
              })
              setValue('allAccounts', selection.allAccounts, {
                shouldValidate: true,
                shouldDirty: true
              })
            }}
          />
          {errors.accountIds?.message && (
            <span className="mt-1.5 block text-xs text-red-300">{errors.accountIds.message}</span>
          )}
        </fieldset>

        <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-4 max-[520px]:grid-cols-1">
          <FinanceField label="Сумма" error={errors.amount?.message}>
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
          <FinanceField label="Валюта">
            <div
              aria-label="Валюта лимита"
              aria-readonly="true"
              className={`${financeInputClassName} flex items-center font-medium`}
            >
              {derivedCurrency ?? '—'}
            </div>
          </FinanceField>
        </div>

        <div className="grid grid-cols-2 gap-4 max-[520px]:grid-cols-1">
          <FinanceField label="Период" error={errors.periodType?.message}>
            <select {...register('periodType')} className={financeInputClassName}>
              <option value="day">День</option>
              <option value="week">Неделя</option>
              <option value="month">Месяц</option>
              <option value="year">Год</option>
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
          <FinanceButton type="submit" tone="primary" disabled={isSaving}>
            {isSaving && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
            {isSaving ? 'Сохраняем…' : limit ? 'Сохранить' : 'Создать лимит'}
          </FinanceButton>
        </div>
      </form>
    </AppDialog>
  )
}
