from __future__ import annotations

import json
from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding='utf-8')


def write(path: str, content: str) -> None:
    file = Path(path)
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(content, encoding='utf-8')


def replace_once(path: str, old: str, new: str, label: str) -> None:
    text = read(path)
    if old not in text:
        raise SystemExit(f'marker not found for {label} in {path}')
    write(path, text.replace(old, new, 1))


# Shared calendar contract: persistent unread inbox + renderer push signal.
path = 'src/shared/contracts/calendar.ts'
text = read(path)
text = text.replace(
    "export interface CalendarRangeInput {\n",
    "export interface CalendarUnreadReminderRecord extends CalendarReminderRecord {\n"
    "  deliveryId: string\n"
    "  deliveredAt: number\n"
    "}\n\n"
    "export interface CalendarAcknowledgeReminderInput {\n"
    "  deliveryId: string\n"
    "}\n\n"
    "export interface CalendarRangeInput {\n",
    1,
)
text = text.replace(
    "  listUpcomingReminders: 'calendar:list-upcoming-reminders',\n",
    "  listUpcomingReminders: 'calendar:list-upcoming-reminders',\n"
    "  listUnreadReminders: 'calendar:list-unread-reminders',\n"
    "  acknowledgeReminder: 'calendar:acknowledge-reminder',\n"
    "  remindersChanged: 'calendar:reminders-changed',\n",
    1,
)
text = text.replace(
    "  listUpcomingReminders(input: CalendarRangeInput): Promise<CalendarReminderRecord[]>\n",
    "  listUpcomingReminders(input: CalendarRangeInput): Promise<CalendarReminderRecord[]>\n"
    "  listUnreadReminders(): Promise<CalendarUnreadReminderRecord[]>\n"
    "  acknowledgeReminder(input: CalendarAcknowledgeReminderInput): Promise<boolean>\n"
    "  onRemindersChanged(listener: () => void): () => void\n",
    1,
)
write(path, text)

# Validation for explicit acknowledgement.
path = 'src/shared/validation/calendar.ts'
text = read(path)
text += "\nexport const calendarAcknowledgeReminderInputSchema = z.object({\n  deliveryId: z.string().uuid()\n})\n"
write(path, text)

# Drizzle schema: make delivery rows durable snapshots independent of reminder edits.
path = 'src/main/database/schema/calendar.ts'
text = read(path)
old = """export const calendarReminderDeliveries = sqliteTable(
  'calendar_reminder_deliveries',
  {
    id: text('id').primaryKey(),
    reminderId: text('reminder_id')
      .notNull()
      .references(() => calendarEventReminders.id, { onDelete: 'cascade' }),
    occurrenceDate: text('occurrence_date').notNull(),
    deliveredAt: integer('delivered_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [
    uniqueIndex('calendar_deliveries_reminder_date_unique').on(
      table.reminderId,
      table.occurrenceDate
    ),
    index('calendar_deliveries_delivered_idx').on(table.deliveredAt)
  ]
)
"""
new = """export const calendarReminderDeliveries = sqliteTable(
  'calendar_reminder_deliveries',
  {
    id: text('id').primaryKey(),
    reminderId: text('reminder_id').notNull(),
    eventId: text('event_id').notNull(),
    occurrenceDate: text('occurrence_date').notNull(),
    title: text('title').notNull(),
    eventTime: text('event_time'),
    offsetMinutes: integer('offset_minutes').notNull(),
    deliveredAt: integer('delivered_at', { mode: 'timestamp_ms' }).notNull(),
    acknowledgedAt: integer('acknowledged_at', { mode: 'timestamp_ms' })
  },
  (table) => [
    uniqueIndex('calendar_deliveries_reminder_date_unique').on(
      table.reminderId,
      table.occurrenceDate
    ),
    index('calendar_deliveries_delivered_idx').on(table.deliveredAt),
    index('calendar_deliveries_acknowledged_idx').on(table.acknowledgedAt)
  ]
)
"""
if old not in text:
    raise SystemExit('calendar delivery schema marker not found')
