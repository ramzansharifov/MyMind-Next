import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Keyboard,
  Lightbulb,
  ListChecks,
  Search,
  X
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'

import { cn } from '../../../shared/lib/cn'
import {
  basicLearningInstructionArticles,
  blockLearningInstructionArticles,
  getLearningInstructionArticle,
  learningInstructionArticles,
  learningInstructionModuleIcon,
  type LearningInstructionArticle,
  type LearningInstructionSection,
  type LearningInstructionTopicId
} from './learning-instruction-catalog'

interface InstructionsOverviewPageProps {
  onBack: () => void
  onOpenLearning: () => void
}

interface LearningInstructionsPageProps {
  onBack: () => void
  onOpenTopic: (topicId: LearningInstructionTopicId) => void
}

interface LearningInstructionArticlePageProps {
  topicId: LearningInstructionTopicId
  onBack: () => void
}

export function InstructionsOverviewPage({
  onBack,
  onOpenLearning
}: InstructionsOverviewPageProps): React.JSX.Element {
  const LearningIcon = learningInstructionModuleIcon

  return (
    <div className="space-y-5">
      <InstructionHero
        eyebrow="Справка"
        title="Инструкции"
        description="Подробные руководства по разделам MyMind, возможностям интерфейса и горячим клавишам."
        icon={BookOpen}
        backLabel="Все настройки"
        onBack={onBack}
      />

      <button
        type="button"
        className={cn(
          'group relative isolate w-full overflow-hidden rounded-2xl border p-5 text-left outline-none',
          'border-[var(--app-border)] bg-[var(--app-surface)]',
          'shadow-[0_12px_40px_rgb(0_0_0/0.1)]',
          'transition-[border-color,transform,box-shadow]',
          'hover:-translate-y-px hover:border-violet-500/35 hover:shadow-xl hover:shadow-black/10',
          'focus-visible:ring-2 focus-visible:ring-violet-500/40'
        )}
        onClick={onOpenLearning}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-28 right-4 -z-10 size-72 rounded-full bg-violet-500/12 blur-3xl"
        />

        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/12 text-violet-300 shadow-inner shadow-violet-500/5">
            <LearningIcon aria-hidden="true" className="size-6" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-violet-300 uppercase">
              Модуль приложения
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--app-text)]">
              Обучение
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--app-muted)]">
              Навигация по библиотеке, главная страница, папки, материалы и отдельное руководство
              для каждого типа блока.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <InstructionBadge>{basicLearningInstructionArticles.length} разделов интерфейса</InstructionBadge>
              <InstructionBadge>{blockLearningInstructionArticles.length} типов блоков</InstructionBadge>
              <InstructionBadge>Горячие клавиши</InstructionBadge>
            </div>
          </div>

          <ArrowRight
            aria-hidden="true"
            className="mt-1 size-5 shrink-0 -translate-x-1 text-[var(--app-muted)] transition-[color,transform] group-hover:translate-x-0 group-hover:text-violet-300"
          />
        </div>
      </button>
    </div>
  )
}

export function LearningInstructionsPage({
  onBack,
  onOpenTopic
}: LearningInstructionsPageProps): React.JSX.Element {
  const [search, setSearch] = useState('')
  const normalizedSearch = search.trim().toLocaleLowerCase('ru-RU')

  const filteredArticles = useMemo(() => {
    if (!normalizedSearch) {
      return learningInstructionArticles
    }

    return learningInstructionArticles.filter((article) =>
      [article.title, article.summary, article.intro, ...article.sections.map((section) => section.title)]
        .join(' ')
        .toLocaleLowerCase('ru-RU')
        .includes(normalizedSearch)
    )
  }, [normalizedSearch])

  const filteredBasics = filteredArticles.filter((article) => article.category === 'basics')
  const filteredBlocks = filteredArticles.filter((article) => article.category === 'blocks')

  return (
    <div className="space-y-5">
      <InstructionHero
        eyebrow="Инструкции"
        title="Обучение"
        description="Выберите раздел интерфейса или тип блока, чтобы открыть полное руководство."
        icon={BookOpen}
        backLabel="Все инструкции"
        onBack={onBack}
      />

      <label className="flex h-12 w-full min-w-0 items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 shadow-inner shadow-black/10 transition-colors focus-within:border-violet-500/45 focus-within:ring-2 focus-within:ring-violet-500/10">
        <Search aria-hidden="true" className="size-4 shrink-0 text-[var(--app-muted)]" />
        <input
          value={search}
          aria-label="Поиск по инструкциям обучения"
          placeholder="Найти инструкцию или возможность"
          className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/65"
          onChange={(event) => setSearch(event.target.value)}
        />
        {search && (
          <button
            type="button"
            aria-label="Очистить поиск инструкций"
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[var(--app-muted)] outline-none transition-colors hover:bg-white/[0.06] hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-violet-500/35"
            onClick={() => setSearch('')}
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        )}
      </label>

      {filteredArticles.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] px-6 py-12 text-center">
          <Search aria-hidden="true" className="mx-auto size-6 text-[var(--app-muted)]" />
          <h2 className="mt-3 font-semibold text-[var(--app-text)]">Ничего не найдено</h2>
          <p className="mt-1 text-sm text-[var(--app-muted)]">
            Измените запрос или очистите строку поиска.
          </p>
        </section>
      ) : (
        <>
          {filteredBasics.length > 0 && (
            <InstructionTopicGroup
              title="Основы модуля"
              description="Навигация, структура библиотеки и работа со страницами."
              articles={filteredBasics}
              onOpenTopic={onOpenTopic}
            />
          )}

          {filteredBlocks.length > 0 && (
            <InstructionTopicGroup
              title="Блоки материалов"
              description="Отдельное руководство для каждого доступного типа блока."
              articles={filteredBlocks}
              onOpenTopic={onOpenTopic}
            />
          )}
        </>
      )}
    </div>
  )
}

