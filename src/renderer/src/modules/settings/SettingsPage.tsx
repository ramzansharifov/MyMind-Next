import {
  ArrowRight,
  BookOpen,
  CircleCheck,
  Database,
  LoaderCircle,
  Palette,
  Settings,
  Sparkles,
  TriangleAlert,
  type LucideIcon
} from 'lucide-react'
import { useState, type ReactNode } from 'react'

import type { SystemHealth } from '../../../../shared/contracts/system'
import { useAppearance } from '../../app/appearance/appearance-context'
import { APP_ACCENT_OPTIONS, APP_THEME_OPTIONS } from '../../app/appearance/appearance-options'
import { cn } from '../../shared/lib/cn'
import { AppearanceSettingsSection } from './AppearanceSettingsSection'
import { SettingsBreadcrumbs, type SettingsBreadcrumbItem } from './SettingsBreadcrumbs'
import {
  BoardsInstructionArticlePage,
  BoardsInstructionsPage,
  InstructionsOverviewPage,
  LearningInstructionArticlePage,
  LearningInstructionsPage
} from './instructions/LearningInstructions'
import {
  boardsInstructionArticles,
  getBoardsInstructionArticle,
  type BoardsInstructionTopicId
} from './instructions/boards-instruction-catalog'
import {
  getLearningInstructionArticle,
  learningInstructionArticles,
  type LearningInstructionTopicId
} from './instructions/learning-instruction-catalog'

interface SettingsPageProps {
  health: SystemHealth | null
  error: string | null
  isLoading: boolean
}

type SettingsRoute =
  | { page: 'overview' }
  | { page: 'appearance' }
  | { page: 'instructions' }
  | { page: 'learning' }
  | { page: 'learning-topic'; topicId: LearningInstructionTopicId }
  | { page: 'boards' }
  | { page: 'boards-topic'; topicId: BoardsInstructionTopicId }

export function SettingsPage({ health, error, isLoading }: SettingsPageProps): React.JSX.Element {
  const [route, setRoute] = useState<SettingsRoute>({ page: 'overview' })
  const breadcrumbItems = getSettingsBreadcrumbItems(route, setRoute)

  let content: React.JSX.Element

  if (route.page === 'appearance') {
    content = <AppearanceSettingsPage />
  } else if (route.page === 'instructions') {
    content = (
      <InstructionsOverviewPage
        onBack={() => setRoute({ page: 'overview' })}
        onOpenLearning={() => setRoute({ page: 'learning' })}
        onOpenBoards={() => setRoute({ page: 'boards' })}
      />
    )
  } else if (route.page === 'learning') {
    content = (
      <LearningInstructionsPage
        onBack={() => setRoute({ page: 'instructions' })}
        onOpenTopic={(topicId) => setRoute({ page: 'learning-topic', topicId })}
      />
    )
  } else if (route.page === 'learning-topic') {
    content = (
      <LearningInstructionArticlePage
        topicId={route.topicId}
        onBack={() => setRoute({ page: 'learning' })}
      />
    )
  } else if (route.page === 'boards') {
    content = (
      <BoardsInstructionsPage
        onBack={() => setRoute({ page: 'instructions' })}
        onOpenTopic={(topicId) => setRoute({ page: 'boards-topic', topicId })}
      />
    )
  } else if (route.page === 'boards-topic') {
    content = (
      <BoardsInstructionArticlePage
        topicId={route.topicId}
        onBack={() => setRoute({ page: 'boards' })}
      />
    )
  } else {
    content = (
      <SettingsOverview
        health={health}
        error={error}
        isLoading={isLoading}
        onOpenAppearance={() => setRoute({ page: 'appearance' })}
        onOpenInstructions={() => setRoute({ page: 'instructions' })}
      />
    )
  }

  const hidesLegacyBackButton =
    route.page === 'instructions' ||
    route.page === 'learning' ||
    route.page === 'learning-topic' ||
    route.page === 'boards' ||
    route.page === 'boards-topic'

  return (
    <section className="h-full overflow-y-auto bg-[var(--app-workspace)] px-8 py-7 max-[720px]:px-4 max-[720px]:py-5">
      <div className="mx-auto w-full max-w-[1240px]">
        {breadcrumbItems.length > 0 && <SettingsBreadcrumbs items={breadcrumbItems} />}
        <div className={cn(hidesLegacyBackButton && '[&>div>header>button]:hidden')}>{content}</div>
      </div>
    </section>
  )
}

