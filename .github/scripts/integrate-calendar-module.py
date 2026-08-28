from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'marker not found in {path}: {old[:80]!r}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')

# Calendar loading is deferred to the next task so React effects only synchronize with the external API.
replace(
    'src/renderer/src/modules/calendar/CalendarPage.tsx',
    "  useEffect(() => {\n    void load()\n  }, [load])\n",
    "  useEffect(() => {\n    const initialLoad = window.setTimeout(() => void load(), 0)\n    return () => window.clearTimeout(initialLoad)\n  }, [load])\n",
)

# IPC registration
replace(
    'src/main/ipc/register-ipc.ts',
    "import { registerBoardsIpcHandlers } from './register-boards-ipc'\n",
    "import { registerBoardsIpcHandlers } from './register-boards-ipc'\nimport { registerCalendarIpcHandlers } from './register-calendar-ipc'\n",
)
replace(
    'src/main/ipc/register-ipc.ts',
    '  registerBoardsIpcHandlers()\n  registerNotesIpcHandlers()\n',
    '  registerBoardsIpcHandlers()\n  registerCalendarIpcHandlers()\n  registerNotesIpcHandlers()\n',
)

# Preload API
replace(
    'src/preload/index.ts',
    "import { BOARD_IPC_CHANNELS, type BoardDocument, type BoardNode } from '../shared/contracts/boards'\n",
    "import { BOARD_IPC_CHANNELS, type BoardDocument, type BoardNode } from '../shared/contracts/boards'\nimport { CALENDAR_IPC_CHANNELS } from '../shared/contracts/calendar'\n",
)
replace(
    'src/preload/index.ts',
    "  diary: {\n    listOverview: () => ipcRenderer.invoke(DIARY_IPC_CHANNELS.listOverview),\n",
    "  calendar: {\n    listRange: (input) => ipcRenderer.invoke(CALENDAR_IPC_CHANNELS.listRange, input),\n    listUpcomingReminders: (input) =>\n      ipcRenderer.invoke(CALENDAR_IPC_CHANNELS.listUpcomingReminders, input),\n    createEvent: (input) => ipcRenderer.invoke(CALENDAR_IPC_CHANNELS.createEvent, input),\n    updateEvent: (input) => ipcRenderer.invoke(CALENDAR_IPC_CHANNELS.updateEvent, input),\n    deleteEvent: (input) => ipcRenderer.invoke(CALENDAR_IPC_CHANNELS.deleteEvent, input),\n    setOccurrenceNote: (input) =>\n      ipcRenderer.invoke(CALENDAR_IPC_CHANNELS.setOccurrenceNote, input),\n    setOccurrenceHidden: (input) =>\n      ipcRenderer.invoke(CALENDAR_IPC_CHANNELS.setOccurrenceHidden, input)\n  },\n\n  diary: {\n    listOverview: () => ipcRenderer.invoke(DIARY_IPC_CHANNELS.listOverview),\n",
)

# Main-process scheduler
replace(
    'src/main/index.ts',
    "import { mainOperationTracker } from './services/main-operation-tracker'\n",
    "import { CalendarReminderScheduler } from './services/calendar-reminder-scheduler'\nimport { mainOperationTracker } from './services/main-operation-tracker'\n",
)
replace(
    'src/main/index.ts',
    'let mainWindow: BrowserWindow | null = null\n',
    "let mainWindow: BrowserWindow | null = null\nconst calendarReminderScheduler = new CalendarReminderScheduler(() => mainWindow)\n",
)
replace(
    'src/main/index.ts',
    'function closeApplicationResources(): void {\n  clearTrackedPasswordClipboard()\n',
    'function closeApplicationResources(): void {\n  calendarReminderScheduler.stop()\n  clearTrackedPasswordClipboard()\n',
)
replace(
    'src/main/index.ts',
    '    createWindow()\n\n    app.on(\'activate\', () => {\n',
    "    createWindow()\n    calendarReminderScheduler.start()\n\n    app.on('activate', () => {\n",
)

