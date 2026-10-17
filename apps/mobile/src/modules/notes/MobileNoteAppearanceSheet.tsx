import { Pressable, ScrollView, Text, View } from 'react-native'
import { DEFAULT_NOTE_APPEARANCE, type NoteAppearance } from '@mymind/contracts/notes'
import { AppDialog } from '../../shared/ui/AppDialog'
import { Button, Label } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import { getReadableNoteTextColor } from './lib/note-color-contrast'

const colors = [
  { name: 'Тема', value: 'theme' },
  { name: 'Без заливки', value: null },
  { name: 'Белый', value: '#ffffff' },
  { name: 'Кремовый', value: '#efe9dd' },
  { name: 'Тёмный', value: '#0d0f12' },
  { name: 'Графит', value: '#171a20' },
  { name: 'Серый', value: '#21252e' },
  { name: 'Хвойный', value: '#182620' },
  { name: 'Синий', value: '#1d2238' },
  { name: 'Розовый', value: '#302329' }
]

export function MobileNoteAppearanceSheet({
  value,
  close,
  onChange
}: {
  value: NoteAppearance
  close(): void
  onChange(value: NoteAppearance): void
}): React.JSX.Element {
  const theme = useTheme()
  const update = (patch: Partial<NoteAppearance>): void => onChange({ ...value, ...patch })
  return (
    <AppDialog
      open
      title="Вид заметки"
      icon="settings"
      presentation="sheet"
      onOpenChange={(open) => {
        if (!open) close()
      }}
    >
      <ScrollView contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 28 }}>
        <Label muted>Варианты</Label>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(
            [
              ['canvas', 'Полотно'],
              ['sheet', 'Лист'],
              ['card', 'Карточка']
            ] as const
          ).map(([variant, label]) => (
            <Pressable
              key={variant}
              accessibilityRole="button"
              accessibilityLabel={`Вид заметки: ${label}`}
              accessibilityState={{ selected: value.variant === variant }}
              onPress={() =>
                update({
                  variant,
                  paperColor:
                    value.paperColor && value.paperColor !== 'theme'
                      ? value.paperColor
                      : variant === 'canvas'
                        ? null
                        : 'theme'
                })
              }
              style={{
                flex: 1,
                minHeight: 94,
                padding: 10,
                gap: 8,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                borderWidth: value.variant === variant ? 2 : 1,
                borderColor: value.variant === variant ? theme.accent : theme.border,
                backgroundColor: theme.surface
              }}
            >
              <View
                style={{
                  width: 30,
                  height: 38,
                  borderRadius: variant === 'card' ? 6 : 1,
                  borderWidth: variant === 'canvas' ? 0 : variant === 'card' ? 2 : 1,
                  borderColor: theme.muted,
                  gap: 5,
                  justifyContent: 'center',
                  padding: 5
                }}
              >
                {[0, 1, 2].map((index) => (
                  <View
                    key={index}
                    style={{
                      height: 2,
                      width: index === 2 ? 10 : 18,
                      backgroundColor: value.variant === variant ? theme.accent : theme.muted
                    }}
                  />
                ))}
              </View>
              <Text
                style={{
                  color: value.variant === variant ? theme.accent : theme.text,
                  fontSize: 12
                }}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Label muted>{value.variant === 'canvas' ? 'Узор полотна' : 'Узор листа'}</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(
            [
              ['none', 'Без узора'],
              ['dots', 'Точки'],
              ['grid', 'Клетка']
            ] as const
          ).map(([paperPattern, label]) => (
            <Button
              key={paperPattern}
              label={label}
              selected={value.paperPattern === paperPattern}
              onPress={() => update({ paperPattern })}
            />
          ))}
        </View>
        <Label muted>{value.variant === 'canvas' ? 'Цвет полотна' : 'Цвет листа'}</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {colors.map((option) => {
            const selected = value.paperColor === option.value
            const background =
              option.value === 'theme' ? theme.surface : (option.value ?? theme.background)
            return (
              <Pressable
                key={option.name}
                accessibilityRole="button"
                accessibilityLabel={`Цвет листа: ${option.name}`}
                accessibilityState={{ selected }}
                onPress={() => update({ paperColor: option.value })}
                style={{
                  width: '30%',
                  minHeight: 84,
                  borderRadius: 12,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? theme.accent : theme.border,
                  padding: 8,
                  gap: 8,
                  backgroundColor: theme.surface
                }}
              >
                <View
                  style={{
                    flex: 1,
                    minHeight: 32,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: background,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: theme.border
                  }}
                >
                  <Text
                    style={{
                      color:
                        (option.value &&
                          option.value !== 'theme' &&
                          getReadableNoteTextColor(option.value)) ||
                        theme.text,
                      fontSize: 18
                    }}
                  >
                    Aa
                  </Text>
                </View>
                <Text
                  numberOfLines={1}
                  style={{ color: selected ? theme.accent : theme.muted, fontSize: 11 }}
                >
                  {option.name}
                </Text>
              </Pressable>
            )
          })}
        </View>
        <Button
          label="Сбросить вид"
          icon="reset"
          onPress={() => onChange({ ...DEFAULT_NOTE_APPEARANCE })}
        />
      </ScrollView>
    </AppDialog>
  )
}
