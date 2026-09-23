import { ScrollView, Text, View } from 'react-native'
import type { FinanceTransaction } from '@mymind/contracts/finance'
import { formatMoneyMinor } from '@mymind/core/finance-money'

import { AppDialog } from '../../shared/ui/AppDialog'
import { IconButton } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import { financeOperationTone } from './finance-semantic-colors'

function DetailRow({
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
    <View
      style={{
        minHeight: 54,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 13,
        backgroundColor: theme.surface
      }}
    >
      <Text style={{ color: theme.muted, fontSize: 10.5, lineHeight: 14 }}>{label}</Text>
      <Text
        selectable
        style={{
          marginTop: 4,
          color: tone ?? theme.text,
          fontSize: 13,
          lineHeight: 18,
          fontWeight: tone ? '700' : '600'
        }}
      >
        {value}
      </Text>
    </View>
  )
}

export function MobileFinanceTransactionDetailSheet({
  transaction,
  onClose,
  onEdit,
  onDelete
}: {
  transaction: FinanceTransaction
  onClose(): void
  onEdit(): void
  onDelete(): void
}): React.JSX.Element {
  const theme = useTheme()
  const outgoing = transaction.entries.find((entry) => entry.signedAmountMinor < 0)
  const incoming = transaction.entries.find((entry) => entry.signedAmountMinor > 0)
  const primary = transaction.type === 'transfer' ? outgoing : transaction.entries[0]
  const displayType = transaction.type === 'adjustment' ? 'expense' : transaction.type
  const tone = financeOperationTone(displayType, theme.accent)
  const typeLabel =
    transaction.type === 'income'
      ? 'Доход'
      : transaction.type === 'expense'
        ? 'Расход'
        : transaction.type === 'transfer'
          ? 'Перевод'
          : 'Корректировка'

  const amount = primary
    ? `${primary.signedAmountMinor > 0 ? '+' : primary.signedAmountMinor < 0 ? '−' : ''}${formatMoneyMinor(
        Math.abs(primary.signedAmountMinor),
        primary.accountCurrencyCode
      )}`
    : '—'

  return (
    <AppDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Операция"
      description={new Date(transaction.occurredAt).toLocaleString('ru-RU', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })}
      icon="finance"
      presentation="sheet"
      footer={
        !transaction.isSystem ? (
          <>
            <IconButton label="Удалить операцию" icon="delete" danger onPress={onDelete} />
            <IconButton label="Изменить операцию" icon="edit" onPress={onEdit} />
          </>
        ) : undefined
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, padding: 14, paddingBottom: 24 }}
      >
        <View
          style={{
            padding: 15,
            borderWidth: 1,
            borderColor: tone + '50',
            borderRadius: 16,
            backgroundColor: tone + '12'
          }}
        >
          <Text style={{ color: tone, fontSize: 11, fontWeight: '700' }}>{typeLabel}</Text>
          <Text
            style={{
              marginTop: 5,
              color: tone,
              fontSize: 26,
              lineHeight: 32,
              fontWeight: '800'
            }}
          >
            {amount}
          </Text>
        </View>

        {transaction.type === 'transfer' ? (
          <>
            <DetailRow label="Счёт списания" value={outgoing?.accountName ?? '—'} />
            <DetailRow
              label="Сумма списания"
              value={
                outgoing
                  ? formatMoneyMinor(
                      Math.abs(outgoing.signedAmountMinor),
                      outgoing.accountCurrencyCode
                    )
                  : '—'
              }
            />
            <DetailRow label="Счёт зачисления" value={incoming?.accountName ?? '—'} />
            <DetailRow
              label="Сумма зачисления"
              value={
                incoming
                  ? formatMoneyMinor(incoming.signedAmountMinor, incoming.accountCurrencyCode)
                  : '—'
              }
            />
          </>
        ) : (
          <>
            <DetailRow label="Счёт" value={primary?.accountName ?? '—'} />
            <DetailRow
              label="Тег"
              value={
                transaction.tagNameSnapshot ??
                (transaction.type === 'income'
                  ? 'Доход'
                  : transaction.type === 'expense'
                    ? 'Расход'
                    : '—')
              }
              tone={tone}
            />
          </>
        )}

        <DetailRow
          label="Дата и время"
          value={new Date(transaction.occurredAt).toLocaleString('ru-RU', {
            dateStyle: 'long',
            timeStyle: 'short'
          })}
        />
        {transaction.templateNameSnapshot ? (
          <DetailRow label="Шаблон" value={transaction.templateNameSnapshot} />
        ) : null}
        {transaction.comment ? <DetailRow label="Комментарий" value={transaction.comment} /> : null}
        {transaction.isSystem ? (
          <DetailRow label="Системная операция" value={transaction.systemReason ?? 'Да'} />
        ) : null}
      </ScrollView>
    </AppDialog>
  )
}
