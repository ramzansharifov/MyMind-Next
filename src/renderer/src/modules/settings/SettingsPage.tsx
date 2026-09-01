import {
  ArrowRight,
  BookOpen,
  Bot,
  Palette,
  Settings,
  Sparkles,
  TriangleAlert,
  type LucideIcon
} from 'lucide-react'
import { useState, type ReactNode } from 'react'

import type { SystemHealth } from '../../../../shared/contracts/system'
import { useAiChatPreferences } from '../../app/ai-chat/ai-chat-preferences-context'
import { useAppearance } from '../../app/appearance/appearance-context'
import { APP_ACCENT_OPTIONS, APP_THEME_OPTIONS } from '../../app/appearance/appearance-options'
import { cn } from '../../shared/lib/cn'
import { ModuleHeader } from '../../shared/ui/ModuleHeader'
import { StandardModulePage } from '../../shared/ui/StandardModulePage'
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
  | { page: 'ai-chat' }
  | { page: 'instructions' }
  | { page: 'learning' }
  | { page: 'learning-topic'; topicId: LearningInstructionTopicId }
  | { page: 'boards' }
  | { page: 'boards-topic'; topicId: BoardsInstructionTopicId }

export function SettingsPage({ error }: SettingsPageProps): React.JSX.Element {
  const [route, setRoute] = useState<SettingsRoute>({ page: 'overview' })
  const breadcrumbItems = getSettingsBreadcrumbItems(route, setRoute)

  let content: React.JSX.Element

  if (route.page === 'appearance') {
    content = <AppearanceSettingsPage />
  } else if (route.page === 'ai-chat') {
    content = <AiChatSettingsPage />
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
        error={error}
        onOpenAppearance={() => setRoute({ page: 'appearance' })}
        onOpenAiChat={() => setRoute({ page: 'ai-chat' })}
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
    <StandardModulePage>
      {breadcrumbItems.length > 0 && <SettingsBreadcrumbs items={breadcrumbItems} />}
      <div className={cn(hidesLegacyBackButton && '[&>div>header>button]:hidden')}>{content}</div>
    </StandardModulePage>
  )
}

function getSettingsBreadcrumbItems(
  route: SettingsRoute,
  navigate: (route: SettingsRoute) => void
): SettingsBreadcrumbItem[] {
  if (route.page === 'overview') return []

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

  if (route.page === 'ai-chat') {
    items.push({ label: 'ИИ-чат' })
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
  error,
  onOpenAppearance,
  onOpenAiChat,
  onOpenInstructions
}: {
  error: string | null
  onOpenAppearance: () => void
  onOpenAiChat: () => void
  onOpenInstructions: () => void
}): React.JSX.Element {
  const { preferences } = useAppearance()
  const { showLauncher } = useAiChatPreferences()
  const theme = APP_THEME_OPTIONS.find((option) => option.value === preferences.theme)
  const accent = APP_ACCENT_OPTIONS.find((option) => option.value === preferences.accent)
  const instructionsCount = learningInstructionArticles.length + boardsInstructionArticles.length

  return (
    <div className="space-y-5">
      <SettingsHero />

      <div className="grid grid-cols-3 items-stretch gap-5 max-[1180px]:grid-cols-2 max-[760px]:grid-cols-1">
        <SettingsNavigationCard title="Внешний вид" icon={Palette} onClick={onOpenAppearance}>
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

        <SettingsNavigationCard title="ИИ-чат" icon={Bot} onClick={onOpenAiChat}>
          <SettingsValueBadge>{showLauncher ? 'Кнопка видна' : 'Кнопка скрыта'}</SettingsValueBadge>
          <SettingsValueBadge>Ctrl + M</SettingsValueBadge>
        </SettingsNavigationCard>

        <SettingsNavigationCard title="Инструкции" icon={BookOpen} onClick={onOpenInstructions}>
          <SettingsValueBadge>{instructionsCount} инструкций</SettingsValueBadge>
        </SettingsNavigationCard>
      </div>

      {error && <SettingsErrorNotice error={error} />}
    </div>
  )
}

function SettingsNavigationCard({
  title,
  icon: Icon,
  children,
  onClick
}: {
  title: string
  icon: LucideIcon
  children: ReactNode
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={cn(
        'group relative isolate min-h-44 overflow-hidden rounded-2xl border p-5 text-left outline-none',
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

        <h2 className="mt-6 text-xl font-semibold tracking-tight text-[var(--app-text)]">
          {title}
        </h2>
        <div className="mt-auto flex flex-wrap gap-2 pt-5">{children}</div>
      </div>
    </button>
  )
}

function SettingsHero(): React.JSX.Element {
  return <ModuleHeader icon={Settings} title="Настройки" />
}

function AppearanceSettingsPage(): React.JSX.Element {
  return (
    <div className="space-y-5">
      <ModuleHeader icon={Sparkles} title="Внешний вид" />
      <AppearanceSettingsSection />
    </div>
  )
}

function AiChatSettingsPage(): React.JSX.Element {
  const { showLauncher, setShowLauncher } = useAiChatPreferences()

  return (
    <div className="space-y-5">
      <ModuleHeader icon={Bot} title="ИИ-чат" />

      <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[0_12px_40px_rgb(0_0_0/0.1)]">
        <header className="flex min-h-16 items-center gap-3 border-b border-[var(--app-border)] px-5 py-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/15 bg-violet-500/10 text-violet-300">
            <Bot aria-hidden="true" className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--app-text)]">Отображение ИИ-чата</h2>
            <p className="mt-0.5 text-xs leading-5 text-[var(--app-muted)]">
              Настройте, будет ли кнопка чата постоянно видна поверх приложения.
            </p>
          </div>
        </header>

        <div className="grid gap-4 p-5">
          <div className="flex items-center justify-between gap-6 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4 max-[640px]:items-start">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--app-text)]">
                Показывать кнопку ИИ-чата
              </p>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--app-muted)]">
                Если выключить эту опцию, плавающая кнопка исчезнет. Сам чат останется доступен по
                сочетанию клавиш.
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-label="Показывать кнопку ИИ-чата"
              aria-checked={showLauncher}
              className={cn(
                'relative h-7 w-12 shrink-0 rounded-full border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-violet-500/45',
                showLauncher
                  ? 'border-[color-mix(in_srgb,var(--app-accent-500)_55%,transparent)] bg-[var(--app-accent-500)]'
                  : 'border-[var(--app-border-strong)] bg-[var(--app-control-hover)]'
              )}
              onClick={() => setShowLauncher(!showLauncher)}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform',
                  showLauncher ? 'translate-x-[1.35rem]' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 py-3 text-xs text-[var(--app-muted)]">
            <span className="mr-1 font-medium text-[var(--app-text)]">Быстрое открытие</span>
            <kbd className="rounded-md border border-[var(--app-border-strong)] bg-[var(--app-surface)] px-2 py-1 font-mono text-[11px] text-[var(--app-text)]">
              Ctrl
            </kbd>
            <span>+</span>
            <kbd className="rounded-md border border-[var(--app-border-strong)] bg-[var(--app-surface)] px-2 py-1 font-mono text-[11px] text-[var(--app-text)]">
              M
            </kbd>
            <span className="ml-1">открывает ИИ-чат даже при скрытой кнопке.</span>
          </div>
        </div>
      </section>
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

function SettingsErrorNotice({ error }: { error: string }): React.JSX.Element {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300"
    >
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{error}</span>
    </div>
  )
}
