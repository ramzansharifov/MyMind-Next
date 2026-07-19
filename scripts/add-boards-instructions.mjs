import { readFileSync, writeFileSync } from 'node:fs'

function read(path) {
  return readFileSync(path, 'utf8')
}

function write(path, content) {
  writeFileSync(path, content, 'utf8')
}

function replaceOnce(path, before, after) {
  const content = read(path)
  if (content.includes(after)) return

  const index = content.indexOf(before)
  if (index < 0) throw new Error(`Pattern not found in ${path}: ${before.slice(0, 180)}`)
  if (content.indexOf(before, index + before.length) >= 0) {
    throw new Error(`Pattern is not unique in ${path}: ${before.slice(0, 180)}`)
  }

  write(path, content.slice(0, index) + after + content.slice(index + before.length))
}

function insertBeforeOnce(path, marker, inserted) {
  const content = read(path)
  if (content.includes(inserted.trim())) return

  const index = content.indexOf(marker)
  if (index < 0) throw new Error(`Marker not found in ${path}: ${marker}`)
  write(path, content.slice(0, index) + inserted + content.slice(index))
}

function replaceRange(path, startMarker, endMarker, replacement) {
  const content = read(path)
  const startIndex = content.indexOf(startMarker)
  if (startIndex < 0) throw new Error(`Start marker not found in ${path}: ${startMarker}`)

  const endIndex = content.indexOf(endMarker, startIndex)
  if (endIndex < 0) throw new Error(`End marker not found in ${path}: ${endMarker}`)

  write(path, content.slice(0, startIndex) + replacement + content.slice(endIndex))
}

const instructionsPath =
  'src/renderer/src/modules/settings/instructions/LearningInstructions.tsx'

replaceOnce(
  instructionsPath,
  `  ListChecks,\n  Search,\n  X\n} from 'lucide-react'`,
  `  ListChecks,\n  Presentation,\n  Search,\n  X,\n  type LucideIcon\n} from 'lucide-react'`
)

replaceOnce(
  instructionsPath,
  `  learningInstructionModuleIcon,\n  type LearningInstructionArticle,\n  type LearningInstructionSection,\n  type LearningInstructionTopicId\n} from './learning-instruction-catalog'`,
  `  learningInstructionModuleIcon,\n  type LearningInstructionSection,\n  type LearningInstructionShortcut,\n  type LearningInstructionTopicId\n} from './learning-instruction-catalog'\nimport {\n  basicBoardsInstructionArticles,\n  boardsInstructionArticles,\n  getBoardsInstructionArticle,\n  integrationBoardsInstructionArticles,\n  type BoardsInstructionTopicId\n} from './boards-instruction-catalog'`
)

replaceOnce(
  instructionsPath,
  `interface InstructionsOverviewPageProps {\n  onBack: () => void\n  onOpenLearning: () => void\n}`,
  `interface InstructionsOverviewPageProps {\n  onBack: () => void\n  onOpenLearning: () => void\n  onOpenBoards: () => void\n}`
)

insertBeforeOnce(
  instructionsPath,
  `interface LearningInstructionArticlePageProps {\n`,
  `interface BoardsInstructionsPageProps {\n  onBack: () => void\n  onOpenTopic: (topicId: BoardsInstructionTopicId) => void\n}\n\ninterface BoardsInstructionArticlePageProps {\n  topicId: BoardsInstructionTopicId\n  onBack: () => void\n}\n\ninterface InstructionArticleBase<TopicId extends string> {\n  id: TopicId\n  title: string\n  summary: string\n  intro: string\n  icon: LucideIcon\n  sections: LearningInstructionSection[]\n  shortcuts: LearningInstructionShortcut[]\n}\n\n`
)

replaceOnce(
  instructionsPath,
  `export function InstructionsOverviewPage({\n  onBack,\n  onOpenLearning\n}: InstructionsOverviewPageProps): React.JSX.Element {\n  const LearningIcon = learningInstructionModuleIcon`,
  `export function InstructionsOverviewPage({\n  onBack,\n  onOpenLearning,\n  onOpenBoards\n}: InstructionsOverviewPageProps): React.JSX.Element {`
)

