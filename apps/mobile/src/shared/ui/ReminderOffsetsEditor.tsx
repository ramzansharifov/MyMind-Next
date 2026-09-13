import { useMemo, useState } from 'react'
import { View } from 'react-native'

import { AppSelect, AppTextField } from './FormControls'
import { Button, IconButton, Row } from './primitives'

type ReminderUnit = 'minutes' | 'hours' | 'days' | 'weeks'

const unitChoices = [
  { value: 'minutes', label: 'Минуты' },
  { value: 'hours', label: 'Часы' },
  { value: 'days', label: 'Дни' },
  { value: 'weeks', label: 'Недели' }
] as const

const multipliers: Record<ReminderUnit, number> = {
  minutes: 1,
  hours: 60,
  days: 1440,
  weeks: 10_080
}

function plural(value: number, forms: [string, string, string]): string {
  const mod10 = value % 10
  const mod100 = value % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}

export function reminderOffsetLabel(minutes: number): string {
  if (minutes === 0) return 'В момент события'
  if (minutes % 10_080 === 0) {
    const value = minutes / 10_080
    return `За ${value} ${plural(value, ['неделю', 'недели', 'недель'])}`
  }
  if (minutes % 1440 === 0) {
    const value = minutes / 1440
    return `За ${value} ${plural(value, ['день', 'дня', 'дней'])}`
  }
  if (minutes % 60 === 0) {
    const value = minutes / 60
    return `За ${value} ${plural(value, ['час', 'часа', 'часов'])}`
  }
  return `За ${minutes} ${plural(minutes, ['минуту', 'минуты', 'минут'])}`
}

export function ReminderOffsetsEditor({
  value,
  onChange,
  disabled = false
}: {
  value: unknown
  onChange(value: number[]): void
  disabled?: boolean
}): React.JSX.Element {
  const offsets = useMemo(
    () =>
      Array.isArray(value)
        ? [...new Set(value.filter((item): item is number => typeof item === 'number' && item >= 0))]
            .sort((a, b) => b - a)
        : [],
    [value]
  )
  const [amount, setAmount] = useState('1')
  const [unit, setUnit] = useState<ReminderUnit>('days')

  const add = (): void => {
    const parsed = Math.max(0, Math.round(Number(amount.replace(',', '.'))))
    if (!Number.isFinite(parsed)) return
    const offset = parsed * multipliers[unit]
    if (offsets.includes(offset)) return
    onChange([...offsets, offset].sort((a, b) => b - a))
  }

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <AppTextField
            accessibilityLabel="Количество до напоминания"
            value={amount}
            disabled={disabled}
            keyboardType="number-pad"
            onChangeText={setAmount}
          />
        </View>
        <View style={{ flex: 1.25 }}>
          <AppSelect
            label="Единица времени"
            value={unit}
            disabled={disabled}
            choices={unitChoices}
            onChange={(next) => {
              if (next === 'minutes' || next === 'hours' || next === 'days' || next === 'weeks') {
                setUnit(next)
              }
            }}
          />
        </View>
        <Button label="Добавить" icon="add" disabled={disabled} onPress={add} />
      </View>

      {offsets.length === 0 ? (
        <Row title="Напоминания не настроены" />
      ) : (
        offsets.map((offset) => (
          <Row key={offset} title={reminderOffsetLabel(offset)}>
            <IconButton
              label={`Удалить «${reminderOffsetLabel(offset)}»`}
              icon="delete"
              compact
              disabled={disabled}
              onPress={() => onChange(offsets.filter((item) => item !== offset))}
            />
          </Row>
        ))
      )}
    </View>
  )
}
