import { messageFor, numeric, nullableNumeric, type FormSpec } from './form-model'
import { useRef, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Switch,
  TextInput,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, ErrorState, Label } from './primitives'
import { useTheme } from './theme'
import { notifyDataChanged } from '../../app/changes'
import { PreferredTimes } from './PreferredTimes'
export function FormSheet({ spec, close }: { spec: FormSpec; close(): void }): React.JSX.Element {
  const theme = useTheme()
  const [values, setValues] = useState(spec.initial)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const guard = useRef(false)
  const requestClose = (): void => {
    if (guard.current) return
    if (JSON.stringify(values) === JSON.stringify(spec.initial)) {
      close()
      return
    }
    Alert.alert('Отменить изменения?', 'Несохранённые изменения будут потеряны.', [
      { text: 'Продолжить', style: 'cancel' },
      { text: 'Не сохранять', style: 'destructive', onPress: close }
    ])
  }
  const set = (key: string, value: unknown): void =>
    setValues((previous) => ({ ...previous, [key]: value }))
  const save = async (): Promise<void> => {
    if (guard.current) return
    guard.current = true
    setPending(true)
    setError('')
    try {
      const input = { ...values }
      for (const field of spec.fields) {
        if (field.kind === 'number') input[field.key] = numeric(values[field.key])
        if (field.kind === 'nullableNumber') input[field.key] = nullableNumeric(values[field.key])
        if (field.kind === 'times')
          input[field.key] = (values[field.key] as { unit: string | number; time: string }[]).map(
            (item) => ({ unit: numeric(item.unit), time: item.time })
          )
        if (field.kind === 'list' && typeof values[field.key] === 'string')
          input[field.key] = String(values[field.key])
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean)
      }
      await spec.save(input)
      notifyDataChanged()
      close()
    } catch (reason) {
      setError(messageFor(reason))
    } finally {
      guard.current = false
      setPending(false)
    }
  }
  return (
    <Modal animationType="slide" onRequestClose={requestClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={{ padding: 16, gap: 12 }}>
            <Label title>{spec.title}</Label>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
              <Button label="Отмена" onPress={requestClose} disabled={pending} />
              <Button
                label={pending ? 'Сохранение…' : 'Сохранить'}
                onPress={() => {
                  void save()
                }}
                disabled={pending}
                selected
              />
            </View>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 48 }}
          >
            {error ? <ErrorState message={error} /> : null}
            {spec.fields.map((field) => (
              <View key={field.key} style={{ gap: 8 }}>
                <Label>{field.label}</Label>
                {field.hint && <Label muted>{field.hint}</Label>}
                {field.kind === 'times' ? (
                  <PreferredTimes
                    value={values[field.key]}
                    onChange={(value) => set(field.key, value)}
                    disabled={pending}
                  />
                ) : field.kind === 'multiple' ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {field.choices?.map((choice) => {
                      const selected = Array.isArray(values[field.key])
                        ? (values[field.key] as (string | null)[])
                        : []
                      return (
                        <Button
                          key={String(choice.value)}
                          label={choice.label}
                          selected={selected.includes(choice.value)}
                          disabled={pending}
                          onPress={() =>
                            set(
                              field.key,
                              selected.includes(choice.value)
                                ? selected.filter((value) => value !== choice.value)
                                : [...selected, choice.value]
                            )
                          }
                        />
                      )
                    })}
                  </View>
                ) : field.kind === 'boolean' ? (
                  <Switch
                    accessibilityLabel={field.label}
                    disabled={pending}
                    value={Boolean(values[field.key])}
                    onValueChange={(value) => set(field.key, value)}
                    trackColor={{ true: theme.accent }}
                  />
                ) : field.kind === 'choice' ? (
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {field.choices?.map((choice) => (
                      <Button
                        key={String(choice.value)}
                        label={choice.label}
                        selected={values[field.key] === choice.value}
                        disabled={pending}
                        onPress={() => set(field.key, choice.value)}
                      />
                    ))}
                  </View>
                ) : (
                  <TextInput
                    accessibilityLabel={field.label}
                    editable={!pending}
                    multiline={field.kind === 'multiline'}
                    keyboardType={
                      field.kind === 'number' || field.kind === 'nullableNumber'
                        ? 'decimal-pad'
                        : 'default'
                    }
                    autoCapitalize="sentences"
                    value={
                      Array.isArray(values[field.key])
                        ? (values[field.key] as string[]).join(', ')
                        : String(values[field.key] ?? '')
                    }
                    onChangeText={(value) => set(field.key, value)}
                    style={{
                      color: theme.text,
                      backgroundColor: theme.surface,
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 12,
                      padding: 14,
                      minHeight: field.kind === 'multiline' ? 140 : 50,
                      textAlignVertical: 'top',
                      fontSize: 16
                    }}
                  />
                )}
              </View>
            ))}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}
