ALTER TABLE `habits` ADD `reminders_enabled` integer DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE `habit_reminder_deliveries` (
  `id` text PRIMARY KEY NOT NULL,
  `habit_id` text NOT NULL,
  `occurrence_date` text NOT NULL,
  `unit` integer NOT NULL,
  `preferred_time` text NOT NULL,
  `delivered_at` integer NOT NULL,
  FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `habit_reminder_deliveries_habit_date_unit_unique` ON `habit_reminder_deliveries` (`habit_id`,`occurrence_date`,`unit`);
--> statement-breakpoint
CREATE INDEX `habit_reminder_deliveries_delivered_idx` ON `habit_reminder_deliveries` (`delivered_at`);