replaceOnce(
  instructionsPath,
  `      <button\n        type="button"\n        className={cn(\n          'group relative isolate w-full overflow-hidden rounded-2xl border p-5 text-left outline-none',\n          'border-[var(--app-border)] bg-[var(--app-surface)]',\n          'shadow-[0_12px_40px_rgb(0_0_0/0.1)]',\n          'transition-[border-color,transform,box-shadow]',\n          'hover:-translate-y-px hover:border-violet-500/35 hover:shadow-xl hover:shadow-black/10',\n          'focus-visible:ring-2 focus-visible:ring-violet-500/40'\n        )}\n        onClick={onOpenLearning}\n      >\n        <div\n          aria-hidden="true"\n          className="pointer-events-none absolute -top-28 right-4 -z-10 size-72 rounded-full bg-violet-500/12 blur-3xl"\n        />\n\n        <div className="flex items-start gap-4">\n          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/12 text-violet-300 shadow-inner shadow-violet-500/5">\n            <LearningIcon aria-hidden="true" className="size-6" />\n          </div>\n\n          <div className="min-w-0 flex-1">\n            <p className="text-[11px] font-semibold tracking-[0.12em] text-violet-300 uppercase">\n              Модуль приложения\n            </p>\n            <h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--app-text)]">\n              Обучение\n            </h2>\n            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--app-muted)]">\n              Навигация по библиотеке, главная страница, папки, материалы и отдельное руководство\n              для каждого типа блока.\n            </p>\n\n            <div className="mt-5 flex flex-wrap gap-2">\n              <InstructionBadge>\n                {basicLearningInstructionArticles.length} разделов интерфейса\n              </InstructionBadge>\n              <InstructionBadge>\n                {blockLearningInstructionArticles.length} типов блоков\n              </InstructionBadge>\n              <InstructionBadge>Горячие клавиши</InstructionBadge>\n            </div>\n          </div>\n\n          <ArrowRight\n            aria-hidden="true"\n            className="mt-1 size-5 shrink-0 -translate-x-1 text-[var(--app-muted)] transition-[color,transform] group-hover:translate-x-0 group-hover:text-violet-300"\n          />\n        </div>\n      </button>`,
  `      <div className="grid grid-cols-2 items-stretch gap-5 max-[880px]:grid-cols-1">\n        <InstructionModuleCard\n          title="Обучение"\n          description="Навигация по библиотеке, главная страница, папки, материалы и отдельное руководство для каждого типа блока."\n          icon={learningInstructionModuleIcon}\n          onOpen={onOpenLearning}\n        >\n          <InstructionBadge>\n            {basicLearningInstructionArticles.length} разделов интерфейса\n          </InstructionBadge>\n          <InstructionBadge>\n            {blockLearningInstructionArticles.length} типов блоков\n          </InstructionBadge>\n          <InstructionBadge>Горячие клавиши</InstructionBadge>\n        </InstructionModuleCard>\n\n        <InstructionModuleCard\n          title="Доски"\n          description="Рабочее пространство, папки, холст tldraw, связанные учебные доски и правила синхронного удаления."\n          icon={Presentation}\n          onOpen={onOpenBoards}\n        >\n          <InstructionBadge>{basicBoardsInstructionArticles.length} основ</InstructionBadge>\n          <InstructionBadge>\n            {integrationBoardsInstructionArticles.length} раздела интеграции\n          </InstructionBadge>\n          <InstructionBadge>Автосохранение</InstructionBadge>\n        </InstructionModuleCard>\n      </div>`
)

