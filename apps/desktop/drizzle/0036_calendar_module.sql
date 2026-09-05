CREATE TABLE `calendar_events` (
  `id` text PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `kind` text NOT NULL,
  `event_date` text NOT NULL,
  `event_time` text,
  `start_date` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `calendar_events_kind_date_idx` ON `calendar_events` (`kind`,`event_date`);
--> statement-breakpoint
CREATE INDEX `calendar_events_updated_idx` ON `calendar_events` (`updated_at`);
--> statement-breakpoint
CREATE TABLE `calendar_event_occurrences` (
  `id` text PRIMARY KEY NOT NULL,
  `event_id` text NOT NULL,
  `occurrence_date` text NOT NULL,
  `note` text DEFAULT '' NOT NULL,
  `hidden` integer DEFAULT false NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`event_id`) REFERENCES `calendar_events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `calendar_occurrences_event_date_unique` ON `calendar_event_occurrences` (`event_id`,`occurrence_date`);
--> statement-breakpoint
CREATE INDEX `calendar_occurrences_date_idx` ON `calendar_event_occurrences` (`occurrence_date`);
--> statement-breakpoint
CREATE TABLE `calendar_event_reminders` (
  `id` text PRIMARY KEY NOT NULL,
  `event_id` text NOT NULL,
  `offset_minutes` integer NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`event_id`) REFERENCES `calendar_events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `calendar_reminders_event_offset_unique` ON `calendar_event_reminders` (`event_id`,`offset_minutes`);
--> statement-breakpoint
CREATE INDEX `calendar_reminders_event_idx` ON `calendar_event_reminders` (`event_id`);
--> statement-breakpoint
CREATE TABLE `calendar_reminder_deliveries` (
  `id` text PRIMARY KEY NOT NULL,
  `reminder_id` text NOT NULL,
  `occurrence_date` text NOT NULL,
  `delivered_at` integer NOT NULL,
  FOREIGN KEY (`reminder_id`) REFERENCES `calendar_event_reminders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `calendar_deliveries_reminder_date_unique` ON `calendar_reminder_deliveries` (`reminder_id`,`occurrence_date`);
--> statement-breakpoint
CREATE INDEX `calendar_deliveries_delivered_idx` ON `calendar_reminder_deliveries` (`delivered_at`);
