import {
  Bell,
  BookHeart,
  CalendarDays,
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
  Utensils,
  Wallet,
  type LucideIcon
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import type { CalendarReminderRecord } from '../../../../shared/contracts/calendar'
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
  { id: 'nutrition', label: 'Питание', icon: Utensils },
  { id: 'calendar', label: 'Календарь', icon: CalendarDays },
  { id: 'diary', label: 'Дневник', icon: BookHeart },
  { id: 'movies', label: 'Фильмы', icon: Film },
  { id: 'music', label: 'Музыка', icon: Disc3 },
  { id: 'finance', label: 'Финансы', icon: Wallet },
  { id: 'passwords', label: 'Пароли', icon: KeyRound }
]

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function reminderTimeLabel(reminder: CalendarReminderRecord): string {
  const trigger = new Date(reminder.triggerAt)
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(trigger)
}

export function HomeModule(): React.JSX.Element {
  const [reminders, setReminders] = useState<CalendarReminderRecord[]>([])

  const loadReminders = useCallback(async (): Promise<void> => {
    const from = new Date()
    const to = new Date(from)
    to.setDate(to.getDate() + 14)
    try {
      const now = Date.now()
      setReminders(
        (
          await window.api.calendar.listUpcomingReminders({
            from: localDateKey(from),
            to: localDateKey(to)
          })
        )
          .filter((reminder) => reminder.triggerAt >= now)
          .slice(0, 6)
      )
    } catch (reason: unknown) {
      console.error('Failed to load calendar reminders for Home', reason)
    }
  }, [])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadReminders(), 0)
    const interval = window.setInterval(() => void loadReminders(), 60_000)
    const handleFocus = (): void => void loadReminders()
    window.addEventListener('focus', handleFocus)
    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [loadReminders])

  return (
    <StandardModulePage>
      <div className="flex flex-col gap-5">
        <ModuleHeader
          icon={House}
          title="Главная"
          description="Все ключевые разделы MyMind в единой рабочей области."
        />

        {reminders.length > 0 && (
          <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-semibold text-[var(--app-text)]">
                <Bell className="size-4 text-violet-300" /> Ближайшие напоминания
              </div>
              <button
                type="button"
                className="text-xs text-[var(--app-muted)] hover:text-[var(--app-text)]"
                onClick={() => requestAppModuleNavigation({ view: 'calendar' })}
              >
                Открыть календарь
              </button>
            </div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {reminders.map((reminder) => (
                <button
                  key={`${reminder.reminderId}:${reminder.occurrenceDate}`}
                  type="button"
                  className="rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] px-3 py-2.5 text-left hover:bg-[var(--app-card-hover)]"
                  onClick={() => requestAppModuleNavigation({ view: 'calendar' })}
                >
                  <div className="truncate text-sm font-medium text-[var(--app-text)]">
                    {reminder.title}
                  </div>
                  <div className="mt-1 text-xs text-[var(--app-muted)]">
                    {reminderTimeLabel(reminder)}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

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