# Module registry
replace(
    'src/renderer/src/app/module-registry.ts',
    '  BookHeart,\n  Disc3,\n',
    '  BookHeart,\n  CalendarDays,\n  Disc3,\n',
)
replace(
    'src/renderer/src/app/module-registry.ts',
    "const DiaryModule = lazy(() =>\n  import('../modules/diary/DiaryPage').then(({ DiaryPage }) => ({ default: DiaryPage }))\n) as ComponentType<AppModuleProps>\n",
    "const CalendarModule = lazy(() =>\n  import('../modules/calendar/CalendarPage').then(({ CalendarPage }) => ({ default: CalendarPage }))\n) as ComponentType<AppModuleProps>\nconst DiaryModule = lazy(() =>\n  import('../modules/diary/DiaryPage').then(({ DiaryPage }) => ({ default: DiaryPage }))\n) as ComponentType<AppModuleProps>\n",
)
replace(
    'src/renderer/src/app/module-registry.ts',
    "  diary: {\n    id: 'diary',\n",
    "  calendar: {\n    id: 'calendar',\n    label: 'Календарь',\n    loadingLabel: 'Загрузка календаря',\n    icon: CalendarDays,\n    navigationGroup: 'primary',\n    workspaceLayout: 'standard',\n    component: CalendarModule\n  },\n  diary: {\n    id: 'diary',\n",
)

# Home module: module card + reminder surface
home = Path('src/renderer/src/modules/home/HomeModule.tsx')
text = home.read_text(encoding='utf-8')
text = text.replace("  BookHeart,\n  Disc3,\n", "  Bell,\n  BookHeart,\n  CalendarDays,\n  Disc3,\n", 1)
text = text.replace("} from 'lucide-react'\n\n", "} from 'lucide-react'\nimport { useCallback, useEffect, useState } from 'react'\n\nimport type { CalendarReminderRecord } from '../../../../shared/contracts/calendar'\n", 1)
text = text.replace(
    "  { id: 'nutrition', label: 'Питание', icon: Utensils },\n  { id: 'diary', label: 'Дневник', icon: BookHeart },\n",
    "  { id: 'nutrition', label: 'Питание', icon: Utensils },\n  { id: 'calendar', label: 'Календарь', icon: CalendarDays },\n  { id: 'diary', label: 'Дневник', icon: BookHeart },\n",
    1,
)
old_start = "export function HomeModule(): React.JSX.Element {\n  return (\n"
new_start = r'''function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function reminderTimeLabel(reminder: CalendarReminderRecord): string {
  const trigger = new Date(reminder.triggerAt)
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(trigger)
}

export function HomeModule(): React.JSX.Element {
  const [reminders, setReminders] = useState<CalendarReminderRecord[]>([])

  const loadReminders = useCallback(async (): Promise<void> => {
    const from = new Date()
    const to = new Date(from)
    to.setDate(to.getDate() + 14)
    try {
      setReminders(
        (await window.api.calendar.listUpcomingReminders({
          from: localDateKey(from),
          to: localDateKey(to)
        })).slice(0, 6)
      )
    } catch (reason: unknown) {
      console.error('Failed to load calendar reminders for Home', reason)
    }
  }, [])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadReminders(), 0)
    const interval = window.setInterval(() => void loadReminders(), 60_000)
    const handleFocus = (): void => void loadReminders()
    window.addEventListener('focus', handleFocus)
    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [loadReminders])

  return (
'''
if old_start not in text:
    raise SystemExit('HomeModule function marker not found')
text = text.replace(old_start, new_start, 1)
section_marker = '''        <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-[var(--app-shadow-card)]">'''
reminder_section = r'''        {reminders.length > 0 && (
          <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-semibold text-[var(--app-text)]">
                <Bell className="size-4 text-violet-300" /> Ближайшие напоминания
              </div>
              <button
                type="button"
                className="text-xs text-[var(--app-muted)] hover:text-[var(--app-text)]"
                onClick={() => requestAppModuleNavigation({ view: 'calendar' })}
              >
                Открыть календарь
              </button>
            </div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {reminders.map((reminder) => (
                <button
                  key={`${reminder.reminderId}:${reminder.occurrenceDate}`}
                  type="button"
                  className="rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] px-3 py-2.5 text-left hover:bg-[var(--app-card-hover)]"
                  onClick={() => requestAppModuleNavigation({ view: 'calendar' })}
                >
                  <div className="truncate text-sm font-medium text-[var(--app-text)]">{reminder.title}</div>
                  <div className="mt-1 text-xs text-[var(--app-muted)]">{reminderTimeLabel(reminder)}</div>
                </button>
              ))}
            </div>
          </section>
        )}

'''
if section_marker not in text:
    raise SystemExit('HomeModule cards section marker not found')
text = text.replace(section_marker, reminder_section + section_marker, 1)
home.write_text(text, encoding='utf-8')
