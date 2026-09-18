import {
  CheckCircle2,
  CircleAlert,
  Download,
  LoaderCircle,
  RefreshCw,
  RotateCcw
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import type { DesktopUpdatePhase, DesktopUpdateStatus } from '../../../../shared/contracts/updates'
import { ModuleHeader } from '../../shared/ui/ModuleHeader'

function formatBytes(value: number | null): string | null {
  if (value === null || !Number.isFinite(value) || value < 0) {
    return null
  }

  const units = ['Б', 'КБ', 'МБ', 'ГБ']
  let size = value
  let index = 0

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024
    index += 1
  }

  const digits = index === 0 ? 0 : size >= 100 ? 0 : 1
  return `${size.toFixed(digits)} ${units[index]}`
}

function formatLastChecked(value: string | null): string | null {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date)
}

function updateStatusCopy(status: DesktopUpdateStatus): {
  title: string
  detail: string
  tone: 'default' | 'success' | 'error'
} {
  switch (status.phase) {
    case 'checking':
      return {
        title: 'Проверяем обновления…',
        detail: 'MyMind связывается с GitHub Releases.',
        tone: 'default'
      }
    case 'available':
      return {
        title: status.availableVersion
          ? `Доступна версия ${status.availableVersion}`
          : 'Доступно обновление',
        detail: 'Нажмите «Обновить», чтобы скачать новую версию.',
        tone: 'default'
      }
    case 'downloading': {
      const percent = Math.round(status.percent ?? 0)
      const speed = formatBytes(status.bytesPerSecond)
      return {
        title: `Загрузка обновления — ${percent}%`,
        detail: speed ? `Текущая скорость: ${speed}/с.` : 'Обновление загружается в фоне.',
        tone: 'default'
      }
    }
    case 'downloaded':
      return {
        title: status.availableVersion
          ? `MyMind ${status.availableVersion} готов к установке`
          : 'Обновление готово к установке',
        detail: 'Нажмите «Перезапустить и установить», когда будете готовы.',
        tone: 'success'
      }
    case 'up-to-date':
      return {
        title: 'Установлена последняя версия',
        detail: 'Новых обновлений сейчас нет.',
        tone: 'success'
      }
    case 'error':
      return {
        title: status.availableVersion
          ? 'Не удалось скачать обновление'
          : 'Не удалось проверить обновления',
        detail: status.error ?? 'Проверьте подключение к интернету и повторите попытку.',
        tone: 'error'
      }
    case 'unsupported':
      return {
        title: 'Обновления доступны в установленной Windows-версии',
        detail: 'В режиме разработки проверка обновлений отключена.',
        tone: 'default'
      }
    default:
      return {
        title: 'Автоматическая проверка включена',
        detail:
          'MyMind сообщает о новой версии, но скачивает её только после вашего подтверждения.',
        tone: 'default'
      }
  }
}

function StatusIcon({ phase }: { phase: DesktopUpdatePhase }): React.JSX.Element {
  if (phase === 'checking' || phase === 'downloading') {
    return <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
  }

  if (phase === 'downloaded' || phase === 'up-to-date') {
    return <CheckCircle2 aria-hidden="true" className="size-5" />
  }

  if (phase === 'error') {
    return <CircleAlert aria-hidden="true" className="size-5" />
  }

  return <Download aria-hidden="true" className="size-5" />
}