insertBeforeOnce(
  instructionsPath,
  `export function LearningInstructionArticlePage({\n`,
  `export function BoardsInstructionsPage({\n  onBack,\n  onOpenTopic\n}: BoardsInstructionsPageProps): React.JSX.Element {\n  const [search, setSearch] = useState('')\n  const normalizedSearch = search.trim().toLocaleLowerCase('ru-RU')\n\n  const filteredArticles = useMemo(() => {\n    if (!normalizedSearch) return boardsInstructionArticles\n\n    return boardsInstructionArticles.filter((article) =>\n      [\n        article.title,\n        article.summary,\n        article.intro,\n        ...article.sections.map((section) => section.title),\n        ...article.sections.flatMap((section) => [\n          ...(section.paragraphs ?? []),\n          ...(section.steps ?? []),\n          ...(section.bullets ?? []),\n          section.note ?? ''\n        ])\n      ]\n        .join(' ')\n        .toLocaleLowerCase('ru-RU')\n        .includes(normalizedSearch)\n    )\n  }, [normalizedSearch])\n\n  const filteredBasics = filteredArticles.filter((article) => article.category === 'basics')\n  const filteredIntegration = filteredArticles.filter(\n    (article) => article.category === 'integration'\n  )\n\n  return (\n    <div className="space-y-5">\n      <InstructionHero\n        eyebrow="Инструкции"\n        title="Доски"\n        description="Выберите часть рабочего пространства, чтобы открыть подробное руководство."\n        icon={Presentation}\n        backLabel="Все инструкции"\n        onBack={onBack}\n      />\n\n      <label className="flex h-12 w-full min-w-0 items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 shadow-inner shadow-black/10 transition-colors focus-within:border-violet-500/45 focus-within:ring-2 focus-within:ring-violet-500/10">\n        <Search aria-hidden="true" className="size-4 shrink-0 text-[var(--app-muted)]" />\n        <input\n          value={search}\n          aria-label="Поиск по инструкциям досок"\n          placeholder="Найти действие, страницу или правило"\n          className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/65"\n          onChange={(event) => setSearch(event.target.value)}\n        />\n        {search && (\n          <button\n            type="button"\n            aria-label="Очистить поиск инструкций досок"\n            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[var(--app-muted)] transition-colors outline-none hover:bg-white/[0.06] hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-violet-500/35"\n            onClick={() => setSearch('')}\n          >\n            <X aria-hidden="true" className="size-4" />\n          </button>\n        )}\n      </label>\n\n      {filteredArticles.length === 0 ? (\n        <section className="rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] px-6 py-12 text-center">\n          <Search aria-hidden="true" className="mx-auto size-6 text-[var(--app-muted)]" />\n          <h2 className="mt-3 font-semibold text-[var(--app-text)]">Ничего не найдено</h2>\n          <p className="mt-1 text-sm text-[var(--app-muted)]">\n            Измените запрос или очистите строку поиска.\n          </p>\n        </section>\n      ) : (\n        <>\n          {filteredBasics.length > 0 && (\n            <InstructionTopicGroup\n              title="Рабочее пространство"\n              description="Навигация, страницы, папки, холст и автоматическое сохранение."\n              articles={filteredBasics}\n              onOpenTopic={onOpenTopic}\n            />\n          )}\n\n          {filteredIntegration.length > 0 && (\n            <InstructionTopicGroup\n              title="Связь с обучением"\n              description="Создание связанных досок, защищённые папки и двустороннее удаление."\n              articles={filteredIntegration}\n              onOpenTopic={onOpenTopic}\n            />\n          )}\n        </>\n      )}\n    </div>\n  )\n}\n\n`
)

