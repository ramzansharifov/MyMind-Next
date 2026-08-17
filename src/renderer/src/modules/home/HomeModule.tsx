import {
  BookHeart,
  Disc3,
  Dumbbell,
  Film,
  GraduationCap,
  House,
  KeyRound,
  ListTodo,
  Notebook,
  Presentation,
  Repeat2,
  Wallet,
  type LucideIcon
} from 'lucide-react'

import { requestAppModuleNavigation } from '../../app/module-navigation'
import type { AppViewId } from '../../app/module-registry'
import { ModuleHeader } from '../../shared/ui/ModuleHeader'
import { StandardModulePage } from '../../shared/ui/StandardModulePage'

const HOME_MODULES: Array<{
  id: Exclude<AppViewId, 'home' | 'settings'>
  label: string
  icon: LucideIcon
}> = [
  { id: 'study', label: 'Обучение', icon: GraduationCap },
  { id: 'boards', label: 'Доски', icon: Presentation },
  { id: 'notes', label: 'Заметки', icon: Notebook },
  { id: 'tasks', label: 'Задачи', icon: ListTodo },
  { id: 'habits', label: 'Привычки', icon: Repeat2 },
  { id: 'workouts', label: 'Тренировки', icon: Dumbbell },
  { id: 'diary', label: 'Дневник', icon: BookHeart },
  { id: 'movies', label: 'Фильмы', icon: Film },
  { id: 'music', label: 'Музыка', icon: Disc3 },
  { id: 'finance', label: 'Финансы', icon: Wallet },
  { id: 'passwords', label: 'Пароли', icon: KeyRound }
]

export function HomeModule(): React.JSX.Element {
  return (
    <StandardModulePage>
      <div className="flex flex-col gap-5">
        <ModuleHeader
          icon={House}
          title="Главная"
          description="Все ключевые разделы MyMind в единой рабочей области."
        />

        <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-[var(--app-shadow-card)]">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
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
    </StandardModulePage>
  )
}