export function UpdateSettingsPage(): React.JSX.Element {
  const [status, setStatus] = useState<DesktopUpdateStatus | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    void window.api.updates
      .getStatus()
      .then((nextStatus) => {
        if (active) setStatus(nextStatus)
      })
      .catch((reason: unknown) => {
        if (active) {
          setActionError(reason instanceof Error ? reason.message : String(reason))
        }
      })

    const unsubscribe = window.api.updates.onStatusChanged((nextStatus) => {
      if (active) {
        setStatus(nextStatus)
        setActionError(null)
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const copy = useMemo(
    () =>
      status
        ? updateStatusCopy(status)
        : {
            title: 'Загрузка состояния…',
            detail: 'Получаем состояние службы обновлений.',
            tone: 'default' as const
          },
    [status]
  )

  const handleCheck = (): void => {
    setActionError(null)
    void window.api.updates
      .check()
      .then(setStatus)
      .catch((reason: unknown) => {
        setActionError(reason instanceof Error ? reason.message : String(reason))
      })
  }

  const handleDownload = (): void => {
    setActionError(null)
    void window.api.updates
      .download()
      .then(setStatus)
      .catch((reason: unknown) => {
        setActionError(reason instanceof Error ? reason.message : String(reason))
      })
  }

  const handleInstall = (): void => {
    setActionError(null)
    void window.api.updates.install().catch((reason: unknown) => {
      setActionError(reason instanceof Error ? reason.message : String(reason))
    })
  }

  const isChecking = status?.phase === 'checking'
  const canCheck = Boolean(
    status &&
    status.phase !== 'unsupported' &&
    status.phase !== 'available' &&
    status.phase !== 'downloading' &&
    status.phase !== 'downloaded'
  )
  const progress = Math.max(0, Math.min(100, status?.percent ?? 0))
  const transferred = formatBytes(status?.transferred ?? null)
  const total = formatBytes(status?.total ?? null)
  const lastCheckedAt = formatLastChecked(status?.lastCheckedAt ?? null)

  const statusToneClass =
    copy.tone === 'success'
      ? 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300'
      : copy.tone === 'error'
        ? 'border-red-500/20 bg-red-500/[0.06] text-red-300'
        : 'border-[var(--app-border)] bg-[var(--app-workspace)] text-accent-300'

  return (
    <div className="space-y-5">
      <ModuleHeader icon={RefreshCw} title="Обновления" />

      <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[0_12px_40px_rgb(0_0_0/0.1)]">
        <header className="flex min-h-16 items-center gap-3 border-b border-[var(--app-border)] px-5 py-3">
          <div className="border-accent-500/15 bg-accent-500/10 text-accent-300 flex size-10 shrink-0 items-center justify-center rounded-xl border">
            <RefreshCw aria-hidden="true" className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--app-text)]">MyMind Desktop</h2>
            <p className="mt-0.5 text-xs leading-5 text-[var(--app-muted)]">
              Новые версии проверяются автоматически, но скачиваются только по вашему запросу.
            </p>
          </div>
        </header>

        <div className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4">
              <p className="text-xs font-medium text-[var(--app-muted)]">Текущая версия</p>
              <p className="mt-2 text-lg font-semibold text-[var(--app-text)]">
                v{status?.currentVersion ?? __APP_VERSION__}
              </p>
            </div>

            <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4">
              <p className="text-xs font-medium text-[var(--app-muted)]">Последняя проверка</p>
              <p className="mt-2 text-sm font-medium text-[var(--app-text)]">
                {lastCheckedAt ?? 'Ещё не выполнялась'}
              </p>
            </div>
          </div>

          <div className={`rounded-xl border p-4 ${statusToneClass}`}>
            <div className="flex items-start gap-3">
              <StatusIcon phase={status?.phase ?? 'idle'} />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{copy.title}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">{copy.detail}</p>
              </div>
            </div>

            {status?.phase === 'downloading' && (
              <div className="mt-4">
                <div
                  role="progressbar"
                  aria-label="Загрузка обновления"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress)}
                  className="h-2 overflow-hidden rounded-full bg-[var(--app-control)]"
                >
                  <div
                    className="bg-accent-500 h-full rounded-full transition-[width] duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-[var(--app-muted)]">
                  <span>{Math.round(progress)}%</span>
                  {transferred && total && (
                    <span>
                      {transferred} из {total}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {status?.phase === 'available' && (
              <button
                type="button"
                className="border-accent-500/25 bg-accent-500/10 text-accent-200 hover:bg-accent-500/15 inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors"
                onClick={handleDownload}
              >
                <Download aria-hidden="true" className="size-4" />
                Обновить
              </button>
            )}

            <button
              type="button"
              disabled={!canCheck}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-control)] px-3 text-sm font-medium text-[var(--app-text)] transition-colors hover:bg-[var(--app-control-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleCheck}
            >
              <RotateCcw
                aria-hidden="true"
                className={`size-4 ${isChecking ? 'animate-spin' : ''}`}
              />
              {isChecking ? 'Проверяем…' : 'Проверить обновления'}
            </button>

            {status?.phase === 'downloaded' && (
              <button
                type="button"
                className="border-accent-500/25 bg-accent-500/10 text-accent-200 hover:bg-accent-500/15 inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors"
                onClick={handleInstall}
              >
                <RefreshCw aria-hidden="true" className="size-4" />
                Перезапустить и установить
              </button>
            )}
          </div>

          <p className="text-xs leading-5 text-[var(--app-muted)]">
            После запуска MyMind проверяет наличие новой версии примерно через 15 секунд, затем
            повторяет проверку раз в 4 часа. Скачивание и установка начинаются только после вашего
            действия.
          </p>

          {actionError && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-xs leading-5 text-red-300"
            >
              {actionError}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
