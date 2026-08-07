import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  BarChart3,
  Copy,
  Gauge,
  Home,
  Landmark,
  Plus,
  ReceiptText,
  Tags
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import type {
  FinanceDashboard,
  FinancePageId,
  FinanceTagSummary,
  FinanceTemplate,
  FinanceTransaction,
  FinanceUserTransactionType
} from '../../../../shared/contracts/finance'
import { financeClient } from './api/finance-client'
import { FinanceAccounts } from './components/FinanceAccounts'
import { FinanceHome } from './components/FinanceHome'
import { FinanceLimits } from './components/FinanceLimits'
import {
  FinanceButton,
  FinanceErrorState,
  FinanceLoadingState
} from './components/FinancePrimitives'
import { FinanceReports } from './components/FinanceReports'
import { FinanceTags } from './components/FinanceTags'
import { FinanceTemplates } from './components/FinanceTemplates'
import { FinanceTransactions } from './components/FinanceTransactions'
import { FinanceAccountDialog } from './components/dialogs/FinanceAccountDialog'
import { FinanceLimitDialog } from './components/dialogs/FinanceLimitDialog'
import { FinanceTagDialog } from './components/dialogs/FinanceTagDialog'
import { FinanceTemplateDialog } from './components/dialogs/FinanceTemplateDialog'
import { FinanceTransactionDialog } from './components/dialogs/FinanceTransactionDialog'
import { currentMonthPeriod, getFinanceErrorMessage } from './lib/finance-ui'

interface FinancePageProps {
  resourceId?: string | null
  onResourceHandled?: () => void
}

type FinanceWorkspacePage = FinancePageId | 'templates' | 'limits'

const tabs: Array<{ id: FinanceWorkspacePage; label: string; icon: typeof Home }> = [
  { id: 'home', label: 'Главная', icon: Home },
  { id: 'transactions', label: 'Транзакции', icon: ReceiptText },
  { id: 'templates', label: 'Шаблоны', icon: Copy },
  { id: 'limits', label: 'Лимиты', icon: Gauge },
  { id: 'accounts', label: 'Счета', icon: Landmark },
  { id: 'tags', label: 'Теги', icon: Tags },
  { id: 'reports', label: 'Отчёты', icon: BarChart3 }
]

