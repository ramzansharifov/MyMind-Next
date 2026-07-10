import { BookOpenCheck, GraduationCap } from 'lucide-react'

export function StudyPage(): React.JSX.Element {
  return (
    <section className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-7xl px-8 py-8 lg:px-10 lg:py-10">
        <header>
          <div className="flex items-center gap-2 text-sm font-medium text-violet-300">
            <GraduationCap aria-hidden="true" className="size-4" />

            <span>Модуль</span>
          </div>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--app-text)]">
            Обучение
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--app-muted)]">
            Рабочее пространство для учебных материалов, предметов, заметок и прогресса.
          </p>
        </header>

        <div className="mt-8 flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface)] p-8">
          <div className="max-w-md text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] text-violet-300">
              <BookOpenCheck aria-hidden="true" className="size-6" />
            </div>

            <h2 className="mt-5 text-lg font-semibold text-[var(--app-text)]">Модуль пока пуст</h2>

            <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
              Здесь мы позже создадим структуру курсов, учебные материалы, редактор конспектов и
              отслеживание прогресса.
            </p>

            <span className="mt-5 inline-flex rounded-full border border-[var(--app-border)] bg-[var(--app-surface-raised)] px-3 py-1 text-xs font-medium text-[var(--app-muted)]">
              Заглушка
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
