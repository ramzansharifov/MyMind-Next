import {
  BarChart3,
  CircleDollarSign,
  Home,
  Landmark,
  LoaderCircle,
  ReceiptText,
  RefreshCw,
  Tags
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import type {
  FinanceDashboard,
  FinanceExchangeRate,
  FinancePageId,
  FinanceTagSummary,
  FinanceTemplate,
  FinanceTransaction,
  FinanceUserTransactionType
} from '../../../../shared/contracts/finance'
import { currentMonthPeriod, getFinanceErrorMessage } from './lib/finance-ui'
import { financeClient } from './api/finance-client'
import { FinanceAccounts } from './components/FinanceAccounts'
import { FinanceHome } from './components/FinanceHome'
import {
  FinanceButton,
  FinanceErrorState,
  FinanceLoadingState
} from './components/FinancePrimitives'
import { FinanceReports } from './components/FinanceReports'
import { FinanceTags } from './components/FinanceTags'
import { FinanceTransactions } from './components/FinanceTransactions'
import { FinanceTagDialog } from './components/dialogs/FinanceTagDialog'
import { FinanceTransactionDialog } from './components/dialogs/FinanceTransactionDialog'

interface FinancePageProps {
  resourceId?: string | null
  onResourceHandled?: () => void
}

const tabs: Array<{ id: FinancePageId; label: string; icon: typeof Home }> = [
  { id: 'home', label: 'Главная', icon: Home },
  { id: 'transactions', label: 'Транзакции', icon: ReceiptText },
  { id: 'accounts', label: 'Счета', icon: Landmark },
  { id: 'tags', label: 'Теги', icon: Tags },
  { id: 'reports', label: 'Отчёты', icon: BarChart3 }
]

export function FinancePage({
  resourceId,
  onResourceHandled
}: FinancePageProps): React.JSX.Element {
  const [activePage, setActivePage] = useState<FinancePageId>('home')
  const [dashboard, setDashboard] = useState<FinanceDashboard | null>(null)
  const [tags, setTags] = useState<FinanceTagSummary[]>([])
  const [templates, setTemplates] = useState<FinanceTemplate[]>([])
  const [rates, setRates] = useState<FinanceExchangeRate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [quickTransactionType, setQuickTransactionType] =
    useState<FinanceUserTransactionType>('expense')
  const [quickTransactionOpen, setQuickTransactionOpen] = useState(false)
  const [transactionsInitial, setTransactionsInitial] = useState<FinanceTransaction | null>(null)
  const [templateInitial, setTemplateInitial] = useState<FinanceTemplate | null>(null)
  const [createTagType, setCreateTagType] = useState<'income' | 'expense' | null>(null)
  const [quickTagType, setQuickTagType] = useState<'income' | 'expense' | null>(null)

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      const period = currentMonthPeriod()
      const [nextDashboard, nextTags, nextTemplates, nextRates] = await Promise.all([
        financeClient.getDashboard(period),
        financeClient.listTags(),
        financeClient.listTemplates(),
        financeClient.listExchangeRates()
      ])
      setDashboard(nextDashboard)
      setTags(nextTags)
      setTemplates(nextTemplates)
      setRates(nextRates)
      setRefreshVersion((current) => current + 1)
    } catch (reason) {
      setError(getFinanceErrorMessage(reason))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!resourceId) return
    const page = tabs.some((item) => item.id === resourceId) ? (resourceId as FinancePageId) : null
    if (page) setActivePage(page)
    onResourceHandled?.()
  }, [onResourceHandled, resourceId])

  function openQuick(type: FinanceUserTransactionType): void {
    setQuickTransactionType(type)
    setQuickTransactionOpen(true)
  }

  if (isLoading && !dashboard) {
    return (
      <main className="h-full overflow-y-auto bg-[var(--app-workspace)]">
        <div className="mx-auto max-w-[1240px] px-8 py-7 max-[700px]:px-4">
          <FinanceLoadingState />
        </div>
      </main>
    )
  }
  if (error && !dashboard) {
    return (
      <main className="h-full overflow-y-auto bg-[var(--app-workspace)]">
        <div className="mx-auto max-w-[1240px] px-8 py-7 max-[700px]:px-4">
          <FinanceErrorState message={error} onRetry={() => void load()} />
        </div>
      </main>
    )
  }
  if (!dashboard) return <></>

  return (
    <main className="h-full overflow-y-auto bg-[var(--app-workspace)]">
      <div className="mx-auto max-w-[1240px] px-8 py-7 max-[700px]:px-4 max-[700px]:py-5">
        <header className="mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-violet-300 uppercase">
                <CircleDollarSign className="size-4" />
                Финансы
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--app-text)]">
                Личные финансы
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--app-muted)]">
                Счета, доходы, расходы, переводы, лимиты и отчёты — локально, без внешних сервисов.
              </p>
            </div>
            <FinanceButton size="sm" onClick={() => void load()} disabled={isLoading}>
              {isLoading ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Обновить
            </FinanceButton>
          </div>
          <nav
            className="mt-5 flex gap-1 overflow-x-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-1.5"
            aria-label="Навигация финансового модуля"
          >
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-current={activePage === id ? 'page' : undefined}
                className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors ${activePage === id ? 'bg-violet-500 text-white shadow-sm' : 'text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'}`}
                onClick={() => {
                  setActivePage(id)
                  if (id !== 'accounts') setSelectedAccountId(null)
                }}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </nav>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-100"
          >
            <span>{error}</span>
            <button
              type="button"
              className="underline"
              onClick={() => {
                setError(null)
                void load()
              }}
            >
              Повторить
            </button>
          </div>
        )}

        {activePage === 'home' && (
          <FinanceHome
            dashboard={dashboard}
            onCreateTransaction={openQuick}
            onOpenPage={(page) => setActivePage(page)}
            onOpenAccount={(id) => {
              setSelectedAccountId(id)
              setActivePage('accounts')
            }}
            onUseTemplate={(template) => {
              setTemplateInitial(template)
              setActivePage('transactions')
            }}
            onSnoozeTemplate={(template) =>
              void (async () => {
                await financeClient.snoozeTemplate({
                  id: template.id,
                  nextOccurrenceAt: Date.now() + 86_400_000
                })
                await load()
              })()
            }
            onSkipTemplate={(template) =>
              void (async () => {
                await financeClient.skipTemplate({ id: template.id })
                await load()
              })()
            }
            onEditTransaction={(transaction) => {
              setTransactionsInitial(transaction)
              setActivePage('transactions')
            }}
          />
        )}
        {activePage === 'transactions' && (
          <FinanceTransactions
            accounts={dashboard.accounts}
            tags={tags}
            limits={dashboard.limits}
            templates={templates}
            baseCurrencyCode={dashboard.settings.baseCurrencyCode}
            initialTransaction={transactionsInitial}
            initialTemplate={templateInitial}
            onChanged={async () => {
              setTransactionsInitial(null)
              setTemplateInitial(null)
              await load()
            }}
          />
        )}
        {activePage === 'accounts' && (
          <FinanceAccounts
            accounts={dashboard.accounts}
            settings={dashboard.settings}
            rates={rates}
            selectedAccountId={selectedAccountId}
            onSelectedAccountChange={setSelectedAccountId}
            onChanged={load}
          />
        )}
        {activePage === 'tags' && (
          <FinanceTags
            tags={tags}
            accounts={dashboard.accounts}
            limits={dashboard.limits}
            baseCurrencyCode={dashboard.settings.baseCurrencyCode}
            createType={createTagType}
            onCreateTypeHandled={() => setCreateTagType(null)}
            onChanged={load}
          />
        )}
        {activePage === 'reports' && (
          <FinanceReports
            accounts={dashboard.accounts}
            tags={tags}
            baseCurrencyCode={dashboard.settings.baseCurrencyCode}
            limitsVersion={refreshVersion}
          />
        )}
      </div>

      <FinanceTagDialog
        open={quickTagType !== null}
        initialType={quickTagType ?? 'expense'}
        onOpenChange={(open) => {
          if (!open) setQuickTagType(null)
        }}
        onSaved={async () => {
          await load()
        }}
      />
      <FinanceTransactionDialog
        open={quickTransactionOpen}
        initialType={quickTransactionType}
        accounts={dashboard.accounts}
        tags={tags}
        onOpenChange={setQuickTransactionOpen}
        onSaved={async () => load()}
        onCreateTagRequested={setQuickTagType}
      />
    </main>
  )
}
