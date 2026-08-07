import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import {
  FINANCE_USER_TRANSACTION_TYPES,
  type FinanceAccountSummary,
  type FinanceTagSummary,
  type FinanceTemplate,
  type FinanceUserTransactionType
} from '../../../../../../shared/contracts/finance'
import { formatMinorPlain, parseMoneyToMinor } from '../../../../../../shared/finance-money'
import { AppDialog } from '../../../../shared/ui/AppDialog'
import { financeClient } from '../../api/finance-client'
import { getFinanceErrorMessage } from '../../lib/finance-ui'
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

const schema = z
  .object({
    name: z.string().trim().min(1, 'Введите название').max(120),
    type: z.enum(FINANCE_USER_TRANSACTION_TYPES),
    sourceAccountId: z.string(),
    destinationAccountId: z.string(),
    tagId: z.string(),
    sourceAmount: z.string().trim().min(1, 'Введите сумму'),
    comment: z.string().max(1000)
  })
  .superRefine((values, context) => {
    if (!values.sourceAccountId) {
      context.addIssue({ code: 'custom', path: ['sourceAccountId'], message: 'Выберите счёт' })
    }
    if (values.type === 'transfer') {
      if (!values.destinationAccountId) {
        context.addIssue({
          code: 'custom',
          path: ['destinationAccountId'],
          message: 'Выберите счёт назначения'
        })
      }
      if (values.sourceAccountId === values.destinationAccountId) {
        context.addIssue({
          code: 'custom',
          path: ['destinationAccountId'],
          message: 'Счета должны отличаться'
        })
      }
    } else if (!values.tagId) {
      context.addIssue({ code: 'custom', path: ['tagId'], message: 'Выберите тег' })
    }
  })

type Values = z.infer<typeof schema>

interface Props {
  open: boolean
  template?: FinanceTemplate | null
  accounts: FinanceAccountSummary[]
  tags: FinanceTagSummary[]
  onOpenChange: (open: boolean) => void
  onSaved: (template: FinanceTemplate) => void | Promise<void>
}

export function FinanceTemplateDialog(props: Props): React.JSX.Element {
  return props.open ? <Content {...props} /> : <></>
}

