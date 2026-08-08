import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  FINANCE_ICON_NAMES,
  type FinanceAccountSummary
} from '../../../../../../shared/contracts/finance'
import { formatMinorPlain, parseMoneyToMinor } from '../../../../../../shared/finance-money'
import { AppDialog } from '../../../../shared/ui/AppDialog'
import { ColorPicker } from '../../../../shared/ui/ColorPicker'
import { financeClient } from '../../api/finance-client'
import { getFinanceErrorMessage } from '../../lib/finance-ui'
import { FinanceButton, FinanceField, financeInputClassName } from '../FinancePrimitives'
import { FinanceIconPicker } from '../FinanceIconPicker'

const DEFAULT_ACCOUNT_COLOR = '#a78bfa'

const accountFormSchema = z.object({
  name: z.string().trim().min(1, 'Введите название').max(120),
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
    control,
    handleSubmit,
    setError,
    formState: { errors }
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: account?.name ?? '',
      currencyCode: account?.currencyCode ?? '',
      initialBalance: account
        ? formatMinorPlain(account.initialBalanceMinor, account.currencyCode)
        : '0.00',
      icon: account?.icon ?? 'wallet',
      color: account?.color ?? DEFAULT_ACCOUNT_COLOR
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
            icon: values.icon,
            color: values.color,
            currencyCode: values.currencyCode
          })
        : await financeClient.createAccount({
            name: values.name,
            currencyCode: values.currencyCode,
            initialBalanceMinor,
            icon: values.icon,
            color: DEFAULT_ACCOUNT_COLOR
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

        <FinanceField
          label="Валюта"
          error={errors.currencyCode?.message}
          hint={
            account && account.transactionCount > 0
              ? 'После появления операций валюту изменить нельзя.'
              : 'Введите трёхбуквенный код, например TJS, USD или RUB.'
          }
        >
          <input
            {...register('currencyCode')}
            maxLength={3}
            placeholder="TJS"
            autoCapitalize="characters"
            autoComplete="off"
            disabled={Boolean(account && account.transactionCount > 0)}
            className={`${financeInputClassName} uppercase`}
          />
        </FinanceField>

        {!account && (
          <FinanceField label="Начальный баланс" error={errors.initialBalance?.message}>
            <input
              {...register('initialBalance')}
              type="number"
              step="any"
              inputMode="decimal"
              className={financeInputClassName}
            />
          </FinanceField>
        )}

        <div className={account ? 'grid grid-cols-2 gap-4 max-[520px]:grid-cols-1' : ''}>
          <div className="text-sm text-[var(--app-text)]">
            <span className="mb-1.5 block font-medium">Иконка</span>
            <Controller
              control={control}
              name="icon"
              render={({ field }) => (
                <FinanceIconPicker
                  value={field.value}
                  disabled={isSaving}
                  onChange={field.onChange}
                />
              )}
            />
            {errors.icon?.message && (
              <span className="mt-1.5 block text-xs text-red-300">{errors.icon.message}</span>
            )}
          </div>
          {account && (
            <div className="text-sm text-[var(--app-text)]">
              <span className="mb-1.5 block font-medium">Цвет</span>
              <Controller
                control={control}
                name="color"
                render={({ field }) => (
                  <ColorPicker
                    value={field.value}
                    ariaLabel="Цвет счёта"
                    disabled={isSaving}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.color?.message && (
                <span className="mt-1.5 block text-xs text-red-300">{errors.color.message}</span>
              )}
            </div>
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
