import { Gauge, Pause, Play, Trash2 } from 'lucide-react'
import { useState } from 'react'

import type {
  FinanceAccountSummary,
  FinanceLimitStatus,
  FinanceTagSummary
} from '../../../../../shared/contracts/finance'
import { formatMoneyMinor } from '../../../../../shared/finance-money'
import { financeClient } from '../api/finance-client'
import { FinanceProgress } from './charts/FinanceCharts'
import { FinanceButton, FinanceEmptyState, FinanceSurface } from './FinancePrimitives'
import { FinanceSection } from './FinanceSection'
import { FinanceConfirmDialog } from './dialogs/FinanceConfirmDialog'
import { FinanceLimitDialog } from './dialogs/FinanceLimitDialog'

interface Props {
  accounts: FinanceAccountSummary[]
  tags: FinanceTagSummary[]
  limits: FinanceLimitStatus[]
  onChanged: () => void | Promise<void>
}

const periodLabels = {
  day: 'День',
  week: 'Неделя',
  month: 'Месяц',
  year: 'Год',
  custom: 'Период'
} as const

export function FinanceLimits({
  accounts,
  tags,
  limits,
  onChanged
}: Props): React.JSX.Element {
  const [limitDialogOpen, setLimitDialogOpen] = useState(false)
  const [editLimit, setEditLimit] = useState<FinanceLimitStatus | null>(null)
  const [deleteLimit, setDeleteLimit] = useState<FinanceLimitStatus | null>(null)

  return (
    <div className="space-y-4">
      <FinanceSection title="Лимиты" icon={<Gauge aria-hidden="true" className="size-5" />}>
        {limits.length === 0 ? (
          <FinanceEmptyState
            icon={<Gauge className="size-6" />}
            title="Лимитов пока нет"
            description="Создайте лимит для нужного тега и выберите счета, расходы которых он должен учитывать."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 max-[780px]:grid-cols-1">
            {limits.map((limit) => {
              const tag = tags.find((item) => item.id === limit.tagId)
              const selectedAccounts = accounts.filter((account) =>
                limit.accountIds.includes(account.id)
              )
              const accountsLabel =
                limit.accountIds.length === 0
                  ? `Все счета · ${limit.currencyCode}`
                  : selectedAccounts.length <= 2
                    ? selectedAccounts.map((account) => account.name).join(', ')
                    : `${selectedAccounts.slice(0, 2).map((account) => account.name).join(', ')} +${selectedAccounts.length - 2}`

              return (
                <FinanceSurface
                  key={limit.id}
                  as="article"
                  className="bg-[var(--app-card)] p-4 shadow-none"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-medium text-[var(--app-text)]">{limit.name}</h3>
                      <p className="mt-1 truncate text-xs text-[var(--app-muted)]">
                        {tag?.name ?? 'Тег не найден'} · {accountsLabel}
                      </p>
                      <p className="mt-1 text-xs text-[var(--app-muted)]">
                        {periodLabels[limit.periodType]} ·{' '}
                        {limit.state === 'active' ? 'Активен' : 'Приостановлен'}
                      </p>
                    </div>
                    <span
                      className={
                        limit.exceededMinor > 0
                          ? 'text-red-300'
                          : limit.warningReached
                            ? 'text-amber-300'
                            : 'text-[var(--app-text)]'
                      }
                    >
                      {Math.round(limit.usagePercent)}%
                    </span>
                  </div>
                  <FinanceProgress
                    className="mt-3"
                    value={limit.usagePercent}
                    warning={limit.warningReached}
                    exceeded={limit.exceededMinor > 0}
                  />
                  <div className="mt-2 text-sm text-[var(--app-muted)]">
                    {formatMoneyMinor(limit.spentMinor, limit.currencyCode)} из{' '}
                    {formatMoneyMinor(limit.amountMinor, limit.currencyCode)}
                  </div>
                  {limit.missingRateCurrencies.length > 0 && (
                    <p className="mt-2 text-xs text-amber-200">
                      Не учтены валюты без курса: {limit.missingRateCurrencies.join(', ')}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--app-border)] pt-3">
                    <FinanceButton
                      size="sm"
                      onClick={() => {
                        setEditLimit(limit)
                        setLimitDialogOpen(true)
                      }}
                    >
                      Изменить
                    </FinanceButton>
                    <FinanceButton
                      size="sm"
                      onClick={() =>
                        void (async () => {
                          await financeClient.setLimitState({
                            id: limit.id,
                            state: limit.state === 'active' ? 'paused' : 'active'
                          })
                          await onChanged()
                        })()
                      }
                    >
                      {limit.state === 'active' ? (
                        <Pause aria-hidden="true" className="size-4" />
                      ) : (
                        <Play aria-hidden="true" className="size-4" />
                      )}
                      {limit.state === 'active' ? 'Приостановить' : 'Возобновить'}
                    </FinanceButton>
                    <FinanceButton size="sm" tone="danger" onClick={() => setDeleteLimit(limit)}>
                      <Trash2 aria-hidden="true" className="size-4" />
                      Удалить
                    </FinanceButton>
                  </div>
                </FinanceSurface>
              )
            })}
          </div>
        )}
      </FinanceSection>

      <FinanceLimitDialog
        open={limitDialogOpen}
        limit={editLimit}
        accounts={accounts}
        tags={tags}
        onOpenChange={(open) => {
          setLimitDialogOpen(open)
          if (!open) setEditLimit(null)
        }}
        onSaved={async () => onChanged()}
      />
      <FinanceConfirmDialog
        open={deleteLimit !== null}
        title="Удалить лимит?"
        subject={deleteLimit?.name}
        description="Транзакции, балансы и прошлые расходы не изменятся; дальнейший контроль прекратится."
        onOpenChange={(open) => !open && setDeleteLimit(null)}
        onConfirm={async () => {
          if (!deleteLimit) return
          await financeClient.deleteLimit({ id: deleteLimit.id })
          setDeleteLimit(null)
          await onChanged()
        }}
      />
    </div>
  )
}
