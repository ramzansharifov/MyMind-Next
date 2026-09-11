import { messageFor, numeric, nullableNumeric, type FormSpec } from './form-model'
import { useRef, useState } from 'react'
import { ScrollView, Switch, TextInput, View } from 'react-native'
import { AppDialog, type AppDialogPresentation } from './AppDialog'
import { useConfirmation } from './ConfirmationProvider'
import { Button, ErrorState, Label } from './primitives'
import { useToast } from './ToastProvider'
import { useTheme } from './theme'
import { notifyDataChanged } from '../../app/changes'
import { PreferredTimes } from './PreferredTimes'

function presentationFor(spec: FormSpec): AppDialogPresentation {
  const complex = spec.fields.some((field) =>
    ['multiline', 'times', 'multiple'].includes(field.kind ?? 'text')
  )
  return spec.fields.length <= 4 && !complex ? 'card' : 'sheet'
}

export function FormSheet({ spec, close }: { spec: FormSpec; close(): void }): React.JSX.Element {
  const theme = useTheme()
  const confirm = useConfirmation()
  const toast = useToast()
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
    void confirm({
      title: 'Отменить изменения?',
      description: 'Несохранённые изменения будут потеряны.',
      confirmLabel: 'Не сохранять',
      submittingLabel: 'Закрываем…',
      tone: 'warning',
      notice: null,
      onConfirm: close
    })
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
      toast.success('Изменения сохранены')
      close()
    } catch (reason) {
      const message = messageFor(reason)
      setError(message)
      toast.error(message)
    } finally {
      guard.current = false
      setPending(false)
    }
  }

  return (
    <AppDialog
      open
      onOpenChange={(open) => {
        if (!open) requestClose()
      }}
      title={spec.title}
      description="Заполните поля и сохраните изменения"
      icon="edit"
      presentation={presentationFor(spec)}
      busy={pending}
      footer={
        <>
          <Button label="Отмена" onPress={requestClose} disabled={pending} />
          <Button
            label={pending ? 'Сохранение…' : 'Сохранить'}
            icon="check"
            primary
            onPress={() => {
              void save()
            }}
            disabled={pending}
          />
        </>
      }
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 24 }}
      >
        {error ? <ErrorState message={error} /> : null}
        {spec.fields.map((field) => (
          <View key={field.key} style={{ gap: 8 }}>
            <Label>{field.label}</Label>
            {field.hint ? <Label muted>{field.hint}</Label> : null}
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
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  minHeight: field.kind === 'multiline' ? 140 : 50,
                  textAlignVertical: field.kind === 'multiline' ? 'top' : 'center',
                  fontSize: 16
                }}
              />
            )}
          </View>
        ))}
      </ScrollView>
    </AppDialog>
  )
}
