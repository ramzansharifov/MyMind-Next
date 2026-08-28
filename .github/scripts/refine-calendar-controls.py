from pathlib import Path

PAGE = Path('src/renderer/src/modules/calendar/CalendarPage.tsx')
TEST = Path('src/renderer/src/modules/calendar/CalendarPage.test.tsx')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'marker not found: {label}')
    return text.replace(old, new, 1)


text = PAGE.read_text(encoding='utf-8')

text = replace_once(
    text,
    "import { AppDialog } from '../../shared/ui/AppDialog'\nimport { ModuleHeader } from '../../shared/ui/ModuleHeader'\n",
    "import { AppDateField } from '../../shared/ui/AppDateField'\nimport { AppDialog } from '../../shared/ui/AppDialog'\nimport { AppSelect } from '../../shared/ui/AppSelect'\nimport { ModuleHeader } from '../../shared/ui/ModuleHeader'\n",
    'shared ui imports',
)

text = replace_once(
    text,
    "const DATE_FORMATTER = new Intl.DateTimeFormat('ru-RU', {\n  day: 'numeric',\n  month: 'long',\n  year: 'numeric'\n})\n\nfunction pad(value: number): string {\n",
    "const DATE_FORMATTER = new Intl.DateTimeFormat('ru-RU', {\n  day: 'numeric',\n  month: 'long',\n  year: 'numeric'\n})\nconst NO_TIME_VALUE = '__none__'\nconst EVENT_KIND_OPTIONS = [\n  { value: 'one_time', label: 'Одноразовое' },\n  { value: 'annual', label: 'Ежегодное' }\n] as const\nconst REMINDER_UNIT_OPTIONS = [\n  { value: 'minutes', label: 'минут' },\n  { value: 'hours', label: 'часов' },\n  { value: 'days', label: 'дней' },\n  { value: 'weeks', label: 'недель' }\n] as const\nconst ANNUAL_MONTH_OPTIONS = [\n  { value: '01', label: 'января' },\n  { value: '02', label: 'февраля' },\n  { value: '03', label: 'марта' },\n  { value: '04', label: 'апреля' },\n  { value: '05', label: 'мая' },\n  { value: '06', label: 'июня' },\n  { value: '07', label: 'июля' },\n  { value: '08', label: 'августа' },\n  { value: '09', label: 'сентября' },\n  { value: '10', label: 'октября' },\n  { value: '11', label: 'ноября' },\n  { value: '12', label: 'декабря' }\n] as const\nconst TIME_HOUR_OPTIONS = [\n  { value: NO_TIME_VALUE, label: 'Без времени' },\n  ...Array.from({ length: 24 }, (_, hour) => ({\n    value: String(hour).padStart(2, '0'),\n    label: String(hour).padStart(2, '0')\n  }))\n]\nconst TIME_MINUTE_OPTIONS = Array.from({ length: 60 }, (_, minute) => ({\n  value: String(minute).padStart(2, '0'),\n  label: String(minute).padStart(2, '0')\n}))\n\nfunction pad(value: number): string {\n",
    'calendar select options',
)

text = replace_once(
    text,
    "function occurrenceKey(event: CalendarOccurrenceRecord): string {\n  return `${event.eventId}:${event.occurrenceDate}`\n}\n\nfunction plural",
    "function occurrenceKey(event: CalendarOccurrenceRecord): string {\n  return `${event.eventId}:${event.occurrenceDate}`\n}\n\nfunction annualDayOptions(value: string): { value: string; label: string }[] {\n  const month = Number(value.slice(5, 7)) || 1\n  const days = new Date(2024, month, 0, 12).getDate()\n  return Array.from({ length: days }, (_, index) => {\n    const day = pad(index + 1)\n    return { value: day, label: String(index + 1) }\n  })\n}\n\nfunction withAnnualMonth(value: string, month: string): string {\n  const year = value.slice(0, 4) || String(new Date().getFullYear())\n  const currentDay = Number(value.slice(8, 10)) || 1\n  const maxDay = new Date(2024, Number(month), 0, 12).getDate()\n  return `${year}-${month}-${pad(Math.min(currentDay, maxDay))}`\n}\n\nfunction withAnnualDay(value: string, day: string): string {\n  const year = value.slice(0, 4) || String(new Date().getFullYear())\n  const month = value.slice(5, 7) || '01'\n  return `${year}-${month}-${day}`\n}\n\nfunction annualOccurrenceDate(occurrenceDate: string, templateDate: string): string {\n  return `${occurrenceDate.slice(0, 4)}-${templateDate.slice(5)}`\n}\n\nfunction plural",
    'annual date helpers',
)

