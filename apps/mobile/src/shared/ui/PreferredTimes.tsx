import { TextInput, View } from 'react-native'
import { Button, Label } from './primitives'
import { useTheme } from './theme'

export function PreferredTimes({
  value,
  onChange,
  disabled
}: {
  value: unknown
  onChange(value: unknown): void
  disabled: boolean
}): React.JSX.Element {
  const theme = useTheme()
  const times = (Array.isArray(value) ? value : []) as { unit: number | string; time: string }[]
  return (
    <View style={{ gap: 12 }}>
      {times.map((entry, index) => (
        <View key={index} style={{ gap: 8 }}>
          <Label muted>Повторение {index + 1}</Label>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              accessibilityLabel={`Номер единицы ${index + 1}`}
              editable={!disabled}
              keyboardType="number-pad"
              value={String(entry.unit)}
              onChangeText={(unit) =>
                onChange(times.map((item, i) => (i === index ? { ...item, unit } : item)))
              }
              style={{
                color: theme.text,
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                padding: 12,
                width: 70,
                minHeight: 48
              }}
            />
            <TextInput
              accessibilityLabel={`Время повторения ${index + 1}`}
              editable={!disabled}
              placeholder="09:00"
              placeholderTextColor={theme.muted}
              value={entry.time}
              onChangeText={(time) =>
                onChange(times.map((item, i) => (i === index ? { ...item, time } : item)))
              }
              style={{
                flex: 1,
                color: theme.text,
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                padding: 12,
                minHeight: 48
              }}
            />
            <Button
              label="Убрать"
              disabled={disabled}
              onPress={() => onChange(times.filter((_, i) => i !== index))}
            />
          </View>
        </View>
      ))}
      <Button
        label="+ Время"
        disabled={disabled}
        onPress={() => onChange([...times, { unit: times.length + 1, time: '09:00' }])}
      />
    </View>
  )
}
