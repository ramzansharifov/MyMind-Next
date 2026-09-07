import { useMemo, useState } from 'react'
import { Modal, ScrollView, Switch, TextInput, View } from 'react-native'
import type { GeneratePasswordInput } from '@mymind/contracts/passwords'
import { generatePasswordInputSchema } from '@mymind/core/validation/passwords'
import { Button, ErrorState, Label } from '../../shared/ui/primitives'
import { messageFor } from '../../shared/ui/form-model'
import { useTheme } from '../../shared/ui/theme'

export function PasswordGeneratorModal({
  generate,
  close,
  copy,
  onUseValue
}: {
  generate(input: GeneratePasswordInput): string
  close(): void
  copy(value: string): Promise<void>
  onUseValue?(value: string): void
}): React.JSX.Element {
  const theme = useTheme()
  const [length, setLength] = useState('24')
  const [lowercase, setLowercase] = useState(true)
  const [uppercase, setUppercase] = useState(true)
  const [digits, setDigits] = useState(true)
  const [symbols, setSymbols] = useState(true)
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(true)
  const [visible, setVisible] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const settings = useMemo(
    () => [
      { label: 'Строчные буквы', value: lowercase, set: setLowercase },
      { label: 'Заглавные буквы', value: uppercase, set: setUppercase },
      { label: 'Цифры', value: digits, set: setDigits },
      { label: 'Символы', value: symbols, set: setSymbols },
      {
        label: 'Исключить похожие I, l, 1, O, 0, o',
        value: excludeAmbiguous,
        set: setExcludeAmbiguous
      }
    ],
    [digits, excludeAmbiguous, lowercase, symbols, uppercase]
  )

  const regenerate = (): void => {
    try {
      const input = generatePasswordInputSchema.parse({
        length: Number(length),
        lowercase,
        uppercase,
        digits,
        symbols,
        excludeAmbiguous
      })
      setValue(generate(input))
      setError('')
    } catch (reason) {
      setError(messageFor(reason))
    }
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 48 }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Label title>Генератор паролей</Label>
              <Label muted>Генерация выполняется локально на устройстве.</Label>
            </View>
            <Button label="Закрыть" onPress={close} />
          </View>

          <Label>Длина</Label>
          <TextInput
            value={length}
            onChangeText={setLength}
            keyboardType="number-pad"
            accessibilityLabel="Длина пароля"
            style={{
              minHeight: 48,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 12,
              backgroundColor: theme.surface,
              color: theme.text,
              paddingHorizontal: 14,
              fontSize: 16
            }}
          />

          {settings.map((setting) => (
            <View
              key={setting.label}
              style={{
                minHeight: 52,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                paddingHorizontal: 14,
                backgroundColor: theme.surface
              }}
            >
              <View style={{ flex: 1 }}>
                <Label>{setting.label}</Label>
              </View>
              <Switch
                value={setting.value}
                onValueChange={setting.set}
                trackColor={{ true: theme.accent }}
              />
            </View>
          ))}

          <Button
            label={value ? 'Сгенерировать заново' : 'Сгенерировать'}
            selected
            onPress={regenerate}
          />
          {error ? <ErrorState message={error} /> : null}

          {value ? (
            <View
              style={{
                gap: 10,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface,
                borderRadius: 16,
                padding: 16
              }}
            >
              <TextInput
                editable={false}
                value={value}
                secureTextEntry={!visible}
                accessibilityLabel="Сгенерированный пароль"
                style={{ color: theme.text, fontSize: 17, minHeight: 44 }}
              />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Button
                  label={visible ? 'Скрыть' : 'Показать'}
                  onPress={() => setVisible(!visible)}
                />
                <Button label="Копировать" onPress={() => void copy(value)} />
                {onUseValue ? (
                  <Button
                    label="Использовать"
                    selected
                    onPress={() => {
                      onUseValue(value)
                      close()
                    }}
                  />
                ) : null}
              </View>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  )
}