function Content({ open, template, accounts, tags, onOpenChange, onSaved }: Props): React.JSX.Element {
  const [isSaving, setIsSaving] = useState(false)
  const [backendError, setBackendError] = useState<string | null>(null)
  const sourceAccount = accounts.find((account) => account.id === template?.sourceAccountId)
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors }
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: template?.name ?? '',
      type: template?.type ?? 'expense',
      sourceAccountId: template?.sourceAccountId ?? accounts[0]?.id ?? '',
      destinationAccountId: template?.destinationAccountId ?? '',
      tagId: template?.tagId ?? '',
      sourceAmount:
        template && sourceAccount
          ? formatMinorPlain(template.sourceAmountMinor, sourceAccount.currencyCode)
          : '',
      comment: template?.comment ?? ''
    }
  })
  const values = useWatch({ control })
  const type = values.type ?? 'expense'
  const sourceAccountId = values.sourceAccountId ?? ''
  const destinationAccountId = values.destinationAccountId ?? ''
  const selectedSource = accounts.find((account) => account.id === sourceAccountId)
  const selectedDestination = accounts.find((account) => account.id === destinationAccountId)
  const compatibleTags = tags.filter((tag) => tag.type === 'both' || tag.type === type)

  function chooseType(nextType: FinanceUserTransactionType): void {
    setValue('type', nextType, { shouldValidate: true, shouldDirty: true })
    if (nextType === 'transfer') {
      setValue('tagId', '', { shouldValidate: true })
      return
    }

    setValue('destinationAccountId', '', { shouldValidate: true })
    const selectedTag = tags.find((tag) => tag.id === values.tagId)
    if (selectedTag && selectedTag.type !== 'both' && selectedTag.type !== nextType) {
      setValue('tagId', '', { shouldValidate: true })
    }
  }

  async function submit(formValues: Values): Promise<void> {
    const source = accounts.find((account) => account.id === formValues.sourceAccountId)
    const destination = accounts.find((account) => account.id === formValues.destinationAccountId)
    if (!source) {
      setError('sourceAccountId', { message: 'Счёт не найден' })
      return
    }

    let sourceAmountMinor: number
    let destinationAmountMinor: number | null = null
    try {
      sourceAmountMinor = parseMoneyToMinor(formValues.sourceAmount, source.currencyCode)
      if (sourceAmountMinor <= 0) throw new Error('Сумма должна быть больше нуля')
    } catch (reason) {
      setError('sourceAmount', { message: getFinanceErrorMessage(reason) })
      return
    }

    if (formValues.type === 'transfer') {
      if (!destination) {
        setError('destinationAccountId', { message: 'Счёт зачисления не найден' })
        return
      }
      try {
        destinationAmountMinor = parseMoneyToMinor(formValues.sourceAmount, destination.currencyCode)
        if (destinationAmountMinor <= 0) throw new Error('Сумма должна быть больше нуля')
      } catch (reason) {
        setError('sourceAmount', { message: getFinanceErrorMessage(reason) })
        return
      }
    }

    setIsSaving(true)
    setBackendError(null)
    try {
      const input = {
        name: formValues.name,
        type: formValues.type,
        sourceAccountId: formValues.sourceAccountId,
        destinationAccountId: formValues.type === 'transfer' ? formValues.destinationAccountId : null,
        tagId: formValues.type === 'transfer' ? null : formValues.tagId,
        sourceAmountMinor,
        destinationAmountMinor,
        comment: formValues.comment,
        // Legacy storage fields stay neutral. Scheduling/reminders are no longer part of template UX.
        scheduleType: 'none' as const,
        scheduleInterval: 1,
        nextOccurrenceAt: null,
        reminderEnabled: false
      }
      const saved = template
        ? await financeClient.updateTemplate({ ...input, id: template.id, state: template.state })
        : await financeClient.createTemplate(input)
      await onSaved(saved)
      onOpenChange(false)
    } catch (reason) {
      setBackendError(getFinanceErrorMessage(reason))
    } finally {
      setIsSaving(false)
    }
  }

  const amountHint =
    type === 'transfer' && selectedSource && selectedDestination
      ? `${selectedSource.currencyCode} → ${selectedDestination.currencyCode} · одна и та же сумма`
      : selectedSource
        ? `Валюта: ${selectedSource.currencyCode}`
        : undefined

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={template ? 'Изменить шаблон' : 'Новый шаблон операции'}
      description="Шаблон только заполняет форму операции и никогда не меняет баланс без подтверждения."
      size="lg"
      busy={isSaving}
      closeLabel="Закрыть форму шаблона"
    >
      <form className="space-y-5" onSubmit={(event) => void handleSubmit(submit)(event)}>
        <FinanceField label="Название" error={errors.name?.message}>
          <input {...register('name')} autoFocus className={financeInputClassName} />
        </FinanceField>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-[var(--app-text)]">Тип операции</legend>
          <FinanceOperationTypePicker value={type} disabled={isSaving} onChange={chooseType} />
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-[var(--app-text)]">
            {type === 'transfer' ? 'Счёт списания' : 'Счёт'}
          </legend>
          <FinanceAccountCardPicker
            accounts={accounts}
            value={sourceAccountId}
            ariaLabel={type === 'transfer' ? 'Счёт списания шаблона' : 'Счёт шаблона'}
            disabled={isSaving}
            onChange={(accountId) => {
              setValue('sourceAccountId', accountId, { shouldValidate: true, shouldDirty: true })
              if (destinationAccountId === accountId) {
                setValue('destinationAccountId', '', { shouldValidate: true })
              }
            }}
          />
          {errors.sourceAccountId?.message && (
            <span className="mt-1.5 block text-xs text-red-300">
              {errors.sourceAccountId.message}
            </span>
          )}
        </fieldset>

        {type === 'transfer' ? (
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-[var(--app-text)]">
              Счёт зачисления
            </legend>
            <FinanceAccountCardPicker
              accounts={accounts.filter((account) => account.id !== sourceAccountId)}
              value={destinationAccountId}
              ariaLabel="Счёт зачисления шаблона"
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
              ariaLabel="Тег шаблона"
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

        <FinanceField label="Сумма" error={errors.sourceAmount?.message} hint={amountHint}>
          <input
            {...register('sourceAmount')}
            type="number"
            step="any"
            min={0}
            inputMode="decimal"
            placeholder="0.00"
            className={financeInputClassName}
          />
        </FinanceField>

        <FinanceField label="Комментарий" error={errors.comment?.message}>
          <textarea
            {...register('comment')}
            placeholder="Необязательное пояснение"
            className={financeTextareaClassName}
          />
        </FinanceField>

        {backendError && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/[0.07] p-3 text-sm text-red-200"
          >
            {backendError}
          </div>
        )}

        <footer className="flex justify-end gap-2 border-t border-[var(--app-border)] pt-4">
          <FinanceButton type="button" disabled={isSaving} onClick={() => onOpenChange(false)}>
            Отмена
          </FinanceButton>
          <FinanceButton type="submit" tone="primary" disabled={isSaving || accounts.length === 0}>
            {isSaving && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
            {isSaving ? 'Сохраняем…' : template ? 'Сохранить' : 'Создать шаблон'}
          </FinanceButton>
        </footer>
      </form>
    </AppDialog>
  )
}
