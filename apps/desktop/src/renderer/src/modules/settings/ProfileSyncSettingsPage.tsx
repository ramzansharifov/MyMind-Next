import { useEffect, useState } from 'react'
import {
  Check,
  Clock3,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  Server,
  ShieldCheck,
  UserRound,
  Wifi,
  type LucideIcon
} from 'lucide-react'
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

function StatusCard({
  icon: Icon,
  label,
  value,
  detail,
  active = false
}: {
  icon: LucideIcon
  label: string
  value: string
  detail: string
  active?: boolean
}): React.JSX.Element {
  return (
    <div
      className={[
        'flex min-h-20 items-center gap-3 rounded-2xl border px-4 py-3.5',
        active
          ? 'border-accent-500/30 bg-accent-500/10'
          : 'border-[var(--app-border)] bg-[var(--app-workspace)]'
      ].join(' ')}
    >
      <div
        className={[
          'flex size-10 shrink-0 items-center justify-center rounded-xl border',
          active
            ? 'border-accent-500/25 bg-accent-500/15 text-accent-300'
            : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)]'
        ].join(' ')}
      >
        <Icon className="size-4.5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium tracking-wide text-[var(--app-muted)]">{label}</p>
        <p
          className={[
            'mt-0.5 truncate text-sm font-semibold',
            active ? 'text-accent-300' : 'text-[var(--app-text)]'
          ].join(' ')}
        >
          {value}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-[var(--app-muted)]">{detail}</p>
      </div>
    </div>
  )
}

const inputClass =
  'h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-muted)] focus:border-accent-500/60 focus:ring-2 focus:ring-accent-500/15 disabled:cursor-not-allowed disabled:opacity-60'

