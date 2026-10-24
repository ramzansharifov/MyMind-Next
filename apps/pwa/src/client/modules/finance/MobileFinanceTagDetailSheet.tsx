import type { FinanceTagSummary } from '@mymind/contracts/finance'
import { AppDialog } from '../../shared/ui/AppDialog'
import { IconButton } from '../../shared/ui/primitives'
import { VisualIconGlyph } from '../../shared/ui/VisualPickers'
import { useTheme } from '../../shared/ui/theme'
import { financeTagTone } from './finance-semantic-colors'
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
export function MobileFinanceTagDetailSheet({
  tag,
  onClose,
  onEdit,
  onDelete
}: {
  tag: FinanceTagSummary
  onClose(): void
  onEdit(): void
  onDelete(): void
}): React.JSX.Element {
  const theme = useTheme()
  const tone = financeTagTone(tag.type, theme.accent)
  const typeLabel =
    tag.type === 'income' ? 'Доход' : tag.type === 'expense' ? 'Расход' : 'Доход и расход'
  const deleteDisabled = tag.transactionCount > 0 || tag.linkedLimitCount > 0
  return (
    <AppDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={tag.name}
      description="Подробности тега"
      icon="tag"
      presentation="sheet"
      footer={
        <>
          <IconButton
            label="Удалить тег"
            icon="delete"
            danger
            disabled={deleteDisabled}
            onClick={onDelete}
          />
          <IconButton label="Изменить тег" icon="edit" onClick={onEdit} />
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
              minHeight: 88,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: tone + '45',
              borderRadius: 16,
              backgroundColor: tone + '10'
            }}
          >
            <div
              className="ui-stack"
              style={{
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: tone + '45',
                borderRadius: 13,
                backgroundColor: tone + '16'
              }}
            >
              <VisualIconGlyph value={tag.icon} size={20} color={tone} />
            </div>
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
                Назначение
              </span>
              <span
                className="ui-text"
                style={{
                  marginTop: 4,
                  color: tone,
                  fontSize: 16,
                  fontWeight: 800
                }}
              >
                {typeLabel}
              </span>
            </div>
          </div>

          <DetailRow label="Операции" value={String(tag.transactionCount)} />
          <DetailRow label="Связанные лимиты" value={String(tag.linkedLimitCount)} />

          {deleteDisabled ? (
            <span
              className="ui-text"
              style={{
                color: theme.muted,
                fontSize: 10.5,
                lineHeight: '15px'
              }}
            >
              Тег нельзя удалить, пока он используется в операциях или лимитах.
            </span>
          ) : null}
        </div>
      </div>
    </AppDialog>
  )
}