replaceRange(
  instructionsPath,
  `export function LearningInstructionArticlePage({`,
  `function InstructionTopicGroup({`,
  `export function LearningInstructionArticlePage({\n  topicId,\n  onBack\n}: LearningInstructionArticlePageProps): React.JSX.Element {\n  const article = getLearningInstructionArticle(topicId)\n\n  return (\n    <InstructionArticlePage\n      article={article}\n      eyebrow={article?.category === 'blocks' ? 'Блок материала' : 'Основы обучения'}\n      backLabel="К списку обучения"\n      scope="learning"\n      onBack={onBack}\n    />\n  )\n}\n\nexport function BoardsInstructionArticlePage({\n  topicId,\n  onBack\n}: BoardsInstructionArticlePageProps): React.JSX.Element {\n  const article = getBoardsInstructionArticle(topicId)\n\n  return (\n    <InstructionArticlePage\n      article={article}\n      eyebrow={article?.category === 'integration' ? 'Связь с обучением' : 'Основы досок'}\n      backLabel="К списку досок"\n      scope="boards"\n      onBack={onBack}\n    />\n  )\n}\n\nfunction InstructionArticlePage({\n  article,\n  eyebrow,\n  backLabel,\n  scope,\n  onBack\n}: {\n  article: InstructionArticleBase<string> | null\n  eyebrow: string\n  backLabel: string\n  scope: string\n  onBack: () => void\n}): React.JSX.Element {\n  if (!article) {\n    return (\n      <div className="space-y-5">\n        <InstructionHero\n          eyebrow="Инструкции"\n          title="Инструкция не найдена"\n          description="Раздел мог быть удалён или переименован."\n          icon={BookOpen}\n          backLabel={backLabel}\n          onBack={onBack}\n        />\n      </div>\n    )\n  }\n\n  function openSection(sectionIndex: number): void {\n    const sectionId = getInstructionSectionId(scope, article.id, sectionIndex)\n    const target = window.document.getElementById(sectionId)\n    if (!target) return\n\n    const prefersReducedMotion =\n      typeof window.matchMedia === 'function' &&\n      window.matchMedia('(prefers-reduced-motion: reduce)').matches\n\n    target.scrollIntoView({\n      behavior: prefersReducedMotion ? 'auto' : 'smooth',\n      block: 'start',\n      inline: 'nearest'\n    })\n    target.focus({ preventScroll: true })\n    target.getAnimations?.().forEach((animation) => animation.cancel())\n    target.animate?.(\n      [\n        {\n          borderColor: 'color-mix(in srgb, var(--app-accent-500) 76%, white 8%)',\n          backgroundColor: 'color-mix(in srgb, var(--app-accent-500) 18%, var(--app-surface))',\n          boxShadow:\n            '0 0 0 3px color-mix(in srgb, var(--app-accent-500) 28%, transparent), 0 16px 48px rgb(0 0 0 / 0.16)'\n        },\n        {\n          borderColor: 'var(--app-border)',\n          backgroundColor: 'var(--app-surface)',\n          boxShadow: '0 12px 40px rgb(0 0 0 / 0.08)'\n        }\n      ],\n      {\n        duration: prefersReducedMotion ? 280 : 1800,\n        easing: 'cubic-bezier(0.16, 1, 0.3, 1)'\n      }\n    )\n  }\n\n  return (\n    <div className="space-y-5">\n      <InstructionHero\n        eyebrow={eyebrow}\n        title={article.title}\n        description={article.summary}\n        icon={article.icon}\n        backLabel={backLabel}\n        onBack={onBack}\n      />\n\n      <div className="grid grid-cols-[minmax(0,1fr)_300px] items-start gap-5 max-[980px]:grid-cols-1">\n        <article className="min-w-0 space-y-4">\n          <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[0_12px_40px_rgb(0_0_0/0.08)]">\n            <p className="text-sm leading-7 text-[var(--app-text)]">{article.intro}</p>\n          </section>\n\n          {article.sections.map((section, index) => {\n            const sectionId = getInstructionSectionId(scope, article.id, index)\n            return (\n              <InstructionArticleSection key={sectionId} section={section} sectionId={sectionId} />\n            )\n          })}\n        </article>\n\n        <aside className="sticky top-0 grid gap-4 max-[980px]:static">\n          <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[0_12px_40px_rgb(0_0_0/0.08)]">\n            <header className="flex items-center gap-3 border-b border-[var(--app-border)] px-4 py-3.5">\n              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-violet-500/15 bg-violet-500/10 text-violet-300">\n                <ListChecks aria-hidden="true" className="size-4" />\n              </div>\n              <div>\n                <h2 className="text-sm font-semibold text-[var(--app-text)]">В этой инструкции</h2>\n                <p className="mt-0.5 text-[11px] text-[var(--app-muted)]">\n                  {article.sections.length} разделов\n                </p>\n              </div>\n            </header>\n\n            <ol className="grid gap-1 p-3">\n              {article.sections.map((section, index) => (\n                <li key={getInstructionSectionId(scope, article.id, index)}>\n                  <button\n                    type="button"\n                    aria-label={\`Перейти к разделу «\${section.title}»\`}\n                    className={cn(\n                      'group flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-xs leading-5 outline-none',\n                      'text-[var(--app-muted)] transition-[background-color,color,transform]',\n                      'hover:translate-x-0.5 hover:bg-[color-mix(in_srgb,var(--app-accent-500)_10%,transparent)]',\n                      'hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-[var(--app-accent-500)]/40'\n                    )}\n                    onClick={() => openSection(index)}\n                  >\n                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-[10px] font-semibold text-violet-300 tabular-nums transition-colors group-hover:bg-[color-mix(in_srgb,var(--app-accent-500)_18%,transparent)] group-hover:text-[var(--app-text)]">\n                      {index + 1}\n                    </span>\n                    <span>{section.title}</span>\n                  </button>\n                </li>\n              ))}\n            </ol>\n          </section>\n\n          <InstructionShortcuts article={article} />\n        </aside>\n      </div>\n    </div>\n  )\n}\n\n`
)