export function ProfileSyncSettingsPage(): React.JSX.Element {
  const [profile, setProfile] = useState<LocalProfile | null>(null)
  const [status, setStatus] = useState<LanSyncHostStatus | null>(null)
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [gender, setGender] = useState<ProfileGender>(null)
  const [showPassword, setShowPassword] = useState(false)
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
      setMessage(
        'Профиль создан. Телефон с тем же логином и паролем сможет подключиться по локальной сети.'
      )
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
      setMessage(
        'Логин и пароль синхронизации обновлены. На телефоне нужно указать те же данные.'
      )
    } catch (reason) {
      setError(messageFor(reason))
    } finally {
      setBusy(false)
    }
  }

  const primaryAddress = status?.addresses[0] ?? '—'
  const displayName = profile?.name?.trim() || profile?.login || 'Локальный профиль'
  const lastSync = status?.lastSyncAt
    ? new Date(status.lastSyncAt).toLocaleString('ru-RU')
    : 'ещё не выполнялась'

  return (
    <div className="space-y-5">
      <ModuleHeader icon={UserRound} title="Профиль и синхронизация" />

      <section className="relative overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
        <div className="pointer-events-none absolute -top-32 right-[-5%] size-80 rounded-full bg-accent-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-[12%] size-72 rounded-full bg-accent-500/5 blur-3xl" />

        <header className="relative flex flex-wrap items-center justify-between gap-4 border-b border-[var(--app-border)] px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="border-accent-500/20 bg-accent-500/10 text-accent-300 flex size-11 shrink-0 items-center justify-center rounded-2xl border">
              <ShieldCheck className="size-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[var(--app-text)]">Локальный профиль</h2>
              <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
                Профиль связывает ваши устройства, но не создаёт облачную учётную запись.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 py-2 text-[11px] text-[var(--app-muted)]">
            <LockKeyhole className="text-accent-300 size-3.5" />
            Пароль не хранится и не передаётся по сети
          </div>
        </header>

        <div className="relative grid gap-5 p-5 xl:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-5 py-6 text-center">
            <div className="border-accent-500/25 bg-accent-500/10 text-accent-300 flex size-24 items-center justify-center rounded-[30px] border shadow-[0_14px_40px_rgba(16,185,129,0.08)]">
              <UserRound className="size-11" strokeWidth={1.7} />
            </div>
            <p className="mt-4 max-w-full truncate text-base font-semibold text-[var(--app-text)]">
              {displayName}
            </p>
            <p className="mt-1 max-w-full truncate text-xs text-[var(--app-muted)]">
              {profile ? `@${profile.login}` : 'Профиль ещё не создан'}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-medium text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-300" />
              Локальное хранение
            </div>
            <p className="mt-4 text-[11px] leading-5 text-[var(--app-muted)]">
              Имя и пол можно менять независимо от данных доступа к синхронизации.
            </p>
          </aside>

          <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Логин *">
                <div className="relative">
                  <UserRound className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--app-muted)]" />
                  <input
                    className={`${inputClass} pl-9`}
                    value={login}
                    autoComplete="username"
                    disabled={busy}
                    onChange={(event) => setLogin(event.target.value)}
                  />
                </div>
              </Field>

              <Field label={profile ? 'Новый пароль для смены логина / пароля' : 'Пароль *'}>
                <div className="relative">
                  <LockKeyhole className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--app-muted)]" />
                  <input
                    className={`${inputClass} pr-10 pl-9`}
                    value={password}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder={profile ? 'Введите новый пароль' : ''}
                    disabled={busy}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--app-muted)] transition hover:bg-[var(--app-surface-raised)] hover:text-[var(--app-text)]"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </Field>

              <Field label="Имя">
                <div className="relative">
                  <UserRound className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--app-muted)]" />
                  <input
                    className={`${inputClass} pl-9`}
                    value={name}
                    placeholder="Необязательно"
                    disabled={busy}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
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
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {!profile ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void create()}
                  className="bg-accent-500 hover:bg-accent-400 inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50"
                >
                  <Check className="size-4" />
                  {busy ? 'Создаём…' : 'Создать профиль'}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void saveDetails()}
                    className="bg-accent-500 hover:bg-accent-400 inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50"
                  >
                    <Check className="size-4" />
                    Сохранить имя и пол
                  </button>
                  <button
                    type="button"
                    disabled={busy || !password}
                    onClick={() => void saveCredentials()}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-workspace)] px-4 text-sm font-medium text-[var(--app-text)] transition hover:bg-[var(--app-surface-raised)] disabled:opacity-45"
                  >
                    <KeyRound className="size-4" />
                    Сменить логин / пароль
                  </button>
                </>
              )}
            </div>

            {error ? (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-3.5 py-3 text-sm text-red-300"
              >
                {error}
              </div>
            ) : null}
            {message ? (
              <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3.5 py-3 text-sm text-emerald-300">
                {message}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--app-border)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="border-accent-500/20 bg-accent-500/10 text-accent-300 flex size-11 items-center justify-center rounded-2xl border">
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
            aria-label="Обновить состояние локальной сети"
            onClick={() => void load()}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-xs font-medium text-[var(--app-text)] transition hover:bg-[var(--app-surface-raised)]"
          >
            <RefreshCw className="size-4" />
            Обновить
          </button>
        </header>

        <div className="space-y-4 p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatusCard
              icon={Wifi}
              label="СЕРВЕР"
              value={status?.running ? 'Активен' : 'Недоступен'}
              detail={status?.running ? 'Готов к подключению телефона' : 'Проверьте локальную сеть'}
              active={Boolean(status?.running)}
            />
            <StatusCard
              icon={Server}
              label="ПОРТ"
              value={status?.port ? String(status.port) : '—'}
              detail="Используется только в локальной сети"
            />
            <StatusCard
              icon={UserRound}
              label="ПРОФИЛЬ"
              value={profile?.login ?? 'Не создан'}
              detail="Текущий профиль на этом компьютере"
            />
            <StatusCard
              icon={Globe2}
              label="АДРЕС КОМПЬЮТЕРА"
              value={primaryAddress}
              detail={
                status && status.addresses.length > 1
                  ? `Ещё адресов: ${status.addresses.length - 1}`
                  : 'Для ручного подключения'
              }
            />
          </div>

          {status && status.addresses.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {status.addresses.slice(1).map((address) => (
                <span
                  key={address}
                  className="rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] px-2.5 py-1 text-[11px] text-[var(--app-muted)]"
                >
                  {address}
                </span>
              ))}
            </div>
          ) : null}

          <div className="flex items-start gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 py-3.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--app-surface)] text-[var(--app-muted)]">
              <Clock3 className="size-4" />
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--app-text)]">
                Последняя синхронизация: {lastSync}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-[var(--app-muted)]">
                После успешного обмена здесь появится время последней синхронизации между
                устройствами.
              </p>
            </div>
          </div>

          <div className="border-accent-500/15 bg-accent-500/10 flex items-start gap-3 rounded-2xl border px-4 py-3.5">
            <ShieldCheck className="text-accent-300 mt-0.5 size-4.5 shrink-0" />
            <p className="text-xs leading-5 text-[var(--app-muted)]">
              Телефон получает только те модули, которые существуют в мобильном приложении. Перед
              каждым запуском на телефоне можно временно отключить любой модуль. «Обучение»,
              «Доски» и другие desktop-only данные в мобильный sync-протокол не входят.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
