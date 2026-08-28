from pathlib import Path

page = Path('src/renderer/src/modules/workouts/WorkoutsPage.tsx')
text = page.read_text(encoding='utf-8')

# The compact journal no longer owns dashboard statistics: reporting is the single analytics surface.
recent_start = text.find('  const recentStats = useMemo(() => {')
recent_end = text.find('\n\n  async function saveExercise', recent_start)
if recent_start == -1 or recent_end == -1:
    raise SystemExit('recentStats block not found')
text = text[:recent_start] + text[recent_end:]

header_toolbar = r'''  const headerToolbar = (() => {
    if (tab === 'journal') {
      return (
        <div className="flex flex-wrap gap-2">
          <label className="flex h-10 min-w-[260px] flex-1 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 focus-within:border-violet-500/45">
            <Search className="size-4 text-[var(--app-muted)]" />
            <input
              type="search"
              value={query}
              placeholder="Поиск по тренировкам и упражнениям…"
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="min-w-[190px]">
            <AppSelect
              ariaLabel="Фильтр по программе"
              value={programFilter}
              options={[
                { value: 'all', label: 'Все программы' },
                { value: 'custom', label: 'Свободные тренировки' },
                ...programs.map((program) => ({ value: program.id, label: program.name }))
              ]}
              onValueChange={setProgramFilter}
            />
          </div>
          <div className="min-w-[180px]">
            <AppSelect
              ariaLabel="Фильтр по группе мышц"
              value={muscleFilter}
              options={[
                { value: 'all', label: 'Все группы мышц' },
                ...WORKOUT_MUSCLE_GROUP_OPTIONS.map(({ value, label }) => ({ value, label }))
              ]}
              onValueChange={(value) => setMuscleFilter(value as MuscleFilter)}
            />
          </div>
        </div>
      )
    }

    if (tab === 'exercises') {
      return (
        <div className="flex flex-wrap gap-2">
          <label className="flex h-10 min-w-[260px] flex-1 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 focus-within:border-violet-500/45">
            <Search className="size-4 text-[var(--app-muted)]" />
            <input
              type="search"
              value={query}
              placeholder="Найти упражнение…"
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="min-w-[190px]">
            <AppSelect
              ariaLabel="Группа мышц"
              value={muscleFilter}
              options={[
                { value: 'all', label: 'Все группы мышц' },
                ...WORKOUT_MUSCLE_GROUP_OPTIONS.map(({ value, label }) => ({ value, label }))
              ]}
              onValueChange={(value) => setMuscleFilter(value as MuscleFilter)}
            />
          </div>
        </div>
      )
    }

    if (tab === 'programs') {
      return (
        <label className="flex h-10 w-full items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 focus-within:border-violet-500/45">
          <Search className="size-4 text-[var(--app-muted)]" />
          <input
            type="search"
            value={query}
            placeholder="Найти программу…"
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      )
    }

    return null
  })()

'''
return_marker = '  return (\n    <StandardModulePage>\n'
return_index = text.find(return_marker)
if return_index == -1:
    raise SystemExit('page return marker not found')
text = text[:return_index] + header_toolbar + text[return_index:]

header_close = '''        </div>
      </ModuleHeader>'''
header_close_replacement = '''        </div>
        {headerToolbar && <div className="mt-3">{headerToolbar}</div>}
      </ModuleHeader>'''
header_area_start = text.find('      <ModuleHeader')
header_close_index = text.find(header_close, header_area_start)
if header_area_start == -1 or header_close_index == -1:
    raise SystemExit('module header close marker not found')
text = (
    text[:header_close_index]
    + text[header_close_index:].replace(header_close, header_close_replacement, 1)
)

# Remove the journal dashboard tiles and the duplicated standalone discovery card.
journal_start = text.find("      {tab === 'journal' && (")
journal_list = text.find('          {filteredSessions.length === 0 ? (', journal_start)
if journal_start == -1 or journal_list == -1:
    raise SystemExit('journal list marker not found')
journal_section_open_end = text.find('\n', text.find('<section className="mt-5 space-y-4">', journal_start)) + 1
if journal_section_open_end <= 0:
    raise SystemExit('journal section marker not found')
text = text[:journal_section_open_end] + text[journal_list:]

# Exercise discovery now lives under the module tabs in the header.
exercise_start = text.find("      {tab === 'exercises' && (")
exercise_list = text.find('          {filteredExercises.length === 0 ? (', exercise_start)
if exercise_start == -1 or exercise_list == -1:
    raise SystemExit('exercise list marker not found')
exercise_section_open_end = text.find('\n', text.find('<section className="mt-5 space-y-4">', exercise_start)) + 1
if exercise_section_open_end <= 0:
    raise SystemExit('exercise section marker not found')
text = text[:exercise_section_open_end] + text[exercise_list:]

# Program discovery now lives under the module tabs in the header.
program_start = text.find("      {tab === 'programs' && (")
program_list = text.find('          {filteredPrograms.length === 0 ? (', program_start)
if program_start == -1 or program_list == -1:
    raise SystemExit('program list marker not found')
program_section_open_end = text.find('\n', text.find('<section className="mt-5 space-y-4">', program_start)) + 1
if program_section_open_end <= 0:
    raise SystemExit('program section marker not found')
text = text[:program_section_open_end] + text[program_list:]

page.write_text(text, encoding='utf-8')

# Regression coverage: controls belong to the module header in all three searchable tabs,
# while journal statistics no longer duplicate the Reports analytics surface.
test = Path('src/renderer/src/modules/workouts/WorkoutsPage.test.tsx')
test_text = test.read_text(encoding='utf-8')
insert_before = "  it('opens the full muscle model from the workout journal', async () => {"
insert_index = test_text.find(insert_before)
if insert_index == -1:
    raise SystemExit('test insertion marker not found')
new_test = r'''  it('keeps searchable workout controls in the module header and analytics out of the journal', async () => {
    const user = userEvent.setup()
    render(<WorkoutsPage />)

    const title = await screen.findByRole('heading', { name: 'Тренировки' })
    const moduleHeader = title.closest('[data-module-header]')
    expect(moduleHeader).not.toBeNull()

    const journalSearch = screen.getByPlaceholderText('Поиск по тренировкам и упражнениям…')
    expect(moduleHeader).toContainElement(journalSearch)
    expect(moduleHeader).toContainElement(screen.getByRole('button', { name: 'Фильтр по программе' }))
    expect(moduleHeader).toContainElement(
      screen.getByRole('button', { name: 'Фильтр по группе мышц' })
    )
    expect(screen.queryByText('Тренировок за 30 дней')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Упражнения/ }))
    expect(moduleHeader).toContainElement(screen.getByPlaceholderText('Найти упражнение…'))
    expect(moduleHeader).toContainElement(screen.getByRole('button', { name: 'Группа мышц' }))

    await user.click(screen.getByRole('button', { name: /Программы/ }))
    expect(moduleHeader).toContainElement(screen.getByPlaceholderText('Найти программу…'))
  })

'''
test_text = test_text[:insert_index] + new_test + test_text[insert_index:]
test.write_text(test_text, encoding='utf-8')
