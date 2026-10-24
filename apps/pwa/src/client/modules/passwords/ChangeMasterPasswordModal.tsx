import { useState } from 'react'
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
    <div
      className="ui-stack"
      style={{
        gap: 7
      }}
    >
      <Label>{label}</Label>
      <AppTextField
        value={value}
        onValueChange={setValue}
        disabled={disabled}
        type="password"
        autoCapitalize="none"
        autoCorrect="off"
        aria-label={label}
      />
    </div>
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
          onClick={() => void save()}
        />
      }
    >
      <div className="ui-scroll">
        <div
          className="ui-stack ui-scroll-content"
          style={{
            padding: 16,
            gap: 16,
            paddingBottom: 28
          }}
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
        </div>
      </div>
    </AppDialog>
  )
}