export function FinancePage({
  resourceId,
  onResourceHandled
}: FinancePageProps): React.JSX.Element {
  const [activePage, setActivePage] = useState<FinanceWorkspacePage>('home')
  const [dashboard, setDashboard] = useState<FinanceDashboard | null>(null)
  const [tags, setTags] = useState<FinanceTagSummary[]>([])
  const [templates, setTemplates] = useState<FinanceTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [quickTransactionType, setQuickTransactionType] =
    useState<FinanceUserTransactionType>('expense')
  const [quickTransactionOpen, setQuickTransactionOpen] = useState(false)
  const [transactionsInitial, setTransactionsInitial] = useState<FinanceTransaction | null>(null)
  const [templateInitial, setTemplateInitial] = useState<FinanceTemplate | null>(null)
  const [quickTagType, setQuickTagType] = useState<'income' | 'expense' | null>(null)
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false)
  const [createLimitOpen, setCreateLimitOpen] = useState(false)
  const [createAccountOpen, setCreateAccountOpen] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      const period = currentMonthPeriod()
      const [nextDashboard, nextTags, nextTemplates] = await Promise.all([
        financeClient.getDashboard(period),
        financeClient.listTags(),
        financeClient.listTemplates()
      ])
      setDashboard(nextDashboard)
      setTags(nextTags)
      setTemplates(nextTemplates)
      setRefreshVersion((current) => current + 1)
    } catch (reason) {
      setError(getFinanceErrorMessage(reason))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) void load()
    })
    return () => {
      cancelled = true
    }
  }, [load])

  useEffect(() => {
    if (!resourceId) return
    const page = tabs.some((item) => item.id === resourceId)
      ? (resourceId as FinanceWorkspacePage)
      : null
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      if (page) setActivePage(page)
      onResourceHandled?.()
    })
    return () => {
      cancelled = true
    }
  }, [onResourceHandled, resourceId])

  function openQuick(type: FinanceUserTransactionType): void {
    setQuickTransactionType(type)
    setQuickTransactionOpen(true)
  }

  if (isLoading && !dashboard) {
    return (
      <main className="h-full overflow-y-auto bg-[var(--app-workspace)] px-8 py-7 max-[700px]:px-4 max-[700px]:py-5">
        <div className="mx-auto w-full max-w-[1240px]">
          <FinanceLoadingState />
        </div>
      </main>
    )
  }
  if (error && !dashboard) {
    return (
      <main className="h-full overflow-y-auto bg-[var(--app-workspace)] px-8 py-7 max-[700px]:px-4 max-[700px]:py-5">
        <div className="mx-auto w-full max-w-[1240px]">
          <FinanceErrorState message={error} onRetry={() => void load()} />
        </div>
      </main>
    )
  }
  if (!dashboard) return <></>

  return (
    <main className="h-full overflow-y-auto bg-[var(--app-workspace)] px-8 py-7 max-[700px]:px-4 max-[700px]:py-5">
      <div data-finance-workspace-container className="mx-auto w-full max-w-[1240px]">
        <header data-finance-hero className="mb-5">
          <div className="flex items-start justify-between gap-6 max-[820px]:flex-col">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.12em] text-violet-300 uppercase">
                Финансы
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em] text-[var(--app-text)]">
                Финансы
              </h1>
              <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--app-muted)]">
                Управляйте счетами, операциями и бюджетом в одном месте.
              </p>
            </div>

            {activePage !== 'reports' && (
              <div
                data-finance-header-actions
                className="flex max-w-full shrink-0 flex-wrap justify-end gap-2 max-[820px]:w-full max-[820px]:justify-start"
              >
                {(activePage === 'home' || activePage === 'transactions') && (
                  <>
                    <FinanceButton tone="positive" onClick={() => openQuick('income')}>
                      <ArrowDownLeft aria-hidden="true" className="size-4" />
                      Доход
                    </FinanceButton>
                    <FinanceButton tone="danger" onClick={() => openQuick('expense')}>
                      <ArrowUpRight aria-hidden="true" className="size-4" />
                      Расход
                    </FinanceButton>
                    <FinanceButton tone="primary" onClick={() => openQuick('transfer')}>
                      <ArrowRightLeft aria-hidden="true" className="size-4" />
                      Перевод
                    </FinanceButton>
                  </>
                )}
                {activePage === 'templates' && (
                  <FinanceButton tone="primary" onClick={() => setCreateTemplateOpen(true)}>
                    <Plus aria-hidden="true" className="size-4" />
                    Новый шаблон
                  </FinanceButton>
                )}
                {activePage === 'limits' && (
                  <FinanceButton tone="primary" onClick={() => setCreateLimitOpen(true)}>
                    <Plus aria-hidden="true" className="size-4" />
                    Новый лимит
                  </FinanceButton>
                )}
                {activePage === 'accounts' && (
                  <FinanceButton tone="primary" onClick={() => setCreateAccountOpen(true)}>
                    <Plus aria-hidden="true" className="size-4" />
                    Новый счёт
                  </FinanceButton>
                )}
                {activePage === 'tags' && (
                  <FinanceButton tone="primary" onClick={() => setQuickTagType('expense')}>
                    <Plus aria-hidden="true" className="size-4" />
                    Новый тег
                  </FinanceButton>
                )}
              </div>
            )}
          </div>

          <nav
            data-finance-navigation
            className="flex gap-1 overflow-x-auto rounded-2xl border border-[var(--app-border)] p-1.5"
            aria-label="Навигация финансового модуля"
          >
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-current={activePage === id ? 'page' : undefined}
                className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-violet-500/35 ${activePage === id ? 'bg-violet-500 text-white shadow-sm' : 'text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'}`}
                onClick={() => {
                  setActivePage(id)
                  if (id !== 'accounts') setSelectedAccountId(null)
                }}
              >
                <Icon aria-hidden="true" className="size-4" />
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
            tags={tags}
            onOpenPage={setActivePage}
            onOpenAccount={(id) => {
              setSelectedAccountId(id)
              setActivePage('accounts')
            }}
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
            initialTransaction={transactionsInitial}
            onChanged={async () => {
              setTransactionsInitial(null)
              await load()
            }}
          />
        )}
        {activePage === 'templates' && (
          <FinanceTemplates
            accounts={dashboard.accounts}
            tags={tags}
            templates={templates}
            initialTemplate={templateInitial}
            onInitialTemplateHandled={() => setTemplateInitial(null)}
            onChanged={load}
          />
        )}
        {activePage === 'limits' && (
          <FinanceLimits
            accounts={dashboard.accounts}
            tags={tags}
            limits={dashboard.limits}
            onChanged={load}
          />
        )}
        {activePage === 'accounts' && (
          <FinanceAccounts
            accounts={dashboard.accounts}
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

      <FinanceAccountDialog
        open={createAccountOpen}
        account={null}
        onOpenChange={setCreateAccountOpen}
        onSaved={async () => load()}
      />
      <FinanceTemplateDialog
        open={createTemplateOpen}
        template={null}
        accounts={dashboard.accounts}
        tags={tags}
        onOpenChange={setCreateTemplateOpen}
        onSaved={async () => load()}
      />
      <FinanceLimitDialog
        open={createLimitOpen}
        limit={null}
        accounts={dashboard.accounts}
        tags={tags}
        onOpenChange={setCreateLimitOpen}
        onSaved={async () => load()}
      />
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
      />
    </main>
  )
}
