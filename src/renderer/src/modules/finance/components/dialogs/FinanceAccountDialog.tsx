import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  FINANCE_ACCOUNT_TYPES,
  FINANCE_ICON_NAMES,
  type FinanceAccountSummary
} from '../../../../../../shared/contracts/finance'
import { formatMinorPlain, parseMoneyToMinor } from '../../../../../../shared/finance-money'
import { AppDialog } from '../../../../shared/ui/AppDialog'
import { financeClient } from '../../api/finance-client'
import { financeAccountTypeLabels, getFinanceErrorMessage } from '../../lib/finance-ui'
import { FinanceButton, FinanceField, financeInputClassName } from '../FinancePrimitives'

const accountFormSchema = z.object({
  name: z.string().trim().min(1, 'Введите название').max(120),
  type: z.enum(FINANCE_ACCOUNT_TYPES),
  currencyCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Введите трёхбуквенный код валюты'),
  initialBalance: z.string().trim().min(1, 'Введите начальный баланс'),
  icon: z.enum(FINANCE_ICON_NAMES),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Выберите корректный цвет')
})

type AccountFormValues = z.infer<typeof accountFormSchema>

interface FinanceAccountDialogProps {
  open: boolean
  account?: FinanceAccountSummary | null
  onOpenChange: (open: boolean) => void
  onSaved: (account: FinanceAccountSummary) => void | Promise<void>
}

export function FinanceAccountDialog(props: FinanceAccountDialogProps): React.JSX.Element {
  return props.open ? <FinanceAccountDialogContent {...props} /> : <></>
}

function FinanceAccountDialogContent({
  open,
  account,
  onOpenChange,
  onSaved
}: FinanceAccountDialogProps): React.JSX.Element {
  const [isSaving, setIsSaving] = useState(false)
  const [backendError, setBackendError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors }
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: account?.name ?? '',
      type: account?.type ?? 'card',
      currencyCode: account?.currencyCode ?? 'TJS',
      initialBalance: account
        ? formatMinorPlain(account.initialBalanceMinor, account.currencyCode)
        : '0,00',
      icon: account?.icon ?? 'credit-card',
      color: account?.color ?? '#8b5cf6'
    }
  })

  async function submit(values: AccountFormValues): Promise<void> {
    let initialBalanceMinor: number
    try {
      initialBalanceMinor = parseMoneyToMinor(values.initialBalance, values.currencyCode)
    } catch (reason) {
      setError('initialBalance', { message: getFinanceErrorMessage(reason) })
      return
    }

    setIsSaving(true)
    setBackendError(null)
    try {
      const saved = account
        ? await financeClient.updateAccount({
            id: account.id,
            name: values.name,
            type: values.type,
            icon: values.icon,
            color: values.color,
            currencyCode: values.currencyCode
          })
        : await financeClient.createAccount({
            name: values.name,
            type: values.type,
            currencyCode: values.currencyCode,
            initialBalanceMinor,
            icon: values.icon,
            color: values.color
          })
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
      title={account ? 'Изменить счёт' : 'Новый счёт'}
      description="Баланс вычисляется из начальной суммы и всех проводок счёта."
      size="md"
      busy={isSaving}
      closeLabel="Закрыть форму счёта"
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          void handleSubmit(submit)(event)
        }}
      >
        <FinanceField label="Название" error={errors.name?.message}>
          <input {...register('name')} autoFocus className={financeInputClassName} />
        </FinanceField>

        <div className="grid grid-cols-2 gap-4 max-[520px]:grid-cols-1">
          <FinanceField label="Тип" error={errors.type?.message}>
            <select {...register('type')} className={financeInputClassName}>
              {FINANCE_ACCOUNT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {financeAccountTypeLabels[type]}
                </option>
              ))}
            </select>
          </FinanceField>
          <FinanceField
            label="Валюта"
            error={errors.currencyCode?.message}
            hint={
              account && account.transactionCount > 0
                ? 'После появления операций валюту изменить нельзя.'
                : 'Код ISO 4217, например TJS, USD или RUB.'
            }
          >
            <input
              {...register('currencyCode')}
              maxLength={3}
              disabled={Boolean(account && account.transactionCount > 0)}
              className={financeInputClassName}
            />
          </FinanceField>
        </div>

        {!account && (
          <FinanceField label="Начальный баланс" error={errors.initialBalance?.message}>
            <input
              {...register('initialBalance')}
              inputMode="decimal"
              className={financeInputClassName}
            />
          </FinanceField>
        )}

        <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-4">
          <FinanceField label="Иконка" error={errors.icon?.message}>
            <select {...register('icon')} className={financeInputClassName}>
              {FINANCE_ICON_NAMES.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </select>
          </FinanceField>
          <FinanceField label="Цвет" error={errors.color?.message}>
            <input
              {...register('color')}
              type="color"
              className={`${financeInputClassName} p-1`}
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
            {isSaving ? 'Сохраняем…' : account ? 'Сохранить' : 'Создать счёт'}
          </FinanceButton>
        </div>
      </form>
    </AppDialog>
  )
}
