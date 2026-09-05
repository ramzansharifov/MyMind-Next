CREATE TABLE `task_groups` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `icon` text DEFAULT 'folder' NOT NULL,
  `color` text DEFAULT 'violet' NOT NULL,
  `position` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `task_groups_position_idx` ON `task_groups` (`position`,`created_at`);
--> statement-breakpoint
CREATE INDEX `task_groups_name_idx` ON `task_groups` (`name`);
--> statement-breakpoint
CREATE TABLE `tasks` (
  `id` text PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `description` text DEFAULT '' NOT NULL,
  `group_id` text,
  `status` text DEFAULT 'active' NOT NULL,
  `priority` text DEFAULT 'normal' NOT NULL,
  `due_date` text,
  `due_time` text,
  `completed_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`group_id`) REFERENCES `task_groups`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `tasks_status_due_idx` ON `tasks` (`status`,`due_date`);
--> statement-breakpoint
CREATE INDEX `tasks_group_status_idx` ON `tasks` (`group_id`,`status`);
--> statement-breakpoint
CREATE INDEX `tasks_due_date_idx` ON `tasks` (`due_date`);
--> statement-breakpoint
CREATE INDEX `tasks_updated_idx` ON `tasks` (`updated_at`);
