import { AppDialog, type AppDialogTone } from './AppDialog'
import { Button } from './primitives'
import { AppIcon } from './icons'
import { useTheme } from './theme'
export function DeleteConfirmationDialog({
  open,
  title,
  description,
  subject,
  confirmLabel = 'Удалить',
  submittingLabel = 'Удаляем…',
  tone = 'danger',
  notice = 'Это действие нельзя отменить.',
  busy = false,
  error = null,
  onOpenChange,
  onConfirm
}: {
  open: boolean
  title: string
  description: string
  subject?: string
  confirmLabel?: string
  submittingLabel?: string
  tone?: Extract<AppDialogTone, 'danger' | 'warning'>
  notice?: string | null
  busy?: boolean
  error?: string | null
  onOpenChange(open: boolean): void
  onConfirm(): void
}): React.JSX.Element {
  const theme = useTheme()
  const accent = tone === 'warning' ? '#f59e0b' : theme.error
  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      icon={tone === 'warning' ? 'info' : 'delete'}
      tone={tone}
      busy={busy}
      dismissible={!busy}
      showClose={false}
      presentation="card"
    >
      <div className="ui-stack">
        {subject ? (
          <span
            className="ui-text"
            style={{
              paddingInline: 18,
              paddingTop: 16,
              color: accent,
              fontSize: 14,
              lineHeight: '20px',
              fontWeight: 700
            }}
          >
            {subject}
          </span>
        ) : null}

        {notice ? (
          <div
            className="ui-stack"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginTop: subject ? 10 : 0,
              paddingInline: 18,
              paddingBlock: 13,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
              backgroundColor: accent + '09'
            }}
          >
            <AppIcon name="info" size={16} color={accent} />
            <span
              className="ui-text"
              style={{
                flex: '1 1 0%',
                color: accent,
                fontSize: 12.5,
                lineHeight: '18px'
              }}
            >
              {notice}
            </span>
          </div>
        ) : null}

        {error ? (
          <div
            className="ui-stack"
            role={'alert'}
            style={{
              marginInline: 16,
              marginTop: 14,
              padding: 12,
              borderWidth: 1,
              borderColor: theme.error + '32',
              borderRadius: 12,
              backgroundColor: theme.error + '0D'
            }}
          >
            <span
              className="ui-text"
              style={{
                color: theme.error,
                fontSize: 13,
                lineHeight: '19px'
              }}
            >
              {error}
            </span>
          </div>
        ) : null}

        <div
          className="ui-stack"
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            gap: 8,
            padding: 16
          }}
        >
          <Button label="Отмена" disabled={busy} onClick={() => onOpenChange(false)} />
          <Button
            label={busy ? submittingLabel : confirmLabel}
            icon={tone === 'warning' ? 'reset' : 'delete'}
            danger={tone === 'danger'}
            selected={tone === 'warning'}
            disabled={busy}
            onClick={onConfirm}
          />
        </div>
      </div>
    </AppDialog>
  )
}
