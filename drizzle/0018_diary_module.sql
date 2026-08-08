CREATE TABLE `diaries` (
  `id` text PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `icon` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `diaries_updated_idx` ON `diaries` (`updated_at`);
--> statement-breakpoint
CREATE TABLE `diary_days` (
  `id` text PRIMARY KEY NOT NULL,
  `diary_id` text NOT NULL,
  `day_key` text NOT NULL,
  `mood` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`diary_id`) REFERENCES `diaries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `diary_days_diary_day_uq` ON `diary_days` (`diary_id`,`day_key`);
--> statement-breakpoint
CREATE INDEX `diary_days_diary_day_idx` ON `diary_days` (`diary_id`,`day_key`);
--> statement-breakpoint
CREATE INDEX `diary_days_diary_updated_idx` ON `diary_days` (`diary_id`,`updated_at`);
--> statement-breakpoint
CREATE TABLE `diary_entries` (
  `id` text PRIMARY KEY NOT NULL,
  `diary_day_id` text NOT NULL,
  `text` text NOT NULL,
  `occurred_at` integer NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`diary_day_id`) REFERENCES `diary_days`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `diary_entries_day_time_idx` ON `diary_entries` (`diary_day_id`,`occurred_at`);
--> statement-breakpoint
CREATE INDEX `diary_entries_updated_idx` ON `diary_entries` (`updated_at`);
--> statement-breakpoint
INSERT INTO `diaries` (`id`, `title`, `icon`, `created_at`, `updated_at`)
VALUES (
  'diary-default',
  'Личный дневник',
  'book-heart',
  CAST(strftime('%s','now') AS INTEGER) * 1000,
  CAST(strftime('%s','now') AS INTEGER) * 1000
);