replaceOnce(
  instructionsPath,
  `function InstructionTopicGroup({\n  title,\n  description,\n  articles,\n  onOpenTopic\n}: {\n  title: string\n  description: string\n  articles: LearningInstructionArticle[]\n  onOpenTopic: (topicId: LearningInstructionTopicId) => void\n}): React.JSX.Element {`,
  `function InstructionTopicGroup<TopicId extends string>({\n  title,\n  description,\n  articles,\n  onOpenTopic\n}: {\n  title: string\n  description: string\n  articles: Array<InstructionArticleBase<TopicId>>\n  onOpenTopic: (topicId: TopicId) => void\n}): React.JSX.Element {`
)

replaceOnce(
  instructionsPath,
  `function InstructionTopicCard({\n  article,\n  onOpen\n}: {\n  article: LearningInstructionArticle\n  onOpen: (topicId: LearningInstructionTopicId) => void\n}): React.JSX.Element {`,
  `function InstructionTopicCard<TopicId extends string>({\n  article,\n  onOpen\n}: {\n  article: InstructionArticleBase<TopicId>\n  onOpen: (topicId: TopicId) => void\n}): React.JSX.Element {`
)

replaceOnce(
  instructionsPath,
  `function getInstructionSectionId(\n  topicId: LearningInstructionTopicId,\n  sectionIndex: number\n): string {\n  return \`learning-instruction-\${topicId}-section-\${sectionIndex + 1}\`\n}`,
  `function getInstructionSectionId(scope: string, topicId: string, sectionIndex: number): string {\n  return \`\${scope}-instruction-\${topicId}-section-\${sectionIndex + 1}\`\n}`
)

replaceOnce(
  instructionsPath,
  `function InstructionShortcuts({\n  article\n}: {\n  article: LearningInstructionArticle\n}): React.JSX.Element {`,
  `function InstructionShortcuts({\n  article\n}: {\n  article: Pick<InstructionArticleBase<string>, 'shortcuts'>\n}): React.JSX.Element {`
)

insertBeforeOnce(
  instructionsPath,
  `function InstructionHero({\n`,
  `function InstructionModuleCard({\n  title,\n  description,\n  icon: Icon,\n  children,\n  onOpen\n}: {\n  title: string\n  description: string\n  icon: LucideIcon\n  children: ReactNode\n  onOpen: () => void\n}): React.JSX.Element {\n  return (\n    <button\n      type="button"\n      className={cn(\n        'group relative isolate min-h-64 w-full overflow-hidden rounded-2xl border p-5 text-left outline-none',\n        'border-[var(--app-border)] bg-[var(--app-surface)]',\n        'shadow-[0_12px_40px_rgb(0_0_0/0.1)]',\n        'transition-[border-color,transform,box-shadow]',\n        'hover:-translate-y-px hover:border-violet-500/35 hover:shadow-xl hover:shadow-black/10',\n        'focus-visible:ring-2 focus-visible:ring-violet-500/40'\n      )}\n      onClick={onOpen}\n    >\n      <div\n        aria-hidden="true"\n        className="pointer-events-none absolute -top-28 right-4 -z-10 size-72 rounded-full bg-violet-500/12 blur-3xl"\n      />\n\n      <div className="flex h-full items-start gap-4">\n        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/12 text-violet-300 shadow-inner shadow-violet-500/5">\n          <Icon aria-hidden="true" className="size-6" />\n        </div>\n\n        <div className="flex min-w-0 flex-1 flex-col self-stretch">\n          <p className="text-[11px] font-semibold tracking-[0.12em] text-violet-300 uppercase">\n            Модуль приложения\n          </p>\n          <h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--app-text)]">\n            {title}\n          </h2>\n          <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">{description}</p>\n          <div className="mt-auto flex flex-wrap gap-2 pt-5">{children}</div>\n        </div>\n\n        <ArrowRight\n          aria-hidden="true"\n          className="mt-1 size-5 shrink-0 -translate-x-1 text-[var(--app-muted)] transition-[color,transform] group-hover:translate-x-0 group-hover:text-violet-300"\n        />\n      </div>\n    </button>\n  )\n}\n\n`
)

