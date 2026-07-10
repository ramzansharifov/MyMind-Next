import { CircleCheck, Database, LoaderCircle, Settings, TriangleAlert } from 'lucide-react'

import type { SystemHealth } from '../../../../shared/contracts/system'

interface SettingsPageProps {
  health: SystemHealth | null
  error: string | null
  isLoading: boolean
}

export function SettingsPage({ health, error, isLoading }: SettingsPageProps): React.JSX.Element {
  return (
    <section className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-7xl px-8 py-8 lg:px-10 lg:py-10">
        <header>
          <div className="flex items-center gap-2 text-sm font-medium text-violet-300">
            <Settings aria-hidden="true" className="size-4" />

            <span>Система</span>
          </div>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--app-text)]">
            Настройки
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--app-muted)]">
            Здесь будут находиться параметры интерфейса, данных, резервного копирования и поведения
            приложения.
          </p>
        </header>

        <div className="mt-8 max-w-2xl rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)]">
          <div className="flex items-center gap-3 border-b border-[var(--app-border)] px-5 py-4">
            <div className="flex size-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
              <Database aria-hidden="true" className="size-5" />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-[var(--app-text)]">
                Локальная база данных
              </h2>

              <p className="mt-0.5 text-xs text-[var(--app-muted)]">
                Состояние SQLite и системного IPC
              </p>
            </div>
          </div>

          <div className="px-5 py-4">
            {isLoading && (
              <div className="flex items-center gap-3 text-sm text-[var(--app-muted)]">
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />

                <span>Проверка подключения…</span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-3">
                <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-red-400" />

                <div>
                  <p className="text-sm font-medium text-red-300">Ошибка запуска</p>

                  <p className="mt-1 text-sm text-red-300/75">{error}</p>
                </div>
              </div>
            )}

            {health && (
              <div className="flex items-start gap-3">
                <CircleCheck
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-emerald-400"
                />

                <div>
                  <p className="text-sm font-medium text-emerald-300">База данных готова</p>

                  <p className="mt-1 text-sm text-[var(--app-muted)]">
                    SQLite {health.sqliteVersion}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
