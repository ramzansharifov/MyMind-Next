import { Text, View } from 'react-native'
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
      <View>
        {subject ? (
          <Text
            style={{
              paddingHorizontal: 18,
              paddingTop: 16,
              color: accent,
              fontSize: 14,
              lineHeight: 20,
              fontWeight: '700'
            }}
          >
            {subject}
          </Text>
        ) : null}

        {notice ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginTop: subject ? 10 : 0,
              paddingHorizontal: 18,
              paddingVertical: 13,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
              backgroundColor: accent + '09'
            }}
          >
            <AppIcon name="info" size={16} color={accent} />
            <Text style={{ flex: 1, color: accent, fontSize: 12.5, lineHeight: 18 }}>{notice}</Text>
          </View>
        ) : null}

        {error ? (
          <View
            accessibilityRole="alert"
            style={{
              marginHorizontal: 16,
              marginTop: 14,
              padding: 12,
              borderWidth: 1,
              borderColor: theme.error + '32',
              borderRadius: 12,
              backgroundColor: theme.error + '0D'
            }}
          >
            <Text style={{ color: theme.error, fontSize: 13, lineHeight: 19 }}>{error}</Text>
          </View>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            gap: 8,
            padding: 16
          }}
        >
          <Button label="Отмена" disabled={busy} onPress={() => onOpenChange(false)} />
          <Button
            label={busy ? submittingLabel : confirmLabel}
            icon={tone === 'warning' ? 'reset' : 'delete'}
            danger={tone === 'danger'}
            selected={tone === 'warning'}
            disabled={busy}
            onPress={onConfirm}
          />
        </View>
      </View>
    </AppDialog>
  )
}
