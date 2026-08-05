import * as Dialog from '@radix-ui/react-dialog'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, X } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import {
  FINANCE_TEMPLATE_SCHEDULE_TYPES,
  FINANCE_USER_TRANSACTION_TYPES,
  type FinanceAccountSummary,
  type FinanceTagSummary,
  type FinanceTemplate
} from '../../../../../../shared/contracts/finance'
import { formatMinorPlain, parseMoneyToMinor } from '../../../../../../shared/finance-money'
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

const schema = z
  .object({
    name: z.string().trim().min(1, 'Введите название').max(120),
    type: z.enum(FINANCE_USER_TRANSACTION_TYPES),
    sourceAccountId: z.string(),
    destinationAccountId: z.string(),
    tagId: z.string(),
    sourceAmount: z.string().trim().min(1, 'Введите сумму'),
    destinationAmount: z.string(),
    comment: z.string().max(1000),
    scheduleType: z.enum(FINANCE_TEMPLATE_SCHEDULE_TYPES),
    scheduleInterval: z.coerce.number().int().min(1).max(365),
    nextOccurrenceAt: z.string(),
    reminderEnabled: z.boolean()
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
    if (values.scheduleType !== 'none' && !values.nextOccurrenceAt) {
      context.addIssue({
        code: 'custom',
        path: ['nextOccurrenceAt'],
        message: 'Укажите следующую дату'
      })
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
  return (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      {props.open && <Content {...props} />}
    </Dialog.Root>
  )
}

function Content({ template, accounts, tags, onOpenChange, onSaved }: Props): React.JSX.Element {
  const [isSaving, setIsSaving] = useState(false)
  const [backendError, setBackendError] = useState<string | null>(null)
  const sourceAccount = accounts.find((account) => account.id === template?.sourceAccountId)
  const destinationAccount = accounts.find(
    (account) => account.id === template?.destinationAccountId
  )
  const {
    register,
    control,
    handleSubmit,
    setError,
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
      destinationAmount:
        template?.destinationAmountMinor != null && destinationAccount
          ? formatMinorPlain(template.destinationAmountMinor, destinationAccount.currencyCode)
          : '',
      comment: template?.comment ?? '',
      scheduleType: template?.scheduleType ?? 'none',
      scheduleInterval: template?.scheduleInterval ?? 1,
      nextOccurrenceAt: template?.nextOccurrenceAt
        ? toDateTimeLocalValue(template.nextOccurrenceAt)
        : '',
      reminderEnabled: template?.reminderEnabled ?? false
    }
  })
  const type = useWatch({ control, name: 'type' })
  const sourceAccountId = useWatch({ control, name: 'sourceAccountId' })
  const destinationAccountId = useWatch({ control, name: 'destinationAccountId' })
  const scheduleType = useWatch({ control, name: 'scheduleType' })
  const selectedSource = accounts.find((account) => account.id === sourceAccountId)
  const selectedDestination = accounts.find((account) => account.id === destinationAccountId)
  const compatibleTags = tags.filter((tag) => tag.type === 'both' || tag.type === type)

  async function submit(values: Values): Promise<void> {
    const source = accounts.find((account) => account.id === values.sourceAccountId)
    const destination = accounts.find((account) => account.id === values.destinationAccountId)
    if (!source) return
    let sourceAmountMinor: number
    let destinationAmountMinor: number | null = null
    try {
      sourceAmountMinor = parseMoneyToMinor(values.sourceAmount, source.currencyCode)
      if (sourceAmountMinor <= 0) throw new Error('Сумма должна быть больше нуля')
    } catch (reason) {
      setError('sourceAmount', { message: getFinanceErrorMessage(reason) })
      return
    }
    if (values.type === 'transfer') {
      if (!destination) return
      try {
        destinationAmountMinor = parseMoneyToMinor(
          values.destinationAmount || values.sourceAmount,
          destination.currencyCode
        )
        if (destinationAmountMinor <= 0) throw new Error('Сумма должна быть больше нуля')
        if (
          source.currencyCode === destination.currencyCode &&
          destinationAmountMinor !== sourceAmountMinor
        ) {
          throw new Error('Для одинаковой валюты суммы должны совпадать')
        }
      } catch (reason) {
        setError('destinationAmount', { message: getFinanceErrorMessage(reason) })
        return
      }
    }

    setIsSaving(true)
    setBackendError(null)
    try {
      const input = {
        name: values.name,
        type: values.type,
        sourceAccountId: values.sourceAccountId,
        destinationAccountId: values.type === 'transfer' ? values.destinationAccountId : null,
        tagId: values.type === 'transfer' ? null : values.tagId,
        sourceAmountMinor,
        destinationAmountMinor,
        comment: values.comment,
        scheduleType: values.scheduleType,
        scheduleInterval: values.scheduleInterval,
        nextOccurrenceAt:
          values.scheduleType === 'none' ? null : fromDateTimeLocalValue(values.nextOccurrenceAt),
        reminderEnabled: values.reminderEnabled
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

  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[82] bg-black/65 backdrop-blur-[2px]" />
      <Dialog.Content className="fixed top-1/2 left-1/2 z-[83] max-h-[calc(100vh-32px)] w-[min(94vw,42rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] shadow-2xl outline-none">
        <header className="flex items-start justify-between border-b border-[var(--app-border)] p-5">
          <div>
            <Dialog.Title className="text-lg font-semibold text-[var(--app-text)]">
              {template ? 'Изменить шаблон' : 'Новый шаблон операции'}
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-[var(--app-muted)]">
              Шаблон только заполняет форму и никогда не меняет баланс без подтверждения.
            </Dialog.Description>
          </div>
          <Dialog.Close asChild disabled={isSaving}>
            <button
              type="button"
              aria-label="Закрыть форму шаблона"
              className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)]"
            >
              <X className="size-4" />
            </button>
          </Dialog.Close>
        </header>
        <form className="space-y-4 p-5" onSubmit={(event) => void handleSubmit(submit)(event)}>
          <FinanceField label="Название" error={errors.name?.message}>
            <input {...register('name')} autoFocus className={financeInputClassName} />
          </FinanceField>
          <FinanceField label="Тип операции" error={errors.type?.message}>
            <select {...register('type')} className={financeInputClassName}>
              <option value="income">Доход</option>
              <option value="expense">Расход</option>
              <option value="transfer">Перевод</option>
            </select>
          </FinanceField>
          <div className="grid grid-cols-2 gap-4 max-[600px]:grid-cols-1">
            <FinanceField
              label={type === 'transfer' ? 'Счёт списания' : 'Счёт'}
              error={errors.sourceAccountId?.message}
            >
              <select {...register('sourceAccountId')} className={financeInputClassName}>
                <option value="">Выберите счёт</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} · {account.currencyCode}
                  </option>
                ))}
              </select>
            </FinanceField>
            {type === 'transfer' && (
              <FinanceField label="Счёт зачисления" error={errors.destinationAccountId?.message}>
                <select {...register('destinationAccountId')} className={financeInputClassName}>
                  <option value="">Выберите счёт</option>
                  {accounts
                    .filter((account) => account.id !== sourceAccountId)
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} · {account.currencyCode}
                      </option>
                    ))}
                </select>
              </FinanceField>
            )}
          </div>
          {type !== 'transfer' && (
            <FinanceField label="Тег" error={errors.tagId?.message}>
              <select {...register('tagId')} className={financeInputClassName}>
                <option value="">Выберите тег</option>
                {compatibleTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </FinanceField>
          )}
          <div className="grid grid-cols-2 gap-4 max-[600px]:grid-cols-1">
            <FinanceField
              label={
                type === 'transfer'
                  ? `Сумма списания${selectedSource ? `, ${selectedSource.currencyCode}` : ''}`
                  : 'Сумма'
              }
              error={errors.sourceAmount?.message}
            >
              <input
                {...register('sourceAmount')}
                inputMode="decimal"
                className={financeInputClassName}
              />
            </FinanceField>
            {type === 'transfer' && (
              <FinanceField
                label={`Сумма зачисления${selectedDestination ? `, ${selectedDestination.currencyCode}` : ''}`}
                error={errors.destinationAmount?.message}
              >
                <input
                  {...register('destinationAmount')}
                  inputMode="decimal"
                  className={financeInputClassName}
                />
              </FinanceField>
            )}
          </div>
          <FinanceField label="Комментарий" error={errors.comment?.message}>
            <textarea {...register('comment')} className={financeTextareaClassName} />
          </FinanceField>
          <div className="grid grid-cols-2 gap-4 max-[600px]:grid-cols-1">
            <FinanceField label="Расписание" error={errors.scheduleType?.message}>
              <select {...register('scheduleType')} className={financeInputClassName}>
                <option value="none">Без расписания</option>
                <option value="daily">Ежедневно</option>
                <option value="weekly">Еженедельно</option>
                <option value="monthly">Ежемесячно</option>
                <option value="yearly">Ежегодно</option>
                <option value="custom">Собственный интервал</option>
              </select>
            </FinanceField>
            {scheduleType === 'custom' && (
              <FinanceField label="Интервал, дней" error={errors.scheduleInterval?.message}>
                <input
                  {...register('scheduleInterval')}
                  type="number"
                  min={1}
                  max={365}
                  className={financeInputClassName}
                />
              </FinanceField>
            )}
          </div>
          {scheduleType !== 'none' && (
            <FinanceField
              label="Следующая предполагаемая дата"
              error={errors.nextOccurrenceAt?.message}
            >
              <input
                {...register('nextOccurrenceAt')}
                type="datetime-local"
                className={financeInputClassName}
              />
            </FinanceField>
          )}
          <label className="flex items-center gap-3 rounded-xl border border-[var(--app-border)] p-3 text-sm text-[var(--app-text)]">
            <input
              {...register('reminderEnabled')}
              type="checkbox"
              className="size-4 accent-violet-500"
            />
            Напоминать о приближении операции
          </label>
          {backendError && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/20 bg-red-500/[0.07] p-3 text-sm text-red-200"
            >
              {backendError}
            </div>
          )}
          <footer className="flex justify-end gap-2 border-t border-[var(--app-border)] pt-4">
            <Dialog.Close asChild disabled={isSaving}>
              <FinanceButton disabled={isSaving}>Отмена</FinanceButton>
            </Dialog.Close>
            <FinanceButton type="submit" tone="primary" disabled={isSaving}>
              {isSaving && <LoaderCircle className="size-4 animate-spin" />}
              {isSaving ? 'Сохраняем…' : template ? 'Сохранить' : 'Создать шаблон'}
            </FinanceButton>
          </footer>
        </form>
      </Dialog.Content>
    </Dialog.Portal>
  )
}
