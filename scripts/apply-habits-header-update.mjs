import { readFileSync, writeFileSync } from 'node:fs'

const path = 'src/renderer/src/modules/habits/HabitsPage.tsx'
let source = readFileSync(path, 'utf8')

function replaceOnce(label, from, to) {
  if (!source.includes(from)) {
    if (source.includes(to)) return
    throw new Error(`Не найден фрагмент: ${label}`)
  }
  source = source.replace(from, to)
}

replaceOnce('unused completed icon', '  CheckCircle2,\n', '')
replaceOnce(
  'date picker import',
  "import { HabitDialog } from './components/HabitDialog'\n",
  "import { HabitDatePicker } from './components/HabitDatePicker'\nimport { HabitDialog } from './components/HabitDialog'\n"
)

const completedStart = source.indexOf('  const completedOnSelectedDate = useMemo(')
if (completedStart !== -1) {
  const completedEnd = source.indexOf('  const groupHabitCounts = useMemo(', completedStart)
  if (completedEnd === -1) throw new Error('Не найден конец completedOnSelectedDate')
  source = source.slice(0, completedStart) + source.slice(completedEnd)
}

const headerStartMarker = '      >\n        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">'
const headerStart = source.indexOf(headerStartMarker)
if (headerStart !== -1) {
  const headerEndMarker = '      </ModuleHeader>'
  const headerEnd = source.indexOf(headerEndMarker, headerStart)
  if (headerEnd === -1) throw new Error('Не найден конец ModuleHeader')

  const headerContent = `      >
        {view !== 'reports' && (
          <div className="flex flex-wrap gap-2">
            <label className="flex h-10 min-w-[260px] flex-1 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 focus-within:border-violet-500/45 focus-within:ring-2 focus-within:ring-violet-500/10">
              <Search className="size-4 shrink-0 text-[var(--app-muted)]" />
              <input
                value={query}
                type="text"
                role="searchbox"
                aria-label="Поиск по привычкам"
                placeholder="Найти привычку…"
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60"
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <button
                  type="button"
                  aria-label="Очистить поиск привычек"
                  className="flex size-7 items-center justify-center rounded-lg text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                  onClick={() => setQuery('')}
                >
                  <X className="size-4" />
                </button>
              )}
            </label>

            {view === 'all' && (
              <div className="min-w-[190px]">
                <AppSelect
                  ariaLabel="Фильтр по типу отслеживания"
                  value={trackingFilter}
                  options={[
                    { value: 'all', label: 'Все типы' },
                    { value: 'check', label: 'Простая отметка' },
                    { value: 'count', label: 'Количество / прогресс' }
                  ]}
                  onValueChange={(value) =>
                    setTrackingFilter(value as HabitTrackingType | 'all')
                  }
                />
              </div>
            )}
          </div>
        )}

        <div
          className={cn(
            'flex flex-wrap items-center justify-between gap-3',
            view !== 'reports' && 'mt-3'
          )}
        >
          <div className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-1">
            {[
              { id: 'today' as const, label: 'Сегодня', icon: CalendarDays },
              { id: 'all' as const, label: 'Все привычки', icon: Target },
              { id: 'reports' as const, label: 'Отчёты', icon: BarChart3 }
            ].map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={view === item.id}
                  className={
                    view === item.id
                      ? 'inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-violet-500 px-3.5 text-sm font-semibold text-white'
                      : 'inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3.5 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                  }
                  onClick={() => setView(item.id)}
                >
                  <Icon className="size-4" /> {item.label}
                </button>
              )
            })}
          </div>

          {view === 'today' && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Предыдущий день"
                className="flex size-10 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                onClick={() => setSelectedDate((current) => addDays(current, -1))}
              >
                <ChevronLeft className="size-4" />
              </button>
              <HabitDatePicker value={selectedDate} max={today} onChange={setSelectedDate} />
              <button
                type="button"
                disabled={selectedDate === today}
                className="h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:cursor-default disabled:opacity-45 disabled:hover:bg-[var(--app-workspace)]"
                onClick={() => setSelectedDate(today)}
              >
                Сегодня
              </button>
              <button
                type="button"
                aria-label="Следующий день"
                disabled={selectedDate >= today}
                className="flex size-10 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-[var(--app-workspace)]"
                onClick={() =>
                  setSelectedDate((current) => {
                    const next = addDays(current, 1)
                    return next > today ? today : next
                  })
                }
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </div>
      </ModuleHeader>`

  source = source.slice(0, headerStart) + headerContent + source.slice(headerEnd + headerEndMarker.length)
}

const searchCardStart = source.indexOf("          {view !== 'reports' && (\n            <div className=\"rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]\">")
if (searchCardStart !== -1) {
  const todayViewStart = source.indexOf("          {view === 'today' && (", searchCardStart)
  if (todayViewStart === -1) throw new Error('Не найден today view после старого поиска')
  source = source.slice(0, searchCardStart) + source.slice(todayViewStart)
}

const dateCardStartMarker = '              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-[var(--app-shadow-card)]">'
const dateCardStart = source.indexOf(dateCardStartMarker)
if (dateCardStart !== -1) {
  const habitsListStartMarker = '              {visibleScheduledHabits.length === 0 ? ('
  const habitsListStart = source.indexOf(habitsListStartMarker, dateCardStart)
  if (habitsListStart === -1) throw new Error('Не найден список привычек после старой навигации даты')
  source = source.slice(0, dateCardStart) + source.slice(habitsListStart)
}

writeFileSync(path, source)