function getSettingsBreadcrumbItems(
  route: SettingsRoute,
  navigate: (route: SettingsRoute) => void
): SettingsBreadcrumbItem[] {
  if (route.page === 'overview') {
    return []
  }

  const items: SettingsBreadcrumbItem[] = [
    {
      label: 'Настройки',
      onClick: () => navigate({ page: 'overview' })
    }
  ]

  if (route.page === 'appearance') {
    items.push({ label: 'Внешний вид' })
    return items
  }

  if (route.page === 'instructions') {
    items.push({ label: 'Инструкции' })
    return items
  }

  items.push({
    label: 'Инструкции',
    onClick: () => navigate({ page: 'instructions' })
  })

  if (route.page === 'learning') {
    items.push({ label: 'Обучение' })
    return items
  }

  if (route.page === 'learning-topic') {
    items.push({
      label: 'Обучение',
      onClick: () => navigate({ page: 'learning' })
    })
    items.push({
      label: getLearningInstructionArticle(route.topicId)?.title ?? 'Инструкция'
    })
    return items
  }

  if (route.page === 'boards') {
    items.push({ label: 'Доски' })
    return items
  }

  items.push({
    label: 'Доски',
    onClick: () => navigate({ page: 'boards' })
  })
  items.push({
    label: getBoardsInstructionArticle(route.topicId)?.title ?? 'Инструкция'
  })

  return items
}

function SettingsOverview({
  health,
  error,
  isLoading,
  onOpenAppearance,
  onOpenInstructions
}: SettingsPageProps & {
  onOpenAppearance: () => void
  onOpenInstructions: () => void
}): React.JSX.Element {
  const { preferences } = useAppearance()
  const theme = APP_THEME_OPTIONS.find((option) => option.value === preferences.theme)
  const accent = APP_ACCENT_OPTIONS.find((option) => option.value === preferences.accent)

  return (
    <div className="space-y-5">
      <SettingsHero />

      <div className="grid grid-cols-2 items-stretch gap-5 max-[980px]:grid-cols-1">
        <SettingsNavigationCard
          eyebrow="Персонализация"
          title="Внешний вид"
          description="Выберите тему приложения и цвет, который будет использоваться для активных элементов интерфейса."
          icon={Palette}
          onClick={onOpenAppearance}
        >
          <SettingsValueBadge>{theme?.label ?? preferences.theme}</SettingsValueBadge>
          <SettingsValueBadge>
            <span
              aria-hidden="true"
              className="size-2.5 rounded-full"
              style={{ backgroundColor: accent?.preview }}
            />
            {accent?.label ?? preferences.accent}
          </SettingsValueBadge>
        </SettingsNavigationCard>

        <SettingsNavigationCard
          eyebrow="Справка"
          title="Инструкции"
          description="Полные руководства по модулям «Обучение» и «Доски», рабочим страницам, блокам, связям и правилам удаления."
          icon={BookOpen}
          onClick={onOpenInstructions}
        >
          <SettingsValueBadge>Обучение и Доски</SettingsValueBadge>
          <SettingsValueBadge>
            {learningInstructionArticles.length + boardsInstructionArticles.length} инструкций
          </SettingsValueBadge>
          <SettingsValueBadge>Поиск по справке</SettingsValueBadge>
        </SettingsNavigationCard>
      </div>

      <DatabaseStatusCard health={health} error={error} isLoading={isLoading} />
    </div>
  )
}

