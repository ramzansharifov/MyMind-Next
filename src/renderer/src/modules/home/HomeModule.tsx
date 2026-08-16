import {
  BookHeart,
  Disc3,
  Film,
  GraduationCap,
  House,
  ListTodo,
  Notebook,
  Presentation,
  Wallet,
  type LucideIcon
} from 'lucide-react'

import { requestAppModuleNavigation } from '../../app/module-navigation'
import type { AppViewId } from '../../app/module-registry'

const HOME_MODULES: Array<{
  id: Exclude<AppViewId, 'home' | 'settings'>
  label: string
  icon: LucideIcon
}> = [
  { id: 'study', label: 'Обучение', icon: GraduationCap },
  { id: 'boards', label: 'Доски', icon: Presentation },
  { id: 'notes', label: 'Заметки', icon: Notebook },
  { id: 'tasks', label: 'Задачи', icon: ListTodo },
  { id: 'diary', label: 'Дневник', icon: BookHeart },
  { id: 'movies', label: 'Фильмы', icon: Film },
  { id: 'music', label: 'Музыка', icon: Disc3 },
  { id: 'finance', label: 'Финансы', icon: Wallet }
]

export function HomeModule(): React.JSX.Element {
  return (
    <div className="h-full overflow-y-auto px-8 py-7">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-4">
        <section className="relative isolate overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-[0_20px_70px_rgb(0_0_0/0.16)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 right-8 -z-10 size-80 rounded-full bg-violet-500/10 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-44 -left-24 -z-10 size-80 rounded-full bg-violet-900/10 blur-3xl"
          />

          <div className="flex items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-violet-300 shadow-inner shadow-violet-500/5">
              <House aria-hidden="true" className="size-6" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--app-text)]">
              Главная
            </h1>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-[var(--app-shadow-card)]">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
            {HOME_MODULES.map((module) => {
              const Icon = module.icon

              return (
                <button
                  key={module.id}
                  type="button"
                  className="group flex min-h-28 flex-col items-start justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] p-4 text-left transition-colors outline-none hover:bg-[var(--app-card-hover)] focus-visible:ring-2 focus-visible:ring-violet-500/70"
                  onClick={() => requestAppModuleNavigation({ view: module.id })}
                >
                  <span className="flex size-9 items-center justify-center rounded-xl border border-violet-500/15 bg-violet-500/10 text-violet-300 transition-colors group-hover:border-violet-500/25">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="font-medium text-[var(--app-text)]">{module.label}</span>
                </button>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
