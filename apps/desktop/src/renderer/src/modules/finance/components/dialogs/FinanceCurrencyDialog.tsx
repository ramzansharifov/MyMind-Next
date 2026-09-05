import { LoaderCircle, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import type {
  FinanceExchangeRate,
  FinanceSettings
} from '../../../../../../shared/contracts/finance'
import { FINANCE_RATE_SCALE } from '../../../../../../shared/finance-money'
import { AppDialog } from '../../../../shared/ui/AppDialog'
import { Tooltip } from '../../../../shared/ui/tooltip'
import { financeClient } from '../../api/finance-client'
import { getFinanceErrorMessage } from '../../lib/finance-ui'
import { FinanceButton, FinanceField, financeInputClassName } from '../FinancePrimitives'

interface Props {
  open: boolean
  settings: FinanceSettings
  rates: FinanceExchangeRate[]
  onOpenChange: (open: boolean) => void
  onChanged: () => void | Promise<void>
}

export function FinanceCurrencyDialog({
  open,
  settings,
  rates,
  onOpenChange,
  onChanged
}: Props): React.JSX.Element {
  const [baseCurrency, setBaseCurrency] = useState(settings.baseCurrencyCode)
  const [currencyCode, setCurrencyCode] = useState('USD')
  const [rate, setRate] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) setBaseCurrency(settings.baseCurrencyCode)
    })
    return () => {
      cancelled = true
    }
  }, [settings.baseCurrencyCode])

  async function saveBaseCurrency(): Promise<void> {
    setIsSaving(true)
    setError(null)
    try {
      await financeClient.setBaseCurrency({ baseCurrencyCode: baseCurrency.trim().toUpperCase() })
      await onChanged()
    } catch (reason) {
      setError(getFinanceErrorMessage(reason))
    } finally {
      setIsSaving(false)
    }
  }

  async function saveRate(): Promise<void> {
    const numeric = Number(rate.replace(',', '.'))
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setError('Введите положительный курс')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      await financeClient.upsertExchangeRate({
        currencyCode: currencyCode.trim().toUpperCase(),
        rateScaled: Math.round(numeric * FINANCE_RATE_SCALE)
      })
      setRate('')
      await onChanged()
    } catch (reason) {
      setError(getFinanceErrorMessage(reason))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Валюты и ручные курсы"
      description="Курсы хранятся локально и задаются относительно основной валюты."
      size="lg"
      busy={isSaving}
      closeLabel="Закрыть настройки валют"
    >
      <div className="space-y-5">
        <section className="rounded-xl border border-[var(--app-border)] p-4">
          <h3 className="font-medium text-[var(--app-text)]">Основная валюта</h3>
          <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
            После изменения сохранённые пользовательские курсы сбрасываются, а для новой основной
            валюты устанавливается курс 1.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              value={baseCurrency}
              maxLength={3}
              onChange={(event) => setBaseCurrency(event.target.value.toUpperCase())}
              className={financeInputClassName}
            />
            <FinanceButton
              tone="primary"
              disabled={isSaving || baseCurrency === settings.baseCurrencyCode}
              onClick={() => void saveBaseCurrency()}
            >
              Сохранить
            </FinanceButton>
          </div>
        </section>
        <section className="rounded-xl border border-[var(--app-border)] p-4">
          <h3 className="font-medium text-[var(--app-text)]">Добавить или обновить курс</h3>
          <div className="mt-3 grid grid-cols-[8rem_minmax(0,1fr)_auto] gap-2 max-[560px]:grid-cols-1">
            <FinanceField label="Валюта">
              <input
                value={currencyCode}
                maxLength={3}
                onChange={(event) => setCurrencyCode(event.target.value.toUpperCase())}
                className={financeInputClassName}
              />
            </FinanceField>
            <FinanceField label={`1 ${currencyCode || 'USD'} в ${settings.baseCurrencyCode}`}>
              <input
                value={rate}
                inputMode="decimal"
                placeholder="9,200000"
                onChange={(event) => setRate(event.target.value)}
                className={financeInputClassName}
              />
            </FinanceField>
            <FinanceButton
              className="mt-[1.625rem]"
              tone="primary"
              disabled={isSaving}
              onClick={() => void saveRate()}
            >
              <Plus className="size-4" />
              Добавить
            </FinanceButton>
          </div>
        </section>
        <section>
          <h3 className="mb-2 font-medium text-[var(--app-text)]">Сохранённые курсы</h3>
          <div className="space-y-2">
            {rates.map((item) => (
              <div
                key={item.currencyCode}
                className="flex items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 py-3"
              >
                <div>
                  <div className="font-medium text-[var(--app-text)]">
                    {item.currencyCode} → {item.baseCurrencyCode}
                  </div>
                  <div className="text-xs text-[var(--app-muted)]">
                    1 {item.currencyCode} ={' '}
                    {(item.rateScaled / FINANCE_RATE_SCALE).toLocaleString('ru-RU', {
                      maximumFractionDigits: 6
                    })}{' '}
                    {item.baseCurrencyCode}
                  </div>
                </div>
                <Tooltip content={`Удалить курс ${item.currencyCode}`} side="top">
                  <span className="inline-flex">
                    <FinanceButton
                      size="sm"
                      tone="danger"
                      disabled={isSaving || item.currencyCode === settings.baseCurrencyCode}
                      aria-label={`Удалить курс ${item.currencyCode}`}
                      onClick={() =>
                        void (async () => {
                          setIsSaving(true)
                          setError(null)
                          try {
                            await financeClient.deleteExchangeRate({
                              currencyCode: item.currencyCode
                            })
                            await onChanged()
                          } catch (reason) {
                            setError(getFinanceErrorMessage(reason))
                          } finally {
                            setIsSaving(false)
                          }
                        })()
                      }
                    >
                      <Trash2 className="size-4" />
                    </FinanceButton>
                  </span>
                </Tooltip>
              </div>
            ))}
          </div>
        </section>
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/[0.07] p-3 text-sm text-red-200"
          >
            {error}
          </div>
        )}
        {isSaving && (
          <div className="flex items-center gap-2 text-sm text-[var(--app-muted)]">
            <LoaderCircle className="size-4 animate-spin" />
            Сохраняем изменения…
          </div>
        )}
      </div>
    </AppDialog>
  )
}
