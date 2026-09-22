import { ScrollView, Text, View } from 'react-native'
import type { FinanceTagSummary } from '@mymind/contracts/finance'

import { AppDialog } from '../../shared/ui/AppDialog'
import { Button } from '../../shared/ui/primitives'
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
          <Button label="Закрыть" onPress={onClose} />
          <Button label="Удалить" icon="delete" danger disabled={deleteDisabled} onPress={onDelete} />
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
          <View
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
          </View>
          <View style={{ minWidth: 0, flex: 1 }}>
            <Text style={{ color: theme.muted, fontSize: 10.5 }}>Назначение</Text>
            <Text style={{ marginTop: 4, color: tone, fontSize: 16, fontWeight: '800' }}>
              {typeLabel}
            </Text>
          </View>
        </View>

        <DetailRow label="Операции" value={String(tag.transactionCount)} />
        <DetailRow label="Связанные лимиты" value={String(tag.linkedLimitCount)} />

        {deleteDisabled ? (
          <Text style={{ color: theme.muted, fontSize: 10.5, lineHeight: 15 }}>
            Тег нельзя удалить, пока он используется в операциях или лимитах.
          </Text>
        ) : null}
      </ScrollView>
    </AppDialog>
  )
}
