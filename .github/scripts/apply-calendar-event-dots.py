from pathlib import Path


def replace_exact(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'marker not found in {path}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_exact(
    'src/renderer/src/modules/calendar/CalendarPage.tsx',
    '''                  <div className="space-y-1">\n                    {dayEvents.slice(0, 3).map((event) => {\n                      const active = selectedEventKey === occurrenceKey(event)\n                      return (\n                        <button\n                          key={occurrenceKey(event)}\n                          type="button"\n                          aria-label={`Открыть событие ${event.title}`}\n                          className={cn(\n                            'flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11px] transition-colors',\n                            active\n                              ? 'bg-violet-500/20 text-violet-100'\n                              : 'bg-violet-500/8 text-[var(--app-text)] hover:bg-violet-500/14'\n                          )}\n                          onClick={(clickEvent) => {\n                            clickEvent.stopPropagation()\n                            selectEvent(event)\n                          }}\n                        >\n                          <span className="size-1.5 shrink-0 rounded-full bg-violet-400" />\n                          {event.kind === 'annual' && (\n                            <Repeat2 className="size-3 shrink-0 opacity-70" />\n                          )}\n                          <span className="truncate">\n                            {event.time ? `${event.time} ` : ''}\n                            {event.title}\n                          </span>\n                        </button>\n                      )\n                    })}\n                    {dayEvents.length > 3 && (\n                      <div className="px-1.5 text-[10px] text-[var(--app-muted)]">\n                        +{dayEvents.length - 3} ещё\n                      </div>\n                    )}\n                  </div>\n''',
    '''                  {dayEvents.length > 0 && (\n                    <div\n                      data-testid={`calendar-event-dots-${day}`}\n                      className="flex flex-wrap items-center gap-1.5 px-1 pt-1"\n                    >\n                      {dayEvents.map((event) => {\n                        const active = selectedEventKey === occurrenceKey(event)\n                        return (\n                          <button\n                            key={occurrenceKey(event)}\n                            type="button"\n                            aria-label={`Открыть событие ${event.title}`}\n                            className={cn(\n                              'size-2 rounded-full transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-surface)]',\n                              active && 'scale-125'\n                            )}\n                            style={{\n                              backgroundColor: 'var(--app-accent-500)',\n                              boxShadow: active\n                                ? '0 0 0 2px color-mix(in srgb, var(--app-accent-500) 28%, transparent)'\n                                : undefined\n                            }}\n                            onClick={(clickEvent) => {\n                              clickEvent.stopPropagation()\n                              selectEvent(event)\n                            }}\n                          />\n                        )\n                      })}\n                    </div>\n                  )}\n''',
)

replace_exact(
    'src/renderer/src/modules/calendar/CalendarPage.test.tsx',
    '''    const eventButton = await screen.findByRole('button', { name: 'Открыть событие Годовщина' })\n    const calendarGrid = screen.getByTestId('calendar-grid')\n''',
    '''    const calendarGrid = screen.getByTestId('calendar-grid')\n    const eventButton = await within(calendarGrid).findByRole('button', {\n      name: 'Открыть событие Годовщина'\n    })\n''',
)

replace_exact(
    'src/renderer/src/modules/calendar/CalendarPage.test.tsx',
    '''    expect(calendarGrid).toContainElement(screen.getByLabelText('Точная дата календаря'))\n    expect(moduleHeader).not.toContainElement(\n''',
    '''    expect(calendarGrid).toContainElement(screen.getByLabelText('Точная дата календаря'))\n    expect(within(calendarGrid).queryByText('Годовщина')).not.toBeInTheDocument()\n    expect(moduleHeader).not.toContainElement(\n''',
)
