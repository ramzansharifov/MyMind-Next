import type {
  FinanceAccountSummary,
  FinanceTagSummary,
  FinanceTemplate
} from '@mymind/contracts/finance'
import { formatMoneyMinor } from '@mymind/core/finance-money'
import { AppDialog } from '../../shared/ui/AppDialog'
import { Button, IconButton } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import { financeOperationTone } from './finance-semantic-colors'
function DetailRow({ label, value }: { label: string; value: string }): React.JSX.Element {
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
          color: theme.text,
          fontSize: 13,
          fontWeight: 600
        }}
      >
        {value}
      </span>
    </div>
  )
}
export function MobileFinanceTemplateDetailSheet({
  template,
  accounts,
  tags,
  onClose,
  onUse,
  onEdit,
  onDelete
}: {
  template: FinanceTemplate
  accounts: FinanceAccountSummary[]
  tags: FinanceTagSummary[]
  onClose(): void
  onUse(): void
  onEdit(): void
  onDelete(): void
}): React.JSX.Element {
  const theme = useTheme()
  const tone = financeOperationTone(template.type, theme.accent)
  const source = accounts.find((account) => account.id === template.sourceAccountId)
  const destination = accounts.find((account) => account.id === template.destinationAccountId)
  const tag = tags.find((item) => item.id === template.tagId)
  const typeLabel =
    template.type === 'income' ? 'Доход' : template.type === 'expense' ? 'Расход' : 'Перевод'
  return (
    <AppDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={template.name}
      description="Подробности шаблона операции"
      icon="copy"
      presentation="sheet"
      footer={
        <>
          <IconButton label="Удалить шаблон" icon="delete" danger onClick={onDelete} />
          <IconButton label="Изменить шаблон" icon="edit" onClick={onEdit} />
          <Button label="Использовать" icon="check" primary onClick={onUse} />
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
              borderColor: tone + '50',
              borderRadius: 16,
              backgroundColor: tone + '12'
            }}
          >
            <span
              className="ui-text"
              style={{
                color: tone,
                fontSize: 11,
                fontWeight: 700
              }}
            >
              {typeLabel}
            </span>
            <span
              className="ui-text"
              style={{
                marginTop: 5,
                color: tone,
                fontSize: 24,
                lineHeight: '30px',
                fontWeight: 800
              }}
            >
              {source
                ? formatMoneyMinor(template.sourceAmountMinor, source.currencyCode)
                : 'Счёт недоступен'}
            </span>
          </div>

          <DetailRow label="Счёт" value={source?.name ?? 'Счёт недоступен'} />
          {template.type === 'transfer' ? (
            <DetailRow label="Счёт зачисления" value={destination?.name ?? 'Счёт недоступен'} />
          ) : (
            <DetailRow label="Тег" value={tag?.name ?? '—'} />
          )}
          {template.comment ? <DetailRow label="Комментарий" value={template.comment} /> : null}
        </div>
      </div>
    </AppDialog>
  )
}