replaceOnce(
  instructionsPath,
  `  icon: typeof BookOpen\n  backLabel: string`,
  `  icon: LucideIcon\n  backLabel: string`
)

const settingsPath = 'src/renderer/src/modules/settings/SettingsPage.tsx'

replaceOnce(
  settingsPath,
  `  InstructionsOverviewPage,\n  LearningInstructionArticlePage,\n  LearningInstructionsPage\n} from './instructions/LearningInstructions'`,
  `  BoardsInstructionArticlePage,\n  BoardsInstructionsPage,\n  InstructionsOverviewPage,\n  LearningInstructionArticlePage,\n  LearningInstructionsPage\n} from './instructions/LearningInstructions'`
)

insertBeforeOnce(
  settingsPath,
  `import {\n  getLearningInstructionArticle,`,
  `import {\n  boardsInstructionArticles,\n  getBoardsInstructionArticle,\n  type BoardsInstructionTopicId\n} from './instructions/boards-instruction-catalog'\n`
)

replaceOnce(
  settingsPath,
  `  | { page: 'learning' }\n  | { page: 'learning-topic'; topicId: LearningInstructionTopicId }`,
  `  | { page: 'learning' }\n  | { page: 'learning-topic'; topicId: LearningInstructionTopicId }\n  | { page: 'boards' }\n  | { page: 'boards-topic'; topicId: BoardsInstructionTopicId }`
)

replaceOnce(
  settingsPath,
  `        onBack={() => setRoute({ page: 'overview' })}\n        onOpenLearning={() => setRoute({ page: 'learning' })}\n      />`,
  `        onBack={() => setRoute({ page: 'overview' })}\n        onOpenLearning={() => setRoute({ page: 'learning' })}\n        onOpenBoards={() => setRoute({ page: 'boards' })}\n      />`
)

replaceOnce(
  settingsPath,
  `  } else if (route.page === 'learning-topic') {\n    content = (\n      <LearningInstructionArticlePage\n        topicId={route.topicId}\n        onBack={() => setRoute({ page: 'learning' })}\n      />\n    )\n  } else {`,
  `  } else if (route.page === 'learning-topic') {\n    content = (\n      <LearningInstructionArticlePage\n        topicId={route.topicId}\n        onBack={() => setRoute({ page: 'learning' })}\n      />\n    )\n  } else if (route.page === 'boards') {\n    content = (\n      <BoardsInstructionsPage\n        onBack={() => setRoute({ page: 'instructions' })}\n        onOpenTopic={(topicId) => setRoute({ page: 'boards-topic', topicId })}\n      />\n    )\n  } else if (route.page === 'boards-topic') {\n    content = (\n      <BoardsInstructionArticlePage\n        topicId={route.topicId}\n        onBack={() => setRoute({ page: 'boards' })}\n      />\n    )\n  } else {`
)

replaceOnce(
  settingsPath,
  `  const hidesLegacyBackButton =\n    route.page === 'instructions' || route.page === 'learning' || route.page === 'learning-topic'`,
  `  const hidesLegacyBackButton =\n    route.page === 'instructions' ||\n    route.page === 'learning' ||\n    route.page === 'learning-topic' ||\n    route.page === 'boards' ||\n    route.page === 'boards-topic'`
)