text = text.replace('  startDate: string\n', '  startYear: string\n', 1)
text = text.replace("    startDate: '',\n", "    startYear: String(new Date().getFullYear()),\n", 1)
text = text.replace("    startDate: event.startDate ?? '',\n", "    startYear: event.startDate?.slice(0, 4) ?? '',\n", 1)

text = replace_once(
    text,
    "  function goToday(): void {\n    setMonth(monthKey(new Date()))\n    setSelectedDate(today)\n    setSelectedEventKey(null)\n  }\n\n  function openCreate",
    "  function goToday(): void {\n    setMonth(monthKey(new Date()))\n    setSelectedDate(today)\n    setSelectedEventKey(null)\n  }\n\n  function goToDate(value: string): void {\n    if (!value) return\n    setMonth(monthKey(parseDate(value)))\n    setSelectedDate(value)\n    setSelectedEventKey(null)\n  }\n\n  function openCreate",
    'go to exact date',
)

old_save = """      const input = {
        title: editor.title.trim(),
        kind: editor.kind,
        date: editor.date,
        time: editor.time || null,
        startDate: editor.kind === 'annual' && editor.startDate ? editor.startDate : null,
        note: editor.note,
        reminderOffsets: editor.reminderOffsets
      }
      if (editor.eventId) {
        await window.api.calendar.updateEvent({
          ...input,
          id: editor.eventId,
          occurrenceDate: editor.occurrenceDate
        })
      } else {
        const created = await window.api.calendar.createEvent(input)
        setSelectedDate(editor.date)
        setSelectedEventKey(`${created.id}:${editor.date}`)
      }
      setEditor(null)
"""
new_save = """      const occurrenceDate =
        editor.kind === 'annual'
          ? annualOccurrenceDate(editor.occurrenceDate, editor.date)
          : editor.date
      const startDate =
        editor.kind === 'annual' && editor.startYear.trim()
          ? `${editor.startYear.trim()}-${editor.date.slice(5)}`
          : null
      const input = {
        title: editor.title.trim(),
        kind: editor.kind,
        date: editor.date,
        time: editor.time || null,
        startDate,
        note: editor.note,
        reminderOffsets: editor.reminderOffsets
      }
      let eventId = editor.eventId
      if (editor.eventId) {
        await window.api.calendar.updateEvent({
          ...input,
          id: editor.eventId,
          occurrenceDate
        })
      } else {
        const created = await window.api.calendar.createEvent(input)
        eventId = created.id
      }
      setSelectedDate(occurrenceDate)
      setSelectedEventKey(eventId ? `${eventId}:${occurrenceDate}` : null)
      setMonth(monthKey(parseDate(occurrenceDate)))
      setEditor(null)
"""
text = replace_once(text, old_save, new_save, 'save annual year semantics')

old_toolbar = """          <div className="grid min-h-14 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-[var(--app-border)] bg-[var(--app-workspace)] px-3 py-2">
            <div className="flex items-center gap-1 justify-self-start">
              <button
                type="button"
                aria-label="Предыдущий месяц"
                className="flex size-9 items-center justify-center rounded-lg text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                onClick={() => shiftMonth(-1)}
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Следующий месяц"
                className="flex size-9 items-center justify-center rounded-lg text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                onClick={() => shiftMonth(1)}
              >
                <ChevronRight className="size-4" />
              </button>
              <button
                type="button"
                className="ml-1 h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] px-3 text-xs font-medium text-[var(--app-text)] transition-colors hover:bg-[var(--app-control-hover)]"
                onClick={goToday}
              >
                Сегодня
              </button>
            </div>

            <strong className="text-sm font-semibold text-[var(--app-text)] capitalize sm:text-base">
              {MONTH_FORMATTER.format(parseDate(month))}
            </strong>

            <div className="justify-self-end rounded-lg border border-violet-500/15 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-200">
              Месяц
            </div>
          </div>
"""
new_toolbar = """          <div className="grid min-h-14 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-[var(--app-border)] bg-[var(--app-workspace)] px-3 py-2">
            <button
              type="button"
              className="h-9 justify-self-start rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] px-3 text-xs font-medium text-[var(--app-text)] transition-colors hover:bg-[var(--app-control-hover)]"
              onClick={goToday}
            >
              Сегодня
            </button>

            <div className="flex min-w-0 items-center justify-center gap-2 sm:gap-3">
              <button
                type="button"
                aria-label="Предыдущий месяц"
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                onClick={() => shiftMonth(-1)}
              >
                <ChevronLeft className="size-4" />
              </button>
              <strong className="min-w-[150px] text-center text-sm font-semibold text-[var(--app-text)] capitalize sm:min-w-[180px] sm:text-base">
                {MONTH_FORMATTER.format(parseDate(month))}
              </strong>
              <button
                type="button"
                aria-label="Следующий месяц"
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                onClick={() => shiftMonth(1)}
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <AppDateField
              value={selectedDate}
              onChange={goToDate}
              ariaLabel="Точная дата календаря"
              calendarButtonLabel="Выбрать точную дату календаря"
              className="w-[176px] justify-self-end"
              inputClassName="h-9 rounded-lg bg-[var(--app-card)] text-xs"
            />
          </div>
"""
text = replace_once(text, old_toolbar, new_toolbar, 'calendar toolbar')

