import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  CalendarClock,
  ChevronRight,
  Gauge,
  Landmark,
  Plus
} from 'lucide-react'

import type {
  FinanceDashboard,
  FinanceTemplate,
  FinanceTransaction,
  FinanceUserTransactionType
} from '../../../../../shared/contracts/finance'
import { formatMoneyMinor } from '../../../../../shared/finance-money'
import { FinanceIcon, financeAccountTypeLabels } from '../lib/finance-ui'
import { FinanceProgress } from './charts/FinanceCharts'
import { FinanceButton, FinanceEmptyState, FinanceSurface } from './FinancePrimitives'
import { FinanceTransactionList } from './FinanceTransactionList'

interface Props {
  dashboard: FinanceDashboard
  onCreateTransaction: (type: FinanceUserTransactionType) => void
  onOpenPage: (page: 'accounts' | 'transactions') => void
  onOpenAccount: (accountId: string) => void
  onUseTemplate: (template: FinanceTemplate) => void
  onSnoozeTemplate: (template: FinanceTemplate) => void
  onSkipTemplate: (template: FinanceTemplate) => void
  onEditTransaction: (transaction: FinanceTransaction) => void
}

export function FinanceHome({
  dashboard,
  onCreateTransaction,
  onOpenPage,
  onOpenAccount,
  onUseTemplate,
  onSnoozeTemplate,
  onSkipTemplate,
  onEditTransaction
}: Props): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-3 max-[1050px]:grid-cols-2 max-[580px]:grid-cols-1">
        <Metric
          label="Общий баланс"
          value={formatMoneyMinor(dashboard.totalBalanceMinor, dashboard.settings.baseCurrencyCode)}
          accent
          incomplete={!dashboard.totalBalanceComplete}
          detail={
            !dashboard.totalBalanceComplete
              ? `Не включены: ${dashboard.missingRateCurrencies.join(', ')}`
              : `В ${dashboard.settings.baseCurrencyCode}`
          }
        />
        <Metric
          label="Доходы за период"
          value={`+${formatMoneyMinor(dashboard.incomeMinor, dashboard.settings.baseCurrencyCode)}`}
          tone="positive"
          detail={`${dashboard.operationCount} операций`}
        />
        <Metric
          label="Расходы за период"
          value={`−${formatMoneyMinor(dashboard.expenseMinor, dashboard.settings.baseCurrencyCode)}`}
          tone="negative"
          detail="Без переводов и корректировок"
        />
        <Metric
          label="Чистый результат"
          value={formatMoneyMinor(dashboard.netMinor, dashboard.settings.baseCurrencyCode)}
          tone={dashboard.netMinor >= 0 ? 'positive' : 'negative'}
          detail="Доходы минус расходы"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <FinanceButton tone="positive" onClick={() => onCreateTransaction('income')}>
          <ArrowDownLeft className="size-4" />
          Доход
        </FinanceButton>
        <FinanceButton tone="danger" onClick={() => onCreateTransaction('expense')}>
          <ArrowUpRight className="size-4" />
          Расход
        </FinanceButton>
        <FinanceButton tone="primary" onClick={() => onCreateTransaction('transfer')}>
          <ArrowRightLeft className="size-4" />
          Перевод
        </FinanceButton>
      </div>

      <section>
        <SectionHeader
          title="Счета"
          description="Текущие остатки по местам хранения денег"
          actionLabel="Все счета"
          onAction={() => onOpenPage('accounts')}
        />
        {dashboard.accounts.length === 0 ? (
          <FinanceEmptyState
            icon={<Landmark className="size-6" />}
            title="Пока нет счетов"
            description="Создайте первый счёт, чтобы начать вести доходы, расходы и переводы."
            action={
              <FinanceButton tone="primary" onClick={() => onOpenPage('accounts')}>
                <Plus className="size-4" />
                Создать счёт
              </FinanceButton>
            }
          />
        ) : (
          <div className="grid grid-cols-3 gap-3 max-[1000px]:grid-cols-2 max-[620px]:grid-cols-1">
            {dashboard.accounts.map((account) => (
              <button
                key={account.id}
                type="button"
                className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 text-left shadow-[var(--app-shadow-card)] transition hover:-translate-y-0.5 hover:border-[var(--app-border-strong)]"
                onClick={() => onOpenAccount(account.id)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-10 items-center justify-center rounded-xl"
                    style={{ background: `${account.color}22`, color: account.color }}
                  >
                    <FinanceIcon name={account.icon} className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-medium text-[var(--app-text)]">
                      {account.name}
                    </div>
                    <div className="text-xs text-[var(--app-muted)]">
                      {financeAccountTypeLabels[account.type]}
                    </div>
                  </div>
                </div>
                <div className="mt-5 text-xl font-semibold text-[var(--app-text)] tabular-nums">
                  {formatMoneyMinor(account.balanceMinor, account.currencyCode)}
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-[var(--app-muted)]">
                  <span>
                    {account.lastTransactionAt
                      ? `Последняя: ${new Date(account.lastTransactionAt).toLocaleDateString('ru-RU')}`
                      : 'Нет операций'}
                  </span>
                  <span
                    className={account.periodChangeMinor >= 0 ? 'text-emerald-300' : 'text-red-300'}
                  >
                    {account.periodChangeMinor >= 0 ? '+' : ''}
                    {formatMoneyMinor(account.periodChangeMinor, account.currencyCode)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
        {dashboard.balancesByCurrency.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {dashboard.balancesByCurrency.map((item) => (
              <span
                key={item.currencyCode}
                className="rounded-lg border border-[var(--app-border)] bg-[var(--app-overlay-faint)] px-3 py-1.5 text-xs text-[var(--app-muted)]"
              >
                {item.currencyCode}:{' '}
                <strong className="text-[var(--app-text)]">
                  {formatMoneyMinor(item.balanceMinor, item.currencyCode)}
                </strong>
                {!item.hasRate && item.currencyCode !== dashboard.settings.baseCurrencyCode
                  ? ' · курс не задан'
                  : ''}
              </span>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 gap-5 max-[900px]:grid-cols-1">
        <FinanceSurface className="overflow-hidden">
          <div className="border-b border-[var(--app-border)] p-4">
            <SectionHeader
              title="Действующие лимиты"
              description="Сначала превышенные и достигшие порога"
              actionLabel="Управлять"
              onAction={() => onOpenPage('transactions')}
            />
          </div>
          {dashboard.limits.length === 0 ? (
            <div className="p-5 text-sm text-[var(--app-muted)]">Активных лимитов пока нет.</div>
          ) : (
            <div className="divide-y divide-[var(--app-border)]">
              {dashboard.limits.slice(0, 5).map((limit) => (
                <div key={limit.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-[var(--app-text)]">{limit.name}</div>
                      <div className="mt-0.5 text-xs text-[var(--app-muted)]">
                        Потрачено {formatMoneyMinor(limit.spentMinor, limit.currencyCode)} из{' '}
                        {formatMoneyMinor(limit.amountMinor, limit.currencyCode)}
                      </div>
                    </div>
                    <span
                      className={`text-sm font-semibold ${limit.exceededMinor > 0 ? 'text-red-300' : limit.warningReached ? 'text-amber-300' : 'text-[var(--app-text)]'}`}
                    >
                      {Math.round(limit.usagePercent)}%
                    </span>
                  </div>
                  <FinanceProgress
                    className="mt-3"
                    value={limit.usagePercent}
                    exceeded={limit.exceededMinor > 0}
                    warning={limit.warningReached}
                  />
                  <div className="mt-2 flex justify-between text-xs text-[var(--app-muted)]">
                    <span>
                      {limit.exceededMinor > 0
                        ? `Превышение ${formatMoneyMinor(limit.exceededMinor, limit.currencyCode)}`
                        : `Осталось ${formatMoneyMinor(limit.remainingMinor, limit.currencyCode)}`}
                    </span>
                    <span>{limit.daysRemaining} дн.</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </FinanceSurface>

        <FinanceSurface className="overflow-hidden">
          <div className="border-b border-[var(--app-border)] p-4">
            <SectionHeader
              title="Предстоящие операции"
              description="Только после вашего подтверждения"
              actionLabel="Шаблоны"
              onAction={() => onOpenPage('transactions')}
            />
          </div>
          {dashboard.upcomingTemplates.length === 0 ? (
            <div className="p-5 text-sm text-[var(--app-muted)]">
              Нет ближайших регулярных операций.
            </div>
          ) : (
            <div className="divide-y divide-[var(--app-border)]">
              {dashboard.upcomingTemplates.slice(0, 5).map((template) => (
                <div key={template.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                      <CalendarClock className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-[var(--app-text)]">
                        {template.name}
                      </div>
                      <div className="mt-0.5 text-xs text-[var(--app-muted)]">
                        {template.nextOccurrenceAt
                          ? new Date(template.nextOccurrenceAt).toLocaleString('ru-RU', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })
                          : 'Без даты'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <FinanceButton size="sm" tone="primary" onClick={() => onUseTemplate(template)}>
                      Создать
                    </FinanceButton>
                    <FinanceButton size="sm" onClick={() => onSnoozeTemplate(template)}>
                      Отложить
                    </FinanceButton>
                    <FinanceButton size="sm" onClick={() => onSkipTemplate(template)}>
                      Пропустить
                    </FinanceButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </FinanceSurface>
      </div>

      <FinanceSurface className="overflow-hidden">
        <div className="border-b border-[var(--app-border)] p-4">
          <SectionHeader
            title="Последние операции"
            description="Системные корректировки скрыты"
            actionLabel="Все операции"
            onAction={() => onOpenPage('transactions')}
          />
        </div>
        {dashboard.recentTransactions.length === 0 ? (
          <div className="p-5 text-sm text-[var(--app-muted)]">Операций пока нет.</div>
        ) : (
          <FinanceTransactionList
            transactions={dashboard.recentTransactions}
            onEdit={onEditTransaction}
          />
        )}
      </FinanceSurface>
    </div>
  )
}

function Metric({
  label,
  value,
  detail,
  tone,
  accent,
  incomplete
}: {
  label: string
  value: string
  detail: string
  tone?: 'positive' | 'negative'
  accent?: boolean
  incomplete?: boolean
}): React.JSX.Element {
  return (
    <FinanceSurface className={`p-4 ${accent ? 'ring-1 ring-violet-500/20' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium tracking-[0.12em] text-[var(--app-muted)] uppercase">
          {label}
        </span>
        {incomplete && <Gauge className="size-4 text-amber-300" />}
      </div>
      <div
        className={`mt-3 text-xl font-semibold tabular-nums ${tone === 'positive' ? 'text-emerald-300' : tone === 'negative' ? 'text-red-300' : 'text-[var(--app-text)]'}`}
      >
        {value}
      </div>
      <p className={`mt-1 text-xs ${incomplete ? 'text-amber-200' : 'text-[var(--app-muted)]'}`}>
        {detail}
      </p>
    </FinanceSurface>
  )
}

function SectionHeader({
  title,
  description,
  actionLabel,
  onAction
}: {
  title: string
  description: string
  actionLabel: string
  onAction: () => void
}): React.JSX.Element {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-[var(--app-text)]">{title}</h2>
        <p className="mt-0.5 text-sm text-[var(--app-muted)]">{description}</p>
      </div>
      <button
        type="button"
        className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-violet-300 hover:text-violet-200"
        onClick={onAction}
      >
        {actionLabel}
        <ChevronRight className="size-4" />
      </button>
    </div>
  )
}
