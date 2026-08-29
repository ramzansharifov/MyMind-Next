import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

import type { CalendarEventKind } from '../../../shared/contracts/calendar'

export const calendarEvents = sqliteTable(
  'calendar_events',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    kind: text('kind').$type<CalendarEventKind>().notNull(),
    eventDate: text('event_date').notNull(),
    eventTime: text('event_time'),
    startDate: text('start_date'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [
    index('calendar_events_kind_date_idx').on(table.kind, table.eventDate),
    index('calendar_events_updated_idx').on(table.updatedAt)
  ]
)

export const calendarEventOccurrences = sqliteTable(
  'calendar_event_occurrences',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => calendarEvents.id, { onDelete: 'cascade' }),
    occurrenceDate: text('occurrence_date').notNull(),
    note: text('note').notNull().default(''),
    hidden: integer('hidden', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [
    uniqueIndex('calendar_occurrences_event_date_unique').on(table.eventId, table.occurrenceDate),
    index('calendar_occurrences_date_idx').on(table.occurrenceDate)
  ]
)

export const calendarEventReminders = sqliteTable(
  'calendar_event_reminders',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => calendarEvents.id, { onDelete: 'cascade' }),
    offsetMinutes: integer('offset_minutes').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [
    uniqueIndex('calendar_reminders_event_offset_unique').on(table.eventId, table.offsetMinutes),
    index('calendar_reminders_event_idx').on(table.eventId)
  ]
)

export const calendarReminderDeliveries = sqliteTable(
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
