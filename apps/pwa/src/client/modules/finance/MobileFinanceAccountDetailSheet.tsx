import { FittedText } from '../../../ui/FittedText'
import { useMemo } from 'react'
import type { FinanceAccountSummary, FinanceTransaction } from '@mymind/contracts/finance'
import type { FinanceRepository } from '@mymind/persistence/finance'
import { formatMoneyMinor } from '@mymind/core/finance-money'
import { AppDialog } from '../../shared/ui/AppDialog'
import { EmptyState, IconButton } from '../../shared/ui/primitives'
import { VisualIconBadge } from '../../shared/ui/VisualPickers'
import { useTheme } from '../../shared/ui/theme'
import { financeOperationTone } from './finance-semantic-colors'
function Metric({
  label,
  value,
  tone
}: {
  label: string
  value: string
  tone?: string
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <div
      className="ui-stack"
      style={{
        width: '48.5%',
        minHeight: 72,
        padding: 11,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 13,
        backgroundColor: theme.surface
      }}
    >
      <span
        className="ui-text"
        style={{
          color: theme.muted,
          fontSize: 9.5
        }}
      >
        {label}
      </span>
      <FittedText
        className="ui-text"
        data-lines={1}
        style={{
          marginTop: 7,
          color: tone ?? theme.text,
          fontSize: 14,
          fontWeight: 700,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 1
        }}
      >
        {value}
      </FittedText>
    </div>
  )
}
function historyTitle(transaction: FinanceTransaction): string {
  if (transaction.type === 'transfer') {
    const source = transaction.entries.find((entry) => entry.signedAmountMinor < 0)
    const destination = transaction.entries.find((entry) => entry.signedAmountMinor > 0)
    return `${source?.accountName ?? 'Счёт'} → ${destination?.accountName ?? 'Счёт'}`
  }
  return transaction.tagNameSnapshot ?? (transaction.type === 'income' ? 'Доход' : 'Расход')
}
export function MobileFinanceAccountDetailSheet({
  api,
  account,
  onClose,
  onEdit,
  onClearHistory,
  onDelete
}: {
  api: FinanceRepository
  account: FinanceAccountSummary
  onClose(): void
  onEdit(): void
  onClearHistory(): void
  onDelete(): void
}): React.JSX.Element {
  const theme = useTheme()
  const transactions = useMemo(
    () =>
      api.listTransactions({
        accountIds: [account.id],
        includeSystem: true,
        sort: 'date-desc',
        limit: 20,
        offset: 0
      }).items,
    [account, api]
  )
  const accountEntries = transactions.flatMap((transaction) =>
    transaction.entries
      .filter((entry) => entry.accountId === account.id)
      .map((entry) => ({ transaction, entry }))
  )
  const income = accountEntries
    .filter(
      ({ transaction, entry }) => transaction.type === 'income' && entry.signedAmountMinor > 0
    )
    .reduce((sum, { entry }) => sum + entry.signedAmountMinor, 0)
  const expense = accountEntries
    .filter(
      ({ transaction, entry }) => transaction.type === 'expense' && entry.signedAmountMinor < 0
    )
    .reduce((sum, { entry }) => sum + Math.abs(entry.signedAmountMinor), 0)
  const transferIn = accountEntries
    .filter(
      ({ transaction, entry }) => transaction.type === 'transfer' && entry.signedAmountMinor > 0
    )
    .reduce((sum, { entry }) => sum + entry.signedAmountMinor, 0)
  const transferOut = accountEntries
    .filter(
      ({ transaction, entry }) => transaction.type === 'transfer' && entry.signedAmountMinor < 0
    )
    .reduce((sum, { entry }) => sum + Math.abs(entry.signedAmountMinor), 0)
  return (
    <AppDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={account.name}
      description={account.currencyCode}
      icon="finance"
      presentation="sheet"
      footer={
        <>
          {account.transactionCount > 0 ? (
            <IconButton
              label="Очистить историю счёта"
              icon="reset"
              danger
              onClick={onClearHistory}
            />
          ) : (
            <IconButton label="Удалить счёт" icon="delete" danger onClick={onDelete} />
          )}
          <IconButton label="Изменить счёт" icon="edit" onClick={onEdit} />
        </>
      }
    >
      <div className="ui-scroll">
        <div
          className="ui-stack ui-scroll-content"
          style={{
            gap: 14,
            padding: 14,
            paddingBottom: 24
          }}
        >
          <div
            className="ui-stack"
            style={{
              padding: 15,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 16,
              backgroundColor: theme.surface
            }}
          >
            <VisualIconBadge value={account.icon} size={46} />
            <div
              className="ui-stack"
              style={{
                minWidth: 0,
                flex: '1 1 0%'
              }}
            >
              <span
                className="ui-text"
                style={{
                  color: theme.muted,
                  fontSize: 10.5
                }}
              >
                Текущий баланс
              </span>
              <FittedText
                className="ui-text"
                data-lines={1}
                style={{
                  marginTop: 3,
                  color: account.balanceMinor < 0 ? theme.error : theme.text,
                  fontSize: 24,
                  fontWeight: 800,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 1
                }}
              >
                {formatMoneyMinor(account.balanceMinor, account.currencyCode)}
              </FittedText>
            </div>
          </div>

          <div
            className="ui-stack"
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8
            }}
          >
            <Metric
              label="Начальный баланс"
              value={formatMoneyMinor(account.initialBalanceMinor, account.currencyCode)}
            />
            <Metric
              label="Доходы"
              value={formatMoneyMinor(income, account.currencyCode)}
              tone={financeOperationTone('income', theme.accent)}
            />
            <Metric
              label="Расходы"
              value={formatMoneyMinor(expense, account.currencyCode)}
              tone={financeOperationTone('expense', theme.accent)}
            />
            <Metric
              label="Переводы + / −"
              value={`${formatMoneyMinor(transferIn, account.currencyCode)} / ${formatMoneyMinor(transferOut, account.currencyCode)}`}
            />
          </div>

          <div
            className="ui-stack"
            style={{
              gap: 8
            }}
          >
            <span
              className="ui-text"
              style={{
                color: theme.text,
                fontSize: 14,
                fontWeight: 700
              }}
            >
              История счёта
            </span>
            {transactions.length ? (
              transactions.map((transaction) => {
                const entry = transaction.entries.find((item) => item.accountId === account.id)
                if (!entry) return null
                const type = transaction.type === 'adjustment' ? 'expense' : transaction.type
                const tone = financeOperationTone(type, theme.accent)
                return (
                  <div
                    className="ui-stack"
                    key={transaction.id}
                    style={{
                      minHeight: 62,
                      paddingInline: 12,
                      paddingBlock: 10,
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 13,
                      backgroundColor: theme.surface
                    }}
                  >
                    <div
                      className="ui-stack"
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8
                      }}
                    >
                      <span
                        className="ui-text"
                        data-lines={1}
                        style={{
                          minWidth: 0,
                          flex: '1 1 0%',
                          color: theme.text,
                          fontSize: 12.5,
                          fontWeight: 700,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: 1
                        }}
                      >
                        {historyTitle(transaction)}
                      </span>
                      <span
                        className="ui-text"
                        style={{
                          color: tone,
                          fontSize: 12,
                          fontWeight: 700
                        }}
                      >
                        {entry.signedAmountMinor > 0 ? '+' : '−'}
                        {formatMoneyMinor(
                          Math.abs(entry.signedAmountMinor),
                          entry.accountCurrencyCode
                        )}
                      </span>
                    </div>
                    <span
                      className="ui-text"
                      style={{
                        marginTop: 4,
                        color: theme.muted,
                        fontSize: 10.5
                      }}
                    >
                      {new Date(transaction.occurredAt).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                )
              })
            ) : (
              <EmptyState text="История счёта пуста." />
            )}
          </div>
        </div>
      </div>
    </AppDialog>
  )
}
