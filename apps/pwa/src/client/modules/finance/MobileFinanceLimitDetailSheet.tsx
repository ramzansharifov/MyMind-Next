import type {
  FinanceAccountSummary,
  FinanceLimitStatus,
  FinanceTagSummary
} from '@mymind/contracts/finance'
import { formatMoneyMinor } from '@mymind/core/finance-money'
import { AppDialog } from '../../shared/ui/AppDialog'
import { IconButton } from '../../shared/ui/primitives'
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
    <div
      className="ui-stack"
      style={{
        minHeight: 54,
        paddingInline: 12,
        paddingBlock: 10,
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
          fontSize: 10.5
        }}
      >
        {label}
      </span>
      <span
        className="ui-text"
        style={{
          marginTop: 4,
          color: tone ?? theme.text,
          fontSize: 13,
          lineHeight: '18px',
          fontWeight: 700
        }}
      >
        {value}
      </span>
    </div>
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
          <IconButton
            label={limit.state === 'active' ? 'Поставить лимит на паузу' : 'Возобновить лимит'}
            icon="reset"
            onClick={onToggleState}
          />
          <IconButton label="Удалить лимит" icon="delete" danger onClick={onDelete} />
          <IconButton label="Изменить лимит" icon="edit" onClick={onEdit} />
        </>
      }
    >
      <div className="ui-scroll">
        <div
          className="ui-stack ui-scroll-content"
          style={{
            gap: 10,
            padding: 14,
            paddingBottom: 24
          }}
        >
          <div
            className="ui-stack"
            style={{
              padding: 15,
              borderWidth: 1,
              borderColor: usageTone + '45',
              borderRadius: 16,
              backgroundColor: usageTone + '10'
            }}
          >
            <div
              className="ui-stack"
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                gap: 10
              }}
            >
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
                  Использовано
                </span>
                <span
                  className="ui-text"
                  data-lines={1}
                  style={{
                    marginTop: 4,
                    color: theme.text,
                    fontSize: 21,
                    fontWeight: 800,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 1
                  }}
                >
                  {formatMoneyMinor(limit.spentMinor, limit.currencyCode)}
                </span>
              </div>
              <span
                className="ui-text"
                style={{
                  color: usageTone,
                  fontSize: 21,
                  fontWeight: 800
                }}
              >
                {Math.round(limit.usagePercent)}%
              </span>
            </div>
            <div
              className="ui-stack"
              style={{
                height: 8,
                marginTop: 12,
                overflow: 'hidden',
                borderRadius: 4,
                backgroundColor: theme.raised
              }}
            >
              <div
                className="ui-stack"
                style={{
                  height: '100%',
                  width: `${Math.max(0, Math.min(100, limit.usagePercent))}%`,
                  borderRadius: 4,
                  backgroundColor: usageTone
                }}
              ></div>
            </div>
          </div>

          <DetailRow
            label="Лимит"
            value={formatMoneyMinor(limit.amountMinor, limit.currencyCode)}
          />
          <DetailRow label="Период" value={PERIOD_LABELS[limit.periodType]} />
          <DetailRow
            label="Состояние"
            value={stateLabel}
            tone={limit.state === 'active' ? theme.accent : '#fbbf24'}
          />
          <DetailRow label="Предупреждение" value={`${limit.warningPercent}%`} />
          <DetailRow label="Счета" value={linkedAccounts} />
        </div>
      </div>
    </AppDialog>
  )
}
