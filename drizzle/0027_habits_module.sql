CREATE TABLE `habit_groups` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `icon` text DEFAULT 'folder' NOT NULL,
  `color` text DEFAULT 'violet' NOT NULL,
  `position` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `habit_groups_position_idx` ON `habit_groups` (`position`,`created_at`);
--> statement-breakpoint
CREATE INDEX `habit_groups_name_idx` ON `habit_groups` (`name`);
--> statement-breakpoint
CREATE TABLE `habits` (
  `id` text PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `description` text DEFAULT '' NOT NULL,
  `group_id` text,
  `status` text DEFAULT 'active' NOT NULL,
  `tracking_type` text DEFAULT 'check' NOT NULL,
  `target_value` integer DEFAULT 1 NOT NULL,
  `unit` text DEFAULT '' NOT NULL,
  `repeat_every_days` integer DEFAULT 1 NOT NULL,
  `start_date` text NOT NULL,
  `end_date` text,
  `preferred_time` text,
  `archived_on` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`group_id`) REFERENCES `habit_groups`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `habits_group_status_idx` ON `habits` (`group_id`,`status`);
--> statement-breakpoint
CREATE INDEX `habits_status_start_idx` ON `habits` (`status`,`start_date`);
--> statement-breakpoint
CREATE INDEX `habits_updated_idx` ON `habits` (`updated_at`);
--> statement-breakpoint
CREATE TABLE `habit_entries` (
  `id` text PRIMARY KEY NOT NULL,
  `habit_id` text NOT NULL,
  `date` text NOT NULL,
  `value` integer DEFAULT 0 NOT NULL,
  `skipped` integer DEFAULT false NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `habit_entries_habit_date_unique` ON `habit_entries` (`habit_id`,`date`);
--> statement-breakpoint
CREATE INDEX `habit_entries_date_idx` ON `habit_entries` (`date`);
--> statement-breakpoint
CREATE INDEX `habit_entries_habit_idx` ON `habit_entries` (`habit_id`);
