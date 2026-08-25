from pathlib import Path

component = Path('src/renderer/src/modules/workouts/components/WorkoutProgressSection.tsx')
source = component.read_text(encoding='utf-8')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected one match, got {count}')
    return text.replace(old, new, 1)


source = replace_once(
    source,
    "import {\n  ArrowRight,\n  CalendarDays,\n  Camera,\n",
    "import * as Collapsible from '@radix-ui/react-collapsible'\n\nimport {\n  ArrowRight,\n  CalendarDays,\n  Camera,\n  ChevronDown,\n",
    'collapsible and chevron imports',
)

source = replace_once(
    source,
    '''            <article
              key={entry.id}
              className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)]"
            >''',
    '''            <Collapsible.Root key={entry.id} defaultOpen={false} asChild>
              <article className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)]">''',
    'progress entry collapsible root',
)

source = replace_once(
    source,
    '''                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-label={`Изменить прогресс за ${formatDate(entry.date)}`}''',
    '''                <div className="flex gap-1">
                  <Collapsible.Trigger asChild>
                    <button
                      type="button"
                      aria-label={`Развернуть или свернуть запись прогресса за ${formatDate(entry.date)}`}
                      className="group flex size-9 items-center justify-center rounded-lg text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                    >
                      <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </button>
                  </Collapsible.Trigger>
                  <button
                    type="button"
                    aria-label={`Изменить прогресс за ${formatDate(entry.date)}`}''',
    'progress entry collapsible trigger',
)

source = replace_once(
    source,
    '''              {(entry.wellbeing || entry.notes) && (''',
    '''              <Collapsible.Content className="overflow-hidden">
                {(entry.wellbeing || entry.notes) && (''',
    'progress entry collapsible content open',
)

source = replace_once(
    source,
    '''                </div>
              </div>
            </article>
          )
        })}''',
    '''                </div>
              </div>
              </Collapsible.Content>
              </article>
            </Collapsible.Root>
          )
        })}''',
    'progress entry collapsible content close',
)

component.write_text(source, encoding='utf-8')

test = Path('src/renderer/src/modules/workouts/components/WorkoutProgressSection.test.tsx')
source = test.read_text(encoding='utf-8')

source = replace_once(
    source,
    "  it('shows weight trend, mode-aware metrics and visual comparison', () => {\n    render(\n",
    "  it('shows weight trend, mode-aware metrics and visual comparison', async () => {\n    const user = userEvent.setup()\n    render(\n",
    'make progress overview test async',
)

source = replace_once(
    source,
    "    expect(screen.getByAltText(/Стало · 20 августа 2026/)).toBeInTheDocument()\n    expect(screen.getByText('12 повторений')).toBeInTheDocument()\n",
    "    expect(screen.getByAltText(/Стало · 20 августа 2026/)).toBeInTheDocument()\n    expect(screen.queryByText('12 повторений')).not.toBeInTheDocument()\n    await user.click(\n      screen.getByRole('button', {\n        name: /Развернуть или свернуть запись прогресса за 20 августа 2026/i\n      })\n    )\n    expect(screen.getByText('12 повторений')).toBeInTheDocument()\n",
    'verify collapsed progress history by default',
)

source = replace_once(
    source,
    "    )\n\n    await user.click(\n      screen.getByRole('button', {\n        name: /Добавить фото сзади за 20 августа 2026/i\n",
    "    )\n\n    await user.click(\n      screen.getByRole('button', {\n        name: /Развернуть или свернуть запись прогресса за 20 августа 2026/i\n      })\n    )\n    await user.click(\n      screen.getByRole('button', {\n        name: /Добавить фото сзади за 20 августа 2026/i\n",
    'expand entry before photo import',
)

source = replace_once(
    source,
    "    )\n\n    await user.click(\n      screen.getByRole('button', {\n        name: /Открыть фото спереди за 20 августа 2026/i\n",
    "    )\n\n    await user.click(\n      screen.getByRole('button', {\n        name: /Развернуть или свернуть запись прогресса за 20 августа 2026/i\n      })\n    )\n    await user.click(\n      screen.getByRole('button', {\n        name: /Открыть фото спереди за 20 августа 2026/i\n",
    'expand entry before photo preview',
)

test.write_text(source, encoding='utf-8')
print('Progress history collapsible patch applied.')
