import { readFileSync, writeFileSync } from 'node:fs'

const componentPath =
  'src/renderer/src/modules/settings/instructions/LearningInstructions.tsx'
const testPath =
  'src/renderer/src/modules/settings/instructions/LearningInstructions.test.tsx'

function replaceOnce(source, before, after, label) {
  const firstIndex = source.indexOf(before)

  if (firstIndex < 0) {
    throw new Error(`Unable to find ${label}`)
  }

  if (source.indexOf(before, firstIndex + before.length) >= 0) {
    throw new Error(`Found multiple matches for ${label}`)
  }

  return `${source.slice(0, firstIndex)}${after}${source.slice(firstIndex + before.length)}`
}

let component = readFileSync(componentPath, 'utf8')

component = replaceOnce(
  component,
  `      </div>
    )
  }

  return (
    <div className="space-y-5">
      <InstructionHero
        eyebrow={article.category === 'blocks' ? 'Блок материала' : 'Основы обучения'}`,
  `      </div>
    )
  }

  function openSection(sectionIndex: number): void {
    const sectionId = getInstructionSectionId(topicId, sectionIndex)
    const target = window.document.getElementById(sectionId)

    if (!target) {
      return
    }

    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    target.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
      inline: 'nearest'
    })

    target.focus({
      preventScroll: true
    })

    target.getAnimations?.().forEach((animation) => {
      animation.cancel()
    })

    target.animate?.(
      [
        {
          borderColor:
            'color-mix(in srgb, var(--app-accent-500) 76%, white 8%)',
          backgroundColor:
            'color-mix(in srgb, var(--app-accent-500) 18%, var(--app-surface))',
          boxShadow:
            '0 0 0 3px color-mix(in srgb, var(--app-accent-500) 28%, transparent), 0 16px 48px rgb(0 0 0 / 0.16)'
        },
        {
          borderColor: 'var(--app-border)',
          backgroundColor: 'var(--app-surface)',
          boxShadow: '0 12px 40px rgb(0 0 0 / 0.08)'
        }
      ],
      {
        duration: prefersReducedMotion ? 280 : 1800,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
      }
    )
  }

  return (
    <div className="space-y-5">
      <InstructionHero
        eyebrow={article.category === 'blocks' ? 'Блок материала' : 'Основы обучения'}`,
  'article section navigation handler'
)

component = replaceOnce(
  component,
  `          {article.sections.map((section) => (
            <InstructionArticleSection key={section.title} section={section} />
          ))}`,
  `          {article.sections.map((section, index) => {
            const sectionId = getInstructionSectionId(article.id, index)

            return (
              <InstructionArticleSection
                key={sectionId}
                section={section}
                sectionId={sectionId}
              />
            )
          })}`,
  'article section rendering'
)

component = replaceOnce(
  component,
  `            <ol className="grid gap-1 p-3">
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
            </ol>`,
  `            <ol className="grid gap-1 p-3">
              {article.sections.map((section, index) => {
                const sectionId = getInstructionSectionId(article.id, index)

                return (
                  <li key={sectionId}>
                    <button
                      type="button"
                      aria-label={\`Перейти к разделу «\${section.title}»\`}
                      className={cn(
                        'group flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-xs leading-5 outline-none',
                        'text-[var(--app-muted)] transition-[background-color,color,transform]',
                        'hover:translate-x-0.5 hover:bg-[color-mix(in_srgb,var(--app-accent-500)_10%,transparent)]',
                        'hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-[var(--app-accent-500)]/40'
                      )}
                      onClick={() => openSection(index)}
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-[10px] font-semibold text-violet-300 tabular-nums transition-colors group-hover:bg-[color-mix(in_srgb,var(--app-accent-500)_18%,transparent)] group-hover:text-[var(--app-text)]">
                        {index + 1}
                      </span>
                      <span>{section.title}</span>
                    </button>
                  </li>
                )
              })}
            </ol>`,
  'instruction contents list'
)

component = replaceOnce(
  component,
  `function InstructionArticleSection({
  section
}: {
  section: LearningInstructionSection
}): React.JSX.Element {
  return (
    <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[0_12px_40px_rgb(0_0_0/0.08)]">`,
  `function InstructionArticleSection({
  section,
  sectionId
}: {
  section: LearningInstructionSection
  sectionId: string
}): React.JSX.Element {
  return (
    <section
      id={sectionId}
      tabIndex={-1}
      className="scroll-mt-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[0_12px_40px_rgb(0_0_0/0.08)] outline-none"
    >`,
  'instruction article section element'
)

component = replaceOnce(
  component,
  `function InstructionShortcuts({`,
  `function getInstructionSectionId(
  topicId: LearningInstructionTopicId,
  sectionIndex: number
): string {
  return \`learning-instruction-\${topicId}-section-\${sectionIndex + 1}\`
}

function InstructionShortcuts({`,
  'instruction section id helper'
)

writeFileSync(componentPath, component)

let tests = readFileSync(testPath, 'utf8')

tests = replaceOnce(
  tests,
  `  it('renders full article sections and confirmed keyboard shortcuts', () => {`,
  `  it('navigates to and highlights a section from the contents list', async () => {
    const user = userEvent.setup()

    render(<LearningInstructionArticlePage topicId="folder-page" onBack={vi.fn()} />)

    const heading = screen.getByRole('heading', { name: 'Основные действия' })
    const section = heading.closest('section')

    expect(section).not.toBeNull()

    const scrollIntoView = vi.fn()
    const animate = vi.fn()
    const cancel = vi.fn()

    Object.defineProperties(section as HTMLElement, {
      scrollIntoView: {
        configurable: true,
        value: scrollIntoView
      },
      getAnimations: {
        configurable: true,
        value: () => [{ cancel }]
      },
      animate: {
        configurable: true,
        value: animate
      }
    })

    await user.click(
      screen.getByRole('button', {
        name: 'Перейти к разделу «Основные действия»'
      })
    )

    expect(scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({
        block: 'start',
        inline: 'nearest'
      })
    )
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(animate).toHaveBeenCalledTimes(1)
  })

  it('renders full article sections and confirmed keyboard shortcuts', () => {`,
  'instruction navigation test'
)

writeFileSync(testPath, tests)