export function LearningInstructionArticlePage({
  topicId,
  onBack
}: LearningInstructionArticlePageProps): React.JSX.Element {
  const article = getLearningInstructionArticle(topicId)

  if (!article) {
    return (
      <div className="space-y-5">
        <InstructionHero
          eyebrow="Инструкции"
          title="Инструкция не найдена"
          description="Раздел мог быть удалён или переименован."
          icon={BookOpen}
          backLabel="К списку обучения"
          onBack={onBack}
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <InstructionHero
        eyebrow={article.category === 'blocks' ? 'Блок материала' : 'Основы обучения'}
        title={article.title}
        description={article.summary}
        icon={article.icon}
        backLabel="К списку обучения"
        onBack={onBack}
      />

      <div className="grid grid-cols-[minmax(0,1fr)_300px] items-start gap-5 max-[980px]:grid-cols-1">
        <article className="min-w-0 space-y-4">
          <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[0_12px_40px_rgb(0_0_0/0.08)]">
            <p className="text-sm leading-7 text-[var(--app-text)]">{article.intro}</p>
          </section>

          {article.sections.map((section) => (
            <InstructionArticleSection key={section.title} section={section} />
          ))}
        </article>

        <aside className="sticky top-0 grid gap-4 max-[980px]:static">
          <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[0_12px_40px_rgb(0_0_0/0.08)]">
            <header className="flex items-center gap-3 border-b border-[var(--app-border)] px-4 py-3.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-violet-500/15 bg-violet-500/10 text-violet-300">
                <ListChecks aria-hidden="true" className="size-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[var(--app-text)]">В этой инструкции</h2>
                <p className="mt-0.5 text-[11px] text-[var(--app-muted)]">
                  {article.sections.length} разделов
                </p>
              </div>
            </header>

            <ol className="grid gap-1 p-3">
              {article.sections.map((section, index) => (
                <li
                  key={section.title}
                  className="flex items-start gap-2 rounded-lg px-2 py-2 text-xs leading-5 text-[var(--app-muted)]"
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-[10px] font-semibold text-violet-300 tabular-nums">
                    {index + 1}
                  </span>
                  <span>{section.title}</span>
                </li>
              ))}
            </ol>
          </section>

          <InstructionShortcuts article={article} />
        </aside>
      </div>
    </div>
  )
}

function InstructionTopicGroup({
  title,
  description,
  articles,
  onOpenTopic
}: {
  title: string
  description: string
  articles: LearningInstructionArticle[]
  onOpenTopic: (topicId: LearningInstructionTopicId) => void
}): React.JSX.Element {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[0_12px_40px_rgb(0_0_0/0.08)]">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--app-border)] px-5 py-4 max-[640px]:items-start">
        <div>
          <h2 className="text-base font-semibold text-[var(--app-text)]">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">{description}</p>
        </div>
        <InstructionBadge>{articles.length}</InstructionBadge>
      </header>

      <div className="grid grid-cols-2 gap-3 p-4 max-[760px]:grid-cols-1">
        {articles.map((article) => (
          <InstructionTopicCard key={article.id} article={article} onOpen={onOpenTopic} />
        ))}
      </div>
    </section>
  )
}

function InstructionTopicCard({
  article,
  onOpen
}: {
  article: LearningInstructionArticle
  onOpen: (topicId: LearningInstructionTopicId) => void
}): React.JSX.Element {
  const Icon = article.icon

  return (
    <button
      type="button"
      className={cn(
        'group flex min-h-32 w-full min-w-0 items-start gap-3 rounded-xl border p-4 text-left outline-none',
        'border-[var(--app-border)] bg-[var(--app-workspace)]',
        'transition-[border-color,background-color,transform,box-shadow]',
        'hover:-translate-y-px hover:border-violet-500/30 hover:bg-[var(--app-surface-raised)]',
        'hover:shadow-lg hover:shadow-black/10 focus-visible:ring-2 focus-visible:ring-violet-500/35'
      )}
      onClick={() => onOpen(article.id)}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/15 bg-violet-500/10 text-violet-300">
        <Icon aria-hidden="true" className="size-5" />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-[var(--app-text)]">{article.title}</h3>
        <p className="mt-1.5 text-xs leading-5 text-[var(--app-muted)]">{article.summary}</p>
      </div>

      <ArrowRight
        aria-hidden="true"
        className="mt-1 size-4 shrink-0 -translate-x-1 text-[var(--app-muted)] transition-[color,transform] group-hover:translate-x-0 group-hover:text-violet-300"
      />
    </button>
  )
}

