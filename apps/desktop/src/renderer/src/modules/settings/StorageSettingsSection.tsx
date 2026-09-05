import { FolderOpen, HardDrive, LoaderCircle, MoveRight } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { StorageInfo } from '../../../../shared/contracts/system'

export function StorageSettingsSection(): React.JSX.Element {
  const [storage, setStorage] = useState<StorageInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMoving, setIsMoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    void window.api.system
      .getStorageInfo()
      .then((info) => {
        if (active) setStorage(info)
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : String(reason))
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const handleOpen = (): void => {
    setError(null)
    void window.api.system.openStorageLocation().catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : String(reason))
    })
  }

  const handleChange = (): void => {
    setError(null)
    setIsMoving(true)

    void window.api.system
      .changeStorageLocation()
      .then((result) => {
        if (result.status !== 'cancelled') {
          setStorage((current) =>
            current
              ? {
                  ...current,
                  path: result.path,
                  isDefault: result.path === current.defaultPath
                }
              : current
          )
        }
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : String(reason))
      })
      .finally(() => {
        setIsMoving(false)
      })
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[0_12px_40px_rgb(0_0_0/0.1)]">
      <header className="flex min-h-16 items-center gap-3 border-b border-[var(--app-border)] px-5 py-3">
        <div className="border-accent-500/15 bg-accent-500/10 text-accent-300 flex size-10 shrink-0 items-center justify-center rounded-xl border">
          <HardDrive aria-hidden="true" className="size-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-[var(--app-text)]">Хранилище данных</h2>
          <p className="mt-0.5 text-xs leading-5 text-[var(--app-muted)]">
            База, вложения заметок и обучения, а также локальные файлы MyMind хранятся в одной
            папке.
          </p>
        </div>
      </header>

      <div className="space-y-4 p-5">
        <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4">
          <p className="text-xs font-medium text-[var(--app-muted)]">Текущая папка</p>
          <div className="mt-2 flex min-w-0 items-center gap-2">
            <FolderOpen aria-hidden="true" className="text-accent-300 size-4 shrink-0" />
            <code className="min-w-0 text-sm break-all text-[var(--app-text)]">
              {isLoading ? 'Загрузка…' : (storage?.path ?? 'Не удалось определить путь')}
            </code>
          </div>
          {storage?.isDefault && (
            <p className="mt-2 text-xs text-[var(--app-muted)]">Используется папка по умолчанию.</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!storage || isLoading || isMoving}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--app-border-strong)] bg-[var(--app-control)] px-3 text-sm font-medium text-[var(--app-text)] transition-colors hover:bg-[var(--app-control-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleOpen}
          >
            <FolderOpen aria-hidden="true" className="size-4" />
            Открыть папку
          </button>
          <button
            type="button"
            disabled={!storage || isLoading || isMoving}
            className="border-accent-500/25 bg-accent-500/10 text-accent-200 hover:bg-accent-500/15 inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleChange}
          >
            {isMoving ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <MoveRight aria-hidden="true" className="size-4" />
            )}
            {isMoving ? 'Перенос данных…' : 'Изменить папку…'}
          </button>
        </div>

        <p className="text-xs leading-5 text-[var(--app-muted)]">
          При смене папки MyMind сначала скопирует и проверит данные, затем переключится на новое
          хранилище и перезапустится. Сторонние файлы в выбранной директории не удаляются.
        </p>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-xs leading-5 text-red-300"
          >
            {error}
          </div>
        )}
      </div>
    </section>
  )
}
