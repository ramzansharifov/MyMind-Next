import { ArrowRight, BookOpen, Palette, Settings, Sparkles, TriangleAlert, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import type { SystemHealth } from '../../../../shared/contracts/system'
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
  onOpenInstructions
}: {
  error: string | null
  onOpenAppearance: () => void
  onOpenInstructions: () => void
}): React.JSX.Element {
  const { preferences } = useAppearance()
  const theme = APP_THEME_OPTIONS.find((option) => option.value === preferences.theme)
  const accent = APP_ACCENT_OPTIONS.find((option) => option.value === preferences.accent)
  const instructionsCount = learningInstructionArticles.length + boardsInstructionArticles.length

  return (
    <div className="space-y-5">
      <SettingsHero />

      <div className="grid grid-cols-2 items-stretch gap-5 max-[980px]:grid-cols-1">
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

        <h2 className="mt-6 text-xl font-semibold tracking-tight text-[var(--app-text)]">{title}</h2>
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