function InstructionArticleSection({
  section
}: {
  section: LearningInstructionSection
}): React.JSX.Element {
  return (
    <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[0_12px_40px_rgb(0_0_0/0.08)]">
      <h2 className="text-lg font-semibold tracking-tight text-[var(--app-text)]">{section.title}</h2>

      {section.paragraphs?.map((paragraph) => (
        <p key={paragraph} className="mt-3 text-sm leading-7 text-[var(--app-muted)]">
          {paragraph}
        </p>
      ))}

      {section.steps && (
        <ol className="mt-4 grid gap-3">
          {section.steps.map((step, index) => (
            <li key={step} className="flex items-start gap-3 text-sm leading-6 text-[var(--app-muted)]">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-violet-500/20 bg-violet-500/10 text-[11px] font-semibold text-violet-300 tabular-nums">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      )}

      {section.bullets && (
        <ul className="mt-4 grid gap-2.5">
          {section.bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-3 text-sm leading-6 text-[var(--app-muted)]">
              <span
                aria-hidden="true"
                className="mt-2 size-1.5 shrink-0 rounded-full bg-violet-400"
              />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}

      {section.note && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-violet-500/15 bg-violet-500/[0.07] p-3.5">
          <Lightbulb aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-violet-300" />
          <p className="text-xs leading-6 text-[var(--app-muted)]">{section.note}</p>
        </div>
      )}
    </section>
  )
}

function InstructionShortcuts({
  article
}: {
  article: LearningInstructionArticle
}): React.JSX.Element {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[0_12px_40px_rgb(0_0_0/0.08)]">
      <header className="flex items-center gap-3 border-b border-[var(--app-border)] px-4 py-3.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-violet-500/15 bg-violet-500/10 text-violet-300">
          <Keyboard aria-hidden="true" className="size-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[var(--app-text)]">Горячие клавиши</h2>
          <p className="mt-0.5 text-[11px] text-[var(--app-muted)]">
            {article.shortcuts.length > 0 ? `${article.shortcuts.length} сочетаний` : 'Не назначены'}
          </p>
        </div>
      </header>

      {article.shortcuts.length > 0 ? (
        <div className="grid gap-3 p-4">
          {article.shortcuts.map((shortcut) => (
            <div key={`${shortcut.keys.join('-')}-${shortcut.description}`} className="grid gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {shortcut.keys.map((key, index) => (
                  <span key={`${key}-${index}`} className="contents">
                    {index > 0 && (
                      <span aria-hidden="true" className="text-[10px] text-[var(--app-muted)]/70">
                        +
                      </span>
                    )}
                    <kbd className="rounded-md border border-[var(--app-border-strong)] bg-[var(--app-workspace)] px-2 py-1 text-[10px] font-semibold text-[var(--app-text)] shadow-sm shadow-black/15">
                      {key}
                    </kbd>
                  </span>
                ))}
              </div>
              <p className="text-xs leading-5 text-[var(--app-muted)]">{shortcut.description}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="p-4 text-xs leading-5 text-[var(--app-muted)]">
          Для этого раздела специальных сочетаний пока нет. Все действия доступны через кнопки
          интерфейса.
        </p>
      )}
    </section>
  )
}

function InstructionHero({
  eyebrow,
  title,
  description,
  icon: Icon,
  backLabel,
  onBack
}: {
  eyebrow: string
  title: string
  description: string
  icon: typeof BookOpen
  backLabel: string
  onBack: () => void
}): React.JSX.Element {
  return (
    <header className="relative isolate overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-[0_20px_70px_rgb(0_0_0/0.16)] max-[720px]:p-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 right-8 -z-10 size-72 rounded-full bg-violet-500/12 blur-3xl"
      />

      <button
        type="button"
        className="mb-6 flex h-9 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-xs font-medium text-[var(--app-muted)] outline-none transition-colors hover:border-violet-500/30 hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-violet-500/40"
        onClick={onBack}
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {backLabel}
      </button>

      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/12 text-violet-300 shadow-inner shadow-violet-500/5">
          <Icon aria-hidden="true" className="size-6" />
        </div>

        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-violet-300 uppercase">
            {eyebrow}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em] text-[var(--app-text)]">
            {title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--app-muted)]">
            {description}
          </p>
        </div>
      </div>
    </header>
  )
}

function InstructionBadge({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <span className="flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 py-1.5 text-[11px] font-medium text-[var(--app-muted)]">
      {children}
    </span>
  )
}
