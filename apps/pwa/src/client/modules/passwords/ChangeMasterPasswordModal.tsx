import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import type { PasswordsRepository } from '@mymind/persistence/passwords'
import { changeMasterPasswordInputSchema } from '@mymind/core/validation/passwords'
import { AppDialog } from '../../shared/ui/AppDialog'
import { AppTextField } from '../../shared/ui/FormControls'
import { Button, ErrorState, Label } from '../../shared/ui/primitives'
import { messageFor } from '../../shared/ui/form-model'

function MasterInput({
  label,
  value,
  setValue,
  disabled = false
}: {
  label: string
  value: string
  setValue(value: string): void
  disabled?: boolean
}): React.JSX.Element {
  return (
    <View style={{ gap: 7 }}>
      <Label>{label}</Label>
      <AppTextField
        value={value}
        onChangeText={setValue}
        disabled={disabled}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={label}
      />
    </View>
  )
}

export function ChangeMasterPasswordModal({
  api,
  close,
  changed
}: {
  api: PasswordsRepository
  close(): void
  changed(): void
}): React.JSX.Element {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)

  const save = async (): Promise<void> => {
    if (working) return
    setWorking(true)
    setError('')
    try {
      if (newPassword !== confirmPassword) throw new Error('Новые мастер-пароли не совпадают')
      const input = changeMasterPasswordInputSchema.parse({
        currentMasterPassword: currentPassword,
        newMasterPassword: newPassword
      })
      await api.changeMasterPassword(input)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      changed()
      close()
    } catch (reason) {
      setError(messageFor(reason))
    } finally {
      setWorking(false)
    }
  }

  return (
    <AppDialog
      open
      onOpenChange={(open) => {
        if (!open && !working) close()
      }}
      title="Сменить мастер-пароль"
      description="Меняется только защищённая оболочка ключа хранилища."
      icon="passwords"
      presentation="sheet"
      busy={working}
      footer={
        <Button
          label={working ? 'Смена…' : 'Сменить мастер-пароль'}
          primary
          disabled={working}
          onPress={() => void save()}
        />
      }
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}
      >
        <MasterInput
          label="Текущий мастер-пароль"
          value={currentPassword}
          setValue={setCurrentPassword}
          disabled={working}
        />
        <MasterInput
          label="Новый мастер-пароль"
          value={newPassword}
          setValue={setNewPassword}
          disabled={working}
        />
        <MasterInput
          label="Повторите новый мастер-пароль"
          value={confirmPassword}
          setValue={setConfirmPassword}
          disabled={working}
        />
        {error ? <ErrorState message={error} /> : null}
      </ScrollView>
    </AppDialog>
  )
}
