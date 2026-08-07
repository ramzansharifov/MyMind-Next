import { AlertTriangle, LoaderCircle } from 'lucide-react'
import { useState } from 'react'

import type {
  ClearFinanceAccountHistoryResult,
  FinanceAccountSummary
} from '../../../../../../shared/contracts/finance'
import { formatMoneyMinor } from '../../../../../../shared/finance-money'
import { AppDialog } from '../../../../shared/ui/AppDialog'
import { financeClient } from '../../api/finance-client'
import { getFinanceErrorMessage } from '../../lib/finance-ui'
import { FinanceButton, financeInputClassName } from '../FinancePrimitives'

interface Props {
  open: boolean
  account: FinanceAccountSummary | null
  onOpenChange: (open: boolean) => void
  onCleared: (result: ClearFinanceAccountHistoryResult) => void | Promise<void>
}

export function FinanceClearAccountDialog({
  open,
  account,
  onOpenChange,
  onCleared
}: Props): React.JSX.Element {
  const [confirmation, setConfirmation] = useState('')
  const [isClearing, setIsClearing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!account) return <></>

  async function clear(): Promise<void> {
    const currentAccount = account
    if (!currentAccount || isClearing || confirmation !== 'ОЧИСТИТЬ') return
    setIsClearing(true)
    setError(null)
    try {
      const result = await financeClient.clearAccountHistory({
        accountId: currentAccount.id,
        expectedBalanceMinor: currentAccount.balanceMinor,
        confirmation
      })
      await onCleared(result)
      setConfirmation('')
      onOpenChange(false)
    } catch (reason) {
      setError(getFinanceErrorMessage(reason))
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Очистить историю счёта?"
      description="Действие невозможно отменить. Баланс других счетов будет сохранён системными корректировками."
      icon={<AlertTriangle aria-hidden="true" />}
      tone="danger"
      role="alertdialog"
      size="lg"
      busy={isClearing}
      closeLabel="Закрыть диалог очистки"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1">
          <div className="rounded-xl border border-[var(--app-border)] p-3">
            <div className="text-xs tracking-wider text-[var(--app-muted)] uppercase">Счёт</div>
            <div className="mt-1 font-semibold text-[var(--app-text)]">{account.name}</div>
          </div>
          <div className="rounded-xl border border-[var(--app-border)] p-3">
            <div className="text-xs tracking-wider text-[var(--app-muted)] uppercase">
              Новый начальный баланс
            </div>
            <div className="mt-1 font-semibold text-[var(--app-text)]">
              {formatMoneyMinor(account.balanceMinor, account.currencyCode)}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--app-border)] p-3">
            <div className="text-xs tracking-wider text-[var(--app-muted)] uppercase">
              Удаляемых операций
            </div>
            <div className="mt-1 font-semibold text-[var(--app-text)]">
              {account.transactionCount}
            </div>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-3 text-sm text-amber-100">
            Связанные переводы будут удалены целиком, а на других счетах появятся прозрачные
            технические корректировки.
          </div>
        </div>
        <label className="block text-sm text-[var(--app-text)]">
          <span className="mb-1.5 block font-medium">Введите ОЧИСТИТЬ для подтверждения</span>
          <input
            value={confirmation}
            disabled={isClearing}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            className={financeInputClassName}
          />
        </label>
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/25 bg-red-500/[0.08] p-3 text-sm text-red-100"
          >
            {error}
            <p className="mt-1 text-xs text-red-200/80">
              Обновите данные счёта и подтвердите действие повторно, если баланс успел измениться.
            </p>
          </div>
        )}
        <div className="flex justify-end gap-2 border-t border-[var(--app-border)] pt-4">
          <FinanceButton disabled={isClearing} onClick={() => onOpenChange(false)}>
            Отмена
          </FinanceButton>
          <FinanceButton
            tone="danger"
            disabled={isClearing || confirmation !== 'ОЧИСТИТЬ'}
            onClick={() => void clear()}
          >
            {isClearing && <LoaderCircle className="size-4 animate-spin" />}
            {isClearing ? 'Очищаем историю…' : 'Очистить историю'}
          </FinanceButton>
        </div>
      </div>
    </AppDialog>
  )
}