replaceOnce(
  settingsPath,
  `  if (route.page === 'learning') {\n    items.push({ label: 'Обучение' })\n    return items\n  }\n\n  items.push({\n    label: 'Обучение',\n    onClick: () => navigate({ page: 'learning' })\n  })\n  items.push({\n    label: getLearningInstructionArticle(route.topicId)?.title ?? 'Инструкция'\n  })\n\n  return items`,
  `  if (route.page === 'learning') {\n    items.push({ label: 'Обучение' })\n    return items\n  }\n\n  if (route.page === 'learning-topic') {\n    items.push({\n      label: 'Обучение',\n      onClick: () => navigate({ page: 'learning' })\n    })\n    items.push({\n      label: getLearningInstructionArticle(route.topicId)?.title ?? 'Инструкция'\n    })\n    return items\n  }\n\n  if (route.page === 'boards') {\n    items.push({ label: 'Доски' })\n    return items\n  }\n\n  items.push({\n    label: 'Доски',\n    onClick: () => navigate({ page: 'boards' })\n  })\n  items.push({\n    label: getBoardsInstructionArticle(route.topicId)?.title ?? 'Инструкция'\n  })\n\n  return items`
)

replaceOnce(
  settingsPath,
  `          description="Полные руководства по модулю «Обучение», страницам библиотеки, блокам и горячим клавишам."`,
  `          description="Полные руководства по модулям «Обучение» и «Доски», рабочим страницам, блокам, связям и правилам удаления."`
)

replaceOnce(
  settingsPath,
  `          <SettingsValueBadge>Обучение</SettingsValueBadge>\n          <SettingsValueBadge>{learningInstructionArticles.length} инструкций</SettingsValueBadge>\n          <SettingsValueBadge>Горячие клавиши</SettingsValueBadge>`,
  `          <SettingsValueBadge>Обучение и Доски</SettingsValueBadge>\n          <SettingsValueBadge>\n            {learningInstructionArticles.length + boardsInstructionArticles.length} инструкций\n          </SettingsValueBadge>\n          <SettingsValueBadge>Поиск по справке</SettingsValueBadge>`
)

const boardsPagePath = 'src/renderer/src/modules/boards/BoardsPage.tsx'

replaceOnce(
  boardsPagePath,
  `          {node.type === 'folder' && (\n            <>\n              <BoardMenuItem\n                icon={FolderPlus}\n                label="Новая папка"\n                accent\n                onSelect={() => onCreate('folder', node.id)}\n              />\n              <BoardMenuItem\n                icon={Presentation}\n                label="Новая доска"\n                accent\n                onSelect={() => onCreate('board', node.id)}\n              />\n              <DropdownMenu.Separator className="my-1 h-px bg-[var(--app-border)]" />\n            </>\n          )}\n\n          {!node.isSystem ? (\n            <>\n              <BoardMenuItem icon={Pencil} label="Переименовать" onSelect={() => onRename(node)} />\n              <DropdownMenu.Separator className="my-1 h-px bg-[var(--app-border)]" />\n              {node.type === 'folder' && node.sourceStudyNodeId ? (\n                <p className="px-2.5 py-2 text-xs leading-5 text-[var(--app-muted)]">\n                  Папка удалится автоматически после удаления последней связанной доски\n                </p>\n              ) : (\n                <BoardMenuItem\n                  icon={Trash2}\n                  label="Удалить"\n                  danger\n                  onSelect={() => onDelete(node)}\n                />\n              )}\n            </>\n          ) : (\n            <p className="px-2.5 py-2 text-xs text-[var(--app-muted)]">Системная папка защищена</p>\n          )}`,
  `          {node.type === 'folder' && (\n            <>\n              <BoardMenuItem\n                icon={FolderPlus}\n                label="Новая папка"\n                accent\n                onSelect={() => onCreate('folder', node.id)}\n              />\n              <BoardMenuItem\n                icon={Presentation}\n                label="Новая доска"\n                accent\n                onSelect={() => onCreate('board', node.id)}\n              />\n              {!node.isSystem && (\n                <DropdownMenu.Separator className="my-1 h-px bg-[var(--app-border)]" />\n              )}\n            </>\n          )}\n\n          {!node.isSystem && (\n            <>\n              <BoardMenuItem icon={Pencil} label="Переименовать" onSelect={() => onRename(node)} />\n              {!(node.type === 'folder' && node.sourceStudyNodeId) && (\n                <>\n                  <DropdownMenu.Separator className="my-1 h-px bg-[var(--app-border)]" />\n                  <BoardMenuItem\n                    icon={Trash2}\n                    label="Удалить"\n                    danger\n                    onSelect={() => onDelete(node)}\n                  />\n                </>\n              )}\n            </>\n          )}`
)

