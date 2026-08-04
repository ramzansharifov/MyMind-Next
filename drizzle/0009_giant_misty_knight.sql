CREATE TABLE `note_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `note_groups_title_idx` ON `note_groups` (`title`);--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text,
	`title` text NOT NULL,
	`document` text NOT NULL,
	`plain_text` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `note_groups`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `notes_group_updated_idx` ON `notes` (`group_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `notes_title_idx` ON `notes` (`title`);