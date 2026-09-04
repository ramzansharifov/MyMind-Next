from pathlib import Path

path = Path('src/renderer/src/modules/passwords/PasswordsPage.tsx')
text = path.read_text(encoding='utf-8')

text = text.replace(
    "import { Tooltip } from '../../shared/ui/tooltip'\n",
    "import { Tooltip } from '../../shared/ui/tooltip'\nimport * as Popover from '@radix-ui/react-popover'\n",
    1,
)
text = text.replace("  ShieldAlert,\n  ShieldCheck,", "  ShieldAlert,\n  SlidersHorizontal,\n  ShieldCheck,", 1)

stats_end = """  const securityStats = useMemo(
    () => ({
      total: groupScopedItems.length,
      weak: groupScopedItems.filter((item) => item.securityIssues.includes('weak')).length,
      reused: groupScopedItems.filter((item) => item.securityIssues.includes('reused')).length,
      old: groupScopedItems.filter((item) => item.securityIssues.includes('old')).length
    }),
    [groupScopedItems]
  )

"""
if stats_end not in text:
    raise SystemExit('securityStats block not found')
text = text.replace(
    stats_end,
    stats_end + "  const activeLibraryFilterCount = Number(typeFilter !== 'all') + Number(issueFilter !== 'all')\n\n",
    1,
)

header = text.index('      <ModuleHeader')
start_marker = '        <div className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)]">'
start = text.index(start_marker, header)
end = text.index('      </ModuleHeader>', start)

replacement = '''        <div
          className={cn(
            'grid gap-3',
            view === 'security'
              ? 'grid-cols-1'
              : 'grid-cols-[minmax(0,1fr)_auto] max-[1120px]:grid-cols-1'
          )}
        >
          {view !== 'security' && (
            <label className="flex h-12 min-w-0 items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 focus-within:border-violet-500/45 focus-within:bg-[var(--app-surface)] focus-within:ring-2 focus-within:ring-violet-500/10">
              <Search className="size-4 shrink-0 text-[var(--app-muted)]" />
              <input
                value={query}
                type="search"
                aria-label="Поиск по паролям"
                placeholder="Название, логин, сайт или тег…"
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/65"
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <Tooltip content="Очистить поиск" side="top">
                  <button
                    type="button"
                    aria-label="Очистить поиск"
                    className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[var(--app-muted)] transition-colors hover:bg-white/[0.06] hover:text-[var(--app-text)]"
                    onClick={() => setQuery('')}
                  >
                    <X className="size-4" />
                  </button>
                </Tooltip>
              )}
            </label>
          )}

          <div
            className={cn(
              'flex min-w-0 items-stretch gap-2 max-[760px]:flex-col',
              view !== 'security' && 'max-[1120px]:w-full'
            )}
          >
            <div
              role="tablist"
              aria-label="Разделы паролей"
              className={cn(
                'flex min-h-12 min-w-0 items-center gap-1 overflow-x-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-1.5',
                view === 'security' ? 'w-fit max-w-full' : 'max-[1120px]:flex-1'
              )}
            >
              {[
                { id: 'all' as const, label: 'Хранилище', icon: KeyRound },
                { id: 'favorites' as const, label: 'Избранное', icon: Heart },
                { id: 'security' as const, label: 'Безопасность', icon: ShieldCheck }
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={view === tab.id}
                    className={
                      view === tab.id
                        ? 'inline-flex h-9 shrink-0 items-center gap-2 rounded-xl bg-violet-500 px-3.5 text-sm font-semibold text-white'
                        : 'inline-flex h-9 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                    }
                    onClick={() => setView(tab.id)}
                  >
                    <Icon className="size-4" />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {view !== 'security' && (
              <Popover.Root>
                <Popover.Trigger asChild>
                  <button
                    type="button"
                    aria-label="Фильтры хранилища"
                    className={
                      activeLibraryFilterCount > 0
                        ? 'inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl border border-violet-400/30 bg-violet-500/10 px-4 text-sm font-semibold text-violet-200 transition-colors hover:bg-violet-500/15'
                        : 'inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                    }
                  >
                    <SlidersHorizontal className="size-4" />
                    Фильтры
                    {activeLibraryFilterCount > 0 && (
                      <span className="flex min-w-5 items-center justify-center rounded-md bg-violet-400/15 px-1.5 text-[11px] text-violet-100">
                        {activeLibraryFilterCount}
                      </span>
                    )}
                  </button>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content
                    align="end"
                    sideOffset={8}
                    collisionPadding={12}
                    className="z-[70] w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-4 shadow-2xl outline-none"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-sm font-semibold text-[var(--app-text)]">Фильтры хранилища</h2>
                        <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
                          Фильтруйте записи по типу и состоянию безопасности.
                        </p>
                      </div>
                      <Tooltip content="Закрыть фильтры" side="top">
                        <Popover.Close asChild>
                          <button
                            type="button"
                            aria-label="Закрыть фильтры"
                            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                          >
                            <X className="size-4" />
                          </button>
                        </Popover.Close>
                      </Tooltip>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <span className="block text-xs font-medium text-[var(--app-muted)]">Тип</span>
                        <AppSelect
                          ariaLabel="Фильтр по типу записи"
                          value={typeFilter}
                          options={[{ value: 'all', label: 'Все типы' }, ...PASSWORD_TYPE_OPTIONS]}
                          onValueChange={(value) => setTypeFilter(value as PasswordTypeFilter)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <span className="block text-xs font-medium text-[var(--app-muted)]">Безопасность</span>
                        <AppSelect
                          ariaLabel="Фильтр по безопасности"
                          value={issueFilter}
                          options={[
                            { value: 'all', label: 'Любая безопасность' },
                            { value: 'weak', label: 'Слабые' },
                            { value: 'reused', label: 'Повторяющиеся' },
                            { value: 'old', label: 'Старые пароли' }
                          ]}
                          onValueChange={(value) => setIssueFilter(value as PasswordIssueFilter)}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--app-border)] pt-3">
                      <span className="text-[11px] text-[var(--app-muted)]">Изменения применяются сразу</span>
                      <button
                        type="button"
                        disabled={activeLibraryFilterCount === 0}
                        className="h-8 rounded-lg px-2.5 text-xs font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:cursor-default disabled:opacity-40"
                        onClick={() => {
                          setTypeFilter('all')
                          setIssueFilter('all')
                        }}
                      >
                        Сбросить
                      </button>
                    </div>
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>
            )}
          </div>
        </div>
'''

text = text[:start] + replacement + text[end:]
path.write_text(text, encoding='utf-8')
