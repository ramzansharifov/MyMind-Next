import { Check, Monitor, Moon, Palette, Sun } from 'lucide-react'

import type { AppThemePreference } from '../../../../shared/contracts/preferences'
import { useAppearance } from '../../app/appearance/appearance-context'
import { APP_ACCENT_OPTIONS, APP_THEME_OPTIONS } from '../../app/appearance/appearance-options'
import { cn } from '../../shared/lib/cn'

const THEME_ICONS = {
  system: Monitor,
  light: Sun,
  dark: Moon
} satisfies Record<AppThemePreference, typeof Monitor>

export function AppearanceSettingsSection(): React.JSX.Element {
  const { preferences, status, error, setTheme, setAccent } = useAppearance()

  return (
    <div className="grid grid-cols-[minmax(260px,0.72fr)_minmax(0,1.28fr)] items-start gap-5 max-[980px]:grid-cols-1">
      <AppearancePreview />

      <div className="grid gap-5">
        <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[0_12px_40px_rgb(0_0_0/0.1)]">
          <header className="flex min-h-20 items-center gap-3 border-b border-[var(--app-border)] px-5 py-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/15 bg-violet-500/10 text-violet-300">
              <Monitor aria-hidden="true" className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--app-text)]">Тема приложения</h2>
              <p className="mt-0.5 text-xs text-[var(--app-muted)]">
                Выберите оформление окон и рабочих областей.
              </p>
            </div>
          </header>

          <fieldset className="p-4">
            <legend className="sr-only">Тема</legend>
            <div className="grid grid-cols-3 gap-3 max-[680px]:grid-cols-1">
              {APP_THEME_OPTIONS.map((option) => {
                const Icon = THEME_ICONS[option.value]
                const selected = preferences.theme === option.value

                return (
                  <label
                    key={option.value}
                    className={cn(
                      'relative flex min-h-32 cursor-pointer flex-col rounded-xl border p-3.5 transition-[border-color,background-color,transform] outline-none',
                      'has-focus-visible:ring-2 has-focus-visible:ring-violet-500/50',
                      selected
                        ? 'border-violet-500/45 bg-violet-500/10'
                        : 'border-[var(--app-border)] bg-[var(--app-workspace)] hover:-translate-y-px hover:border-[var(--app-border-strong)]'
                    )}
                  >
                    <input
                      type="radio"
                      name="appearance-theme"
                      value={option.value}
                      checked={selected}
                      className="sr-only"
                      onChange={() => setTheme(option.value)}
                    />

                    <span className="flex items-start justify-between gap-3">
                      <Icon aria-hidden="true" className="size-5 shrink-0 text-violet-300" />
                      {selected && (
                        <span className="flex size-5 items-center justify-center rounded-full bg-violet-500 text-white">
                          <Check aria-hidden="true" className="size-3" />
                        </span>
                      )}
                    </span>

                    <span className="mt-auto pt-4">
                      <span className="block text-sm font-medium text-[var(--app-text)]">
                        {option.label}
                      </span>
                      <span className="mt-1 block text-[11px] leading-4 text-[var(--app-muted)]">
                        {option.description}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[0_12px_40px_rgb(0_0_0/0.1)]">
          <header className="flex min-h-20 items-center gap-3 border-b border-[var(--app-border)] px-5 py-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/15 bg-violet-500/10 text-violet-300">
              <Palette aria-hidden="true" className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--app-text)]">Акцентный цвет</h2>
              <p className="mt-0.5 text-xs text-[var(--app-muted)]">
                Используется для кнопок, выбора и активных элементов.
              </p>
            </div>
          </header>

          <fieldset className="p-4">
            <legend className="sr-only">Акцентный цвет</legend>
            <div className="grid grid-cols-5 gap-2 max-[680px]:grid-cols-2">
              {APP_ACCENT_OPTIONS.map((option) => {
                const selected = preferences.accent === option.value

                return (
                  <label
                    key={option.value}
                    className={cn(
                      'flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border p-2.5 transition-[border-color,background-color,transform] outline-none',
                      'has-focus-visible:ring-2 has-focus-visible:ring-violet-500/50',
                      selected
                        ? 'border-violet-500/45 bg-violet-500/10'
                        : 'border-[var(--app-border)] bg-[var(--app-workspace)] hover:-translate-y-px hover:border-[var(--app-border-strong)]'
                    )}
                  >
                    <input
                      type="radio"
                      name="appearance-accent"
                      value={option.value}
                      checked={selected}
                      className="sr-only"
                      aria-label={option.label}
                      onChange={() => setAccent(option.value)}
                    />
                    <span
                      aria-hidden="true"
                      className="flex size-8 shrink-0 items-center justify-center rounded-full shadow-sm shadow-black/20"
                      style={{ backgroundColor: option.preview }}
                    >
                      {selected && <Check className="size-4 text-white" />}
                    </span>
                    <span className="truncate text-[11px] font-medium text-[var(--app-text)]">
                      {option.label}
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        </section>

        <div
          aria-live="polite"
          className="min-h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-xs"
        >
          {status === 'ready' && !error && (
            <span className="text-[var(--app-muted)]">Изменения применяются автоматически.</span>
          )}
          {status === 'loading' && (
            <span className="text-[var(--app-muted)]">Загрузка оформления…</span>
          )}
          {status === 'saving' && <span className="text-violet-300">Сохранение…</span>}
          {error && <span className="text-red-400">Не удалось сохранить: {error}</span>}
        </div>
      </div>
    </div>
  )
}

function AppearancePreview(): React.JSX.Element {
  return (
    <aside className="sticky top-0 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[0_12px_40px_rgb(0_0_0/0.1)] max-[980px]:static">
      <p className="text-sm font-semibold text-[var(--app-text)]">Предпросмотр</p>
      <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
        Так будут выглядеть основные поверхности MyMind.
      </p>

      <div
        aria-hidden="true"
        className="mt-5 overflow-hidden rounded-2xl border border-[var(--app-border-strong)] bg-[var(--app-workspace)] shadow-2xl shadow-black/20"
      >
        <div className="flex h-9 items-center gap-1.5 border-b border-[var(--app-border)] bg-[var(--app-surface-raised)] px-3">
          <span className="size-2 rounded-full bg-red-400/70" />
          <span className="size-2 rounded-full bg-amber-400/70" />
          <span className="size-2 rounded-full bg-emerald-400/70" />
        </div>

        <div className="grid min-h-64 grid-cols-[64px_1fr]">
          <div className="border-r border-[var(--app-border)] bg-[var(--app-sidebar)] p-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
              <Palette className="size-4" />
            </div>
            <div className="mt-4 h-9 rounded-xl bg-[var(--app-sidebar-active)]" />
            <div className="mt-2 h-9 rounded-xl bg-white/[0.025]" />
          </div>

          <div className="p-4">
            <div className="h-2.5 w-20 rounded-full bg-violet-400/80" />
            <div className="mt-3 h-5 w-36 rounded-md bg-[var(--app-text)]/85" />
            <div className="mt-5 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
              <div className="h-2 w-4/5 rounded-full bg-[var(--app-muted)]/35" />
              <div className="mt-2 h-2 w-3/5 rounded-full bg-[var(--app-muted)]/20" />
              <div className="mt-5 h-8 w-24 rounded-lg bg-violet-500" />
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
