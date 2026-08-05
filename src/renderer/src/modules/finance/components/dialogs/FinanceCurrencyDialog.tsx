import * as Dialog from '@radix-ui/react-dialog'
import { LoaderCircle, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import type {
  FinanceExchangeRate,
  FinanceSettings
} from '../../../../../../shared/contracts/finance'
import { FINANCE_RATE_SCALE } from '../../../../../../shared/finance-money'
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

  useEffect(() => setBaseCurrency(settings.baseCurrencyCode), [settings.baseCurrencyCode])

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
    <Dialog.Root open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[82] bg-black/65 backdrop-blur-[2px]" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-[83] max-h-[calc(100vh-32px)] w-[min(94vw,42rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] shadow-2xl outline-none"
          onEscapeKeyDown={(event) => isSaving && event.preventDefault()}
          onPointerDownOutside={(event) => isSaving && event.preventDefault()}
        >
          <header className="flex items-start justify-between border-b border-[var(--app-border)] p-5">
            <div>
              <Dialog.Title className="text-lg font-semibold text-[var(--app-text)]">
                Валюты и ручные курсы
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-[var(--app-muted)]">
                Курсы хранятся локально и задаются относительно основной валюты.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild disabled={isSaving}>
              <button
                type="button"
                aria-label="Закрыть настройки валют"
                className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)]"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </header>
          <div className="space-y-5 p-5">
            <section className="rounded-xl border border-[var(--app-border)] p-4">
              <h3 className="font-medium text-[var(--app-text)]">Основная валюта</h3>
              <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
                После изменения сохранённые пользовательские курсы сбрасываются, а для новой
                основной валюты устанавливается курс 1.
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
