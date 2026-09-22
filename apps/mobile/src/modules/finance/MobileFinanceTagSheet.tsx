import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, type LucideIcon } from 'lucide-react-native'
import {
  FINANCE_TAG_COLORS,
  type FinanceIconName,
  type FinanceTagSummary,
  type FinanceTagType
} from '@mymind/contracts/finance'
import type { FinanceRepository } from '@mymind/persistence/finance'
import * as validation from '@mymind/core/validation/finance'

import { notifyDataChanged } from '../../app/changes'
import { AppDialog } from '../../shared/ui/AppDialog'
import { AppTextField } from '../../shared/ui/FormControls'
import { AppIconGrid } from '../../shared/ui/VisualPickers'
import { FINANCE_ICON_CHOICES } from '../../shared/ui/visual-options'
import { Button, ErrorState, Label } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import { useToast } from '../../shared/ui/toast-context'

const TAG_TYPE_OPTIONS: ReadonlyArray<{
  value: FinanceTagType
  label: string
  description: string
  icon: LucideIcon
}> = [
  {
    value: 'expense',
    label: 'Расход',
    description: 'Категории расходов',
    icon: ArrowUpRight
  },
  {
    value: 'income',
    label: 'Доход',
    description: 'Категории доходов',
    icon: ArrowDownLeft
  },
  {
    value: 'both',
    label: 'Оба',
    description: 'Доходы и расходы',
    icon: ArrowRightLeft
  }
]

export function MobileFinanceTagSheet({
  api,
  tag = null,
  onClose,
  onSaved
}: {
  api: FinanceRepository
  tag?: FinanceTagSummary | null
  onClose(): void
  onSaved(): void
}): React.JSX.Element {
  const theme = useTheme()
  const toast = useToast()
  const [name, setName] = useState(tag?.name ?? '')
  const [type, setType] = useState<FinanceTagType>(tag?.type ?? 'expense')
  const [icon, setIcon] = useState<FinanceIconName>(tag?.icon ?? 'tag')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const save = (): void => {
    if (pending) return
    setError('')

    try {
      const input = {
        name: name.trim(),
        type,
        icon
      }
      setPending(true)
      if (tag) {
        api.updateTag(validation.updateFinanceTagInputSchema.parse({ id: tag.id, ...input }))
      } else {
        api.createTag(validation.createFinanceTagInputSchema.parse(input))
      }

      notifyDataChanged()
      onSaved()
      toast.success(tag ? 'Тег обновлён' : 'Тег создан')
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить тег')
    } finally {
      setPending(false)
    }
  }

  return (
    <AppDialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose()
      }}
      title={tag ? 'Изменить тег' : 'Новый тег'}
      description="Теги классифицируют доходы и расходы и используются в отчётах и лимитах"
      icon="tag"
      presentation="sheet"
      busy={pending}
      footer={
        <>
          <Button label="Отмена" disabled={pending} onPress={onClose} />
          <Button
            label={pending ? 'Сохранение…' : tag ? 'Сохранить' : 'Создать тег'}
            icon="check"
            primary
            disabled={pending}
            onPress={save}
          />
        </>
      }
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 18, padding: 14, paddingBottom: 26 }}
      >
        {error ? <ErrorState message={error} /> : null}

        <View style={{ gap: 8 }}>
          <Label>Название</Label>
          <AppTextField
            accessibilityLabel="Название тега"
            value={name}
            placeholder="Например: Продукты"
            disabled={pending}
            onChangeText={(value) => {
              setName(value)
              setError('')
            }}
          />
        </View>

        <View style={{ gap: 8 }}>
          <Label>Назначение</Label>
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 7 }}>
            {TAG_TYPE_OPTIONS.map((option) => {
              const selected = type === option.value
              const tone = FINANCE_TAG_COLORS[option.value]
              const Icon = option.icon
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  accessibilityState={{ checked: selected, disabled: pending }}
                  disabled={pending}
                  onPress={() => {
                    setType(option.value)
                    setError('')
                  }}
                  style={({ pressed }) => ({
                    minWidth: 0,
                    flex: 1,
                    minHeight: 94,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 6,
                    paddingVertical: 9,
                    borderWidth: 1,
                    borderColor: selected ? tone + '88' : theme.border,
                    borderRadius: 13,
                    backgroundColor: selected
                      ? tone + '1D'
                      : pressed
                        ? theme.raised
                        : theme.surface,
                    opacity: pending ? 0.45 : pressed ? 0.76 : 1
                  })}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 10,
                      backgroundColor: selected ? tone + '22' : theme.background
                    }}
                  >
                    <Icon size={16} color={selected ? tone : theme.muted} />
                  </View>
                  <Text
                    numberOfLines={1}
                    style={{
                      marginTop: 6,
                      color: selected ? tone : theme.text,
                      fontSize: 11.5,
                      fontWeight: '700'
                    }}
                  >
                    {option.label}
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={{
                      marginTop: 2,
                      color: theme.muted,
                      fontSize: 9,
                      lineHeight: 12,
                      textAlign: 'center'
                    }}
                  >
                    {option.description}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          {tag && tag.transactionCount > 0 ? (
            <Text style={{ color: theme.muted, fontSize: 10.5, lineHeight: 15 }}>
              Тип можно изменить только при совместимости со всей существующей историей.
            </Text>
          ) : null}
        </View>

        <View style={{ gap: 8 }}>
          <Label>Иконка</Label>
          <AppIconGrid
            family="finance"
            value={icon}
            choices={FINANCE_ICON_CHOICES}
            disabled={pending}
            onChange={(value) => {
              setIcon(value as FinanceIconName)
              setError('')
            }}
          />
        </View>
      </ScrollView>
    </AppDialog>
  )
}