const boardsTestPath = 'src/renderer/src/modules/boards/BoardsPage.test.tsx'
replaceOnce(
  boardsTestPath,
  `    expect(\n      screen.getByText('Папка удалится автоматически после удаления последней связанной доски')\n    ).toBeInTheDocument()\n    expect(screen.queryByRole('menuitem', { name: 'Удалить' })).not.toBeInTheDocument()`,
  `    expect(screen.getByRole('menuitem', { name: 'Переименовать' })).toBeInTheDocument()\n    expect(screen.queryByRole('menuitem', { name: 'Удалить' })).not.toBeInTheDocument()\n    expect(\n      screen.queryByText('Папка удалится автоматически после удаления последней связанной доски')\n    ).not.toBeInTheDocument()`
)

const instructionTestPath =
  'src/renderer/src/modules/settings/instructions/LearningInstructions.test.tsx'

replaceOnce(
  instructionTestPath,
  `  InstructionsOverviewPage,\n  LearningInstructionArticlePage,\n  LearningInstructionsPage`,
  `  BoardsInstructionArticlePage,\n  BoardsInstructionsPage,\n  InstructionsOverviewPage,\n  LearningInstructionArticlePage,\n  LearningInstructionsPage`
)

insertBeforeOnce(
  instructionTestPath,
  `import {\n  blockLearningInstructionArticles,`,
  `import { boardsInstructionArticles } from './boards-instruction-catalog'\n`
)

replaceOnce(
  instructionTestPath,
  `    const onOpenLearning = vi.fn()\n\n    render(<InstructionsOverviewPage onBack={vi.fn()} onOpenLearning={onOpenLearning} />)`,
  `    const onOpenLearning = vi.fn()\n    const onOpenBoards = vi.fn()\n\n    render(\n      <InstructionsOverviewPage\n        onBack={vi.fn()}\n        onOpenLearning={onOpenLearning}\n        onOpenBoards={onOpenBoards}\n      />\n    )`
)

replaceOnce(
  instructionTestPath,
  `    expect(onOpenLearning).toHaveBeenCalledTimes(1)\n  })`,
  `    expect(onOpenLearning).toHaveBeenCalledTimes(1)\n\n    await user.click(screen.getByRole('button', { name: /Доски/ }))\n    expect(onOpenBoards).toHaveBeenCalledTimes(1)\n  })`
)

insertBeforeOnce(
  instructionTestPath,
  `  it('navigates to and highlights a section from the contents list', async () => {`,
  `  it('provides a searchable boards catalog and opens its deletion guide', async () => {\n    const user = userEvent.setup()\n    const onOpenTopic = vi.fn()\n\n    render(<BoardsInstructionsPage onBack={vi.fn()} onOpenTopic={onOpenTopic} />)\n\n    expect(boardsInstructionArticles.length).toBeGreaterThanOrEqual(7)\n    expect(screen.getByRole('heading', { name: 'Рабочее пространство' })).toBeInTheDocument()\n    expect(screen.getByRole('heading', { name: 'Связь с обучением' })).toBeInTheDocument()\n\n    await user.type(\n      screen.getByRole('textbox', { name: 'Поиск по инструкциям досок' }),\n      'удаление'\n    )\n\n    const deletionTopic = screen.getByRole('button', { name: /Удаление и синхронизация/ })\n    await user.click(deletionTopic)\n    expect(onOpenTopic).toHaveBeenCalledWith('boards-deletion-sync')\n  })\n\n  it('documents the complete bidirectional deletion behavior for study boards', () => {\n    render(<BoardsInstructionArticlePage topicId="boards-deletion-sync" onBack={vi.fn()} />)\n\n    expect(screen.getByRole('heading', { name: 'Удаление и синхронизация' })).toBeInTheDocument()\n    expect(\n      screen.getByText(/удаляется её холст и соответствующий блок «Доска» в учебном материале/)\n    ).toBeInTheDocument()\n    expect(\n      screen.getByText(/пустая автоматически созданная папка удаляется/)\n    ).toBeInTheDocument()\n  })\n\n`
)

console.log('Boards instructions and compact menus applied')
