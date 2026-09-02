import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

import type {
  HabitGroupColor,
  HabitGroupIcon,
  HabitTrackingType
} from '../../../shared/contracts/habits'

export const habitGroups = sqliteTable(
  'habit_groups',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    icon: text('icon').$type<HabitGroupIcon>().notNull().default('folder'),
    color: text('color').$type<HabitGroupColor>().notNull().default('violet'),
    position: integer('position').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [
    index('habit_groups_position_idx').on(table.position, table.createdAt),
    index('habit_groups_name_idx').on(table.name)
  ]
)

export const habits = sqliteTable(
  'habits',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    groupId: text('group_id').references(() => habitGroups.id, { onDelete: 'set null' }),
    trackingType: text('tracking_type').$type<HabitTrackingType>().notNull().default('check'),
    targetValue: integer('target_value').notNull().default(1),
    unit: text('unit').notNull().default(''),
    repeatEveryDays: integer('repeat_every_days').notNull().default(1),
    preferredTime: text('preferred_time'),
    remindersEnabled: integer('reminders_enabled', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [
    index('habits_group_updated_idx').on(table.groupId, table.updatedAt),
    index('habits_updated_idx').on(table.updatedAt)
  ]
)

export const habitEntries = sqliteTable(
  'habit_entries',
  {
    id: text('id').primaryKey(),
    habitId: text('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    value: integer('value').notNull().default(0),
    skipped: integer('skipped', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [
    uniqueIndex('habit_entries_habit_date_unique').on(table.habitId, table.date),
    index('habit_entries_date_idx').on(table.date),
    index('habit_entries_habit_idx').on(table.habitId)
  ]
)

export const habitReminderDeliveries = sqliteTable(
  'habit_reminder_deliveries',
  {
    id: text('id').primaryKey(),
    habitId: text('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    occurrenceDate: text('occurrence_date').notNull(),
    unit: integer('unit').notNull(),
    preferredTime: text('preferred_time').notNull(),
    deliveredAt: integer('delivered_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [
    uniqueIndex('habit_reminder_deliveries_habit_date_unit_unique').on(
      table.habitId,
      table.occurrenceDate,
      table.unit
    ),
    index('habit_reminder_deliveries_delivered_idx').on(table.deliveredAt)
  ]
)
