CREATE TABLE `calendar_reminder_deliveries_new` (
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