write(path, text.replace(old, new, 1))

# Migration upgrades existing deliveries as already acknowledged so historical notifications do not reappear.
write(
    'drizzle/0037_calendar_unread_reminders.sql',
    """CREATE TABLE `calendar_reminder_deliveries_new` (
  `id` text PRIMARY KEY NOT NULL,
  `reminder_id` text NOT NULL,
  `event_id` text NOT NULL,
  `occurrence_date` text NOT NULL,
  `title` text NOT NULL,
  `event_time` text,
  `offset_minutes` integer NOT NULL,
  `delivered_at` integer NOT NULL,
  `acknowledged_at` integer
);
--> statement-breakpoint
INSERT INTO `calendar_reminder_deliveries_new` (`id`, `reminder_id`, `event_id`, `occurrence_date`, `title`, `event_time`, `offset_minutes`, `delivered_at`, `acknowledged_at`)
SELECT d.`id`, d.`reminder_id`, r.`event_id`, d.`occurrence_date`, e.`title`, e.`event_time`, r.`offset_minutes`, d.`delivered_at`, d.`delivered_at`
FROM `calendar_reminder_deliveries` d
INNER JOIN `calendar_event_reminders` r ON r.`id` = d.`reminder_id`
INNER JOIN `calendar_events` e ON e.`id` = r.`event_id`;
--> statement-breakpoint
DROP TABLE `calendar_reminder_deliveries`;
--> statement-breakpoint
ALTER TABLE `calendar_reminder_deliveries_new` RENAME TO `calendar_reminder_deliveries`;
--> statement-breakpoint
CREATE UNIQUE INDEX `calendar_deliveries_reminder_date_unique` ON `calendar_reminder_deliveries` (`reminder_id`,`occurrence_date`);
--> statement-breakpoint
CREATE INDEX `calendar_deliveries_delivered_idx` ON `calendar_reminder_deliveries` (`delivered_at`);
--> statement-breakpoint
CREATE INDEX `calendar_deliveries_acknowledged_idx` ON `calendar_reminder_deliveries` (`acknowledged_at`);
""",
)

journal_path = Path('drizzle/meta/_journal.json')
journal = json.loads(journal_path.read_text(encoding='utf-8'))
if not any(entry.get('tag') == '0037_calendar_unread_reminders' for entry in journal['entries']):
    journal['entries'].append(
        {
            'idx': 37,
            'version': '6',
            'when': 1787990400000,
            'tag': '0037_calendar_unread_reminders',
            'breakpoints': True,
        }
    )