old_selected = """                    !inMonth && 'bg-[var(--app-workspace)]/40',
                    isSelected
                      ? 'bg-violet-500/[0.07] shadow-[inset_0_0_0_1px_rgba(139,92,246,0.32)]'
                      : 'hover:bg-[var(--app-card-hover)]'
                  )}
                  onClick={() => selectDay(day)}
"""
new_selected = """                    !inMonth && 'bg-[var(--app-workspace)]/40',
                    !isSelected && 'hover:bg-[var(--app-card-hover)]'
                  )}
                  style={
                    isSelected
                      ? {
                          backgroundColor:
                            'color-mix(in srgb, var(--app-accent-500) 7%, transparent)',
                          boxShadow:
                            'inset 0 0 0 1px color-mix(in srgb, var(--app-accent-500) 48%, transparent)'
                        }
                      : undefined
                  }
                  onClick={() => selectDay(day)}
"""
text = replace_once(text, old_selected, new_selected, 'accent selected cell')

text = text.replace(
    "                      {formatDate(selectedEvent.startDate)}\n",
    "                      {selectedEvent.startDate.slice(0, 4)} год\n",
    1,
)

old_form = """            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-[var(--app-muted)]">
                  Тип события
                </span>
                <select
                  value={editor.kind}
                  className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none"
                  onChange={(event) =>
                    setEditor({ ...editor, kind: event.target.value as CalendarEventKind })
                  }
                >
                  <option value="one_time">Одноразовое</option>
                  <option value="annual">Ежегодное</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-[var(--app-muted)]">
                  Дата
                </span>
                <input
                  type="date"
                  value={editor.date}
                  className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none"
                  onChange={(event) => setEditor({ ...editor, date: event.target.value })}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-[var(--app-muted)]">
                  Время, необязательно
                </span>
                <input
                  type="time"
                  value={editor.time}
                  className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none"
                  onChange={(event) => setEditor({ ...editor, time: event.target.value })}
                />
              </label>
              {editor.kind === 'annual' && (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-[var(--app-muted)]">
                    Начало даты, необязательно
                  </span>
                  <input
                    type="date"
                    value={editor.startDate}
                    className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none"
                    onChange={(event) => setEditor({ ...editor, startDate: event.target.value })}
                  />
                </label>
              )}
            </div>
"""
new_form = """            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="mb-1.5 block text-xs font-medium text-[var(--app-muted)]">
                  Тип события
                </span>
                <AppSelect
                  value={editor.kind}
                  options={EVENT_KIND_OPTIONS}
                  ariaLabel="Тип события"
                  triggerClassName="h-11 border border-[var(--app-border)]"
                  onValueChange={(value) =>
                    setEditor({ ...editor, kind: value as CalendarEventKind })
                  }
                />
              </div>

              <div>
                <span className="mb-1.5 block text-xs font-medium text-[var(--app-muted)]">
                  Дата
                </span>
                {editor.kind === 'one_time' ? (
                  <AppDateField
                    value={editor.date}
                    onChange={(value) => setEditor({ ...editor, date: value })}
                    ariaLabel="Дата события"
                    calendarButtonLabel="Выбрать дату события"
                    inputClassName="h-11"
                  />
                ) : (
                  <div className="grid grid-cols-[0.8fr_1.2fr] gap-2">
                    <AppSelect
                      value={editor.date.slice(8, 10)}
                      options={annualDayOptions(editor.date)}
                      ariaLabel="День ежегодного события"
                      triggerClassName="h-11 border border-[var(--app-border)]"
                      onValueChange={(value) =>
                        setEditor({ ...editor, date: withAnnualDay(editor.date, value) })
                      }
                    />
                    <AppSelect
                      value={editor.date.slice(5, 7)}
                      options={ANNUAL_MONTH_OPTIONS}
                      ariaLabel="Месяц ежегодного события"
                      triggerClassName="h-11 border border-[var(--app-border)]"
                      onValueChange={(value) =>
                        setEditor({ ...editor, date: withAnnualMonth(editor.date, value) })
                      }
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="mb-1.5 block text-xs font-medium text-[var(--app-muted)]">
                  Время, необязательно
                </span>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <AppSelect
                    value={editor.time ? editor.time.slice(0, 2) : NO_TIME_VALUE}
                    options={TIME_HOUR_OPTIONS}
                    ariaLabel="Часы события"
                    triggerClassName="h-11 border border-[var(--app-border)]"
                    onValueChange={(value) =>
                      setEditor({
                        ...editor,
                        time:
                          value === NO_TIME_VALUE
                            ? ''
                            : `${value}:${editor.time ? editor.time.slice(3, 5) : '00'}`
                      })
                    }
                  />
                  <span className="text-sm font-semibold text-[var(--app-muted)]">:</span>
                  <AppSelect
                    value={editor.time ? editor.time.slice(3, 5) : '00'}
                    options={TIME_MINUTE_OPTIONS}
                    ariaLabel="Минуты события"
                    disabled={!editor.time}
                    triggerClassName="h-11 border border-[var(--app-border)]"
                    onValueChange={(value) =>
                      setEditor({ ...editor, time: `${editor.time.slice(0, 2)}:${value}` })
                    }
                  />
                </div>
              </div>

              {editor.kind === 'annual' && (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-[var(--app-muted)]">
                    Год начала, необязательно
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    value={editor.startYear}
                    placeholder={String(new Date().getFullYear())}
                    aria-label="Год начала"
                    className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent-500)]"
                    onChange={(event) =>
                      setEditor({ ...editor, startYear: event.target.value.replace(/\\D/g, '').slice(0, 4) })
                    }
                  />
                </label>
              )}
            </div>
"""
text = replace_once(text, old_form, new_form, 'radix event form')

