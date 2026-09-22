import { ScrollView, Text, View } from 'react-native'
import type {
  FinanceAccountSummary,
  FinanceLimitStatus,
  FinanceTagSummary
} from '@mymind/contracts/finance'
import { formatMoneyMinor } from '@mymind/core/finance-money'

import { AppDialog } from '../../shared/ui/AppDialog'
import { Button } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'

const PERIOD_LABELS: Record<FinanceLimitStatus['periodType'], string> = {
  day: 'День',
  week: 'Неделя',
  month: 'Месяц',
  year: 'Год'
}

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
      <Text style={{ color: theme.muted, fontSize: 10.5 }}>{label}</Text>
      <Text
        selectable
        style={{
          marginTop: 4,
          color: tone ?? theme.text,
          fontSize: 13,
          lineHeight: 18,
          fontWeight: '700'
        }}
      >
        {value}
      </Text>
    </View>
  )
}

export function MobileFinanceLimitDetailSheet({
  limit,
  accounts,
  tags,
  onClose,
  onEdit,
  onToggleState,
  onDelete
}: {
  limit: FinanceLimitStatus
  accounts: FinanceAccountSummary[]
  tags: FinanceTagSummary[]
  onClose(): void
  onEdit(): void
  onToggleState(): void
  onDelete(): void
}): React.JSX.Element {
  const theme = useTheme()
  const tag = tags.find((item) => item.id === limit.tagId)
  const linkedAccounts =
    limit.accountIds.length === 0
      ? 'Все счета подходящей валюты'
      : accounts
          .filter((account) => limit.accountIds.includes(account.id))
          .map((account) => account.name)
          .join(', ') || 'Счета недоступны'
  const usageTone =
    limit.usagePercent >= 100 ? theme.error : limit.warningReached ? '#fbbf24' : theme.accent
  const stateLabel = limit.state === 'active' ? 'Активен' : 'На паузе'

  return (
    <AppDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={tag?.name ?? 'Лимит'}
      description="Подробности лимита расходов"
      icon="finance"
      presentation="sheet"
      footer={
        <>
          <Button label="Закрыть" onPress={onClose} />
          <Button
            label={limit.state === 'active' ? 'Пауза' : 'Возобновить'}
            icon="reset"
            onPress={onToggleState}
          />
          <Button label="Удалить" icon="delete" danger onPress={onDelete} />
          <Button label="Изменить" icon="edit" primary onPress={onEdit} />
        </>
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
            borderColor: usageTone + '45',
            borderRadius: 16,
            backgroundColor: usageTone + '10'
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
            <View style={{ minWidth: 0, flex: 1 }}>
              <Text style={{ color: theme.muted, fontSize: 10.5 }}>Использовано</Text>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{
                  marginTop: 4,
                  color: theme.text,
                  fontSize: 21,
                  fontWeight: '800'
                }}
              >
                {formatMoneyMinor(limit.spentMinor, limit.currencyCode)}
              </Text>
            </View>
            <Text style={{ color: usageTone, fontSize: 21, fontWeight: '800' }}>
              {Math.round(limit.usagePercent)}%
            </Text>
          </View>
          <View
            style={{
              height: 8,
              marginTop: 12,
              overflow: 'hidden',
              borderRadius: 4,
              backgroundColor: theme.raised
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${Math.max(0, Math.min(100, limit.usagePercent))}%`,
                borderRadius: 4,
                backgroundColor: usageTone
              }}
            />
          </View>
        </View>

        <DetailRow label="Лимит" value={formatMoneyMinor(limit.amountMinor, limit.currencyCode)} />
        <DetailRow label="Период" value={PERIOD_LABELS[limit.periodType]} />
        <DetailRow
          label="Состояние"
          value={stateLabel}
          tone={limit.state === 'active' ? theme.accent : '#fbbf24'}
        />
        <DetailRow label="Предупреждение" value={`${limit.warningPercent}%`} />
        <DetailRow label="Счета" value={linkedAccounts} />
      </ScrollView>
    </AppDialog>
  )
}