journal_path.write_text(json.dumps(journal, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

# Repository: delivery rows are now durable unread snapshots and are acknowledged explicitly.
path = 'src/main/repositories/calendar.repository.ts'
text = read(path)
text = text.replace(
    "  CalendarCreateEventInput,\n",
    "  CalendarAcknowledgeReminderInput,\n  CalendarCreateEventInput,\n",
    1,
)
text = text.replace(
    "  CalendarReminderRecord,\n",
    "  CalendarReminderRecord,\n  CalendarUnreadReminderRecord,\n",
    1,
)
old_mark = """export function markCalendarReminderDelivered(reminderId: string, occurrenceDate: string): boolean {
  try {
    getSqlite()
      .prepare(
        'INSERT INTO calendar_reminder_deliveries (id, reminder_id, occurrence_date, delivered_at) VALUES (?, ?, ?, ?)'
      )
      .run(randomUUID(), reminderId, occurrenceDate, Date.now())
    return true
  } catch (reason: unknown) {
    if (reason instanceof Error && /UNIQUE constraint failed/.test(reason.message)) return false
    throw reason
  }
}
"""
new_mark = """export function markCalendarReminderDelivered(reminder: CalendarReminderRecord): boolean {
  try {
    getSqlite()
      .prepare(
        'INSERT INTO calendar_reminder_deliveries (id, reminder_id, event_id, occurrence_date, title, event_time, offset_minutes, delivered_at, acknowledged_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)'
      )
      .run(
        randomUUID(),
        reminder.reminderId,
        reminder.eventId,
        reminder.occurrenceDate,
        reminder.title,
        reminder.eventTime,
        reminder.offsetMinutes,
        Date.now()
      )
    return true
  } catch (reason: unknown) {
    if (reason instanceof Error && /UNIQUE constraint failed/.test(reason.message)) return false
    throw reason
  }
}

interface UnreadReminderRow {
  id: string
  reminder_id: string
  event_id: string
  occurrence_date: string
  title: string
  event_time: string | null
  offset_minutes: number
  delivered_at: number
}

export function listUnreadCalendarReminders(): CalendarUnreadReminderRecord[] {
  const rows = getSqlite()
    .prepare(
      `SELECT id, reminder_id, event_id, occurrence_date, title, event_time, offset_minutes, delivered_at
       FROM calendar_reminder_deliveries
       WHERE acknowledged_at IS NULL
       ORDER BY delivered_at DESC, occurrence_date DESC`
    )
    .all() as UnreadReminderRow[]

  return rows.map((row) => ({
    deliveryId: row.id,
    reminderId: row.reminder_id,
    eventId: row.event_id,
    title: row.title,
    occurrenceDate: row.occurrence_date,
    eventTime: row.event_time,
    offsetMinutes: row.offset_minutes,
    triggerAt: dateTimeMs(row.occurrence_date, row.event_time) - row.offset_minutes * 60_000,
    deliveredAt: row.delivered_at
  }))
}

export function acknowledgeCalendarReminder(input: CalendarAcknowledgeReminderInput): boolean {
  return (
    getSqlite()
      .prepare(
        'UPDATE calendar_reminder_deliveries SET acknowledged_at = ? WHERE id = ? AND acknowledged_at IS NULL'
      )
      .run(Date.now(), input.deliveryId).changes > 0
  )
}
"""
if old_mark not in text:
    raise SystemExit('markCalendarReminderDelivered marker not found')
write(path, text.replace(old_mark, new_mark, 1))

# IPC handlers.
path = 'src/main/ipc/register-calendar-ipc.ts'
text = read(path)
text = text.replace(
    "  calendarCreateEventInputSchema,\n",
    "  calendarAcknowledgeReminderInputSchema,\n  calendarCreateEventInputSchema,\n",
    1,
)
text = text.replace(
    "  createCalendarEvent,\n",
    "  acknowledgeCalendarReminder,\n  createCalendarEvent,\n",
    1,
)
text = text.replace(
    "  listCalendarReminderTriggers,\n",
    "  listCalendarReminderTriggers,\n  listUnreadCalendarReminders,\n",
    1,
)
marker = """  ipcMain.handle(CALENDAR_IPC_CHANNELS.listUpcomingReminders, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      listCalendarReminderTriggers(calendarRangeInputSchema.parse(rawInput))
    )
  )
"""
addition = marker + """  ipcMain.handle(CALENDAR_IPC_CHANNELS.listUnreadReminders, () =>
    mainOperationTracker.run(() => listUnreadCalendarReminders())
  )
  ipcMain.handle(CALENDAR_IPC_CHANNELS.acknowledgeReminder, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      acknowledgeCalendarReminder(calendarAcknowledgeReminderInputSchema.parse(rawInput))
    )
  )
"""
if marker not in text:
    raise SystemExit('calendar IPC reminder marker not found')
write(path, text.replace(marker, addition, 1))

# Preload API exposes inbox methods and an immediate main-process change event.
path = 'src/preload/index.ts'
text = read(path)
old = """  calendar: {
    listRange: (input) => ipcRenderer.invoke(CALENDAR_IPC_CHANNELS.listRange, input),
    listUpcomingReminders: (input) =>
      ipcRenderer.invoke(CALENDAR_IPC_CHANNELS.listUpcomingReminders, input),
    createEvent: (input) => ipcRenderer.invoke(CALENDAR_IPC_CHANNELS.createEvent, input),
"""
new = """  calendar: {
    listRange: (input) => ipcRenderer.invoke(CALENDAR_IPC_CHANNELS.listRange, input),
    listUpcomingReminders: (input) =>
      ipcRenderer.invoke(CALENDAR_IPC_CHANNELS.listUpcomingReminders, input),
    listUnreadReminders: () => ipcRenderer.invoke(CALENDAR_IPC_CHANNELS.listUnreadReminders),
    acknowledgeReminder: (input) =>
      ipcRenderer.invoke(CALENDAR_IPC_CHANNELS.acknowledgeReminder, input),
    onRemindersChanged: (listener) => {
      const handler = (): void => listener()
      ipcRenderer.on(CALENDAR_IPC_CHANNELS.remindersChanged, handler)
      return () => ipcRenderer.removeListener(CALENDAR_IPC_CHANNELS.remindersChanged, handler)
    },
    createEvent: (input) => ipcRenderer.invoke(CALENDAR_IPC_CHANNELS.createEvent, input),
"""
if old not in text:
    raise SystemExit('preload calendar marker not found')
write(path, text.replace(old, new, 1))

# Scheduler: create durable unread delivery first, notify renderer immediately, then show an explicit non-silent Windows toast.
path = 'src/main/services/calendar-reminder-scheduler.ts'
text = read(path)
text = text.replace(
    "import { BrowserWindow, Notification } from 'electron'\n\n",
    "import { BrowserWindow, Notification } from 'electron'\n\nimport { CALENDAR_IPC_CHANNELS } from '../../shared/contracts/calendar'\n",
    1,
)
text = text.replace(
    "        if (!markCalendarReminderDelivered(reminder.reminderId, reminder.occurrenceDate)) continue\n        const notification = new Notification({\n          title: `Календарь · ${reminder.title}`,\n          body: `${reminder.occurrenceDate}${formatEventTime(reminder.eventTime)}`\n        })\n",
    "        if (!markCalendarReminderDelivered(reminder)) continue\n\n        const window = this.getWindow()\n        if (window && !window.isDestroyed() && !window.webContents.isDestroyed()) {\n          window.webContents.send(CALENDAR_IPC_CHANNELS.remindersChanged)\n        }\n\n        if (!Notification.isSupported()) continue\n        const notification = new Notification({\n          title: `Календарь · ${reminder.title}`,\n          body: `${reminder.occurrenceDate}${formatEventTime(reminder.eventTime)}`,\n          silent: false,\n          timeoutType: 'default'\n        })\n",
    1,
)
write(path, text)

# Renderer hook: all surfaces stay synchronized, acknowledge only through explicit action.
write(
    'src/renderer/src/modules/calendar/useCalendarReminderInbox.ts',
    """import { useCallback, useEffect, useState } from 'react'

import type { CalendarUnreadReminderRecord } from '../../../../shared/contracts/calendar'

const LOCAL_REMINDERS_CHANGED_EVENT = 'mymind:calendar-reminders-changed'
const POLL_INTERVAL_MS = 30_000

function broadcastLocalChange(): void {
  window.dispatchEvent(new Event(LOCAL_REMINDERS_CHANGED_EVENT))
}

export function useCalendarReminderInbox(): {
  reminders: CalendarUnreadReminderRecord[]
  acknowledge: (reminder: CalendarUnreadReminderRecord) => Promise<void>
  refresh: () => Promise<void>
} {
  const [reminders, setReminders] = useState<CalendarUnreadReminderRecord[]>([])

  const refresh = useCallback(async (): Promise<void> => {
    const calendarApi = window.api?.calendar
    if (!calendarApi?.listUnreadReminders) {
      setReminders([])
      return
    }

    try {
      setReminders(await calendarApi.listUnreadReminders())
    } catch (reason: unknown) {
      console.error('Failed to load unread calendar reminders', reason)
    }
  }, [])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void refresh(), 0)
    const interval = window.setInterval(() => void refresh(), POLL_INTERVAL_MS)
    const handleRefresh = (): void => void refresh()
    const unsubscribeMain = window.api?.calendar?.onRemindersChanged?.(handleRefresh)

    window.addEventListener('focus', handleRefresh)
    window.addEventListener(LOCAL_REMINDERS_CHANGED_EVENT, handleRefresh)

    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(interval)
      window.removeEventListener('focus', handleRefresh)
      window.removeEventListener(LOCAL_REMINDERS_CHANGED_EVENT, handleRefresh)
      unsubscribeMain?.()
    }
  }, [refresh])

  const acknowledge = useCallback(
    async (reminder: CalendarUnreadReminderRecord): Promise<void> => {
      const calendarApi = window.api?.calendar
      if (!calendarApi?.acknowledgeReminder) return
      await calendarApi.acknowledgeReminder({ deliveryId: reminder.deliveryId })
      broadcastLocalChange()
      await refresh()
    },
    [refresh]
  )

  return { reminders, acknowledge, refresh }
}
""",
)

# Reusable unread reminder section used on Home and at the bottom of Calendar.
write(
    'src/renderer/src/modules/calendar/CalendarReminderInbox.tsx',
    """import { Bell, CalendarDays, Check } from 'lucide-react'
import { useState } from 'react'

import type { CalendarUnreadReminderRecord } from '../../../../shared/contracts/calendar'
import { cn } from '../../shared/lib/cn'

function formatDateTime(date: string, time: string | null): string {
  const [year, month, day] = date.split('-').map(Number)
  const label = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(year ?? 0, (month ?? 1) - 1, day ?? 1, 12))
  return time ? `${label}, ${time}` : label
}

function plural(value: number, forms: [string, string, string]): string {
  const mod10 = value % 10
  const mod100 = value % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}

function offsetLabel(minutes: number): string {
  if (minutes === 0) return 'В момент события'
  if (minutes % 10_080 === 0) {
    const value = minutes / 10_080
    return `За ${value} ${plural(value, ['неделю', 'недели', 'недель'])}`
  }
  if (minutes % 1440 === 0) {
    const value = minutes / 1440
    return `За ${value} ${plural(value, ['день', 'дня', 'дней'])}`
  }
  if (minutes % 60 === 0) {
    const value = minutes / 60
    return `За ${value} ${plural(value, ['час', 'часа', 'часов'])}`
  }
  return `За ${minutes} ${plural(minutes, ['минуту', 'минуты', 'минут'])}`
}

interface CalendarReminderInboxProps {
  reminders: CalendarUnreadReminderRecord[]
  onAcknowledge: (reminder: CalendarUnreadReminderRecord) => Promise<void>
  onOpenCalendar?: () => void
  className?: string
}

export function CalendarReminderInbox({
  reminders,
  onAcknowledge,
  onOpenCalendar,
  className
}: CalendarReminderInboxProps): React.JSX.Element | null {
  const [busyDeliveryId, setBusyDeliveryId] = useState<string | null>(null)
  if (reminders.length === 0) return null

  async function acknowledge(reminder: CalendarUnreadReminderRecord): Promise<void> {
    setBusyDeliveryId(reminder.deliveryId)
    try {
      await onAcknowledge(reminder)
    } finally {
      setBusyDeliveryId(null)
    }
  }

  return (
    <section
      data-testid="calendar-reminder-inbox"
      className={cn(
        'rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]',
        className
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex size-8 items-center justify-center rounded-xl bg-red-500/10 text-red-300">
            <Bell className="size-4" />
            <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-red-500 ring-2 ring-[var(--app-surface)]" />
          </span>
          <div>
            <div className="text-sm font-semibold text-[var(--app-text)]">Напоминания календаря</div>
            <div className="text-xs text-[var(--app-muted)]">
              {reminders.length} непрочитанных · исчезнут только после «Понятно»
            </div>
          </div>
        </div>
        {onOpenCalendar && (
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
            onClick={onOpenCalendar}
          >
            <CalendarDays className="size-3.5" /> Открыть календарь
          </button>
        )}
      </div>

      <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-3">
        {reminders.map((reminder) => (
          <article
            key={reminder.deliveryId}
            className="flex min-w-0 flex-col gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-red-500" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[var(--app-text)]">
                    {reminder.title}
                  </div>
                  <div className="mt-1 text-xs text-[var(--app-muted)]">
                    {formatDateTime(reminder.occurrenceDate, reminder.eventTime)}
                  </div>
                  <div className="mt-1 text-xs text-[var(--app-muted)]">
                    {offsetLabel(reminder.offsetMinutes)}
                  </div>
                </div>
              </div>
            </div>
            <button
              type="button"
              disabled={busyDeliveryId === reminder.deliveryId}
              className="inline-flex h-9 items-center justify-center gap-1.5 self-end rounded-xl bg-[var(--app-accent-500)] px-3 text-xs font-semibold text-white transition-opacity disabled:opacity-50"
              onClick={() => void acknowledge(reminder)}
            >
              <Check className="size-3.5" /> Понятно
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
""",
)

# Home: replace upcoming reminders with durable unread inbox; add dot to Calendar card as well.
path = 'src/renderer/src/modules/home/HomeModule.tsx'
text = read(path)
text = text.replace("  Bell,\n", '', 1)
text = text.replace("import { useCallback, useEffect, useState } from 'react'\n\n", '', 1)
text = text.replace("import type { CalendarReminderRecord } from '../../../../shared/contracts/calendar'\n", '', 1)
text = text.replace(
    "import { requestAppModuleNavigation } from '../../app/module-navigation'\n",
    "import { requestAppModuleNavigation } from '../../app/module-navigation'\n"
    "import { CalendarReminderInbox } from '../calendar/CalendarReminderInbox'\n"
    "import { useCalendarReminderInbox } from '../calendar/useCalendarReminderInbox'\n",
    1,
)
start = text.index("function pad(value: number): string {")
end = text.index("export function HomeModule(): React.JSX.Element {")
text = text[:start] + text[end:]
old_start = """export function HomeModule(): React.JSX.Element {
  const [reminders, setReminders] = useState<CalendarReminderRecord[]>([])

  const loadReminders = useCallback(async (): Promise<void> => {
    const from = new Date()
    const to = new Date(from)
    to.setDate(to.getDate() + 14)
    try {
      const now = Date.now()
      setReminders(
        (
          await window.api.calendar.listUpcomingReminders({
            from: localDateKey(from),
            to: localDateKey(to)
          })
        )
          .filter((reminder) => reminder.triggerAt >= now)
          .slice(0, 6)
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
"""
new_start = """export function HomeModule(): React.JSX.Element {
  const { reminders, acknowledge } = useCalendarReminderInbox()

  return (
"""
if old_start not in text:
    raise SystemExit('Home reminder state marker not found')
text = text.replace(old_start, new_start, 1)
old_section_start = """        {reminders.length > 0 && (
          <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]">
"""
section_start = text.index(old_section_start)
section_end_marker = """          </section>
        )}

        <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-[var(--app-shadow-card)]">
"""
section_end = text.index(section_end_marker, section_start)
replacement = """        <CalendarReminderInbox
          reminders={reminders}
          onAcknowledge={acknowledge}
          onOpenCalendar={() => requestAppModuleNavigation({ view: 'calendar' })}
        />

        <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-[var(--app-shadow-card)]">
"""
text = text[:section_start] + replacement + text[section_end + len(section_end_marker):]
text = text.replace(
    """                  <span className="flex size-9 items-center justify-center rounded-xl border border-violet-500/15 bg-violet-500/10 text-violet-300 transition-colors group-hover:border-violet-500/25">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
""",
    """                  <span className="relative flex size-9 items-center justify-center rounded-xl border border-violet-500/15 bg-violet-500/10 text-violet-300 transition-colors group-hover:border-violet-500/25">
                    <Icon aria-hidden="true" className="size-5" />
                    {module.id === 'calendar' && reminders.length > 0 && (
                      <span
                        aria-label="Есть непрочитанные напоминания"
                        className="absolute -top-1 -right-1 size-2.5 rounded-full bg-red-500 ring-2 ring-[var(--app-card)]"
                      />
                    )}
                  </span>
""",
    1,
)
write(path, text)

# Sidebar dot on Calendar icon.
path = 'src/renderer/src/app/AppShell.tsx'
text = read(path)
text = text.replace(
    "import { cn } from '../shared/lib/cn'\n",
    "import { useCalendarReminderInbox } from '../modules/calendar/useCalendarReminderInbox'\n"
    "import { cn } from '../shared/lib/cn'\n",
    1,
)
text = text.replace(
    "  onSelect: (view: AppViewId) => void\n",
    "  onSelect: (view: AppViewId) => void\n  hasNotification?: boolean\n",
    1,
)
text = text.replace(
    "  isCollapsed,\n  onSelect\n}: NavigationButtonProps)",
    "  isCollapsed,\n  onSelect,\n  hasNotification = false\n}: NavigationButtonProps)",
    1,
)
old_icon = """      <Icon
        aria-hidden="true"
        className={cn(
          'size-5 shrink-0 transition-colors',
          isActive
            ? 'text-violet-300'
            : ['text-[var(--app-muted)]', 'group-hover:text-[var(--app-text)]']
        )}
      />
"""
new_icon = """      <span className="relative flex size-5 shrink-0 items-center justify-center">
        <Icon
          aria-hidden="true"
          className={cn(
            'size-5 transition-colors',
            isActive
              ? 'text-violet-300'
              : ['text-[var(--app-muted)]', 'group-hover:text-[var(--app-text)]']
          )}
        />
        {hasNotification && (
          <span
            aria-label="Есть непрочитанные напоминания календаря"
            className="absolute -top-1 -right-1 size-2.5 rounded-full bg-red-500 ring-2 ring-[var(--app-sidebar)]"
          />
        )}
      </span>
"""
if old_icon not in text:
    raise SystemExit('AppShell icon marker not found')
text = text.replace(old_icon, new_icon, 1)
text = text.replace(
    "  const [isCollapsed, setIsCollapsed] = useState(() => activeView === 'study')\n",
    "  const [isCollapsed, setIsCollapsed] = useState(() => activeView === 'study')\n"
    "  const { reminders: calendarReminders } = useCalendarReminderInbox()\n",
    1,
)
text = text.replace(
    """                    isCollapsed={isCollapsed}
                    onSelect={handleViewChange}
                  />
""",
    """                    isCollapsed={isCollapsed}
                    onSelect={handleViewChange}
                    hasNotification={item.id === 'calendar' && calendarReminders.length > 0}
                  />
""",
    1,
)
write(path, text)

# Calendar bottom inbox.
path = 'src/renderer/src/modules/calendar/CalendarPage.tsx'
text = read(path)
text = text.replace(
    "import { StandardModulePage } from '../../shared/ui/StandardModulePage'\n",
    "import { StandardModulePage } from '../../shared/ui/StandardModulePage'\n"
    "import { CalendarReminderInbox } from './CalendarReminderInbox'\n"
    "import { useCalendarReminderInbox } from './useCalendarReminderInbox'\n",
    1,
)
text = text.replace(
    "  const [reminderUnit, setReminderUnit] = useState<'minutes' | 'hours' | 'days' | 'weeks'>('days')\n",
    "  const [reminderUnit, setReminderUnit] = useState<'minutes' | 'hours' | 'days' | 'weeks'>('days')\n"
    "  const { reminders: unreadReminders, acknowledge: acknowledgeReminder } =\n"
    "    useCalendarReminderInbox()\n",
    1,
)
marker = """      </div>

      <AppDialog
"""
replacement = """      </div>

      <CalendarReminderInbox
        reminders={unreadReminders}
        onAcknowledge={acknowledgeReminder}
        className="mt-4"
      />

      <AppDialog
"""
if marker not in text:
    raise SystemExit('CalendarPage AppDialog marker not found')
write(path, text.replace(marker, replacement, 1))

# Repository regression: delivered reminder stays unread until explicit acknowledgement.
path = 'src/main/repositories/calendar.repository.test.ts'
text = read(path)
text = text.replace(
    "  calculateCalendarElapsed,\n",
    "  acknowledgeCalendarReminder,\n  calculateCalendarElapsed,\n",
    1,
)
text = text.replace(
    "  listCalendarReminderTriggers,\n",
    "  listCalendarReminderTriggers,\n  listUnreadCalendarReminders,\n",
    1,
)
text = text.replace(
    "    expect(markCalendarReminderDelivered(first!.reminderId, first!.occurrenceDate)).toBe(true)\n    expect(markCalendarReminderDelivered(first!.reminderId, first!.occurrenceDate)).toBe(false)\n",
    "    expect(markCalendarReminderDelivered(first!)).toBe(true)\n    expect(markCalendarReminderDelivered(first!)).toBe(false)\n\n"
    "    const unread = listUnreadCalendarReminders()\n"
    "    expect(unread).toHaveLength(1)\n"
    "    expect(unread[0]).toMatchObject({\n"
    "      reminderId: first!.reminderId,\n"
    "      eventId: event.id,\n"
    "      title: 'Встреча',\n"
    "      occurrenceDate: first!.occurrenceDate\n"
    "    })\n"
    "    expect(listUnreadCalendarReminders()).toHaveLength(1)\n"
    "    expect(acknowledgeCalendarReminder({ deliveryId: unread[0]!.deliveryId })).toBe(true)\n"
    "    expect(listUnreadCalendarReminders()).toHaveLength(0)\n"
    "    expect(acknowledgeCalendarReminder({ deliveryId: unread[0]!.deliveryId })).toBe(false)\n",
    1,
)
write(path, text)

# Calendar UI mocks must support the inbox API without changing the existing layout test intent.
path = 'src/renderer/src/modules/calendar/CalendarPage.test.tsx'
text = read(path)
text = text.replace(
    "  listUpcomingReminders: vi.fn(),\n",
    "  listUpcomingReminders: vi.fn(),\n  listUnreadReminders: vi.fn(),\n  acknowledgeReminder: vi.fn(),\n  onRemindersChanged: vi.fn(),\n",
    1,
)
text = text.replace(
    "  mocks.listUpcomingReminders.mockResolvedValue([])\n",
    "  mocks.listUpcomingReminders.mockResolvedValue([])\n"
    "  mocks.listUnreadReminders.mockResolvedValue([])\n"
    "  mocks.acknowledgeReminder.mockResolvedValue(true)\n"
    "  mocks.onRemindersChanged.mockReturnValue(() => undefined)\n",
    1,
)
write(path, text)

# Component regression for explicit acknowledgement affordance.
write(
    'src/renderer/src/modules/calendar/CalendarReminderInbox.test.tsx',
    """import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'

import type { CalendarUnreadReminderRecord } from '../../../../shared/contracts/calendar'
import { CalendarReminderInbox } from './CalendarReminderInbox'

it('keeps an unread reminder visible until the explicit Понятно action is used', async () => {
  const user = userEvent.setup()
  const onAcknowledge = vi.fn().mockResolvedValue(undefined)
  const reminder: CalendarUnreadReminderRecord = {
    deliveryId: '00000000-0000-4000-8000-000000000010',
    reminderId: '00000000-0000-4000-8000-000000000011',
    eventId: '00000000-0000-4000-8000-000000000012',
    title: 'Встреча',
    occurrenceDate: '2026-08-29',
    eventTime: '10:00',
    offsetMinutes: 60,
    triggerAt: Date.now() - 1000,
    deliveredAt: Date.now()
  }

  render(<CalendarReminderInbox reminders={[reminder]} onAcknowledge={onAcknowledge} />)

  expect(screen.getByText('Встреча')).toBeInTheDocument()
  expect(screen.getByText(/исчезнут только после/)).toBeInTheDocument()
  expect(onAcknowledge).not.toHaveBeenCalled()

  await user.click(screen.getByRole('button', { name: /Понятно/ }))
  expect(onAcknowledge).toHaveBeenCalledWith(reminder)
})
""",
)