old_unit = """                <select
                  value={reminderUnit}
                  className="h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none"
                  onChange={(event) => setReminderUnit(event.target.value as typeof reminderUnit)}
                >
                  <option value="minutes">минут</option>
                  <option value="hours">часов</option>
                  <option value="days">дней</option>
                  <option value="weeks">недель</option>
                </select>
"""
new_unit = """                <div className="w-32">
                  <AppSelect
                    value={reminderUnit}
                    options={REMINDER_UNIT_OPTIONS}
                    ariaLabel="Единица напоминания"
                    triggerClassName="h-10 border border-[var(--app-border)]"
                    onValueChange={(value) => setReminderUnit(value as typeof reminderUnit)}
                  />
                </div>
"""
text = replace_once(text, old_unit, new_unit, 'radix reminder unit')

text = text.replace(
    '                Заметка именно на {formatOccurrenceDate(editor.occurrenceDate)}\n',
    "                Заметка именно на {formatOccurrenceDate(editor.kind === 'annual' ? annualOccurrenceDate(editor.occurrenceDate, editor.date) : editor.date)}\n",
    1,
)

PAGE.write_text(text, encoding='utf-8')

# Extend regression coverage around toolbar placement and annual date semantics.
test = TEST.read_text(encoding='utf-8')
test = replace_once(
    test,
    "    expect(calendarGrid).toContainElement(screen.getByRole('button', { name: 'Сегодня' }))\n",
    "    expect(calendarGrid).toContainElement(screen.getByRole('button', { name: 'Сегодня' }))\n    expect(calendarGrid).toContainElement(screen.getByLabelText('Точная дата календаря'))\n",
    'toolbar exact date test',
)
test = replace_once(
    test,
    "    expect(\n      within(detailPanel).getByRole('button', { name: 'Редактировать событие' })\n    ).toBeInTheDocument()\n",
    "    const editButton = within(detailPanel).getByRole('button', { name: 'Редактировать событие' })\n    expect(editButton).toBeInTheDocument()\n\n    await user.click(editButton)\n\n    expect(screen.getByLabelText('День ежегодного события')).toBeInTheDocument()\n    expect(screen.getByLabelText('Месяц ежегодного события')).toBeInTheDocument()\n    expect(screen.getByLabelText('Год начала')).toHaveValue(year - 5)\n    expect(screen.getByLabelText('Часы события')).toBeInTheDocument()\n    expect(screen.getByLabelText('Минуты события')).toBeInTheDocument()\n    expect(screen.queryByLabelText('Дата события')).not.toBeInTheDocument()\n",
    'annual radix form test',
)
TEST.write_text(test, encoding='utf-8')
