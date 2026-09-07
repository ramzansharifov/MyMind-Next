import { useState } from 'react'
import { Modal, ScrollView, TextInput, View } from 'react-native'
import type { PasswordsRepository } from '@mymind/persistence/passwords'
import { changeMasterPasswordInputSchema } from '@mymind/core/validation/passwords'
import { Button, ErrorState, Label } from '../../shared/ui/primitives'
import { messageFor } from '../../shared/ui/form-model'
import { useTheme } from '../../shared/ui/theme'

function MasterInput({
  label,
  value,
  setValue
}: {
  label: string
  value: string
  setValue(value: string): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <View style={{ gap: 7 }}>
      <Label>{label}</Label>
      <TextInput
        value={value}
        onChangeText={setValue}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={label}
        style={{
          minHeight: 50,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.surface,
          color: theme.text,
          borderRadius: 12,
          paddingHorizontal: 14,
          fontSize: 16
        }}
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
  const theme = useTheme()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)

  const save = async (): Promise<void> => {
    if (working) return
    setWorking(true)
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
      setError('')
      changed()
      close()
    } catch (reason) {
      setError(messageFor(reason))
    } finally {
      setWorking(false)
    }
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 48 }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Label title>Сменить мастер-пароль</Label>
              <Label muted>
                Данные не расшифровываются заново: меняется только защищённая оболочка ключа хранилища.
              </Label>
            </View>
            <Button label="Закрыть" onPress={close} />
          </View>
          <MasterInput
            label="Текущий мастер-пароль"
            value={currentPassword}
            setValue={setCurrentPassword}
          />
          <MasterInput label="Новый мастер-пароль" value={newPassword} setValue={setNewPassword} />
          <MasterInput
            label="Повторите новый мастер-пароль"
            value={confirmPassword}
            setValue={setConfirmPassword}
          />
          {error ? <ErrorState message={error} /> : null}
          <Button
            label={working ? 'Смена…' : 'Сменить мастер-пароль'}
            selected
            disabled={working}
            onPress={() => void save()}
          />
        </ScrollView>
      </View>
    </Modal>
  )
}