function SettingsNavigationCard({
  eyebrow,
  title,
  description,
  icon: Icon,
  children,
  onClick
}: {
  eyebrow: string
  title: string
  description: string
  icon: LucideIcon
  children: ReactNode
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={cn(
        'group relative isolate min-h-56 overflow-hidden rounded-2xl border p-5 text-left outline-none',
        'border-[var(--app-border)] bg-[var(--app-surface)]',
        'shadow-[0_12px_40px_rgb(0_0_0/0.1)]',
        'transition-[border-color,transform,box-shadow]',
        'hover:-translate-y-px hover:border-violet-500/35 hover:shadow-xl hover:shadow-black/10',
        'focus-visible:ring-2 focus-visible:ring-violet-500/40'
      )}
      onClick={onClick}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-20 -z-10 size-64 rounded-full bg-violet-500/12 blur-3xl"
      />

      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/12 text-violet-300 shadow-inner shadow-violet-500/5">
            <Icon aria-hidden="true" className="size-5" />
          </div>

          <ArrowRight
            aria-hidden="true"
            className="size-5 -translate-x-1 text-[var(--app-muted)] transition-[color,transform] group-hover:translate-x-0 group-hover:text-violet-300"
          />
        </div>

        <div className="mt-8">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-violet-300 uppercase">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--app-text)]">
            {title}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--app-muted)]">{description}</p>
        </div>

        <div className="mt-auto flex flex-wrap gap-2 pt-5">{children}</div>
      </div>
    </button>
  )
}

function SettingsHero(): React.JSX.Element {
  return (
    <header className="relative isolate overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-[0_20px_70px_rgb(0_0_0/0.16)] max-[720px]:p-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 right-8 -z-10 size-80 rounded-full bg-violet-500/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-44 -left-24 -z-10 size-80 rounded-full bg-violet-900/10 blur-3xl"
      />

      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/12 text-violet-300 shadow-inner shadow-violet-500/5">
          <Settings aria-hidden="true" className="size-6" />
        </div>

        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-violet-300 uppercase">
            Система
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em] text-[var(--app-text)]">
            Настройки
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--app-muted)]">
            Настройте MyMind под себя, изучите возможности приложения и проверьте состояние
            локальных компонентов.
          </p>
        </div>
      </div>
    </header>
  )
}

function AppearanceSettingsPage(): React.JSX.Element {
  return (
    <div className="space-y-5">
      <header className="relative isolate overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-[0_20px_70px_rgb(0_0_0/0.16)] max-[720px]:p-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-28 right-8 -z-10 size-72 rounded-full bg-violet-500/12 blur-3xl"
        />

        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/12 text-violet-300 shadow-inner shadow-violet-500/5">
            <Sparkles aria-hidden="true" className="size-6" />
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-violet-300 uppercase">
              Персонализация
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em] text-[var(--app-text)]">
              Внешний вид
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--app-muted)]">
              Тема и акцент применяются сразу ко всему приложению и сохраняются между запусками.
            </p>
          </div>
        </div>
      </header>

      <AppearanceSettingsSection />
    </div>
  )
}

function SettingsValueBadge({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <span className="flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 py-1.5 text-[11px] font-medium text-[var(--app-muted)]">
      {children}
    </span>
  )
}

function DatabaseStatusCard({
  health,
  error,
  isLoading
}: Pick<SettingsPageProps, 'health' | 'error' | 'isLoading'>): React.JSX.Element {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[0_12px_40px_rgb(0_0_0/0.1)]">
      <header className="flex min-h-20 items-center gap-3 border-b border-[var(--app-border)] px-5 py-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/15 bg-violet-500/10 text-violet-300">
          <Database aria-hidden="true" className="size-5" />
        </div>

        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-[var(--app-text)]">
            Локальные данные
          </h2>
          <p className="mt-0.5 text-xs text-[var(--app-muted)]">SQLite и системный IPC</p>
        </div>
      </header>

      <div className="p-5">
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
            <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-emerald-300">База данных готова</p>
              <p className="mt-1 text-sm text-[var(--app-muted)]">SQLite {health.sqliteVersion}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
