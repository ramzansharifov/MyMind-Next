import { ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'

import { AppDialog } from '../../../shared/ui/AppDialog'

const FORM_ID = 'change-master-password-form'

interface ChangeMasterPasswordDialogProps {
  open: boolean
  busy: boolean
  onOpenChange: (open: boolean) => void
  onChangePassword: (currentMasterPassword: string, newMasterPassword: string) => Promise<void>
}

export function ChangeMasterPasswordDialog({
  open,
  busy,
  onOpenChange,
  onChangePassword
}: ChangeMasterPasswordDialogProps): React.JSX.Element {
  const [currentPassword, setCurrentPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setCurrentPassword('')
    setNextPassword('')
    setConfirmPassword('')
    setError(null)
  }, [open])

  const valid =
    currentPassword.length > 0 &&
    nextPassword.length >= 12 &&
    nextPassword === confirmPassword &&
    nextPassword !== currentPassword

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!valid || busy) return
    setError(null)
    try {
      await onChangePassword(currentPassword, nextPassword)
      setCurrentPassword('')
      setNextPassword('')
      setConfirmPassword('')
      onOpenChange(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сменить мастер-пароль')
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Сменить мастер-пароль"
      description="Мастер-пароль открывает всё зашифрованное хранилище. После смены используйте только новый пароль."
      icon={<ShieldCheck />}
      size="md"
      busy={busy}
      footer={
        <>
          <button
            type="button"
            disabled={busy}
            className="h-10 rounded-xl px-4 text-sm font-medium text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:opacity-45"
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </button>
          <button
            type="submit"
            form={FORM_ID}
            disabled={busy || !valid}
            className="h-10 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-45"
          >
            {busy ? 'Сохраняем…' : 'Сменить пароль'}
          </button>
        </>
      }
    >
      <form id={FORM_ID} className="space-y-4" onSubmit={(event) => void submit(event)}>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-[var(--app-muted)]">Текущий мастер-пароль</span>
          <input
            autoFocus
            type="password"
            value={currentPassword}
            autoComplete="current-password"
            className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm text-[var(--app-text)] outline-none focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-[var(--app-muted)]">Новый мастер-пароль</span>
          <input
            type="password"
            value={nextPassword}
            minLength={12}
            maxLength={256}
            autoComplete="new-password"
            className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm text-[var(--app-text)] outline-none focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
            onChange={(event) => setNextPassword(event.target.value)}
          />
          <span className="block text-[11px] text-[var(--app-muted)]">Минимум 12 символов.</span>
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-[var(--app-muted)]">Повторите новый пароль</span>
          <input
            type="password"
            value={confirmPassword}
            autoComplete="new-password"
            className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm text-[var(--app-text)] outline-none focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </label>

        {confirmPassword && nextPassword !== confirmPassword && (
          <div className="text-xs text-amber-300">Пароли не совпадают.</div>
        )}
        {error && (
          <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
      </form>
    </AppDialog>
  )
}
