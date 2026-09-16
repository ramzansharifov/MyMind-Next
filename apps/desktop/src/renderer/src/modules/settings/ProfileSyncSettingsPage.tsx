import { useEffect, useState } from 'react'
import { RefreshCw, ShieldCheck, UserRound, Wifi } from 'lucide-react'
import type { LocalProfile, ProfileGender } from '@mymind/contracts/profile-sync'
import type { LanSyncHostStatus } from '../../../../shared/contracts/profile-sync'
import { ModuleHeader } from '../../shared/ui/ModuleHeader'

function messageFor(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason)
}

function Field({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <label className="grid gap-2 text-sm text-[var(--app-text)]">
      <span className="text-xs font-medium text-[var(--app-muted)]">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  'h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none transition focus:border-accent-500/60 focus:ring-2 focus:ring-accent-500/20'

export function ProfileSyncSettingsPage(): React.JSX.Element {
  const [profile, setProfile] = useState<LocalProfile | null>(null)
  const [status, setStatus] = useState<LanSyncHostStatus | null>(null)
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [gender, setGender] = useState<ProfileGender>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async (): Promise<void> => {
    const [nextProfile, nextStatus] = await Promise.all([
      window.api.profileSync.getProfile(),
      window.api.profileSync.getLanStatus()
    ])
    setProfile(nextProfile)
    setStatus(nextStatus)
    setLogin(nextProfile?.login ?? '')
    setName(nextProfile?.name ?? '')
    setGender(nextProfile?.gender ?? null)
  }

  useEffect(() => {
    void load().catch((reason: unknown) => setError(messageFor(reason)))
  }, [])

  const create = async (): Promise<void> => {
    if (busy) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const created = await window.api.profileSync.createProfile({
        login,
        password,
        name: name || null,
        gender
      })
      setProfile(created)
      setPassword('')
      setMessage('Профиль создан. Теперь телефон с тем же логином и паролем сможет синхронизироваться по локальной сети.')
      setStatus(await window.api.profileSync.getLanStatus())
    } catch (reason) {
      setError(messageFor(reason))
    } finally {
      setBusy(false)
    }
  }

  const saveDetails = async (): Promise<void> => {
    if (busy || !profile) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const updated = await window.api.profileSync.updateProfile({
        name: name || null,
        gender
      })
      setProfile(updated)
      setMessage('Данные профиля сохранены.')
    } catch (reason) {
      setError(messageFor(reason))
    } finally {
      setBusy(false)
    }
  }

  const saveCredentials = async (): Promise<void> => {
    if (busy || !profile) return
    if (!password) {
      setError('Введите новый пароль.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const updated = await window.api.profileSync.replaceCredentials({ login, password })
      setProfile(updated)
      setPassword('')
      setMessage('Логин и пароль синхронизации обновлены. На другом устройстве нужно указать те же данные.')
    } catch (reason) {
      setError(messageFor(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <ModuleHeader icon={UserRound} title="Профиль и синхронизация" />

      <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)]">
        <header className="flex items-start gap-3 border-b border-[var(--app-border)] px-5 py-4">
          <div className="border-accent-500/15 bg-accent-500/10 text-accent-300 flex size-10 items-center justify-center rounded-xl border">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--app-text)]">Локальный профиль</h2>
            <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
              Обязательны только логин и пароль. Пароль не хранится в базе и не передаётся по сети.
            </p>
          </div>
        </header>

        <div className="grid gap-4 p-5 md:grid-cols-2">
          <Field label="Логин *">
            <input
              className={inputClass}
              value={login}
              autoComplete="username"
              disabled={busy}
              onChange={(event) => setLogin(event.target.value)}
            />
          </Field>
          <Field label={profile ? 'Новый пароль для смены логина/пароля' : 'Пароль *'}>
            <input
              className={inputClass}
              value={password}
              type="password"
              autoComplete="new-password"
              disabled={busy}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          <Field label="Имя">
            <input
              className={inputClass}
              value={name}
              disabled={busy}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label="Пол">
            <select
              className={inputClass}
              value={gender ?? ''}
              disabled={busy}
              onChange={(event) =>
                setGender(
                  event.target.value === 'male'
                    ? 'male'
                    : event.target.value === 'female'
                      ? 'female'
                      : null
                )
              }
            >
              <option value="">Не указан</option>
              <option value="male">Мужской</option>
              <option value="female">Женский</option>
            </select>
          </Field>

          <div className="flex flex-wrap gap-2 md:col-span-2">
            {!profile ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void create()}
                className="bg-accent-500 hover:bg-accent-400 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy ? 'Создаём…' : 'Создать профиль'}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveDetails()}
                  className="bg-accent-500 hover:bg-accent-400 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Сохранить имя и пол
                </button>
                <button
                  type="button"
                  disabled={busy || !password}
                  onClick={() => void saveCredentials()}
                  className="rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-workspace)] px-4 py-2 text-sm font-medium text-[var(--app-text)] disabled:opacity-50"
                >
                  Сменить логин / пароль
                </button>
              </>
            )}
          </div>

          {error ? (
            <p role="alert" className="text-sm text-red-400 md:col-span-2">
              {error}
            </p>
          ) : null}
          {message ? <p className="text-sm text-emerald-400 md:col-span-2">{message}</p> : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)]">
        <header className="flex items-center justify-between gap-4 border-b border-[var(--app-border)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="border-accent-500/15 bg-accent-500/10 text-accent-300 flex size-10 items-center justify-center rounded-xl border">
              <Wifi className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--app-text)]">Локальная сеть</h2>
              <p className="mt-1 text-xs text-[var(--app-muted)]">
                Телефон и компьютер должны находиться в одной сети Wi-Fi / LAN.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Обновить состояние"
            onClick={() => void load()}
            className="rounded-xl border border-[var(--app-border)] p-2 text-[var(--app-muted)] hover:text-[var(--app-text)]"
          >
            <RefreshCw className="size-4" />
          </button>
        </header>

        <div className="grid gap-3 p-5 text-sm">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 py-1 text-xs text-[var(--app-muted)]">
              Сервер: {status?.running ? 'активен' : 'недоступен'}
            </span>
            <span className="rounded-full border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 py-1 text-xs text-[var(--app-muted)]">
              Порт: {status?.port ?? '—'}
            </span>
            <span className="rounded-full border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 py-1 text-xs text-[var(--app-muted)]">
              Профиль: {profile ? profile.login : 'не создан'}
            </span>
          </div>
          <p className="text-xs leading-5 text-[var(--app-muted)]">
            Адреса компьютера: {status?.addresses.length ? status.addresses.join(', ') : 'не найдены'}
          </p>
          <p className="text-xs leading-5 text-[var(--app-muted)]">
            Последняя синхронизация:{' '}
            {status?.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString('ru-RU') : 'ещё не выполнялась'}
          </p>
          <p className="text-xs leading-5 text-[var(--app-muted)]">
            «Обучение» и «Доски» остаются только на компьютере и в мобильную синхронизацию не входят.
          </p>
        </div>
      </section>
    </div>
  )
}
