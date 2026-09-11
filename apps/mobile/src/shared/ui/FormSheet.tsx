import { messageFor, numeric, nullableNumeric, type FormSpec } from './form-model'
import { useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { AppDialog, type AppDialogPresentation } from './AppDialog'
import { useConfirmation } from './ConfirmationProvider'
import { AppCheckbox, AppDateField, AppSelect, AppTextField, AppTimeField } from './FormControls'
import { Button, ErrorState, Label } from './primitives'
import { useToast } from './ToastProvider'
import { notifyDataChanged } from '../../app/changes'
import { PreferredTimes } from './PreferredTimes'

function presentationFor(spec: FormSpec): AppDialogPresentation {
  const complex = spec.fields.some((field) =>
    ['multiline', 'times', 'multiple'].includes(field.kind ?? 'text')
  )
  return spec.fields.length <= 4 && !complex ? 'card' : 'sheet'
}

export function FormSheet({ spec, close }: { spec: FormSpec; close(): void }): React.JSX.Element {
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
              <View style={{ gap: 7 }}>
                {field.choices?.map((choice) => {
                  const selected = Array.isArray(values[field.key])
                    ? (values[field.key] as (string | null)[])
                    : []
                  return (
                    <AppCheckbox
                      key={String(choice.value)}
                      label={choice.label}
                      value={selected.includes(choice.value)}
                      disabled={pending}
                      onChange={(checked) =>
                        set(
                          field.key,
                          checked
                            ? [...selected, choice.value]
                            : selected.filter((value) => value !== choice.value)
                        )
                      }
                    />
                  )
                })}
              </View>
            ) : field.kind === 'boolean' ? (
              <AppCheckbox
                value={Boolean(values[field.key])}
                disabled={pending}
                onChange={(value) => set(field.key, value)}
              />
            ) : field.kind === 'date' ? (
              <AppDateField label={field.label} value={String(values[field.key] ?? '')} disabled={pending} optional={values[field.key] === null} onChangeText={(value) => set(field.key, value)} />
            ) : field.kind === 'time' ? (
              <AppTimeField label={field.label} value={String(values[field.key] ?? '')} disabled={pending} optional={values[field.key] === null} onChangeText={(value) => set(field.key, value)} />
            ) : field.kind === 'choice' ? (
              <AppSelect
                label={field.label}
                value={
                  typeof values[field.key] === 'string' || values[field.key] === null
                    ? (values[field.key] as string | null)
                    : null
                }
                choices={field.choices ?? []}
                disabled={pending}
                onChange={(value) => set(field.key, value)}
              />
            ) : (
              <AppTextField
                accessibilityLabel={field.label}
                disabled={pending}
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
              />
            )}
          </View>
        ))}
      </ScrollView>
    </AppDialog>
  )
}
